from contextlib import asynccontextmanager
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api.endpoints import router as api_router
from .api.endpoints import run_instant_demo

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up and pre-seed the student demo so first requests are sub-50ms
    try:
        await run_instant_demo()
    except Exception as e:
        print(f"Warning: Demo warm-up encountered: {e}")
    yield

app = FastAPI(
    title="PredictX Backend API",
    description="AI-Powered Feature Importance Reliability Assessment Engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount endpoints (both under /api and root for flexibility)
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router)

@app.get("/")
async def root():
    return {
        "message": "PredictX Backend API is running successfully!",
        "documentation": "/docs",
        "health": "/health",
        "api_v1": settings.API_V1_STR
    }

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "PredictX Backend Engine",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "database": "supabase" if settings.SUPABASE_URL else "sqlite"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
