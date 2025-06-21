from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import and_

from app.crud.base import CRUDBase
from app.models.run import Run, BlockRun
from app.schemas.run import RunCreate, RunUpdate, BlockRunCreate # BlockRunUpdate not strictly needed if only created

class CRUDRun(CRUDBase[Run, RunCreate, RunUpdate]):
    async def create_with_sequence_and_user(
        self, db: AsyncSession, *, obj_in: RunCreate, user_id: int # sequence_id is in RunCreate
    ) -> Run:
        # Pydantic V2
        obj_in_data = obj_in.model_dump()
        # Pydantic V1
        # obj_in_data = obj_in.dict()
        db_obj = self.model(**obj_in_data, user_id=user_id, status="pending") # Default status
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_multi_by_sequence_and_user(
        self, db: AsyncSession, *, sequence_id: int, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Run]:
        result = await db.execute(
            select(self.model)
            .filter(and_(Run.sequence_id == sequence_id, Run.user_id == user_id))
            .options(selectinload(Run.block_runs).options(joinedload(BlockRun.block))) # Eager load block_runs and their blocks
            .order_by(Run.started_at.desc().nullslast(), Run.id.desc()) # Show recent first
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_id_and_user(
        self, db: AsyncSession, *, id: int, user_id: int
    ) -> Optional[Run]:
        result = await db.execute(
            select(self.model)
            .filter(and_(Run.id == id, Run.user_id == user_id))
            .options(selectinload(Run.block_runs).options(joinedload(BlockRun.block))) # Eager load
        )
        return result.scalars().first()

    # --- BlockRun specific methods ---
    async def create_block_run(self, db: AsyncSession, *, obj_in: BlockRunCreate) -> BlockRun:
        # Pydantic V2
        obj_in_data = obj_in.model_dump()
        # Pydantic V1
        # obj_in_data = obj_in.dict()
        db_obj = BlockRun(**obj_in_data)
        db.add(db_obj)
        # Commit might be handled by the calling function (e.g., execute_sequence)
        # await db.commit()
        # await db.refresh(db_obj)
        return db_obj # Return uncommitted object if part of a larger transaction

    async def get_block_runs_for_run(self, db: AsyncSession, *, run_id: int) -> List[BlockRun]:
        result = await db.execute(
            select(BlockRun)
            .filter(BlockRun.run_id == run_id)
            .options(joinedload(BlockRun.block)) # Eager load block details
            .order_by(BlockRun.started_at.asc().nullsfirst(), BlockRun.id.asc())
        )
        return result.scalars().all()

run = CRUDRun(Run)
