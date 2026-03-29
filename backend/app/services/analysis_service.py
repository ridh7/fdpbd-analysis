"""Service layer for FD-PBD analysis orchestration."""

import tempfile
from pathlib import Path

from app.core.isotropic.analysis import run_fdpbd_analysis
from app.models.isotropic import FDPBDParams, FDPBDResult


class AnalysisService:
    """Orchestrates analysis workflows: temp file lifecycle, core calls, cleanup."""

    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir

    async def run_isotropic(
        self, params: FDPBDParams, file_content: bytes
    ) -> FDPBDResult:
        """Run isotropic FD-PBD analysis on uploaded data."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        tmp_path = self._save_temp_file(file_content)
        try:
            return run_fdpbd_analysis(params, tmp_path)
        finally:
            tmp_path.unlink(missing_ok=True)

    def _save_temp_file(self, content: bytes) -> Path:
        """Write uploaded file content to a temporary file."""
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".txt", dir=str(self.data_dir)
        ) as tmp:
            tmp.write(content)
            return Path(tmp.name)
