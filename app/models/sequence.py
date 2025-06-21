from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Sequence(Base):
    # 'id' is inherited from Base
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Ensure tablename 'users'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    owner = relationship("User", back_populates="sequences")
    blocks = relationship("Block", back_populates="sequence", cascade="all, delete-orphan", order_by="Block.order")
    variables = relationship("Variable", back_populates="sequence", cascade="all, delete-orphan")
    runs = relationship("Run", back_populates="sequence", cascade="all, delete-orphan")
