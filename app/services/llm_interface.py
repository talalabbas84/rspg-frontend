import httpx
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

async def call_claude_api(prompt: str, model: str = "claude-3-opus-20240229", max_tokens: int = 2048) -> str:
    if not settings.CLAUDE_API_KEY:
        logger.error("CLAUDE_API_KEY is not configured.")
        raise ValueError("CLAUDE_API_KEY is not configured in the environment.")

    headers = {
        "x-api-key": settings.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01", # Check for latest recommended version
        "content-type": "application/json"
    }
    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}]
        # Add system prompt support if needed:
        # "system": "Your system prompt here",
    }

    logger.debug(f"Calling Claude API. Model: {model}, Max Tokens: {max_tokens}")
    # logger.debug(f"Prompt: {prompt[:500]}...") # Log a snippet of the prompt

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.anthropic.com/v1/messages", 
                json=payload, 
                headers=headers, 
                timeout=90.0 # Increased timeout for potentially long LLM responses
            )
            response.raise_for_status() # Raises HTTPStatusError for 4xx/5xx responses
            
            response_data = response.json()
            # Expected response structure: {"content": [{"type": "text", "text": "..."}]}
            if response_data.get("content") and isinstance(response_data["content"], list) and len(response_data["content"]) > 0:
                if response_data["content"][0].get("type") == "text":
                    return response_data["content"][0]["text"]
            
            logger.error(f"Unexpected Claude API response format: {response_data}")
            raise Exception("Unexpected Claude API response format.")

        except httpx.HTTPStatusError as e:
            error_details = e.response.text
            logger.error(f"Claude API request failed with status {e.response.status_code}: {error_details}")
            # You might want to parse the error response from Claude for more specific details
            raise Exception(f"LLM API request failed: {e.response.status_code} - {error_details}")
        except httpx.RequestError as e: # Handles network errors, timeouts etc.
            logger.error(f"Claude API request error: {e}")
            raise Exception(f"LLM API request error: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred calling Claude API: {e}")
            raise Exception(f"An unexpected error occurred calling LLM API: {e}")
