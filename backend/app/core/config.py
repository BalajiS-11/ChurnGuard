from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / '.env'),
        env_file_encoding='utf-8',
        extra='ignore'
    )
    
    # App
    PROJECT_NAME: str = 'ChurnGuard'
    VERSION: str = '1.0.0'
    API_V1_STR: str = '/api/v1'
    ENVIRONMENT: str = 'development'
    LOG_LEVEL: str = 'INFO'
    
    # Database
    DATABASE_URL: str = 'sqlite:///./churnguard.db'
    
    # Security
    SECRET_KEY: str = 'churnguard_super_secret_jwt_key_change_in_production_2026!'
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # ML Artifacts
    MODEL_PATH: str = str(BASE_DIR / 'ml' / 'artifacts' / 'model_v1.joblib')
    METADATA_PATH: str = str(BASE_DIR / 'ml' / 'artifacts' / 'metadata.json')
    
    # CORS
    CORS_ORIGINS: str = 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000'

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(',') if o.strip()]

settings = Settings()
