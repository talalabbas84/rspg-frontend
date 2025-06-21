from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.crud.base import CRUDBase
from app.models.variable import Variable
from app.schemas.variable import VariableCreate, VariableUpdate

class CRUDVariable(CRUDBase[Variable, VariableCreate, VariableUpdate]):
    async def create_with_sequence( # Renamed for clarity
        self, db: AsyncSession, *, obj_in: VariableCreate # sequence_id is in VariableCreate
    ) -> Variable:
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
        self, db: AsyncSession, *, sequence_id: int, skip: int = 0, limit: int = 100
    ) -> List[Variable]:
        result = await db.execute(
            select(self.model)
            .filter(Variable.sequence_id == sequence_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_id_and_sequence(
        self, db: AsyncSession, *, id: int, sequence_id: int
    ) -> Optional[Variable]:
        result = await db.execute(
            select(self.model).filter(and_(Variable.id == id, Variable.sequence_id == sequence_id))
        )
        return result.scalars().first()
    
    async def get_by_name_and_sequence(
        self, db: AsyncSession, *, name: str, sequence_id: int
    ) -> Optional[Variable]:
        result = await db.execute(
            select(self.model).filter(and_(Variable.name == name, Variable.sequence_id == sequence_id))
        )
        return result.scalars().first()

variable = CRUDVariable(Variable)
