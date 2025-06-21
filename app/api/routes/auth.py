from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.token import Token
from app.schemas.user import UserCreate, UserRead
from app.crud import crud_user
from app.core.security import create_access_token
from app.db.session import get_db
from app.api import deps # For get_current_active_user

router = APIRouter()

@router.post("/register", response_model=UserRead)
async def register_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    user = await crud_user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system.",
        )
    user = await crud_user.create(db, obj_in=user_in)
    return user

@router.post("/login", response_model=Token)
async def login_for_access_token(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    user = await crud_user.authenticate(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    
    access_token = create_access_token(subject=user.email) # Use email as subject
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserRead)
async def read_users_me(
    current_user: models.User = Depends(deps.get_current_active_user)
):
    return current_user
