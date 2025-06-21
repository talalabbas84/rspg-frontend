from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
import logging

from app.core.config import settings
from app.api.routes import (
    auth, sequences, blocks, variables, runs, engine, global_lists
)
# For Alembic auto-generation, ensure models are imported somewhere Base can see them
# from app.db import models # This line can help if Alembic has issues finding models

# Setup logging
logging.basicConfig(level=logging.INFO) # Adjust level as needed (DEBUG, INFO, WARNING, ERROR)
logger = logging.getLogger(__name__)


# Custom route class to make all routes use snake_case for operation_id
# This helps with generating cleaner client SDKs.
class KebabCaseAPIRoute(APIRoute):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.name:
             # Convert function name (e.g., read_users_me) to kebab-case (read-users-me)
            self.operation_id = self.name.replace("_", "-")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version="0.1.0", # Add a version
    # route_class=KebabCaseAPIRoute # Uncomment to use custom operation_ids
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS, # Uses the property from config
        allow_credentials=True,
        allow_methods=["*"], # Allows all methods
        allow_headers=["*"], # Allows all headers
    )
else:
    logger.warning("CORS origins not configured. API might not be accessible from frontend.")


# API Routers
api_router_v1 = APIRoute(prefix=settings.API_V1_STR) # Use APIRoute for prefixing

api_router_v1.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router_v1.include_router(sequences.router, prefix="/sequences", tags=["Sequences"])
api_router_v1.include_router(blocks.router, prefix="/blocks", tags=["Blocks"]) # Typically blocks are sub-resources of sequences
api_router_v1.include_router(variables.router, prefix="/variables", tags=["Variables"]) # Same for variables
api_router_v1.include_router(global_lists.router, prefix="/global-lists", tags=["Global Lists"])
api_router_v1.include_router(runs.router, prefix="/runs", tags=["Runs & Execution History"])
api_router_v1.include_router(engine.router, prefix="/engine", tags=["Execution Engine Utilities"])

app.include_router(api_router_v1)


@app.get("/healthcheck", tags=["Health"])
def healthcheck():
    """Basic health check endpoint."""
    return {"status": "ok", "project_name": settings.PROJECT_NAME}

# Optional: Add startup event for DB connection test or other init tasks
# @app.on_event("startup")
# async def startup_event():
#     logger.info("Application startup...")
#     try:
#         # Test DB connection
#         from app.db.session import engine
#         async with engine.connect() as connection:
#             logger.info("Database connection successful.")
#     except Exception as e:
#         logger.error(f"Database connection failed on startup: {e}")

# Optional: Add shutdown event
# @app.on_event("shutdown")
# async def shutdown_event():
#     logger.info("Application shutdown...")

if __name__ == "__main__":
    import uvicorn
    # This is for direct execution (e.g. python app/main.py)
    # Production usually uses Gunicorn + Uvicorn workers.
    uvicorn.run(app, host="0.0.0.0", port=8000)
