from sqlalchemy import Column, Integer, String, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class GlobalList(Base): # User-managed lists of items
    # 'id' is inherited from Base
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="global_lists")
    items = relationship("GlobalListItem", back_populates="global_list", cascade="all, delete-orphan", order_by="GlobalListItem.order")
    __table_args__ = (UniqueConstraint('name', 'user_id', name='_user_globallist_name_uc'),)

class GlobalListItem(Base):
    # 'id' is inherited from Base
    value = Column(Text, nullable=False) # The actual string item
    order = Column(Integer, nullable=False, default=0) # For maintaining order in the list
    global_list_id = Column(Integer, ForeignKey("globallists.id"), nullable=False)

    global_list = relationship("GlobalList", back_populates="items")
