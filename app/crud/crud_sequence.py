from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.sequence import Sequence
from app.schemas.sequence import SequenceCreate, SequenceUpdate

class CRUDSequence(CRUDBase[Sequence, SequenceCreate, SequenceUpdate]):
    async def create_with_owner(
        self, db: AsyncSession, *, obj_in: SequenceCreate, user_id: int
    ) -> Sequence:
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
    ) -> List[Sequence]:
        result = await db.execute(
            select(self.model)
            .filter(Sequence.user_id == user_id)
            .offset(skip)
            .limit(limit)
            .options(selectinload(Sequence.blocks), selectinload(Sequence.variables)) # Eager load related
        )
        return result.scalars().all()

    async def get_by_id_and_owner(
        self, db: AsyncSession, *, id: int, user_id: int
    ) -> Optional[Sequence]:
        result = await db.execute(
            select(self.model)
            .filter(Sequence.id == id, Sequence.user_id == user_id)
            .options(selectinload(Sequence.blocks), selectinload(Sequence.variables)) # Eager load related
        )
        return result.scalars().first()

sequence = CRUDSequence(Sequence)
