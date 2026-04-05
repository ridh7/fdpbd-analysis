"""
Application settings — centralized configuration loaded from environment variables.

Uses pydantic-settings (BaseSettings) which auto-reads from environment variables.
Each field has a default value that works for local development, but can be
overridden in production via env vars prefixed with FDPBD_.

Example:
    # In terminal or .env file:
    export FDPBD_DATA_DIRECTORY="/var/data/fdpbd"
    export FDPBD_CORS_ORIGINS='["https://my-app.com"]'

    # Settings() will read these and override the defaults.

This is the Python equivalent of Vite's import.meta.env / .env file on the frontend,
but with type validation — if someone sets FDPBD_CORS_ORIGINS to a non-list value,
Pydantic will raise a validation error at startup rather than silently breaking.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Directory where uploaded data files are temporarily stored during analysis.
    # The analysis service writes temp files here, then deletes them after processing.
    data_directory: str = "./data"

    # Allowed frontend origins for CORS (see main.py middleware).
    # Defaults to Vite's dev server. In production, this would be the deployed URL.
    cors_origins: list[str] = ["http://localhost:5173"]

    # env_prefix means pydantic looks for FDPBD_DATA_DIRECTORY and FDPBD_CORS_ORIGINS
    # in environment variables. Without a prefix, it would look for DATA_DIRECTORY
    # which could clash with other apps' env vars.
    model_config = {"env_prefix": "FDPBD_"}


# Singleton instance — imported throughout the app as `from app.config import settings`.
# Created once at import time, reads env vars once, then reused everywhere.
settings = Settings()
