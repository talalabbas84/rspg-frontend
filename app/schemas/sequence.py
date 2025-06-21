from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .block import BlockRead # Import related schemas
from .variable import VariableRead

class SequenceBase(BaseModel):
    name: str
    description: Optional[str] = None

class SequenceCreate(SequenceBase):
    pass

class SequenceUpdate(SequenceBase):
    name: Optional[str] = None # All fields optional for PATCH

class SequenceRead(SequenceBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Optionally include related objects when reading a sequence
    blocks: List[BlockRead] = []
    variables: List[VariableRead] = []
    class Config:
        from_attributes = True
