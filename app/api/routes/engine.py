from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.api import deps
from app.db import models
from app.crud import crud_sequence, crud_block
from app.db.session import get_db
from app.services import execution_engine # For preview

router = APIRouter()

class PreviewPromptRequest(models.BaseModel): # Pydantic model for request body
    sequence_id: int
    block_id: int
    input_overrides: Dict[str, Any] | None = None

@router.post("/preview_prompt", response_model=Dict[str, Any]) # Response can be more specific
async def preview_block_prompt(
    request_data: PreviewPromptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    # Verify user owns the sequence
    sequence = await crud_sequence.get_by_id_and_owner(db, id=request_data.sequence_id, user_id=current_user.id)
    if not sequence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sequence not found or not owned by user")

    # Verify block belongs to this sequence (implicitly done by preview_prompt_for_block if it checks)
    # block = await crud_block.get(db, id=request_data.block_id)
    # if not block or block.sequence_id != request_data.sequence_id:
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found in this sequence.")

    try:
        preview_data = await execution_engine.preview_prompt_for_block(
            db=db,
            sequence_id=request_data.sequence_id,
            block_id=request_data.block_id,
            user_id=current_user.id, # Pass user_id for context gathering if needed
            input_overrides=request_data.input_overrides
        )
        return preview_data
    except ValueError as ve: # Catch specific errors from the service
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Error generating prompt preview for block {request_data.block_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate prompt preview.")

# Note: The main "run_sequence" endpoint is now in runs.py as it creates a Run resource.
# This engine.py is more for utility/preview functions related to execution.
