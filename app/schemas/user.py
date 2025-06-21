from pydantic import BaseModel, EmailStr
from typing import Optional

# Shared properties
class UserBase(BaseModel):
    email: EmailStr
    is_active: Optional[bool] = True

# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str

# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None
    is_active: Optional[bool] = None

# Properties stored in DB
class UserInDBBase(UserBase):
    id: int
    hashed_password: str
    class Config:
        from_attributes = True # Pydantic V2
        # orm_mode = True # Pydantic V1

# Additional properties to return via API
class UserRead(UserBase):
    id: int
    class Config:
        from_attributes = True
