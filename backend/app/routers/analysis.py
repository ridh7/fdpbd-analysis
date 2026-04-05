"""
FD-PBD analysis endpoints — the HTTP interface to the analysis pipeline.

## Route overview:
    POST /fdpbd/analyze           → isotropic forward model (returns JSON)
    POST /fdpbd/analyze_anisotropy → anisotropic forward model (returns JSON)
    POST /fdpbd/analyze_transverse → transverse forward model (returns JSON)
    POST /fdpbd/fit_anisotropy    → anisotropic DE fitting (returns SSE stream)
    POST /fdpbd/fit_transverse    → transverse DE fitting (returns SSE stream)

## Why Form(...) + File(...) instead of JSON body?
The frontend sends multipart/form-data because it includes BOTH a JSON params
string AND a binary file upload. You can't put binary file data in a JSON body
(without base64 encoding, which inflates size by ~33%). So params are sent as
a JSON string in a form field, and the file is a separate form field.

## FastAPI imports used:
- APIRouter: groups related endpoints under a prefix (/fdpbd) and tag
- Depends(): dependency injection — see dependencies.py
- File(...) / UploadFile: handles multipart file upload, provides .read()
- Form(...): extracts a form field value (the JSON params string)
- HTTPException: returns an error response with a status code and detail message
- StreamingResponse: sends the response body incrementally (for SSE)

## SSE (Server-Sent Events) for fitting:
Forward model routes return a single JSON response (fast, ~seconds).
DE fitting takes minutes, so it uses SSE to stream progress updates:
    event: progress\ndata: {"generation": 1, ...}\n\n
    event: progress\ndata: {"generation": 2, ...}\n\n
    ...
    event: result\ndata: {"fitted_param_value": 1.23, ...}\n\n

The frontend's fitting.ts parses these via an async generator (see that file).

## asyncio bridge pattern (_run_fit_sse):
DE fitting is CPU-bound (runs in a thread via asyncio.to_thread). But SSE
needs to yield events from an async generator. The bridge:
    Thread (DE callback) → loop.call_soon_threadsafe(queue.put) → async gen yields
This lets the async generator yield SSE events as they arrive from the thread.
"""

import asyncio
import json
import logging
import tempfile
import traceback
from collections.abc import AsyncGenerator
from dataclasses import asdict
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.config import settings
from app.core.shared.fitting_de import (
    ProgressEvent,
    run_anisotropic_fit,
    run_transverse_fit,
)
from app.dependencies import get_analysis_service
from app.models.anisotropic import AnisotropicParams, AnisotropicResult
from app.models.fitting import AnisotropicFitParams, TransverseFitParams
from app.models.isotropic import IsotropicParams, IsotropicResult
from app.models.transverse_isotropic import (
    TransverseParams,
    TransverseResult,
)
from app.services.analysis_service import AnalysisService

logger = logging.getLogger(__name__)

# prefix="/fdpbd" → all routes start with /fdpbd
# tags=["analysis"] → groups these endpoints in the auto-generated docs (/docs)
router = APIRouter(prefix="/fdpbd", tags=["analysis"])


def _parse_params(params_str: str) -> dict[str, Any]:
    """Parse the JSON params string from the form field.

    This is the trust boundary — raw user input enters the system here.
    If the JSON is malformed, we return 400 (bad request) immediately
    rather than letting it propagate deeper into the pipeline.

    `from e` chains the original JSONDecodeError so the stack trace is
    preserved in logs (Python exception chaining).
    """
    try:
        result: dict[str, Any] = json.loads(params_str)
        return result
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=400, detail="Invalid JSON format in params"
        ) from e


# ---------------------------------------------------------------------------
# Forward model endpoints — return a single JSON response
# ---------------------------------------------------------------------------


