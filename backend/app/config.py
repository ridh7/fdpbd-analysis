from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    data_directory: str = "./data"
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_prefix": "FDPBD_"}


settings = Settings()
