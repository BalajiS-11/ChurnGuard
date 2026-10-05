from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_db, require_roles
from backend.app.core.security import get_password_hash
from backend.app.db.models import User, AuditLog, SystemSetting
from backend.app.schemas.schemas import UserResponse, UserCreate, UserUpdate, AuditLogResponse
from backend.app.services.audit_service import log_audit_event

router = APIRouter(dependencies=[Depends(require_roles("admin"))])

# User Management
@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.post("/users", response_model=UserResponse)
def create_user(user_in: UserCreate, current_admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
        
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=user_in.is_active,
        avatar_url=user_in.avatar_url,
        preferences=user_in.preferences or {"theme": "system"}
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_audit_event(db, "user_create", user_id=current_admin.id, entity_type="user", entity_id=user.id)
    return user

@router.patch("/users/{id}", response_model=UserResponse)
def update_user(id: str, user_in: UserUpdate, current_admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.role is not None:
        user.role = user_in.role
        log_audit_event(db, "role_change", user_id=current_admin.id, entity_type="user", entity_id=user.id, metadata_json={"new_role": user_in.role})
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.password is not None:
        user.password_hash = get_password_hash(user_in.password)
    if user_in.preferences is not None:
        user.preferences = user_in.preferences
        
    db.commit()
    db.refresh(user)
    return user

# Audit Log Viewer
@router.get("/audit", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = Query(50, ge=10, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
        
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    
    # Attach email
    res = []
    for l in logs:
        user = db.query(User).filter(User.id == l.user_id).first() if l.user_id else None
        res.append({
            "id": l.id,
            "user_id": l.user_id,
            "user_email": user.email if user else "system",
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "metadata_json": l.metadata_json,
            "ip_address": l.ip_address,
            "created_at": l.created_at
        })
    return res

# System Settings
@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    settings_records = db.query(SystemSetting).all()
    return {s.key: s.value for s in settings_records}

@router.post("/settings")
def update_setting(
    key: str,
    value: Dict[str, Any],
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        setting = SystemSetting(key=key, value=value, updated_by=current_admin.id)
        db.add(setting)
    else:
        setting.value = value
        setting.updated_by = current_admin.id
        
    db.commit()
    log_audit_event(db, "setting_update", user_id=current_admin.id, entity_type="system_setting", entity_id=key, metadata_json=value)
    return {"message": f"Setting '{key}' updated successfully"}
