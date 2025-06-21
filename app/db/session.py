from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Ensure the DATABASE_URL is suitable for asyncpg or aiosqlite
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    # echo=True, # Uncomment for debugging SQL queries
)

AsyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False # Important for async operations
)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
