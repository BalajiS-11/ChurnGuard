from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.deps import get_db, get_current_user
from backend.app.db.models import User, Notification
from backend.app.schemas.schemas import NotificationResponse

router = APIRouter()

@router.get("", response_model=List[NotificationResponse])
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(30)
        .all()
    )
    return notifs

@router.patch("/{id}/read", response_model=NotificationResponse)
def mark_notification_read(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(Notification.id == id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(Notification.user_id == current_user.id).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
