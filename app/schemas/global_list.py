from pydantic import BaseModel, Field
from typing import Optional, List

# --- Global List Item Schemas ---
class GlobalListItemBase(BaseModel):
    value: str
    order: int = Field(default=0, ge=0)

class GlobalListItemCreate(GlobalListItemBase):
    pass # global_list_id will be set by path or parent

class GlobalListItemRead(GlobalListItemBase):
    id: int
    global_list_id: int
    class Config:
        from_attributes = True

# --- Global List Schemas ---
class GlobalListBase(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None

class GlobalListCreate(GlobalListBase):
    # items: Optional[List[GlobalListItemCreate]] = [] # Allow creating items along with the list
    pass

class GlobalListUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = None
    # items: Optional[List[GlobalListItemCreate]] = None # For replacing all items

class GlobalListRead(GlobalListBase):
    id: int
    user_id: int
    items: List[GlobalListItemRead] = []
    class Config:
        from_attributes = True
