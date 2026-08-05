from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.database import get_db
from app.models import User

bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_access_token(user: User) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({"sub": str(user.id), "org": user.organization_id, "role": user.role, "exp": expires}, settings.secret_key, algorithm="HS256")

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
    except Exception as exc:
        raise HTTPException(401, "Invalid or expired token") from exc

def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials:
        raise HTTPException(401, "Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, get_settings().secret_key, algorithms=["HS256"])
        user = db.get(User, int(payload["sub"]))
    except Exception as exc:
        raise HTTPException(401, "Invalid or expired token") from exc
    if not user or not user.is_active:
        raise HTTPException(401, "Inactive user")
    return user

def require_operator(user: User = Depends(get_current_user)) -> User:
    if user.role not in {"admin", "operator"}:
        raise HTTPException(403, "Operator role required")
    return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Admin role required")
    return user

def bootstrap_identity(db: Session) -> None:
    from app.models import Device, Organization
    organization = db.query(Organization).filter_by(name="NetScope Demo").first()
    if not organization:
        organization = Organization(name="NetScope Demo"); db.add(organization); db.flush()
    if not db.query(User).filter_by(email="admin@netscope.local").first():
        db.add(User(organization_id=organization.id, email="admin@netscope.local", password_hash=hash_password("admin"), display_name="NOC Admin", role="admin"))
    db.query(Device).filter(Device.organization_id.is_(None)).update({Device.organization_id: organization.id})
    db.commit()
