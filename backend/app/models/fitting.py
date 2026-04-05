"""
Pydantic models for DE (differential evolution) fitting requests.

## Why separate fit models instead of reusing AnisotropicParams/TransverseParams?
The fit endpoints receive BOTH the analysis parameters AND the fit configuration
(which parameter to fit, bounds, iterations, etc.) in a single request. Rather
than creating a wrapper like { params: AnisotropicParams, fit_config: FitConfig },
the analysis fields are embedded directly alongside fit_config. This keeps the
JSON payload flat — matching what the frontend sends from useFitting.ts:
    { ...buildAnisotropicPayload(), fit_config: { parameter_to_fit: "sigma_x", ... } }

## FitConfig
The fit configuration that controls the DE algorithm:
- parameter_to_fit: which sample parameter to optimize (e.g., "sigma_x")
- bounds_min/max: search range for the optimizer
- fixed_values: pin other fittable params while fitting one (not currently used by frontend)
- max_iterations: DE generations before stopping
- population_size: number of candidate solutions per generation
- tolerance: convergence threshold — stop early if improvement is below this

## AnisotropicFitParams / TransverseFitParams
These duplicate the fields from AnisotropicParams / TransverseParams and add
fit_config at the end. The duplication isn't ideal but avoids Pydantic model
inheritance complexity. The field names and constraints match the corresponding
analysis models exactly.
"""

from pydantic import BaseModel, Field


class FitConfig(BaseModel):
    """Configuration for the differential evolution optimizer.

    These map to scipy.optimize.differential_evolution() parameters:
    - bounds_min/max → bounds=[(min, max)]
    - max_iterations → maxiter
    - population_size → popsize
    - tolerance → tol
    """

    parameter_to_fit: str = Field(description="Name of the layer2 parameter to fit")
    bounds_min: float = Field(description="Lower bound for the parameter")
    bounds_max: float = Field(description="Upper bound for the parameter")
    # Allows fixing other fittable parameters at specific values while fitting
    # one parameter. E.g., fix sigma_y=1.0 while fitting sigma_x.
    # Not currently exposed in the frontend UI.
    fixed_values: dict[str, float] = Field(
        default_factory=dict,  # default_factory avoids the mutable default trap —
        # Field(default={}) would share ONE dict across all instances
        description="Fixed values for other fittable parameters during this fit",
    )
    max_iterations: int = Field(default=20, gt=0)    # DE generations
    population_size: int = Field(default=8, gt=0)     # candidates per generation
    tolerance: float = Field(default=1e-3, gt=0)      # convergence threshold


class AnisotropicFitParams(BaseModel):
    """Full payload for an anisotropic DE fit run.

    Combines all AnisotropicParams fields + fit_config in one flat model.
    The frontend sends this as a single JSON object to POST /fdpbd/fit_anisotropy.
    """

    # --- Analysis params (same as AnisotropicParams) ---
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
    # Transducer elastic/thermal
    rho: float = Field(gt=0)
    alphaT: float
    C11_0: float = Field(gt=0)
    C12_0: float
    C44_0: float = Field(gt=0)
    # Sample anisotropic
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

    # --- Fit configuration (nested model) ---
    fit_config: FitConfig


class TransverseFitParams(BaseModel):
    """Full payload for a transverse isotropic DE fit run.

    Combines all TransverseParams fields + fit_config in one flat model.
    The frontend sends this as a single JSON object to POST /fdpbd/fit_transverse.
    """

    # --- Analysis params (same as TransverseParams) ---
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
    # Layer 1 (transducer)
    layer1_thickness: float = Field(gt=0)
    layer1_sigma: float = Field(gt=0)
    layer1_capac: float = Field(gt=0)
    layer1_rho: float = Field(gt=0)
    layer1_alphaT: float
    layer1_C11_0: float = Field(gt=0)
    layer1_C12_0: float
    layer1_C44_0: float = Field(gt=0)
    # Layer 2 (sample)
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
    # Layer 3 (medium)
    layer3_sigma: float = Field(gt=0)
    layer3_capac: float = Field(gt=0)
    num_middle_points: int = Field(default=15, gt=0)

    # --- Fit configuration (nested model) ---
    fit_config: FitConfig
