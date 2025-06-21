from pydantic import BaseModel
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: str | None = None # Subject (user identifier, e.g., email or user_id)
    exp: datetime | None = None # Expiry timestamp
