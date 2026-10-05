from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_db, get_current_user
from backend.app.db.models import User, RetentionAction, Customer
from backend.app.schemas.schemas import ActionCreate, ActionUpdate, ActionStatusUpdate, ActionResponse

router = APIRouter()

@router.get("", response_model=List[ActionResponse])
def list_actions(
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(RetentionAction)
    
    if current_user.role == "rm" and not assignee_id:
        query = query.filter(RetentionAction.assignee_id == current_user.id)
    elif assignee_id:
        query = query.filter(RetentionAction.assignee_id == assignee_id)
        
    if status:
        query = query.filter(RetentionAction.status == status)
    if customer_id:
        query = query.filter(RetentionAction.customer_id == customer_id)
        
    actions = query.order_by(RetentionAction.created_at.desc()).all()
    
    res = []
    for a in actions:
        res.append({
            "id": a.id,
            "customer_id": a.customer_id,
            "customer_name": f"{a.customer.surname or ''} ({a.customer.external_id})" if a.customer else "Unknown",
            "created_by": a.created_by,
            "creator_name": a.creator.full_name if a.creator else "Unknown",
            "assignee_id": a.assignee_id,
            "assignee_name": a.assignee.full_name if a.assignee else "Unassigned",
            "type": a.type,
            "title": a.title,
            "notes": a.notes,
            "status": a.status,
            "outcome": a.outcome,
            "due_date": a.due_date,
            "completed_at": a.completed_at,
            "created_at": a.created_at,
            "updated_at": a.updated_at
        })
    return res

@router.post("", response_model=ActionResponse)
def create_action(
    action_in: ActionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == action_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    assignee_id = action_in.assignee_id or customer.assigned_rm_id or current_user.id
    
    action = RetentionAction(
        customer_id=action_in.customer_id,
        created_by=current_user.id,
        assignee_id=assignee_id,
        type=action_in.type,
        title=action_in.title,
        notes=action_in.notes,
        due_date=action_in.due_date,
        status="todo",
        outcome="pending"
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    
    return {
        "id": action.id,
        "customer_id": action.customer_id,
        "customer_name": f"{customer.surname or ''} ({customer.external_id})",
        "created_by": action.created_by,
        "creator_name": current_user.full_name,
        "assignee_id": action.assignee_id,
        "assignee_name": action.assignee.full_name if action.assignee else "Unassigned",
        "type": action.type,
        "title": action.title,
        "notes": action.notes,
        "status": action.status,
        "outcome": action.outcome,
        "due_date": action.due_date,
        "completed_at": action.completed_at,
        "created_at": action.created_at,
        "updated_at": action.updated_at
    }

@router.patch("/{id}/status", response_model=ActionResponse)
def update_action_status(
    id: str,
    status_in: ActionStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action = db.query(RetentionAction).filter(RetentionAction.id == id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    action.status = status_in.status
    if status_in.outcome:
        action.outcome = status_in.outcome
    if status_in.notes:
        action.notes = (action.notes or "") + f"\n[{datetime.now(timezone.utc).strftime('%Y-%m-%d')}]: {status_in.notes}"
        
    if status_in.status in ("done", "cancelled"):
        action.completed_at = datetime.now(timezone.utc)
        
    db.commit()
    db.refresh(action)
    
    return {
        "id": action.id,
        "customer_id": action.customer_id,
        "customer_name": f"{action.customer.surname or ''} ({action.customer.external_id})" if action.customer else "",
        "created_by": action.created_by,
        "creator_name": action.creator.full_name if action.creator else "",
        "assignee_id": action.assignee_id,
        "assignee_name": action.assignee.full_name if action.assignee else "",
        "type": action.type,
        "title": action.title,
        "notes": action.notes,
        "status": action.status,
        "outcome": action.outcome,
        "due_date": action.due_date,
        "completed_at": action.completed_at,
        "created_at": action.created_at,
        "updated_at": action.updated_at
    }
