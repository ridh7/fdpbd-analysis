"""
FastAPI dependency injection (DI) providers.

## What is Dependency Injection?
Instead of a router creating its own AnalysisService (hardcoding the data
directory path), it DECLARES what it needs via a parameter:

    @router.post("/analyze")
    async def analyze(service: AnalysisService = Depends(get_analysis_service)):
        ...

FastAPI calls get_analysis_service() automatically and passes the result.
The router never knows WHERE the data directory is — it just gets a ready-to-use
service. This is the same pattern as React's props vs. importing globals.

## Why this matters for testing:
In tests, you can swap in a different provider:

    app.dependency_overrides[get_analysis_service] = lambda: AnalysisService(
        data_dir=Path("tests/fixtures")
    )

Now all routes use the test fixtures directory instead of the real data directory,
without changing any router code. This is DI's main benefit — decoupling
configuration from usage.

## Why a separate file?
Keeps the DI wiring in one place. If you add more services later (e.g.,
FittingService, CacheService), their providers go here too. The router
imports from dependencies.py, never from config.py directly.
"""

from pathlib import Path

from app.config import settings
from app.services.analysis_service import AnalysisService


def get_analysis_service() -> AnalysisService:
    """Provide an AnalysisService instance configured from app settings."""
    return AnalysisService(data_dir=Path(settings.data_directory))
