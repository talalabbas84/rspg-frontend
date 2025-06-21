import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
from typing import List

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "MPSG Backend"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./test.db") # Ensure this is async compatible
    SECRET_KEY: str = os.getenv("SECRET_KEY", "a_very_default_secret_key_for_development_only") # CHANGE THIS IN PRODUCTION
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 7)) # 7 days
    
    CLAUDE_API_KEY: str | None = os.getenv("CLAUDE_API_KEY")
    
    # CORS Origins: space-separated string in .env, converted to list here
    BACKEND_CORS_ORIGINS_STR: str = os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:3000 http://127.0.0.1:3000")
    
    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS_STR.split(' ') if origin.strip()]

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = 'utf-8'

settings = Settings()
