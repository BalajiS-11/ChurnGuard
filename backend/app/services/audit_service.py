from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request
from backend.app.db.models import AuditLog

def log_audit_event(
    db: Session,
    action: str,
    user_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    metadata_json: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None
):
    ip_addr = None
    ua = None
    if request:
        ip_addr = request.client.host if request.client else None
        ua = request.headers.get("user-agent")
        
    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        metadata_json=metadata_json,
        ip_address=ip_addr,
        user_agent=ua
    )
    db.add(audit_entry)
    db.commit()
