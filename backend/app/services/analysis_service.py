"""
Service layer for FD-PBD analysis orchestration.

## Why a service layer?
The service sits BETWEEN the router (HTTP concerns) and the core analysis
(physics/math). This separation means:

- Router handles: request parsing, file upload, JSON response formatting
- Service handles: temp file lifecycle, calling the right analysis function
- Core handles: actual physics computation

Without this layer, the router would manage temp files directly — mixing
HTTP logic with file I/O. The service encapsulates that lifecycle:
    save temp file → run analysis → delete temp file (even on error)

## Why are these methods sync, not async?
The analysis functions (run_isotropic_analysis, etc.) are synchronous and
CPU-bound — there's nothing to `await`. The router calls these directly
(without await) from its async handler. For a single-user tool the blocking
is acceptable. In a production app with concurrent users, you'd wrap them
in `asyncio.to_thread()` to avoid blocking the event loop.

## Python imports:
- tempfile.NamedTemporaryFile: creates a file with a unique auto-generated
  name that won't collide with other uploads. delete=False means we manage
  cleanup ourselves (in the finally block), not the context manager.
"""

import tempfile
from pathlib import Path

from app.core.anisotropic.analysis import run_anisotropic_analysis
from app.core.isotropic.analysis import run_isotropic_analysis
from app.core.transverse.analysis import run_transverse_analysis
from app.models.anisotropic import AnisotropicParams, AnisotropicResult
from app.models.isotropic import IsotropicParams, IsotropicResult
from app.models.transverse_isotropic import (
    TransverseParams,
    TransverseResult,
)


class AnalysisService:
    """Orchestrates analysis workflows: temp file lifecycle, core calls, cleanup.

    Injected into routes via FastAPI's Depends() mechanism (see dependencies.py).
    The data_dir is configurable — production uses settings.data_directory,
    tests can override it with a fixtures path.
    """

    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir

    def run_isotropic(
        self, params: IsotropicParams, file_content: bytes
    ) -> IsotropicResult:
        """Run isotropic FD-PBD analysis on uploaded data."""
        # Ensure data directory exists (idempotent — no-op if already there)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        tmp_path = self._save_temp_file(file_content)
        try:
            return run_isotropic_analysis(params, tmp_path)
        finally:
            # Always clean up, even if analysis throws an exception.
            # missing_ok=True prevents a second error if the file was already
            # removed (e.g., by the OS or a race condition).
            tmp_path.unlink(missing_ok=True)

    def run_anisotropic(
        self, params: AnisotropicParams, file_content: bytes
    ) -> AnisotropicResult:
        """Run anisotropic FD-PBD analysis on uploaded data."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        tmp_path = self._save_temp_file(file_content)
        try:
            return run_anisotropic_analysis(params, tmp_path)
        finally:
            tmp_path.unlink(missing_ok=True)

    def run_transverse_isotropic(
        self, params: TransverseParams, file_content: bytes
    ) -> TransverseResult:
        """Run transverse isotropic FD-PBD analysis on uploaded data."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        tmp_path = self._save_temp_file(file_content)
        try:
            return run_transverse_analysis(params, tmp_path)
        finally:
            tmp_path.unlink(missing_ok=True)

    def _save_temp_file(self, content: bytes) -> Path:
        """Write uploaded file content to a temporary file.

        Uses NamedTemporaryFile with delete=False so the file persists after
        the context manager exits — we need the path for numpy's loadtxt(),
        which reads from a file path (not a file object). The caller is
        responsible for deleting it via the try/finally pattern above.
        """
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".txt", dir=str(self.data_dir)
        ) as tmp:
            tmp.write(content)
            return Path(tmp.name)
