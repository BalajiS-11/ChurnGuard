import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from backend.app.core.deps import get_db, get_current_user, require_roles, mask_customer_pii
from backend.app.db.models import User, Customer, Prediction, PredictionDriver, RetentionAction
from backend.app.schemas.schemas import CustomerResponse, CustomerListResponse, CustomerCreate, CustomerBase
from backend.app.services.prediction_service import predict_single

router = APIRouter()

@router.get("", response_model=CustomerListResponse)
def list_customers(
    search: Optional[str] = None,
    risk: Optional[str] = None,
    geography: Optional[str] = None,
    gender: Optional[str] = None,
    is_active: Optional[bool] = None,
    products: Optional[int] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    balance_min: Optional[float] = None,
    balance_max: Optional[float] = None,
    rm_id: Optional[str] = None,
    sort_by: str = Query("latest_probability", regex="^(latest_probability|balance|age|credit_score|estimated_salary|created_at)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Customer).filter(Customer.is_deleted == False)
    
    # RM sees their own customers if requested or if pure RM role
    if current_user.role == "rm" and rm_id == "me":
        query = query.filter(Customer.assigned_rm_id == current_user.id)
    elif rm_id:
        query = query.filter(Customer.assigned_rm_id == rm_id)
        
    # Filters
    if risk:
        tiers = [r.strip().lower() for r in risk.split(",")]
        query = query.filter(Customer.latest_risk_tier.in_(tiers))
        
    if geography:
        geos = [g.strip().capitalize() for g in geography.split(",")]
        query = query.filter(Customer.geography.in_(geos))
        
    if gender:
        query = query.filter(Customer.gender == gender.capitalize())
        
    if is_active is not None:
        query = query.filter(Customer.is_active_member == is_active)
        
    if products is not None:
        query = query.filter(Customer.num_of_products == products)
        
    if age_min is not None:
        query = query.filter(Customer.age >= age_min)
    if age_max is not None:
        query = query.filter(Customer.age <= age_max)
        
    if balance_min is not None:
        query = query.filter(Customer.balance >= balance_min)
    if balance_max is not None:
        query = query.filter(Customer.balance <= balance_max)
        
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Customer.surname.ilike(search_term),
                Customer.external_id.cast(Customer.external_id.type).like(search_term)
            )
        )
        
    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    # Sorting
    sort_column = getattr(Customer, sort_by, Customer.latest_probability)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column).nulls_last())
    else:
        query = query.order_by(asc(sort_column).nulls_last())
        
    # Pagination
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    # Mask PII for analyst role
    result_items = []
    for c in items:
        cdict = {
            "id": c.id,
            "external_id": c.external_id,
            "surname": c.surname,
            "credit_score": c.credit_score,
            "geography": c.geography,
            "gender": c.gender,
            "age": c.age,
            "tenure": c.tenure,
            "balance": c.balance,
            "num_of_products": c.num_of_products,
            "has_cr_card": c.has_cr_card,
            "is_active_member": c.is_active_member,
            "estimated_salary": c.estimated_salary,
            "actual_churned": c.actual_churned,
            "assigned_rm_id": c.assigned_rm_id,
            "assigned_rm_name": c.assigned_rm.full_name if c.assigned_rm else None,
            "latest_probability": c.latest_probability,
            "latest_risk_tier": c.latest_risk_tier,
            "latest_scored_at": c.latest_scored_at,
            "created_at": c.created_at
        }
        masked = mask_customer_pii(cdict, current_user.role)
        result_items.append(masked)
        
    return {
        "items": result_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.get("/watchlist")
def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Customer).filter(
        Customer.is_deleted == False,
        Customer.latest_risk_tier.in_(["critical", "high"])
    )
    if current_user.role == "rm":
        query = query.filter(Customer.assigned_rm_id == current_user.id)
    customers = query.order_by(Customer.latest_probability.desc().nulls_last()).limit(50).all()
    return [mask_customer_pii({
        "id": c.id,
        "external_id": c.external_id,
        "surname": c.surname,
        "credit_score": c.credit_score,
        "geography": c.geography,
        "gender": c.gender,
        "age": c.age,
        "balance": c.balance,
        "num_of_products": c.num_of_products,
        "is_active_member": c.is_active_member,
        "latest_probability": c.latest_probability,
        "latest_risk_tier": c.latest_risk_tier
    }, current_user.role) for c in customers]

