from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import ValidationError, BaseModel

from app.core.config import settings

# Define TokenPayload schema directly here or import if it's in schemas/token.py
class TokenPayload(BaseModel):
    sub: str | None = None
    exp: datetime | None = None

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = settings.ALGORITHM
SECRET_KEY = settings.SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

def create_access_token(subject: Union[str, Any], expires_delta: timedelta | None = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def decode_access_token(token: str) -> TokenPayload | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Manually create datetime object for 'exp' if it's a timestamp
        if 'exp' in payload and isinstance(payload['exp'], (int, float)):
            payload['exp'] = datetime.fromtimestamp(payload['exp'], tz=timezone.utc)
            
        token_data = TokenPayload(**payload)
        if token_data.exp and token_data.exp < datetime.now(timezone.utc):
            return None # Token expired
        return token_data
    except (JWTError, ValidationError, TypeError): # Added TypeError for timestamp conversion issues
        return None
