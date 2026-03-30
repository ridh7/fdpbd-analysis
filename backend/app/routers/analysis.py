"""FD-PBD analysis endpoints."""

import json
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.dependencies import get_analysis_service
from app.models.anisotropic import AnisotropicFDPBDParams, AnisotropicFDPBDResult
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
    return await service.run_isotropic(validated_params, content)


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
    return await service.run_anisotropic(validated_params, content)


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
    return await service.run_transverse_isotropic(validated_params, content)
