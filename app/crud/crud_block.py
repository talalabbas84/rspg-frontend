from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.crud.base import CRUDBase
from app.models.block import Block
from app.schemas.block import BlockCreate, BlockUpdate

class CRUDBlock(CRUDBase[Block, BlockCreate, BlockUpdate]):
    async def create_with_sequence( # Renamed for clarity
        self, db: AsyncSession, *, obj_in: BlockCreate # sequence_id is in BlockCreate
    ) -> Block:
        # Pydantic V2
        obj_in_data = obj_in.model_dump()
        # Pydantic V1
        # obj_in_data = obj_in.dict()
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_multi_by_sequence(
        self, db: AsyncSession, *, sequence_id: int, skip: int = 0, limit: int = 1000 # High limit for blocks
    ) -> List[Block]:
        result = await db.execute(
            select(self.model)
            .filter(Block.sequence_id == sequence_id)
            .order_by(Block.order) # Ensure blocks are ordered
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_id_and_sequence( # For ownership check via sequence
        self, db: AsyncSession, *, id: int, sequence_id: int
    ) -> Optional[Block]:
        result = await db.execute(
            select(self.model).filter(and_(Block.id == id, Block.sequence_id == sequence_id))
        )
        return result.scalars().first()

block = CRUDBlock(Block)
