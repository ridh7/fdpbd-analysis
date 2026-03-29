"""FD-PBD analysis endpoints."""

import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.dependencies import get_analysis_service
from app.models.isotropic import FDPBDParams, FDPBDResult
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/fdpbd", tags=["analysis"])


@router.post("/analyze", response_model=FDPBDResult)
async def analyze_isotropic(
    params: str = Form(...),
    file: UploadFile = File(...),
    service: AnalysisService = Depends(get_analysis_service),
) -> FDPBDResult:
    """Run isotropic FD-PBD analysis with uploaded data file."""
    try:
        params_dict = json.loads(params)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=400, detail="Invalid JSON format in params"
        ) from e

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
    return await service.run_isotropic(validated_params, content)