@router.post("/analyze", response_model=IsotropicResult)
async def analyze_isotropic(
    params: str = Form(...),  # JSON string from multipart form
    file: UploadFile = File(...),  # the .txt data file
    service: AnalysisService = Depends(get_analysis_service),  # DI
) -> IsotropicResult:
    """Run isotropic FD-PBD analysis with uploaded data file."""
    params_dict = _parse_params(params)

    # The frontend may send eta_down as "0.01,0.01,0.01" (comma-separated
    # string) instead of a JSON array. Convert it to a list of floats.
    if isinstance(params_dict.get("eta_down"), str):
        params_dict["eta_down"] = [
            float(x) for x in params_dict["eta_down"].split(",") if x.strip()
        ]

    # Pydantic validation — catches type mismatches, missing fields, out-of-range
    # values. Returns 422 (unprocessable entity) if validation fails.
    try:
        validated_params = IsotropicParams(**params_dict)
    except ValueError as e:
        raise HTTPException(
            status_code=422, detail=f"Parameter validation failed: {e}"
        ) from e

    # Read the entire file into memory (small .txt files, <1MB typically)
    content = await file.read()
    try:
        return service.run_isotropic(validated_params, content)
    except ValueError as e:
        # 400 for domain errors (e.g., data file has wrong format)
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/analyze_anisotropy", response_model=AnisotropicResult)
async def analyze_anisotropic(
    params: str = Form(...),
    file: UploadFile = File(...),
    service: AnalysisService = Depends(get_analysis_service),
) -> AnisotropicResult:
    """Run anisotropic FD-PBD analysis with uploaded data file."""
    params_dict = _parse_params(params)

    try:
        validated_params = AnisotropicParams(**params_dict)
    except ValueError as e:
        raise HTTPException(
            status_code=422, detail=f"Parameter validation failed: {e}"
        ) from e

    content = await file.read()
    try:
        return service.run_anisotropic(validated_params, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/analyze_transverse", response_model=TransverseResult)
async def analyze_transverse(
    params: str = Form(...),
    file: UploadFile = File(...),
    service: AnalysisService = Depends(get_analysis_service),
) -> TransverseResult:
    """Run transverse isotropic FD-PBD analysis with uploaded data file."""
    params_dict = _parse_params(params)

    try:
        validated_params = TransverseParams(**params_dict)
    except ValueError as e:
        raise HTTPException(
            status_code=422, detail=f"Parameter validation failed: {e}"
        ) from e

    content = await file.read()
    try:
        return service.run_transverse_isotropic(validated_params, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


# ---------------------------------------------------------------------------
# SSE fitting infrastructure
# ---------------------------------------------------------------------------


def _sse_event(event: str, data: str) -> str:
    """Format a single Server-Sent Event.

    SSE protocol format:
        event: progress\\n
        data: {"generation": 1, ...}\\n
        \\n

    The double newline at the end signals "end of this event" to the browser.
    """
    return f"event: {event}\ndata: {data}\n\n"


async def _run_fit_sse(
    fit_func: Any,
    validated_params: Any,
    file_content: bytes,
) -> AsyncGenerator[str, None]:
    """
    Run a DE fit in a background thread, streaming progress as SSE events.

    This is the async bridge between:
    - The sync DE optimizer (runs in a thread, fires callbacks)
    - The async SSE generator (yields formatted events to the HTTP response)

    The bridge uses an asyncio.Queue:
    1. DE callback (in thread) → loop.call_soon_threadsafe(queue.put) → enqueue
    2. Async generator → await queue.get() → dequeue → yield SSE event

    call_soon_threadsafe is needed because asyncio.Queue is NOT thread-safe —
    you can't call queue.put() directly from a non-async thread. This method
    schedules the put on the event loop's thread safely.
    """
    # Save uploaded file to disk (DE fitting reads from file path)
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
        """Called from the DE thread — safely enqueues onto the async loop."""
        loop.call_soon_threadsafe(queue.put_nowait, event)

    async def run_in_thread() -> Any:
        """Run the sync fit function in a thread pool via asyncio.to_thread.

        This prevents the CPU-bound DE fitting from blocking the event loop
        (which would freeze SSE streaming and all other async handlers).
        """
        return await asyncio.to_thread(
            fit_func, validated_params, tmp_path, on_progress
        )

    # Start the fit as a background task
    task = asyncio.create_task(run_in_thread())

    try:
        # Poll the queue for progress events while the fit is running.
        # timeout=0.5 ensures we check task.done() regularly even if no
        # progress events arrive (e.g., during long generations).
        while not task.done():
            try:
                event = await asyncio.wait_for(queue.get(), timeout=0.5)
                if event is not None:
                    yield _sse_event("progress", json.dumps(asdict(event)))
            except asyncio.TimeoutError:
                continue

        # Drain any remaining progress events that arrived after task completed
        while not queue.empty():
            event = queue.get_nowait()
            if event is not None:
                yield _sse_event("progress", json.dumps(asdict(event)))

        # Send the final result as an SSE event
        result = await task
        result_dict = asdict(result)
        yield _sse_event("result", json.dumps(result_dict))
    except Exception as e:
        # Send error as SSE event (not HTTP error — the stream is already open)
        logger.error("Fitting error:\n%s", traceback.format_exc())
        yield _sse_event("error", json.dumps({"detail": str(e)}))
    finally:
        # Clean up temp file regardless of success/failure
        Path(tmp_path).unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# DE fitting endpoints — return SSE streams
# ---------------------------------------------------------------------------


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
    )
