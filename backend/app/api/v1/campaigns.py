import random
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from backend.app.core.deps import get_db, get_current_user, require_roles
from backend.app.db.models import User, Campaign, CampaignCustomer, Customer
from backend.app.schemas.schemas import (
    CampaignCreate,
    CampaignResponse,
    SegmentPreviewRequest,
    SegmentPreviewResponse,
    CustomerResponse
)
from backend.app.services.prediction_service import calculate_revenue_at_risk

router = APIRouter()

def evaluate_segment_rules(query, rules: List[Any]):
    """
    Apply segment builder rules to Customer SQLAlchemy query.
    Rules format: [{"field": "geography", "op": "eq", "value": "Germany"}, ...]
    """
    for r in rules:
        field = r.field if hasattr(r, "field") else r.get("field")
        op = r.op if hasattr(r, "op") else r.get("op")
        val = r.value if hasattr(r, "value") else r.get("value")
        
        column = getattr(Customer, field, None)
        if column is None:
            continue
            
        if op == "eq":
            query = query.filter(column == val)
        elif op == "neq":
            query = query.filter(column != val)
        elif op == "gt":
            query = query.filter(column > float(val))
        elif op == "lt":
            query = query.filter(column < float(val))
        elif op == "gte":
            query = query.filter(column >= float(val))
        elif op == "lte":
            query = query.filter(column <= float(val))
        elif op == "in" and isinstance(val, list):
            query = query.filter(column.in_(val))
            
    return query

@router.post("/preview", response_model=SegmentPreviewResponse)
def preview_segment(
    req: SegmentPreviewRequest,
    current_user: User = Depends(require_roles("manager", "admin")),
    db: Session = Depends(get_db)
):
    query = db.query(Customer).filter(Customer.is_deleted == False)
    query = evaluate_segment_rules(query, req.segment_rules)
    
    customers = query.all()
    audience_size = len(customers)
    
    total_rev = sum(
        calculate_revenue_at_risk(
            c.latest_probability or 0.0,
            c.balance,
            c.estimated_salary,
            c.num_of_products
        )
        for c in customers
    )
    
    sample = [
        CustomerResponse.from_orm(c) for c in customers[:5]
    ]
    
    return {
        "audience_size": audience_size,
        "projected_revenue_at_risk": round(total_rev, 2),
        "sample_customers": sample
    }

@router.get("", response_model=List[CampaignResponse])
def list_campaigns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
    return campaigns

@router.post("", response_model=CampaignResponse)
def create_campaign(
    campaign_in: CampaignCreate,
    current_user: User = Depends(require_roles("manager", "admin")),
    db: Session = Depends(get_db)
):
    # Calculate live audience size
    query = db.query(Customer).filter(Customer.is_deleted == False)
    query = evaluate_segment_rules(query, campaign_in.segment_rules)
    customers = query.all()
    
    audience_size = len(customers)
    total_rev = sum(
        calculate_revenue_at_risk(
            c.latest_probability or 0.0,
            c.balance,
            c.estimated_salary,
            c.num_of_products
        )
        for c in customers
    )
    
    rules_json = [r.dict() if hasattr(r, "dict") else r for r in campaign_in.segment_rules]
    
    campaign = Campaign(
        name=campaign_in.name,
        description=campaign_in.description,
        owner_id=current_user.id,
        status="draft",
        segment_rules=rules_json,
        offer=campaign_in.offer,
        control_pct=campaign_in.control_pct,
        start_date=campaign_in.start_date,
        end_date=campaign_in.end_date,
        audience_size=audience_size,
        projected_revenue_at_risk=round(total_rev, 2)
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign

@router.get("/{id}", response_model=CampaignResponse)
def get_campaign(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.get("/{id}/customers")
def get_campaign_customers(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    links = db.query(CampaignCustomer).filter(CampaignCustomer.campaign_id == id).limit(200).all()
    cust_ids = [l.customer_id for l in links]
    custs = {c.id: c for c in db.query(Customer).filter(Customer.id.in_(cust_ids)).all()}
    
    res = []
    for l in links:
        c = custs.get(l.customer_id)
        if c:
            s_name = c.surname
            if current_user.role == "analyst" and s_name and len(s_name) > 2:
                s_name = s_name[0] + "***" + s_name[-1]
            res.append({
                "link_id": l.id,
                "customer_id": c.id,
                "external_id": c.external_id if current_user.role != "analyst" else f"CUST-****{c.external_id[-4:] if len(c.external_id) >= 4 else '0000'}",
                "surname": s_name,
                "credit_score": c.credit_score,
                "geography": c.geography,
                "balance": c.balance,
                "latest_probability": c.latest_probability,
                "latest_risk_tier": c.latest_risk_tier,
                "is_control": l.is_control,
                "outcome": l.outcome
            })
    return res

@router.post("/{id}/launch", response_model=CampaignResponse)
def launch_campaign(
    id: str,
    current_user: User = Depends(require_roles("manager", "admin")),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    # Get audience
    query = db.query(Customer).filter(Customer.is_deleted == False)
    query = evaluate_segment_rules(query, campaign.segment_rules)
    customers = query.all()
    
    control_ratio = campaign.control_pct / 100.0
    
    # Clean previous links
    db.query(CampaignCustomer).filter(CampaignCustomer.campaign_id == campaign.id).delete()
    
    for c in customers:
        is_ctrl = random.random() < control_ratio
        link = CampaignCustomer(
            campaign_id=campaign.id,
            customer_id=c.id,
            is_control=is_ctrl,
            outcome="pending"
        )
        db.add(link)
        
    campaign.status = "active"
    db.commit()
    db.refresh(campaign)
    return campaign

@router.get("/{id}/results")
def get_campaign_results(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    links = db.query(CampaignCustomer).filter(CampaignCustomer.campaign_id == id).all()
    
    treatment = [l for l in links if not l.is_control]
    control = [l for l in links if l.is_control]
    
    # Calculate conversion / outcomes
    t_retained = sum(1 for l in treatment if l.outcome == "retained")
    t_churned = sum(1 for l in treatment if l.outcome == "churned")
    
    c_retained = sum(1 for l in control if l.outcome == "retained")
    c_churned = sum(1 for l in control if l.outcome == "churned")
    
    t_rate = (t_retained / len(treatment) * 100.0) if treatment else 0.0
    c_rate = (c_retained / len(control) * 100.0) if control else 0.0
    uplift = round(t_rate - c_rate, 2)
    
    return {
        "campaign_id": campaign.id,
        "name": campaign.name,
        "status": campaign.status,
        "total_audience": len(links),
        "treatment_group": {
            "size": len(treatment),
            "retained": t_retained,
            "churned": t_churned,
            "retention_rate": round(t_rate, 1)
        },
        "control_group": {
            "size": len(control),
            "retained": c_retained,
            "churned": c_churned,
            "retention_rate": round(c_rate, 1)
        },
        "uplift_percentage_points": uplift,
        "projected_revenue_saved": round(uplift * 0.01 * (campaign.projected_revenue_at_risk or 0.0), 2)
    }
