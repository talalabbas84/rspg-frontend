import enum
from sqlalchemy import Column, Integer, ForeignKey, JSON, DateTime, Text, Enum as SQLAlchemyEnum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class RunStatusEnum(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled" # If you implement cancellation

class Run(Base):
    # 'id' is inherited from Base
    sequence_id = Column(Integer, ForeignKey("sequences.id"), nullable=False)
    # user_id can be derived from sequence.user_id, but denormalizing can be useful for queries
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(SQLAlchemyEnum(RunStatusEnum), nullable=False, default=RunStatusEnum.PENDING)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    input_overrides_json = Column(JSON, nullable=True) # Store any runtime inputs used for this run
    results_summary_json = Column(JSON, nullable=True) # Optional: store final outputs or overall summary

    sequence = relationship("Sequence", back_populates="runs")
    owner = relationship("User") # Relationship to User
    block_runs = relationship("BlockRun", back_populates="run", cascade="all, delete-orphan", order_by="BlockRun.started_at")

class BlockRun(Base):
    # 'id' is inherited from Base
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=False) # Original block_id
    block_name_snapshot = Column(String, nullable=True) # Snapshot of block name at execution time
    block_type_snapshot = Column(String, nullable=True) # Snapshot of block type

    status = Column(SQLAlchemyEnum(RunStatusEnum), nullable=False, default=RunStatusEnum.PENDING)
    prompt_text = Column(Text, nullable=True) # The actual prompt sent to LLM
    llm_output_text = Column(Text, nullable=True) # Raw LLM output

    # Specific output structures based on block type
    named_outputs_json = Column(JSON, nullable=True) # For discretization blocks: {"name1": "val1", ...}
    list_outputs_json = Column(JSON, nullable=True)  # For single list blocks: {"values": ["item1_out", ...]}
    matrix_outputs_json = Column(JSON, nullable=True)# For multi list blocks: {"values": [["r1c1", "r1c2"], ...]}
    
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    token_usage_json = Column(JSON, nullable=True) # e.g., {'prompt_tokens': X, 'completion_tokens': Y}
    cost = Column(Float, nullable=True) # Cost of this specific block run

    run = relationship("Run", back_populates="block_runs")
    block = relationship("Block") # Relationship to the Block model (can be null if block deleted)
