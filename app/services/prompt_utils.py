from jinja2 import Environment, select_autoescape, meta, UndefinedError
import json
from typing import Dict, Any, List, Set
import logging

logger = logging.getLogger(__name__)

# Initialize Jinja2 environment
# You might want to add custom filters or extensions here if needed
jinja_env = Environment(
    autoescape=select_autoescape(['html', 'xml', 'jinja']), # Be cautious with autoescape if not generating HTML
    # trim_blocks=True, # Useful for cleaning up template whitespace
    # lstrip_blocks=True,
    # extensions=['jinja2.ext.do'] # If you need 'do' statements
)

def get_template_variables(template_string: str) -> Set[str]:
    """Parses a Jinja2 template string and returns a set of undeclared variables."""
    try:
        parsed_content = jinja_env.parse(template_string)
        return meta.find_undeclared_variables(parsed_content)
    except Exception as e:
        logger.error(f"Error parsing template to find variables: {e}")
        return set()

def render_prompt(template_string: str, context: Dict[str, Any]) -> str:
    """Renders a prompt template with the given context."""
    try:
        template = jinja_env.from_string(template_string)
        return template.render(context)
    except UndefinedError as e:
        logger.warning(f"Undefined variable in prompt template: {e.message}. Template: '{template_string[:100]}...' Context keys: {list(context.keys())}")
        # Decide how to handle: raise error, or render with empty string for undefined
        raise ValueError(f"Missing variable in prompt: {e.message}. Ensure all {{variables}} are provided.")
    except Exception as e:
        logger.error(f"Error rendering prompt template: {e}")
        raise

def discretize_output(llm_output: str, output_names: List[str]) -> Dict[str, str]:
    """
    Attempts to parse LLM output (expected to be JSON or specifically structured text)
    and map it to the provided output_names.
    This is a critical part that needs to be robust and often tailored to
    how you instruct the LLM to format its output.
    """
    named_outputs = {name: "" for name in output_names} # Initialize with empty strings

    if not llm_output or not output_names:
        return named_outputs

    # Attempt 1: Parse as JSON
    try:
        data = json.loads(llm_output)
        if isinstance(data, dict):
            for name in output_names:
                if name in data:
                    named_outputs[name] = str(data[name]) if data[name] is not None else ""
                else:
                    logger.warning(f"Discretization: Key '{name}' not found in LLM JSON output.")
            return named_outputs
        elif isinstance(data, list) and len(data) == len(output_names):
             # If LLM returns a list and counts match, map them by order
            for i, name in enumerate(output_names):
                named_outputs[name] = str(data[i]) if data[i] is not None else ""
            return named_outputs

    except json.JSONDecodeError:
        logger.debug("LLM output for discretization is not valid JSON. Attempting text parsing.")

    # Attempt 2: Simple text parsing (example, highly dependent on LLM instructions)
    # This is a fallback and should be made more robust based on your LLM's output format.
    # For instance, if you instruct the LLM to use "VAR_NAME: value" format:
    lines = llm_output.strip().split('\n')
    parsed_from_text = {}
    for line in lines:
        parts = line.split(':', 1)
        if len(parts) == 2:
            key = parts[0].strip()
            value = parts[1].strip()
            if key in output_names:
                parsed_from_text[key] = value
    
    for name in output_names:
        if name in parsed_from_text:
            named_outputs[name] = parsed_from_text[name]
        # else: # If not found by key, and only one output_name, assign the whole output
            # if len(output_names) == 1 and not named_outputs[name]: # Check if already filled by JSON
            #     named_outputs[name] = llm_output.strip()
            #     break

    # If still some names are unassigned, and it's a single output name, assign the whole output
    if len(output_names) == 1 and not named_outputs[output_names[0]]:
        named_outputs[output_names[0]] = llm_output.strip()

    # Log if any output names remain unassigned after all attempts
    for name in output_names:
        if not named_outputs[name] and llm_output: # Only warn if there was output but no value assigned
            logger.warning(f"Discretization: Could not find or parse value for output name '{name}'.")
            named_outputs[name] = "Error: Value not found or parsed." # Default error message

    return named_outputs
