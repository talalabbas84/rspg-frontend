from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api import deps
from app.db import models # Import your models module
from app.schemas import sequence as sequence_schema # Alias to avoid conflict
from app.crud import crud_sequence
from app.db.session import get_db

router = APIRouter()

@router.post("/", response_model=sequence_schema.SequenceRead, status_code=status.HTTP_201_CREATED)
async def create_sequence(
    sequence_in: sequence_schema.SequenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    # Check for duplicate sequence name for the same user
    # existing_sequence = await db.execute(
    #     select(models.Sequence).filter(models.Sequence.name == sequence_in.name, models.Sequence.user_id == current_user.id)
    # )
    # if existing_sequence.scalars().first():
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sequence name already exists for this user.")
        
    created_seq = await crud_sequence.create_with_owner(db=db, obj_in=sequence_in, user_id=current_user.id)
    # Eagerly load relationships for the response if not done by default in CRUD or schema
    return await crud_sequence.get_by_id_and_owner(db, id=created_seq.id, user_id=current_user.id)


@router.get("/", response_model=List[sequence_schema.SequenceRead])
async def read_sequences(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_active_user)
):
    sequences = await crud_sequence.get_multi_by_owner(db, user_id=current_user.id, skip=skip, limit=limit)
    return sequences

@router.get("/{sequence_id}", response_model=sequence_schema.SequenceRead)
async def read_sequence(
    sequence: models.Sequence = Depends(deps.get_sequence_owner_check) # Uses the dependency for check
):
    # The dependency already fetches and validates the sequence
    return sequence

@router.put("/{sequence_id}", response_model=sequence_schema.SequenceRead)
async def update_sequence(
    sequence_id: int, # Keep sequence_id for clarity, though dependency provides sequence object
    sequence_in: sequence_schema.SequenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_sequence: models.Sequence = Depends(deps.get_sequence_owner_check) # Ensures ownership
):
    # Check for duplicate name if name is being updated
    # if sequence_in.name and sequence_in.name != current_sequence.name:
    #     existing_sequence = await db.execute(
    #         select(models.Sequence).filter(models.Sequence.name == sequence_in.name, models.Sequence.user_id == current_sequence.user_id)
    #     )
    #     if existing_sequence.scalars().first():
    #         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sequence name already exists for this user.")

    updated_sequence = await crud_sequence.update(db, db_obj=current_sequence, obj_in=sequence_in)
    return await crud_sequence.get_by_id_and_owner(db, id=updated_sequence.id, user_id=current_sequence.user_id)


@router.delete("/{sequence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sequence(
    db: AsyncSession = Depends(get_db),
    current_sequence: models.Sequence = Depends(deps.get_sequence_owner_check) # Ensures ownership
):
    await crud_sequence.remove(db, id=current_sequence.id)
    return # No content response
