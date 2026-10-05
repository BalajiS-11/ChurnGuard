from typing import Generator, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.security import decode_token
from backend.app.db.session import SessionLocal
from backend.app.db.models import User

security_scheme = HTTPBearer(auto_error=False)

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account is deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_roles(*allowed_roles: str):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}. Your role: {current_user.role}"
            )
        return current_user
    return role_checker

def mask_customer_pii(customer_dict: dict, user_role: str) -> dict:
    """
    Masks Surname and CustomerId for the analyst role.
    """
    if user_role == "analyst":
        # Mask surname e.g. H***e
        surname = customer_dict.get("surname")
        if surname and len(surname) > 2:
            customer_dict["surname"] = surname[0] + "***" + surname[-1]
        elif surname:
            customer_dict["surname"] = "***"
            
        # Mask external_id e.g. 156***02
        ext_id = str(customer_dict.get("external_id", ""))
        if len(ext_id) > 4:
            customer_dict["external_id"] = ext_id[:3] + "***" + ext_id[-2:]
        else:
            customer_dict["external_id"] = "***"
    return customer_dict
