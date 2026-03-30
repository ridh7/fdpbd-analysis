"""Pydantic models for anisotropic FD-PBD analysis."""

from pydantic import BaseModel, Field


class AnisotropicFDPBDParams(BaseModel):
    """Input parameters for anisotropic FD-PBD analysis (SI units)."""

    f_rolloff: float = Field(gt=0)
    delay_1: float
    delay_2: float
    lambda_down: list[float] = Field(
        min_length=1, description="Transducer conductivity"
    )
    c_down: list[float] = Field(
        min_length=1, description="Layer heat capacities (J/m^3-K)"
    )
    h_down: list[float] = Field(min_length=1, description="Layer thicknesses (m)")
    incident_pump: float = Field(gt=0)
    w_rms: float = Field(gt=0)
    x_offset: float
    phi: float = Field(description="Rotation angle (radians)")
    lens_transmittance: float = Field(gt=0, le=1)
    detector_factor: float
    n_al: float
    k_al: float
    lambda_up: float = Field(gt=0)
    c_up: float = Field(gt=0)
    # Transducer (Layer 1) elastic/thermal
    rho: float = Field(gt=0, description="Transducer density (kg/m^3)")
    alphaT: float = Field(description="Transducer CTE (1/K)")
    C11_0: float = Field(gt=0, description="Transducer C11 (Pa)")
    C12_0: float = Field(description="Transducer C12 (Pa)")
    C44_0: float = Field(gt=0, description="Transducer C44 (Pa)")
    # Sample (Layer 2) anisotropic
    lambda_down_x_sample: float = Field(gt=0, description="Sample sigma_x (W/m-K)")
    lambda_down_y_sample: float = Field(gt=0, description="Sample sigma_y (W/m-K)")
    lambda_down_z_sample: float = Field(gt=0, description="Sample sigma_z (W/m-K)")
    rho_sample: float = Field(gt=0, description="Sample density (kg/m^3)")
    C11_0_sample: float = Field(gt=0)
    C12_0_sample: float
    C13_0_sample: float
    C33_0_sample: float = Field(gt=0)
    C44_0_sample: float = Field(gt=0)
    alphaT_perp: float = Field(description="Sample CTE perpendicular (1/K)")
    alphaT_para: float = Field(description="Sample CTE parallel (1/K)")


class AnisotropicPlotData(BaseModel):
    """Typed plot data for anisotropic analysis results."""

    model_freqs: list[float]
    in_model: list[float]
    out_model: list[float]
    ratio_model: list[float]
    exp_freqs: list[float]
    in_exp: list[float]
    out_exp: list[float]
    ratio_exp: list[float]


class AnisotropicFDPBDResult(BaseModel):
    """Result of anisotropic FD-PBD analysis."""

    f_peak: float | None = Field(description="Peak out-of-phase frequency (Hz)")
    ratio_at_peak: float | None = Field(description="Ratio at peak frequency")
    lambda_measure: float | None = None
    alpha_t_fitted: float | None = None
    t_ss_heat: float | None = None
    plot_data: AnisotropicPlotData
