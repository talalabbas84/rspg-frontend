from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone
import logging

from app.api import deps
from app.db import models
from app.schemas import run as run_schema
from app.crud import crud_run, crud_sequence
from app.db.session import get_db
from app.services import execution_engine # For starting a run

router = APIRouter()

logger = logging.getLogger(__name__)

@router.post("/", response_model=run_schema.RunRead, status_code=status.HTTP_202_ACCEPTED) # 202 as run starts async
async def create_run_for_sequence(
    run_in: run_schema.RunCreate, # Contains sequence_id and input_overrides
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    # Verify user owns the sequence
    sequence = await crud_sequence.get_by_id_and_owner(db, id=run_in.sequence_id, user_id=current_user.id)
    if not sequence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sequence not found or not owned by user")

    # Create the initial Run DB object
    created_run_db_obj = await crud_run.create_with_sequence_and_user(
        db=db, obj_in=run_in, user_id=current_user.id
    )
    
    # TODO: Background Task for actual execution
    # For now, let's call it directly, but this will block.
    # In production, use FastAPI's BackgroundTasks or a task queue like Celery.
    # from fastapi import BackgroundTasks
    # background_tasks.add_task(execution_engine.execute_sequence, ...)
    
    # For simplicity in this example, we'll execute synchronously and update the run object.
    # This is NOT ideal for long-running tasks.
    try:
        updated_run_obj = await execution_engine.execute_sequence(
            db=db,
            run_id=created_run_db_obj.id,
            sequence_id=sequence.id,
            user_id=current_user.id,
            input_overrides=run_in.input_overrides_json,
            # llm_model can be passed from request or sequence settings
        )
        # The execute_sequence should return the Run object with eager-loaded block_runs
        return updated_run_obj
    except Exception as e:
        # If synchronous execution fails catastrophically before run status is updated
        logger.error(f"Immediate catastrophic failure during synchronous execution of run {created_run_db_obj.id}: {e}", exc_info=True)
        # Mark run as failed if it wasn't already
        run_to_fail = await crud_run.get(db, id=created_run_db_obj.id)
        if run_to_fail and run_to_fail.status != models.RunStatusEnum.FAILED:
            run_to_fail.status = models.RunStatusEnum.FAILED
            run_to_fail.completed_at = datetime.now(timezone.utc)
            run_to_fail.results_summary_json = {"error": "Execution failed catastrophically", "details": str(e)}
            db.add(run_to_fail)
            await db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to execute sequence: {e}")


@router.get("/by_sequence/{sequence_id}", response_model=List[run_schema.RunRead])
async def read_runs_for_sequence(
    sequence_id: int,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 20, # Paginate runs
    current_user: models.User = Depends(deps.get_current_active_user)
):
    # Verify user owns the sequence
    sequence = await crud_sequence.get_by_id_and_owner(db, id=sequence_id, user_id=current_user.id)
    if not sequence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sequence not found or not owned by user")

    runs = await crud_run.get_multi_by_sequence_and_user(
        db, sequence_id=sequence_id, user_id=current_user.id, skip=skip, limit=limit
    )
    return runs

@router.get("/{run_id}", response_model=run_schema.RunRead)
async def read_run_details(
    run_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    run = await crud_run.get_by_id_and_user(db, id=run_id, user_id=current_user.id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found or not owned by user")
    return run

# Optional: Endpoint to get details of a specific BlockRun
@router.get("/block_run/{block_run_id}", response_model=run_schema.BlockRunReadWithDetails) # Assuming this schema exists
async def read_block_run_details(
    block_run_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    # Need a CRUD method for BlockRun or a more complex query here
    # For example:
    result = await db.execute(
        select(models.BlockRun)
        .join(models.Run) # Join with Run to check ownership
        .filter(models.BlockRun.id == block_run_id, models.Run.user_id == current_user.id)
        .options(joinedload(models.BlockRun.block)) # Eager load original block
    )
    block_run = result.scalars().first()
    
    if not block_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="BlockRun not found or access denied.")
    return block_run
