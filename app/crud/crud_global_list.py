from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_

from app.crud.base import CRUDBase
from app.models.global_list import GlobalList, GlobalListItem
from app.schemas.global_list import GlobalListCreate, GlobalListUpdate, GlobalListItemCreate

class CRUDGlobalList(CRUDBase[GlobalList, GlobalListCreate, GlobalListUpdate]):
    async def create_with_owner(
        self, db: AsyncSession, *, obj_in: GlobalListCreate, user_id: int
    ) -> GlobalList:
        # Pydantic V2
        obj_in_data = obj_in.model_dump()
        # Pydantic V1
        # obj_in_data = obj_in.dict()
        db_obj = self.model(**obj_in_data, user_id=user_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_multi_by_owner(
        self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[GlobalList]:
        result = await db.execute(
            select(self.model)
            .filter(GlobalList.user_id == user_id)
            .options(selectinload(GlobalList.items)) # Eager load items
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_id_and_owner(
        self, db: AsyncSession, *, id: int, user_id: int
    ) -> Optional[GlobalList]:
        result = await db.execute(
            select(self.model)
            .filter(and_(GlobalList.id == id, GlobalList.user_id == user_id))
            .options(selectinload(GlobalList.items)) # Eager load items
        )
        return result.scalars().first()

    # --- Global List Item CRUD ---
    async def add_item_to_list(
        self, db: AsyncSession, *, global_list_id: int, item_in: GlobalListItemCreate
    ) -> GlobalListItem:
        # Pydantic V2
        item_data = item_in.model_dump()
        # Pydantic V1
        # item_data = item_in.dict()
        db_item = GlobalListItem(**item_data, global_list_id=global_list_id)
        db.add(db_item)
        await db.commit()
        await db.refresh(db_item)
        return db_item

    async def get_item(self, db: AsyncSession, item_id: int) -> Optional[GlobalListItem]:
        result = await db.execute(select(GlobalListItem).filter(GlobalListItem.id == item_id))
        return result.scalars().first()

    async def update_item(
        self, db: AsyncSession, *, db_item: GlobalListItem, item_in_data: dict
    ) -> GlobalListItem:
        for field, value in item_in_data.items():
            setattr(db_item, field, value)
        db.add(db_item)
        await db.commit()
        await db.refresh(db_item)
        return db_item
    
    async def remove_item(self, db: AsyncSession, *, item_id: int) -> Optional[GlobalListItem]:
        item = await self.get_item(db, item_id=item_id)
        if item:
            await db.delete(item)
            await db.commit()
        return item

global_list = CRUDGlobalList(GlobalList)
