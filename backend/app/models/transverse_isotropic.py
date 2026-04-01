"""Pydantic models for transverse isotropic FD-PBD analysis."""

from pydantic import BaseModel, Field


class TransverseParams(BaseModel):
    """Input parameters for transverse isotropic FD-PBD analysis (SI units)."""

    # Lock-in correction
    f_rolloff: float = Field(gt=0)
    delay_1: float
    delay_2: float

    # Optical / detection
    incident_pump: float = Field(gt=0)
    v_sum_fixed: float = Field(gt=0)
    w_rms: float = Field(gt=0)
    r_0: float = Field(description="Probe offset (m)")
    lens_transmittance: float = Field(gt=0, le=1)
    detector_gain: float
    c_probe: float = Field(gt=0)
    n_al: float
    k_al: float

    # Simulation grid
    n_p: int = Field(default=63, gt=0)
    model_freq_start: float = Field(default=5e3, gt=0)
    model_freq_end: float = Field(default=300.0, gt=0)
    model_freq_points: int = Field(default=40, gt=0)

    # Thermal boundary conductance
    g_int: float = Field(gt=0)

    # Layer 1 (transducer film)
    layer1_thickness: float = Field(gt=0)
    layer1_sigma: float = Field(gt=0, description="Conductivity (W/m-K)")
    layer1_capac: float = Field(gt=0, description="Heat capacity (J/m³-K)")
    layer1_rho: float = Field(gt=0, description="Density (kg/m³)")
    layer1_alphaT: float = Field(description="CTE (1/K)")
    layer1_C11_0: float = Field(gt=0, description="Elastic C11 (Pa)")
    layer1_C12_0: float = Field(description="Elastic C12 (Pa)")
    layer1_C44_0: float = Field(gt=0, description="Elastic C44 (Pa)")

    # Layer 2 (transversely isotropic bulk)
    layer2_sigma_r: float = Field(gt=0, description="In-plane conductivity (W/m-K)")
    layer2_sigma_z: float = Field(
        gt=0, description="Through-plane conductivity (W/m-K)"
    )
    layer2_capac: float = Field(gt=0, description="Heat capacity (J/m³-K)")
    layer2_rho: float = Field(gt=0, description="Density (kg/m³)")
    layer2_alphaT_perp: float = Field(description="CTE perpendicular (1/K)")
    layer2_alphaT_para: float = Field(description="CTE parallel (1/K)")
    layer2_C11_0: float = Field(gt=0)
    layer2_C12_0: float
    layer2_C13_0: float
    layer2_C33_0: float = Field(gt=0)
    layer2_C44_0: float = Field(gt=0)

    # Layer 3 (medium above sample)
    layer3_sigma: float = Field(gt=0, description="Conductivity (W/m-K)")
    layer3_capac: float = Field(gt=0, description="Heat capacity (J/m³-K)")

    # Middle points for comparison
    num_middle_points: int = Field(default=15, gt=0)


class TransverseIsotropicPlotData(BaseModel):
    """Plot data for transverse isotropic analysis."""

    model_freqs: list[float]
    in_model: list[float]
    out_model: list[float]
    ratio_model: list[float]
    exp_freqs: list[float]
    in_exp: list[float]
    out_exp: list[float]
    ratio_exp: list[float]


class TransverseResult(BaseModel):
    """Result of transverse isotropic FD-PBD analysis."""

    f_peak: float | None = Field(default=None, description="Peak frequency (Hz)")
    ratio_at_peak: float | None = Field(default=None, description="Ratio at peak")
    plot_data: TransverseIsotropicPlotData
