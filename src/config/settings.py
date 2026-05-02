from pydantic_settings import BaseSettings,SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL :str
    JWT_SECRET: str
    JWT_ALGORITHM: str
    REFRESH_TOKEN_EXPIRY: int
    ACCESS_MAX_AGE : int
    REFRESH_MAX_AGE : int
    GEMINI_API_KEY: str
    UPLOAD_PATH: str


    model_config=SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


def get_settings():
    return Settings()
x=get_settings()
print(x.GEMINI_API_KEY)