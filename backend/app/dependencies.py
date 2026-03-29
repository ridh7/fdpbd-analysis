"""FastAPI dependency injection providers."""

from pathlib import Path

from app.config import settings
from app.services.analysis_service import AnalysisService


def get_analysis_service() -> AnalysisService:
    """Provide an AnalysisService instance configured from settings."""
    return AnalysisService(data_dir=Path(settings.data_directory))
