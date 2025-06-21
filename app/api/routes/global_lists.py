from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api import deps
from app.db import models
from app.schemas import global_list as gl_schema
from app.crud import crud_global_list
from app.db.session import get_db

router = APIRouter()

@router.post("/", response_model=gl_schema.GlobalListRead, status_code=status.HTTP_201_CREATED)
async def create_global_list(
    list_in: gl_schema.GlobalListCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    # Check for duplicate name for this user
    # existing_list = await db.execute(
    #     select(models.GlobalList).filter(models.GlobalList.name == list_in.name, models.GlobalList.user_id == current_user.id)
    # )
    # if existing_list.scalars().first():
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Global list name already exists.")
        
    created_list = await crud_global_list.create_with_owner(db=db, obj_in=list_in, user_id=current_user.id)
    return await crud_global_list.get_by_id_and_owner(db, id=created_list.id, user_id=current_user.id) # To include items if schema expects

@router.get("/", response_model=List[gl_schema.GlobalListRead])
async def read_global_lists(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_active_user)
):
    lists = await crud_global_list.get_multi_by_owner(db, user_id=current_user.id, skip=skip, limit=limit)
    return lists

@router.get("/{global_list_id}", response_model=gl_schema.GlobalListRead)
async def read_global_list(
    global_list: models.GlobalList = Depends(deps.get_global_list_owner_check) # Dependency handles fetch and ownership
):
    return global_list

@router.put("/{global_list_id}", response_model=gl_schema.GlobalListRead)
async def update_global_list(
    global_list_id: int, # For clarity, though dependency provides the object
    list_in: gl_schema.GlobalListUpdate,
    db: AsyncSession = Depends(get_db),
    current_global_list: models.GlobalList = Depends(deps.get_global_list_owner_check)
):
    updated_list = await crud_global_list.update(db, db_obj=current_global_list, obj_in=list_in)
    return await crud_global_list.get_by_id_and_owner(db, id=updated_list.id, user_id=current_global_list.user_id)

@router.delete("/{global_list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_global_list(
    current_global_list: models.GlobalList = Depends(deps.get_global_list_owner_check),
    db: AsyncSession = Depends(get_db)
):
    await crud_global_list.remove(db, id=current_global_list.id)
    return

# --- Global List Items ---

@router.post("/{global_list_id}/items/", response_model=gl_schema.GlobalListItemRead, status_code=status.HTTP_201_CREATED)
async def create_global_list_item(
    item_in: gl_schema.GlobalListItemCreate,
    parent_global_list: models.GlobalList = Depends(deps.get_global_list_owner_check), # Ensures list ownership
    db: AsyncSession = Depends(get_db)
):
    created_item = await crud_global_list.add_item_to_list(db, global_list_id=parent_global_list.id, item_in=item_in)
    return created_item

@router.get("/{global_list_id}/items/", response_model=List[gl_schema.GlobalListItemRead])
async def read_global_list_items(
    parent_global_list: models.GlobalList = Depends(deps.get_global_list_owner_check),
    # No db needed here as items are on parent_global_list if eager loaded
):
    return parent_global_list.items # Assumes items are eager loaded by the dependency

@router.put("/{global_list_id}/items/{item_id}", response_model=gl_schema.GlobalListItemRead)
async def update_global_list_item(
    item_id: int,
    item_in: gl_schema.GlobalListItemCreate, # Use Create schema for update as well, or define ItemUpdate
    parent_global_list: models.GlobalList = Depends(deps.get_global_list_owner_check), # Ensures list ownership
    db: AsyncSession = Depends(get_db)
):
    db_item = await crud_global_list.get_item(db, item_id=item_id)
    if not db_item or db_item.global_list_id != parent_global_list.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found in this list")
    
    # Pydantic V2
    item_data = item_in.model_dump(exclude_unset=True)
    # Pydantic V1
    # item_data = item_in.dict(exclude_unset=True)
    updated_item = await crud_global_list.update_item(db, db_item=db_item, item_in_data=item_data)
    return updated_item

@router.delete("/{global_list_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_global_list_item(
    item_id: int,
    parent_global_list: models.GlobalList = Depends(deps.get_global_list_owner_check), # Ensures list ownership
    db: AsyncSession = Depends(get_db)
):
    db_item = await crud_global_list.get_item(db, item_id=item_id)
    if not db_item or db_item.global_list_id != parent_global_list.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found in this list")
    
    await crud_global_list.remove_item(db, item_id=item_id)
    return
