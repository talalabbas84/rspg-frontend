# This is the most complex service. It orchestrates the entire sequence execution.
# A full, robust implementation is very long. This is a well-structured and functional version.
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from app.db import models
from app.crud import crud_block, crud_variable, crud_run, crud_global_list
from app.services.llm_interface import call_claude_api
from app.services.prompt_utils import render_prompt, discretize_output
from app.schemas.run import BlockRunCreate
import json
from datetime import datetime, timezone
import logging
from typing import Dict, Any, Tuple, List

logger = logging.getLogger(__name__)

async def _gather_sequence_context(db: AsyncSession, sequence_id: int, user_id: int, input_overrides: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Gathers all available variables for a sequence execution:
    1. User-defined Global Variables for the sequence.
    2. User-defined Global Lists (their items).
    3. Input Variables (runtime overrides take precedence over defaults if any).
    """
    context = {}

    # 1. Fetch user-defined Global Variables for the sequence
    seq_variables = await crud_variable.get_multi_by_sequence(db, sequence_id=sequence_id)
    for var in seq_variables:
        if var.type == models.VariableTypeEnum.GLOBAL and var.value_json and "value" in var.value_json:
            context[var.name] = var.value_json["value"]
        elif var.type == models.VariableTypeEnum.INPUT: # Prepare for overrides
            if var.value_json and "default" in var.value_json:
                context[var.name] = var.value_json["default"]
            else: # Input variable with no default
                context[var.name] = None # Or raise error if required and not in overrides

    # 2. Fetch user-defined Global Lists
    global_lists = await crud_global_list.get_multi_by_owner(db, user_id=user_id) # Assuming global lists are user-wide
    # If global lists can be sequence-specific, adjust query:
    # global_lists = await db.execute(select(models.GlobalList).filter(models.GlobalList.sequence_id == sequence_id).options(selectinload(models.GlobalList.items)))
    # global_lists = global_lists.scalars().all()

    for glist in global_lists:
        context[glist.name] = [item.value for item in glist.items]

    # 3. Apply input_overrides (runtime inputs for INPUT type variables)
    if input_overrides:
        for key, value in input_overrides.items():
            # Check if this key corresponds to a defined INPUT variable
            # For now, allow any override, but validation could be added
            context[key] = value
            
    # Ensure all defined INPUT variables are in context, even if None (unless overridden)
    for var in seq_variables:
        if var.type == models.VariableTypeEnum.INPUT and var.name not in context:
            context[var.name] = None # Explicitly set to None if no default and no override

    logger.debug(f"Initial context for sequence {sequence_id}: { {k: (str(v)[:50] + '...' if isinstance(v, str) and len(v) > 50 else v) for k,v in context.items()} }")
    return context

async def _execute_single_block_logic(
    db: AsyncSession, # Pass db session for potential internal db calls if needed (e.g. fetching list items dynamically)
    block: models.Block,
    current_context: Dict[str, Any],
    llm_model: str
) -> Tuple[Dict[str, Any], str, str, Dict[str, Any] | None, Dict[str, Any] | None, Dict[str, Any] | None, str | None]:
    """
    Core logic for executing one block.
    Returns: (
        output_data_for_context,
        rendered_prompt_text,
        llm_raw_output_text,
        named_outputs_json_for_db,
        list_outputs_json_for_db,
        matrix_outputs_json_for_db,
        error_message_str
    )
    """
    block_config = block.config_json
    prompt_template = block_config.get("prompt", "")
    
    output_data: Dict[str, Any] = {}
    rendered_prompt = ""
    llm_output = ""
    named_outputs_db = None
    list_outputs_db = None
    matrix_outputs_db = None
    error_message = None

    try:
        if block.type == models.BlockTypeEnum.STANDARD:
            rendered_prompt = render_prompt(prompt_template, current_context)
            llm_output = await call_claude_api(rendered_prompt, model=llm_model)
            output_var_name = block_config.get("output_variable_name", f"block_{block.id}_output")
            output_data[output_var_name] = llm_output

        elif block.type == models.BlockTypeEnum.DISCRETIZATION:
            rendered_prompt = render_prompt(prompt_template, current_context)
            llm_output = await call_claude_api(rendered_prompt, model=llm_model)
            output_names = block_config.get("output_names", [])
            if not output_names: raise ValueError("Discretization block missing 'output_names' in config.")
            named_outputs = discretize_output(llm_output, output_names)
            output_data.update(named_outputs)
            named_outputs_db = named_outputs

        elif block.type == models.BlockTypeEnum.SINGLE_LIST:
            input_list_name = block_config.get("input_list_variable_name")
            if not input_list_name: raise ValueError("Single List block missing 'input_list_variable_name'.")
            
            input_list = current_context.get(input_list_name)
            if not isinstance(input_list, list):
                raise ValueError(f"Variable '{input_list_name}' for Single List block is not a list or not found in context. Found: {type(input_list)}")

            output_list_var_name = block_config.get("output_list_variable_name") or f"output_list_{block.id}"
            
            item_results = []
            # For logging, we might only store the template or a sample rendered prompt
            rendered_prompt = f"Executing Single List Block. Template: {prompt_template[:100]}... on list '{input_list_name}' ({len(input_list)} items)."
            
            for item_idx, item_value in enumerate(input_list):
                item_context = {**current_context, "item": item_value, "item_index": item_idx} # Provide item and its index
                item_prompt = render_prompt(prompt_template, item_context)
                # Consider logging each item_prompt if verbosity is high
                item_llm_output = await call_claude_api(item_prompt, model=llm_model)
                item_results.append(item_llm_output)
            
            output_data[output_list_var_name] = item_results
            llm_output = json.dumps(item_results) # Store all results as JSON string for raw output
            list_outputs_db = {"values": item_results}


        elif block.type == models.BlockTypeEnum.MULTI_LIST:
            input_configs = block_config.get("input_lists_config", [])
            if not input_configs: raise ValueError("Multi List block missing 'input_lists_config'.")
            output_matrix_var_name = block_config.get("output_matrix_variable_name") or f"output_matrix_{block.id}"

            # Simplified: assumes primary list is the first one, others are secondary.
            # More complex logic would handle priorities and parallel iteration.
            # This example iterates over the first list, and for each item, iterates over the second.
            if len(input_configs) < 2: raise ValueError("Multi-List block requires at least two input lists in config.")

            list1_name = input_configs[0]["name"]
            list2_name = input_configs[1]["name"] # Assuming only two lists for this example

            primary_list = current_context.get(list1_name)
            secondary_list = current_context.get(list2_name)

            if not isinstance(primary_list, list): raise ValueError(f"Primary list '{list1_name}' is not a list or not found.")
            if not isinstance(secondary_list, list): raise ValueError(f"Secondary list '{list2_name}' is not a list or not found.")

            matrix_results = []
            rendered_prompt = f"Executing Multi List Block. Template: {prompt_template[:100]}... on lists '{list1_name}' & '{list2_name}'."

            for p_idx, p_item in enumerate(primary_list):
                row_results = []
                for s_idx, s_item in enumerate(secondary_list):
                    # Define how items are exposed, e.g. item_list1_name, item_list2_name or item1, item2
                    item_context = {
                        **current_context,
                        "item1": p_item,  # Or use a more specific name based on input_configs
                        "item2": s_item,
                        "item1_index": p_idx,
                        "item2_index": s_idx,
                    }
                    item_prompt = render_prompt(prompt_template, item_context)
                    item_llm_output = await call_claude_api(item_prompt, model=llm_model)
                    row_results.append(item_llm_output)
                matrix_results.append(row_results)
            
            output_data[output_matrix_var_name] = matrix_results
            llm_output = json.dumps(matrix_results)
            matrix_outputs_db = {"values": matrix_results}

        else:
            raise NotImplementedError(f"Block type '{block.type}' execution not implemented.")

    except Exception as e:
        logger.error(f"Error executing block {block.id} ('{block.name}'): {e}", exc_info=True)
        error_message = str(e)
        # output_data will remain as it was before the error for this block

    return output_data, rendered_prompt, llm_output, named_outputs_db, list_outputs_db, matrix_outputs_db, error_message


async def execute_sequence(
    db: AsyncSession,
    run_id: int, # Pass the created Run ID
    sequence_id: int,
    user_id: int, # For context gathering
    input_overrides: Dict[str, Any] = None,
    llm_model: str = "claude-3-opus-20240229" # Default model
) -> models.Run:
    """
    Executes a full sequence.
    1. Fetches the Run object.
    2. Updates Run status to RUNNING.
    3. Gathers initial context.
    4. Iterates through blocks, executing each one:
        a. Creates a BlockRun record (initially PENDING/RUNNING).
        b. Executes block logic.
        c. Updates BlockRun with results/status.
        d. Updates overall context with block's output.
    5. Updates Run status to COMPLETED or FAILED.
    Returns the updated Run object with all BlockRuns.
    """
    run_obj = await crud_run.get(db, id=run_id)
    if not run_obj or run_obj.sequence_id != sequence_id or run_obj.user_id != user_id:
        raise ValueError("Run not found or access denied.")

    run_obj.status = models.RunStatusEnum.RUNNING
    run_obj.started_at = datetime.now(timezone.utc)
    run_obj.input_overrides_json = input_overrides # Log the overrides used
    db.add(run_obj)
    await db.commit()
    await db.refresh(run_obj)

    current_context = await _gather_sequence_context(db, sequence_id, user_id, input_overrides)
    
    # Fetch blocks for the sequence, ordered
    blocks = await crud_block.get_multi_by_sequence(db, sequence_id=sequence_id)
    if not blocks:
        logger.warning(f"Sequence {sequence_id} has no blocks to execute for run {run_id}.")
        run_obj.status = models.RunStatusEnum.COMPLETED # Or FAILED if no blocks is an error
        run_obj.completed_at = datetime.now(timezone.utc)
        db.add(run_obj)
        await db.commit()
        await db.refresh(run_obj)
        return run_obj

    overall_success = True
    final_outputs_summary = {}

    for block in blocks:
        block_run_create_schema = BlockRunCreate(
            run_id=run_obj.id,
            block_id=block.id,
            status=models.RunStatusEnum.RUNNING, # Set to running before execution
            # Snapshots can be added here or after fetching block
        )
        # Pydantic V2
        db_block_run = models.BlockRun(**block_run_create_schema.model_dump())
        # Pydantic V1
        # db_block_run = models.BlockRun(**block_run_create_schema.dict())
        
        db_block_run.block_name_snapshot = block.name
        db_block_run.block_type_snapshot = block.type.value
        db_block_run.started_at = datetime.now(timezone.utc) # More precise start time
        
        db.add(db_block_run)
        await db.flush() # Get ID for db_block_run
        # await db.refresh(db_block_run) # Refresh to load defaults if any

        logger.info(f"Executing block ID {block.id} ('{block.name}') for run ID {run_obj.id}")
        
        (block_output_data, rendered_prompt, llm_raw_output,
         named_outputs_db, list_outputs_db, matrix_outputs_db, error_message) = await _execute_single_block_logic(
            db, block, current_context, llm_model
        )

        db_block_run.prompt_text = rendered_prompt
        db_block_run.llm_output_text = llm_raw_output
        db_block_run.named_outputs_json = named_outputs_db
        db_block_run.list_outputs_json = list_outputs_db
        db_block_run.matrix_outputs_json = matrix_outputs_db
        db_block_run.completed_at = datetime.now(timezone.utc)

        if error_message:
            db_block_run.status = models.RunStatusEnum.FAILED
            db_block_run.error_message = error_message
            overall_success = False
            logger.error(f"Block ID {block.id} failed for run ID {run_obj.id}: {error_message}")
            # Decide: stop sequence on first error, or continue?
            # For now, let's mark overall run as failed but continue processing other blocks if desired (though context might be broken)
            # To stop on first error:
            # run_obj.status = models.RunStatusEnum.FAILED
            # run_obj.completed_at = datetime.now(timezone.utc)
            # db.add(run_obj)
            # await db.commit() # Commit this block_run failure and run failure
            # await db.refresh(run_obj)
            # return run_obj # Exit early
        else:
            db_block_run.status = models.RunStatusEnum.COMPLETED
            current_context.update(block_output_data) # Make outputs available for next blocks
            # Store this block's output in the summary for the run
            final_outputs_summary[f"block_{block.id}_{block.name.replace(' ','_')}"] = block_output_data
            logger.info(f"Block ID {block.id} completed successfully for run ID {run_obj.id}")

        # db.add(db_block_run) # Already added, SQLAlchemy tracks changes
        await db.flush() # Ensure this block_run is processed before next iteration

    run_obj.status = models.RunStatusEnum.COMPLETED if overall_success else models.RunStatusEnum.FAILED
    run_obj.completed_at = datetime.now(timezone.utc)
    run_obj.results_summary_json = final_outputs_summary # Store all collected outputs
    
    db.add(run_obj)
    await db.commit()
    await db.refresh(run_obj) # Refresh to get all relationships updated if needed
    
    # Eagerly load block_runs for the response
    run_obj_with_details = await crud_run.get_by_id_and_user(db, id=run_obj.id, user_id=user_id)
    return run_obj_with_details if run_obj_with_details else run_obj


async def preview_prompt_for_block(
    db: AsyncSession,
    sequence_id: int,
    block_id: int,
    user_id: int,
    input_overrides: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Generates a preview of the prompt for a specific block.
    This requires simulating the context as it would be just before that block executes.
    """
    target_block = await crud_block.get(db, id=block_id)
    if not target_block or target_block.sequence_id != sequence_id:
        raise ValueError("Block not found or does not belong to the sequence.")

    # Check if user owns the sequence (indirectly via target_block.sequence.user_id)
    # This requires loading the sequence relationship for target_block or an extra query.
    # For simplicity, assuming ownership check is done at route level.

    current_context = await _gather_sequence_context(db, sequence_id, user_id, input_overrides)
    
    # Simulate execution of blocks *before* the target_block to build up context
    # This is a simplified simulation; it doesn't actually call LLMs.
    # It just resolves variable names based on *expected* output names from configs.
    
    prior_blocks = await db.execute(
        select(models.Block)
        .filter(models.Block.sequence_id == sequence_id, models.Block.order < target_block.order)
        .order_by(models.Block.order)
    )
    prior_blocks = prior_blocks.scalars().all()

    for prev_block in prior_blocks:
        # Simulate output based on block type and config
        # This is a placeholder for actual output simulation logic
        # For a true preview, you'd need to know the *names* of variables each block produces.
        block_config = prev_block.config_json
        if prev_block.type == models.BlockTypeEnum.STANDARD:
            output_var_name = block_config.get("output_variable_name", f"block_{prev_block.id}_output")
            current_context[output_var_name] = f"[Output from {prev_block.name} (ID: {prev_block.id})]"
        elif prev_block.type == models.BlockTypeEnum.DISCRETIZATION:
            output_names = block_config.get("output_names", [])
            for name in output_names:
                current_context[name] = f"[Discretized output '{name}' from {prev_block.name}]"
        elif prev_block.type == models.BlockTypeEnum.SINGLE_LIST:
            output_list_var_name = block_config.get("output_list_variable_name") or f"output_list_{prev_block.id}"
            current_context[output_list_var_name] = [f"[Sample item from list output of {prev_block.name}]"]
        elif prev_block.type == models.BlockTypeEnum.MULTI_LIST:
            output_matrix_var_name = block_config.get("output_matrix_variable_name") or f"output_matrix_{prev_block.id}"
            current_context[output_matrix_var_name] = [[f"[Sample item from matrix output of {prev_block.name}]"]]
        # Add more simulation logic as needed

    # Now render the prompt for the target block with the simulated context
    prompt_template = target_block.config_json.get("prompt", "")
    
    # Special handling for list blocks in preview
    preview_context_for_render = {**current_context}
    if target_block.type == models.BlockTypeEnum.SINGLE_LIST:
        # Use a placeholder for 'item' if the input list isn't fully resolved or for clarity
        preview_context_for_render["item"] = "[SAMPLE_LIST_ITEM]"
        preview_context_for_render["item_index"] = 0
    elif target_block.type == models.BlockTypeEnum.MULTI_LIST:
        # Use placeholders for items from multiple lists
        # This needs to align with how your prompt template expects these items
        input_configs = target_block.config_json.get("input_lists_config", [])
        for i, conf in enumerate(input_configs):
            # Example: item1, item2 or item_listname
            placeholder_name = f"item{i+1}" # Or derive from conf.get('item_placeholder', f'item{i+1}')
            preview_context_for_render[placeholder_name] = f"[SAMPLE_FROM_{conf['name']}]"
            preview_context_for_render[f"{placeholder_name}_index"] = 0


    try:
        rendered_prompt = render_prompt(prompt_template, preview_context_for_render)
    except ValueError as e: # Catch undefined variable errors from render_prompt
        rendered_prompt = f"Error rendering prompt preview: {e}. Template: {prompt_template}"
    except Exception as e:
        rendered_prompt = f"Unexpected error rendering prompt preview: {e}. Template: {prompt_template}"


    return {
        "block_id": target_block.id,
        "block_name": target_block.name,
        "block_type": target_block.type.value,
        "prompt_template": prompt_template,
        "rendered_prompt": rendered_prompt,
        "context_used_for_preview": { # Show a snippet of the context
            k: (str(v)[:100] + '...' if isinstance(v, str) and len(v) > 100 else v) 
            for k,v in preview_context_for_render.items()
        }
    }
