import enum
from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class BlockTypeEnum(str, enum.Enum):
    STANDARD = "standard"
    DISCRETIZATION = "discretization"
    SINGLE_LIST = "single_list"
    MULTI_LIST = "multi_list"

class Block(Base):
    # 'id' is inherited from Base
    name = Column(String, nullable=False, default="Untitled Block")
    type = Column(SQLAlchemyEnum(BlockTypeEnum), nullable=False)
    sequence_id = Column(Integer, ForeignKey("sequences.id"), nullable=False)
    order = Column(Integer, nullable=False, default=0)
    config_json = Column(JSON, nullable=False, default=lambda: {}) # Store block-specific config
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    sequence = relationship("Sequence", back_populates="blocks")