@router.get("/{id}")
def get_customer_detail(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == id, Customer.is_deleted == False).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    # Fetch latest prediction and drivers
    latest_pred = (
        db.query(Prediction)
        .filter(Prediction.customer_id == customer.id, Prediction.is_whatif == False)
        .order_by(Prediction.created_at.desc())
        .first()
    )
    
    drivers = []
    if latest_pred:
        p_drivers = (
            db.query(PredictionDriver)
            .filter(PredictionDriver.prediction_id == latest_pred.id)
            .order_by(PredictionDriver.rank.asc())
            .all()
        )
        drivers = [
            {
                "rank": d.rank,
                "feature": d.feature,
                "friendly_name": d.feature,
                "feature_value": d.feature_value,
                "shap_value": d.shap_value,
                "direction": d.direction,
                "reason_text": d.reason_text
            }
            for d in p_drivers
        ]
        
    # If no stored drivers, generate live
    if not drivers:
        live_pred = predict_single({
            "credit_score": customer.credit_score,
            "geography": customer.geography,
            "gender": customer.gender,
            "age": customer.age,
            "tenure": customer.tenure,
            "balance": customer.balance,
            "num_of_products": customer.num_of_products,
            "has_cr_card": customer.has_cr_card,
            "is_active_member": customer.is_active_member,
            "estimated_salary": customer.estimated_salary
        })
        drivers = live_pred["drivers"]
        recs = live_pred["recommendations"]
    else:
        from ml.recommend import generate_recommendations
        recs = generate_recommendations({
            "CreditScore": customer.credit_score,
            "Geography": customer.geography,
            "Gender": customer.gender,
            "Age": customer.age,
            "Tenure": customer.tenure,
            "Balance": customer.balance,
            "NumOfProducts": customer.num_of_products,
            "HasCrCard": customer.has_cr_card,
            "IsActiveMember": customer.is_active_member,
            "EstimatedSalary": customer.estimated_salary
        }, drivers)
        
    # Actions for this customer
    actions = (
        db.query(RetentionAction)
        .filter(RetentionAction.customer_id == customer.id)
        .order_by(RetentionAction.created_at.desc())
        .all()
    )
    actions_data = [
        {
            "id": a.id,
            "title": a.title,
            "type": a.type,
            "status": a.status,
            "outcome": a.outcome,
            "due_date": a.due_date.isoformat() if a.due_date else None,
            "completed_at": a.completed_at.isoformat() if a.completed_at else None,
            "notes": a.notes,
            "created_at": a.created_at.isoformat()
        }
        for a in actions
    ]
    
    cdict = {
        "id": customer.id,
        "external_id": customer.external_id,
        "surname": customer.surname,
        "credit_score": customer.credit_score,
        "geography": customer.geography,
        "gender": customer.gender,
        "age": customer.age,
        "tenure": customer.tenure,
        "balance": customer.balance,
        "num_of_products": customer.num_of_products,
        "has_cr_card": customer.has_cr_card,
        "is_active_member": customer.is_active_member,
        "estimated_salary": customer.estimated_salary,
        "actual_churned": customer.actual_churned,
        "assigned_rm_id": customer.assigned_rm_id,
        "assigned_rm_name": customer.assigned_rm.full_name if customer.assigned_rm else "Unassigned",
        "latest_probability": customer.latest_probability,
        "latest_risk_tier": customer.latest_risk_tier,
        "latest_scored_at": customer.latest_scored_at,
        "created_at": customer.created_at,
        "drivers": drivers,
        "recommendations": recs,
        "actions": actions_data
    }
    return mask_customer_pii(cdict, current_user.role)

@router.get("/{id}/predictions")
def get_customer_prediction_history(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    preds = (
        db.query(Prediction)
        .filter(Prediction.customer_id == id)
        .order_by(Prediction.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": p.id,
            "probability": p.probability,
            "risk_tier": p.risk_tier,
            "predicted_churn": p.predicted_churn,
            "is_whatif": p.is_whatif,
            "created_at": p.created_at.isoformat()
        }
        for p in preds
    ]

@router.post("", response_model=CustomerResponse)
def create_customer(
    customer_in: CustomerCreate,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db)
):
    # Check duplicate external_id
    existing = db.query(Customer).filter(Customer.external_id == customer_in.external_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this external ID already exists")
        
    customer = Customer(**customer_in.dict())
    
    # Score immediately with model
    pred = predict_single(customer_in.dict())
    customer.latest_probability = pred["probability"]
    customer.latest_risk_tier = pred["risk_tier"]
    
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer
