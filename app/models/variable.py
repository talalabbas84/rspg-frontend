import enum
from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Text, Enum as SQLAlchemyEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class VariableTypeEnum(str, enum.Enum):
    GLOBAL = "global"       # User-defined single value, available throughout sequence
    INPUT = "input"         # Expected at runtime for the sequence
    # Note: Block outputs, list outputs, matrix outputs are conceptual types for the frontend/engine,
    # not stored as distinct Variable types in DB. They are results of BlockRuns.
    # Global Lists are handled by the GlobalList model.

class Variable(Base): # Represents user-defined global or input variables
    # 'id' is inherited from Base
    name = Column(String, nullable=False)
    type = Column(SQLAlchemyEnum(VariableTypeEnum), nullable=False)
    sequence_id = Column(Integer, ForeignKey("sequences.id"), nullable=False)
    # For GLOBAL type, value_json stores the actual value.
    # For INPUT type, value_json might store a default, description, or type hint.
    value_json = Column(JSON, nullable=True) # e.g., {"value": "some_string"} or {"default": 123, "type": "integer"}
    description = Column(Text, nullable=True)

    sequence = relationship("Sequence", back_populates="variables")
    __table_args__ = (UniqueConstraint('name', 'sequence_id', name='_sequence_variable_name_uc'),)
