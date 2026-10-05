from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from backend.app.core.deps import get_db, get_current_user
from backend.app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from backend.app.core.config import settings
from backend.app.db.models import User, RefreshToken
from backend.app.schemas.schemas import LoginRequest, Token, RefreshRequest, UserResponse
from backend.app.services.audit_service import log_audit_event

router = APIRouter()

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    user.last_login_at = datetime.now(timezone.utc)
    
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id)
    
    # Store refresh token record
    rf_record = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token[-20:],
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(rf_record)
    db.commit()
    
    log_audit_event(db, "login", user_id=user.id, entity_type="user", entity_id=user.id, request=request)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "avatar_url": user.avatar_url,
            "preferences": user.preferences
        }
    }

@router.post("/refresh")
def refresh(refresh_data: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(refresh_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
    new_access_token = create_access_token(subject=user.id, role=user.role)
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Revoke all active refresh tokens for user
    db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id).update({"revoked": True})
    db.commit()
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
