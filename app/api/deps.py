from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_access_token # TokenPayload is defined in security.py
from app.crud import crud_user
from app.db.models import User # Import your User model
from app.db.session import get_db # Your async db session getter

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login" # Correct path to your login endpoint
)

async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_data = decode_access_token(token)
    if not token_data or not token_data.sub:
        raise credentials_exception
    
    user = await crud_user.get_by_email(db, email=token_data.sub)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

# Dependency to check if current user owns a sequence
async def get_sequence_owner_check(
    sequence_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> models.Sequence: # Return the sequence if owned
    from app.crud import crud_sequence # Local import to avoid circular dependency
    sequence = await crud_sequence.get_by_id_and_owner(db, id=sequence_id, user_id=current_user.id)
    if not sequence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sequence not found or not owned by user")
    return sequence

# Dependency to check if current user owns a global list
async def get_global_list_owner_check(
    global_list_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> models.GlobalList:
    from app.crud import crud_global_list # Local import
    glist = await crud_global_list.get_by_id_and_owner(db, id=global_list_id, user_id=current_user.id)
    if not glist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Global list not found or not owned by user")
    return glist
