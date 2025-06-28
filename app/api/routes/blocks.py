from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api import deps
from app.db import models
from app.schemas import block as block_schema
from app.crud import crud_block, crud_sequence
from app.db.session import get_db

router = APIRouter()

# Dependency to get and check ownership of the parent sequence for a block operation
async def get_parent_sequence_for_block(
    sequence_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
) -> models.Sequence:
    sequence = await crud_sequence.get_by_id_and_owner(db, id=sequence_id, user_id=current_user.id)
    if not sequence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent sequence not found or not owned by user")
    return sequence

@router.post("/", response_model=block_schema.BlockRead, status_code=status.HTTP_201_CREATED)
async def create_block(
    block_in: block_schema.BlockCreate, # sequence_id is part of BlockCreate
    db: AsyncSession = Depends(get_db),
    # Ensure the user owns the sequence they are adding a block to
    parent_sequence: models.Sequence = Depends(get_parent_sequence_for_block) # Uses sequence_id from block_in
):
    # block_in already contains sequence_id, which is validated by get_parent_sequence_for_block
    # if block_in.sequence_id != parent_sequence.id: # Should not happen if dependency works
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Block's sequence_id mismatch.")
    
    created_block = await crud_block.create(db=db, obj_in=block_in) # Use generic create
    return created_block


@router.get("/in_sequence/{sequence_id}", response_model=List[block_schema.BlockRead])
async def read_blocks_for_sequence(
    parent_sequence: models.Sequence = Depends(get_parent_sequence_for_block), # Validates sequence ownership
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 1000 # Usually fetch all blocks for a sequence
):
    blocks = await crud_block.get_multi_by_sequence(db, sequence_id=parent_sequence.id, skip=skip, limit=limit)
    return blocks

@router.get("/{block_id}", response_model=block_schema.BlockRead)
async def read_block(
    block_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    block = await crud_block.get(db, id=block_id)
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
    # Check ownership by fetching parent sequence
    parent_sequence = await crud_sequence.get_by_id_and_owner(db, id=block.sequence_id, user_id=current_user.id)
    if not parent_sequence:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this block")
    return block

@router.put("/{block_id}", response_model=block_schema.BlockRead)
async def update_block(
    block_id: int,
    block_in: block_schema.BlockUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    db_block = await crud_block.get(db, id=block_id)
    if not db_block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
    
    parent_sequence = await crud_sequence.get_by_id_and_owner(db, id=db_block.sequence_id, user_id=current_user.id)
    if not parent_sequence:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this block")

    # If block type is part of update, handle config_json revalidation carefully
    # For now, assuming type is not changed or frontend sends valid config for existing type
    
    updated_block = await crud_block.update(db, db_obj=db_block, obj_in=block_in)
    return updated_block

@router.delete("/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_block(
    block_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    db_block = await crud_block.get(db, id=block_id)
    if not db_block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")

    parent_sequence = await crud_sequence.get_by_id_and_owner(db, id=db_block.sequence_id, user_id=current_user.id)
    if not parent_sequence:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this block")
        
    await crud_block.remove(db, id=block_id)
    return
