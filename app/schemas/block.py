from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from app.models.block import BlockTypeEnum # Import Enum from models

# --- Block Config Schemas ---
# These define the expected structure of `config_json` for each block type

class BlockConfigBase(BaseModel):
    prompt: Optional[str] = None # Common to most blocks

class BlockConfigStandard(BlockConfigBase):
    output_variable_name: str = Field(default="output", description="Name of the variable to store the LLM output")

class BlockConfigDiscretization(BlockConfigBase):
    prompt: str = Field(..., description="Prompt for the LLM, expected to guide structured output.")
    output_names: List[str] = Field(..., min_length=1, description="List of names for the discretized output variables.")

class BlockConfigSingleList(BlockConfigBase):
    prompt: str = Field(..., description="Prompt template to be applied to each item in the input list. Use '{{item}}' for the current list item.")
    input_list_variable_name: str = Field(..., description="Name of the global list or variable (which should be a list) to iterate over.")
    output_list_variable_name: Optional[str] = Field(default=None, description="Name for the new list variable containing results. Auto-generated if None.")

class BlockConfigMultiListInput(BaseModel):
    name: str = Field(..., description="Name of the global list or variable (which should be a list).")
    priority: int = Field(default=1, ge=1, description="Priority for looping. Lower numbers are higher priority. Lists with same priority are iterated in parallel.")
    # item_placeholder: str = Field(default="item", description="Placeholder name for items from this list in the prompt, e.g., {{claims_item}}")

class BlockConfigMultiList(BlockConfigBase):
    prompt: str = Field(..., description="Prompt template. Use placeholders like '{{item_listA}}', '{{item_listB}}' for current items from respective lists.")
    input_lists_config: List[BlockConfigMultiListInput] = Field(..., min_length=1, description="Configuration for input lists, including names and priorities.")
    output_matrix_variable_name: Optional[str] = Field(default=None, description="Name for the new matrix (list of lists) variable. Auto-generated if None.")


# --- Main Block Schemas ---
class BlockBase(BaseModel):
    name: str = Field(default="Untitled Block", min_length=1)
    type: BlockTypeEnum
    order: int = Field(default=0, ge=0)
    # config_json will hold one of the BlockConfig... models as a dict
    config_json: Union[BlockConfigStandard, BlockConfigDiscretization, BlockConfigSingleList, BlockConfigMultiList, Dict[str, Any]]

    @field_validator('config_json', mode='before')
    @classmethod
    def validate_config_json_type(cls, v: Any, values: dict) -> Dict[str, Any]:
        # This validator ensures that the config_json matches the block type
        # It's a bit complex to do perfectly here without Pydantic's discriminated unions fully applied
        # For now, we assume the frontend sends a correctly structured dict.
        # More advanced validation can be done in the route or service layer.
        block_type = values.data.get('type')
        if block_type == BlockTypeEnum.STANDARD:
            return BlockConfigStandard(**v if isinstance(v, dict) else {}).model_dump()
        elif block_type == BlockTypeEnum.DISCRETIZATION:
            return BlockConfigDiscretization(**v if isinstance(v, dict) else {}).model_dump()
        elif block_type == BlockTypeEnum.SINGLE_LIST:
            return BlockConfigSingleList(**v if isinstance(v, dict) else {}).model_dump()
        elif block_type == BlockTypeEnum.MULTI_LIST:
            return BlockConfigMultiList(**v if isinstance(v, dict) else {}).model_dump()
        return v if isinstance(v, dict) else {}


class BlockCreate(BlockBase):
    sequence_id: int

class BlockUpdate(BaseModel): # For PATCH, all fields are optional
    name: Optional[str] = Field(default=None, min_length=1)
    # type: Optional[BlockTypeEnum] = None # Type change might be complex, usually not allowed or handled carefully
    order: Optional[int] = Field(default=None, ge=0)
    config_json: Optional[Union[BlockConfigStandard, BlockConfigDiscretization, BlockConfigSingleList, BlockConfigMultiList, Dict[str, Any]]] = None

    @field_validator('config_json', mode='before')
    @classmethod
    def validate_update_config_json(cls, v: Any, values: dict) -> Optional[Dict[str, Any]]:
        if v is None:
            return None
        # For updates, we don't know the block type beforehand from `values` easily.
        # Assume the incoming dict `v` is already structured correctly for its intended type.
        # The service layer should handle type-specific config updates carefully.
        return v if isinstance(v, dict) else {}


class BlockRead(BlockBase):
    id: int
    sequence_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True
