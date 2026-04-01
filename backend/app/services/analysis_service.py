"""Service layer for FD-PBD analysis orchestration."""

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
    """Orchestrates analysis workflows: temp file lifecycle, core calls, cleanup."""

    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir

    async def run_isotropic(
        self, params: IsotropicParams, file_content: bytes
    ) -> IsotropicResult:
        """Run isotropic FD-PBD analysis on uploaded data."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        tmp_path = self._save_temp_file(file_content)
        try:
            return run_isotropic_analysis(params, tmp_path)
        finally:
            tmp_path.unlink(missing_ok=True)

    async def run_anisotropic(
        self, params: AnisotropicParams, file_content: bytes
    ) -> AnisotropicResult:
        """Run anisotropic FD-PBD analysis on uploaded data."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        tmp_path = self._save_temp_file(file_content)
        try:
            return run_anisotropic_analysis(params, tmp_path)
        finally:
            tmp_path.unlink(missing_ok=True)

    async def run_transverse_isotropic(
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
        """Write uploaded file content to a temporary file."""
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".txt", dir=str(self.data_dir)
        ) as tmp:
            tmp.write(content)
            return Path(tmp.name)
