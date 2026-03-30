"""Pydantic models for DE fitting configuration and SSE messages."""

from pydantic import BaseModel, Field


class FitConfig(BaseModel):
    """Configuration for differential evolution fitting."""

    parameter_to_fit: str = Field(description="Name of the layer2 parameter to fit")
    bounds_min: float = Field(description="Lower bound for the parameter")
    bounds_max: float = Field(description="Upper bound for the parameter")
    fixed_values: dict[str, float] = Field(
        default_factory=dict,
        description="Fixed values for other fittable parameters during this fit",
    )
    max_iterations: int = Field(default=20, gt=0)
    population_size: int = Field(default=8, gt=0)
    tolerance: float = Field(default=1e-3, gt=0)


class AnisotropicFitParams(BaseModel):
    """Full params for an anisotropic DE fit run (analysis params + fit config)."""

    # All analysis params are embedded directly
    f_rolloff: float = Field(gt=0)
    delay_1: float
    delay_2: float
    lambda_down: list[float] = Field(min_length=1)
    c_down: list[float] = Field(min_length=1)
    h_down: list[float] = Field(min_length=1)
    incident_pump: float = Field(gt=0)
    w_rms: float = Field(gt=0)
    x_offset: float
    phi: float
    lens_transmittance: float = Field(gt=0, le=1)
    detector_factor: float
    n_al: float
    k_al: float
    lambda_up: float = Field(gt=0)
    c_up: float = Field(gt=0)
    rho: float = Field(gt=0)
    alphaT: float
    C11_0: float = Field(gt=0)
    C12_0: float
    C44_0: float = Field(gt=0)
    lambda_down_x_sample: float = Field(gt=0)
    lambda_down_y_sample: float = Field(gt=0)
    lambda_down_z_sample: float = Field(gt=0)
    rho_sample: float = Field(gt=0)
    C11_0_sample: float = Field(gt=0)
    C12_0_sample: float
    C13_0_sample: float
    C33_0_sample: float = Field(gt=0)
    C44_0_sample: float = Field(gt=0)
    alphaT_perp: float
    alphaT_para: float
    # Fit config
    fit_config: FitConfig


class TransverseFitParams(BaseModel):
    """Full params for a transverse isotropic DE fit run."""

    # All analysis params
    f_rolloff: float = Field(gt=0)
    delay_1: float
    delay_2: float
    incident_pump: float = Field(gt=0)
    v_sum_fixed: float = Field(gt=0)
    w_rms: float = Field(gt=0)
    r_0: float
    lens_transmittance: float = Field(gt=0, le=1)
    detector_gain: float
    c_probe: float = Field(gt=0)
    n_al: float
    k_al: float
    g_int: float = Field(gt=0)
    n_p: int = Field(default=63, gt=0)
    model_freq_start: float = Field(default=5e3, gt=0)
    model_freq_end: float = Field(default=300.0, gt=0)
    model_freq_points: int = Field(default=40, gt=0)
    # Layer 1
    layer1_thickness: float = Field(gt=0)
    layer1_sigma: float = Field(gt=0)
    layer1_capac: float = Field(gt=0)
    layer1_rho: float = Field(gt=0)
    layer1_alphaT: float
    layer1_C11_0: float = Field(gt=0)
    layer1_C12_0: float
    layer1_C44_0: float = Field(gt=0)
    # Layer 2
    layer2_sigma_r: float = Field(gt=0)
    layer2_sigma_z: float = Field(gt=0)
    layer2_capac: float = Field(gt=0)
    layer2_rho: float = Field(gt=0)
    layer2_alphaT_perp: float
    layer2_alphaT_para: float
    layer2_C11_0: float = Field(gt=0)
    layer2_C12_0: float
    layer2_C13_0: float
    layer2_C33_0: float = Field(gt=0)
    layer2_C44_0: float = Field(gt=0)
    # Layer 3
    layer3_sigma: float = Field(gt=0)
    layer3_capac: float = Field(gt=0)
    num_middle_points: int = Field(default=15, gt=0)
    # Fit config
    fit_config: FitConfig
