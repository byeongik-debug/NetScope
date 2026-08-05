from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "NetScope API"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./netscope.db"
    cors_origins: list[str] = ["*"]
    secret_key: str = "change-this-development-key"
    access_token_minutes: int = 720
    model_config = SettingsConfigDict(env_file=".env", env_prefix="NETSCOPE_")

@lru_cache
def get_settings() -> Settings:
    return Settings()
