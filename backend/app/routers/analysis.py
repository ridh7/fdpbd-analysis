"""FD-PBD analysis endpoints."""

import asyncio
import json
import logging
import tempfile
import traceback
from collections.abc import AsyncGenerator
from dataclasses import asdict
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.config import settings
from app.core.shared.fitting_de import (
    ProgressEvent,
    run_anisotropic_fit,
    run_transverse_fit,
)
from app.dependencies import get_analysis_service
from app.models.anisotropic import AnisotropicFDPBDParams, AnisotropicFDPBDResult
from app.models.fitting import AnisotropicFitParams, TransverseFitParams
from app.models.isotropic import FDPBDParams, FDPBDResult
from app.models.transverse_isotropic import (
    TransverseIsotropicParams,
    TransverseIsotropicResult,
)
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/fdpbd", tags=["analysis"])


def _parse_params(params_str: str) -> dict[str, Any]:
    """Parse JSON params string, raising 400 on invalid JSON."""
    try:
        result: dict[str, Any] = json.loads(params_str)
        return result
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=400, detail="Invalid JSON format in params"
        ) from e


@router.post("/analyze", response_model=FDPBDResult)
async def analyze_isotropic(
    params: str = Form(...),
    file: UploadFile = File(...),
    service: AnalysisService = Depends(get_analysis_service),
) -> FDPBDResult:
    """Run isotropic FD-PBD analysis with uploaded data file."""
    params_dict = _parse_params(params)

    # Handle eta_down as comma-separated string
    if isinstance(params_dict.get("eta_down"), str):
        params_dict["eta_down"] = [
            float(x) for x in params_dict["eta_down"].split(",") if x.strip()
        ]

    try:
        validated_params = FDPBDParams(**params_dict)
    except ValueError as e:
        raise HTTPException(
            status_code=422, detail=f"Parameter validation failed: {e}"
        ) from e

    content = await file.read()
    try:
        return await service.run_isotropic(validated_params, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/analyze_anisotropy", response_model=AnisotropicFDPBDResult)
async def analyze_anisotropic(
    params: str = Form(...),
    file: UploadFile = File(...),
    service: AnalysisService = Depends(get_analysis_service),
) -> AnisotropicFDPBDResult:
    """Run anisotropic FD-PBD analysis with uploaded data file."""
    params_dict = _parse_params(params)

    try:
        validated_params = AnisotropicFDPBDParams(**params_dict)
    except ValueError as e:
        raise HTTPException(
            status_code=422, detail=f"Parameter validation failed: {e}"
        ) from e

    content = await file.read()
    try:
        return await service.run_anisotropic(validated_params, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/analyze_transverse", response_model=TransverseIsotropicResult)
async def analyze_transverse(
    params: str = Form(...),
    file: UploadFile = File(...),
    service: AnalysisService = Depends(get_analysis_service),
) -> TransverseIsotropicResult:
    """Run transverse isotropic FD-PBD analysis with uploaded data file."""
    params_dict = _parse_params(params)

    try:
        validated_params = TransverseIsotropicParams(**params_dict)
    except ValueError as e:
        raise HTTPException(
            status_code=422, detail=f"Parameter validation failed: {e}"
        ) from e

    content = await file.read()
    try:
        return await service.run_transverse_isotropic(validated_params, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


def _sse_event(event: str, data: str) -> str:
    """Format a Server-Sent Event."""
    return f"event: {event}\ndata: {data}\n\n"


async def _run_fit_sse(
    fit_func: Any,
    validated_params: Any,
    file_content: bytes,
) -> AsyncGenerator[str, None]:
    """Run a DE fit in a thread, streaming progress as SSE events."""
    data_dir = Path(settings.data_directory)
    data_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(
        delete=False, suffix=".txt", dir=str(data_dir)
    ) as tmp:
        tmp.write(file_content)
        tmp_path = tmp.name

    loop = asyncio.get_event_loop()
    queue: asyncio.Queue[ProgressEvent | None] = asyncio.Queue()

    def on_progress(event: ProgressEvent) -> None:
        loop.call_soon_threadsafe(queue.put_nowait, event)

    async def run_in_thread() -> Any:
        return await asyncio.to_thread(
            fit_func, validated_params, tmp_path, on_progress
        )

    task = asyncio.create_task(run_in_thread())

    try:
        while not task.done():
            try:
                event = await asyncio.wait_for(queue.get(), timeout=0.5)
                if event is not None:
                    yield _sse_event("progress", json.dumps(asdict(event)))
            except asyncio.TimeoutError:
                continue

        # Drain any remaining progress events
        while not queue.empty():
            event = queue.get_nowait()
            if event is not None:
                yield _sse_event("progress", json.dumps(asdict(event)))

        result = await task
        result_dict = asdict(result)
        yield _sse_event("result", json.dumps(result_dict))
    except Exception as e:
        logger.error("Fitting error:\n%s", traceback.format_exc())
        yield _sse_event("error", json.dumps({"detail": str(e)}))
    finally:
        Path(tmp_path).unlink(missing_ok=True)


@router.post("/fit_anisotropy")
async def fit_anisotropic(
    params: str = Form(...),
    file: UploadFile = File(...),
) -> StreamingResponse:
    """Run anisotropic DE fitting, streaming progress via SSE."""
    params_dict = _parse_params(params)
    try:
        validated_params = AnisotropicFitParams(**params_dict)
    except ValueError as e:
        raise HTTPException(
            status_code=422, detail=f"Parameter validation failed: {e}"
        ) from e

    content = await file.read()
    return StreamingResponse(
        _run_fit_sse(run_anisotropic_fit, validated_params, content),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/fit_transverse")
async def fit_transverse(
    params: str = Form(...),
    file: UploadFile = File(...),
) -> StreamingResponse:
    """Run transverse isotropic DE fitting, streaming progress via SSE."""
    params_dict = _parse_params(params)
    try:
        validated_params = TransverseFitParams(**params_dict)
    except ValueError as e:
        raise HTTPException(
            status_code=422, detail=f"Parameter validation failed: {e}"
        ) from e

    content = await file.read()
    return StreamingResponse(
        _run_fit_sse(run_transverse_fit, validated_params, content),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
