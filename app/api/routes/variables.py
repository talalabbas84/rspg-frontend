from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

from app.api import deps
from app.db import models
from app.schemas import variable as variable_schema
from app.schemas.variable import AvailableVariable # Specific schema for available vars
from app.crud import crud_variable, crud_sequence, crud_block, crud_global_list
from app.db.session import get_db

router = APIRouter()

# Dependency from blocks.py, reused here
from .blocks import get_parent_sequence_for_block as get_parent_sequence_for_variable_ops

@router.post("/", response_model=variable_schema.VariableRead, status_code=status.HTTP_201_CREATED)
async def create_variable(
    variable_in: variable_schema.VariableCreate,
    db: AsyncSession = Depends(get_db),
    parent_sequence: models.Sequence = Depends(get_parent_sequence_for_variable_ops) # Validates sequence ownership
):
    # Check for duplicate variable name within the sequence
    existing_variable = await crud_variable.get_by_name_and_sequence(db, name=variable_in.name, sequence_id=parent_sequence.id)
    if existing_variable:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Variable with name '{variable_in.name}' already exists in this sequence.")
    
    # Ensure sequence_id in variable_in matches the one from dependency
    if variable_in.sequence_id != parent_sequence.id:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Variable's sequence_id mismatch.")

    created_variable = await crud_variable.create(db=db, obj_in=variable_in)
    return created_variable

@router.get("/by_sequence/{sequence_id}", response_model=List[variable_schema.VariableRead])
async def read_variables_for_sequence(
    parent_sequence: models.Sequence = Depends(get_parent_sequence_for_variable_ops), # Validates sequence ownership
    db: AsyncSession = Depends(get_db)
):
    variables = await crud_variable.get_multi_by_sequence(db, sequence_id=parent_sequence.id)
    return variables

@router.get("/{variable_id}", response_model=variable_schema.VariableRead)
async def read_variable(
    variable_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    variable = await crud_variable.get(db, id=variable_id)
    if not variable:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variable not found")
    
    # Check ownership via parent sequence
    parent_sequence = await crud_sequence.get_by_id_and_owner(db, id=variable.sequence_id, user_id=current_user.id)
    if not parent_sequence:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this variable")
    return variable

@router.put("/{variable_id}", response_model=variable_schema.VariableRead)
async def update_variable(
    variable_id: int,
    variable_in: variable_schema.VariableUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    db_variable = await crud_variable.get(db, id=variable_id)
    if not db_variable:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variable not found")

    parent_sequence = await crud_sequence.get_by_id_and_owner(db, id=db_variable.sequence_id, user_id=current_user.id)
    if not parent_sequence:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this variable")

    # Check for name collision if name is being changed
    if variable_in.name and variable_in.name != db_variable.name:
        existing_variable = await crud_variable.get_by_name_and_sequence(db, name=variable_in.name, sequence_id=db_variable.sequence_id)
        if existing_variable:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Variable name '{variable_in.name}' already exists in this sequence.")

    updated_variable = await crud_variable.update(db, db_obj=db_variable, obj_in=variable_in)
    return updated_variable

@router.delete("/{variable_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variable(
    variable_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    db_variable = await crud_variable.get(db, id=variable_id)
    if not db_variable:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variable not found")

    parent_sequence = await crud_sequence.get_by_id_and_owner(db, id=db_variable.sequence_id, user_id=current_user.id)
    if not parent_sequence:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this variable")
        
    await crud_variable.remove(db, id=variable_id)
    return

@router.get("/available_for_sequence/{sequence_id}", response_model=List[AvailableVariable])
async def list_available_variables_for_sequence(
    parent_sequence: models.Sequence = Depends(get_parent_sequence_for_variable_ops), # Validates sequence ownership
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user) # For global lists
):
    available_vars: List[AvailableVariable] = []

    # 1. User-defined Global and Input variables for this sequence
    seq_vars = await crud_variable.get_multi_by_sequence(db, sequence_id=parent_sequence.id)
    for var in seq_vars:
        available_vars.append(AvailableVariable(
            name=var.name,
            type=var.type.value, # 'global' or 'input'
            source=f"Sequence Defined ({var.type.value.capitalize()})",
            description=var.description
        ))

    # 2. User's Global Lists
    user_global_lists = await crud_global_list.get_multi_by_owner(db, user_id=current_user.id)
    for glist in user_global_lists:
        available_vars.append(AvailableVariable(
            name=glist.name,
            type="global_list",
            source="User Global List",
            description=glist.description
        ))

    # 3. Outputs from Blocks within this sequence
    # These are conceptual variables derived from block configurations.
    # The actual values are only available after a run.
    sequence_blocks = await crud_block.get_multi_by_sequence(db, sequence_id=parent_sequence.id)
    for block in sequence_blocks:
        config = block.config_json
        if block.type == models.BlockTypeEnum.STANDARD:
            var_name = config.get("output_variable_name", f"block_{block.id}_output")
            available_vars.append(AvailableVariable(
                name=var_name, type="block_output", source=f"Block: {block.name}", description=f"Output of '{block.name}'"
            ))
        elif block.type == models.BlockTypeEnum.DISCRETIZATION:
            output_names = config.get("output_names", [])
            for name in output_names:
                available_vars.append(AvailableVariable(
                    name=name, type="block_output", source=f"Block: {block.name} (Discretized)", description=f"Discretized output '{name}' from '{block.name}'"
                ))
        elif block.type == models.BlockTypeEnum.SINGLE_LIST:
            var_name = config.get("output_list_variable_name") or f"output_list_{block.id}"
            available_vars.append(AvailableVariable(
                name=var_name, type="list_output", source=f"Block: {block.name}", description=f"List output of '{block.name}'"
            ))
        elif block.type == models.BlockTypeEnum.MULTI_LIST:
            var_name = config.get("output_matrix_variable_name") or f"output_matrix_{block.id}"
            available_vars.append(AvailableVariable(
                name=var_name, type="matrix_output", source=f"Block: {block.name}", description=f"Matrix output of '{block.name}'"
            ))
            
    # Remove duplicates by name, prioritizing more specific types if any (though types here are distinct)
    # A simple way: convert to dict by name, then back to list
    final_vars_dict: Dict[str, AvailableVariable] = {}
    for avar in available_vars:
        if avar.name not in final_vars_dict: # Keep first encountered (could add priority logic)
            final_vars_dict[avar.name] = avar
            
    return list(final_vars_dict.values())
