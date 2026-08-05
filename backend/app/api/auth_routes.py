from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.auth import create_access_token, get_current_user, hash_password, require_admin, verify_password
from app.core.database import get_db
from app.models import User
from app.schemas.auth import LoginIn, TokenOut, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

def user_out(user: User) -> UserOut:
    return UserOut(id=user.id, organization_id=user.organization_id, email=user.email, display_name=user.display_name, role=user.role)

@router.post("/login", response_model=TokenOut, response_model_by_alias=True)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return TokenOut(access_token=create_access_token(user), user=user_out(user))

@router.get("/me", response_model=UserOut, response_model_by_alias=True)
def me(user: User = Depends(get_current_user)):
    return user_out(user)

@router.get("/users", response_model=list[UserOut], response_model_by_alias=True)
def users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [user_out(item) for item in db.query(User).filter(User.organization_id == admin.organization_id).order_by(User.display_name)]

@router.post("/users", response_model=UserOut, response_model_by_alias=True, status_code=201)
def create_user(payload: UserCreate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(409, "Email already registered")
    item = User(organization_id=admin.organization_id, email=payload.email.lower(), password_hash=hash_password(payload.password), display_name=payload.display_name, role=payload.role)
    db.add(item); db.commit(); db.refresh(item)
    return user_out(item)
