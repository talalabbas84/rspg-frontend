from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.run import RunStatusEnum
from .block import BlockRead # For block snapshot

class RunBase(BaseModel):
    sequence_id: int
    input_overrides_json: Optional[Dict[str, Any]] = Field(default=None, description="Runtime input values overriding sequence defaults.")

class RunCreate(RunBase):
    pass # Status will be set by backend

class RunUpdate(BaseModel): # For updating status, results by the execution engine
    status: Optional[RunStatusEnum] = None
    results_summary_json: Optional[Dict[str, Any]] = None
    completed_at: Optional[datetime] = None


class BlockRunBase(BaseModel):
    block_id: int
    status: RunStatusEnum = RunStatusEnum.PENDING
    prompt_text: Optional[str] = None
    llm_output_text: Optional[str] = None
    named_outputs_json: Optional[Dict[str, Any]] = None
    list_outputs_json: Optional[Dict[str, Any]] = None # e.g. {"values": [...]}
    matrix_outputs_json: Optional[Dict[str, Any]] = None # e.g. {"values": [[...],[...]]}
    error_message: Optional[str] = None
    token_usage_json: Optional[Dict[str, int]] = None # e.g. {"prompt_tokens": X, "completion_tokens": Y}
    cost: Optional[float] = None

class BlockRunCreate(BlockRunBase):
    run_id: int

class BlockRunRead(BlockRunBase):
    id: int
    run_id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    block_name_snapshot: Optional[str] = None
    block_type_snapshot: Optional[str] = None
    class Config:
        from_attributes = True

class BlockRunReadWithDetails(BlockRunRead):
    # block: Optional[BlockRead] = None # If you want to nest the full block details
    pass


class RunRead(RunBase):
    id: int
    user_id: int
    status: RunStatusEnum
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    results_summary_json: Optional[Dict[str, Any]] = None
    block_runs: List[BlockRunRead] = [] # Include block runs when reading a run
    class Config:
        from_attributes = True
