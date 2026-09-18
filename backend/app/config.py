import os
from pydantic_settings import BaseSettings
from typing import List, Dict

class Settings(BaseSettings):
    PROJECT_NAME: str = "PredictX"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # Supabase (Optional, falls back to SQLite)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "predictx.db")
    
    # Performance & Concurrency (Tuned for free tier / 30+ concurrent users)
    MAX_CONCURRENT_WORKERS: int = int(os.getenv("MAX_CONCURRENT_WORKERS", "4"))
    SHAP_MAX_BACKGROUND_SAMPLES: int = 100
    STABILITY_DEFAULT_RUNS: int = 15
    MAX_DATASET_ROWS_FOR_FULL_SHAP: int = 5000
    
    # Research Defaults for Reliability Weights (Sum to 1.0)
    DEFAULT_WEIGHTS: Dict[str, float] = {
        "correlation": 0.20,
        "proxy": 0.15,
        "stability": 0.20,
        "model_agreement": 0.15,
        "subgroup": 0.15,
        "perturbation": 0.15,
    }
    
    # Reliability Classification Cutoffs
    THRESHOLD_RELIABLE: float = 80.0
    THRESHOLD_NEEDS_REVIEW: float = 50.0
    
    # Correlation & Multicollinearity Defaults
    CORRELATION_HIGH_THRESHOLD: float = 0.80
    VIF_MODERATE_THRESHOLD: float = 5.0
    VIF_HIGH_THRESHOLD: float = 10.0
    
    # Subgroup guard
    SUBGROUP_MIN_SAMPLE_SIZE: int = 15

    class Config:
        case_sensitive = True
        env_file = (".env", "backend/.env")
        extra = "ignore"

settings = Settings()
