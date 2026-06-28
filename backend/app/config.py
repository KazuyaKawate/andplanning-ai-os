from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/aios.db"

    # CORS — comma-separated list of allowed origins
    allowed_origins: str = "http://localhost:3000,http://localhost:3001"

    # Default AI provider API keys (overridden per-request by stored settings)
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""

    # Optional — Bearer token to protect this backend's own API
    api_secret_key: str = ""

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
