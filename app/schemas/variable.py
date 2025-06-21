from pydantic import BaseModel, Field
from typing import Optional, Any, List, Literal
from app.models.variable import VariableTypeEnum

class VariableBase(BaseModel):
    name: str = Field(..., pattern=r"^[a-zA-Z_][a-zA-Z0-9_]*$", description="Variable name, valid Python identifier format.")
    description: Optional[str] = None

class VariableCreate(VariableBase):
    type: VariableTypeEnum
    sequence_id: int
    value_json: Optional[Dict[str, Any]] = Field(default=None, description="For GLOBAL: {'value': ...}. For INPUT: {'default': ..., 'type_hint': 'str'}")

class VariableUpdate(BaseModel):
    name: Optional[str] = Field(default=None, pattern=r"^[a-zA-Z_][a-zA-Z0-9_]*$")
    description: Optional[str] = None
    value_json: Optional[Dict[str, Any]] = None
    # Type and sequence_id are generally not updatable for an existing variable.

class VariableRead(VariableBase):
    id: int
    type: VariableTypeEnum
    sequence_id: int
    value_json: Optional[Dict[str, Any]] = None
    class Config:
        from_attributes = True

# Schema for the /available-variables endpoint
class AvailableVariable(BaseModel):
    name: str
    type: Literal["global", "input", "global_list", "block_output", "list_output", "matrix_output"]
    source: str # e.g., "Global Variable", "Block: <block_name>", "Global List: <list_name>"
    description: Optional[str] = None
    # For lists/matrices, you might want to include item structure or dimensions if known
    # item_type: Optional[str] = None # e.g. "string", "number" for list items
    # dimensions: Optional[Tuple[int, int]] = None # For matrices
