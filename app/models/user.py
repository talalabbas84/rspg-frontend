from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base # Use the Base from app.db

class User(Base):
    # 'id' is inherited from Base
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    sequences = relationship("Sequence", back_populates="owner", cascade="all, delete-orphan")
    global_lists = relationship("GlobalList", back_populates="owner", cascade="all, delete-orphan")
