"""
Pydantic models for anisotropic FD-PBD analysis.

## Key differences from isotropic models:
- AnisotropicParams has direction-dependent thermal conductivities (sigma_x/y/z)
  instead of a single scalar, and elastic stiffness tensor components (C11, C12, etc.)
  for both the transducer and sample layers.
- lambda_down/c_down/h_down are min_length=1 (not fixed at 3) because the
  anisotropic model uses a different layer structure than the isotropic model.
- AnisotropicPlotData has separate frequency axes for model and experiment
  (model_freqs vs exp_freqs) because the model is computed at higher resolution.
- AnisotropicResult fields are nullable (float | None) because the analysis may
  not converge or certain quantities may not be computable for all parameter
  combinations. The isotropic model always converges, so its results are non-nullable.
"""

from pydantic import BaseModel, Field


class AnisotropicParams(BaseModel):
    """Input parameters for anisotropic FD-PBD analysis (SI units)."""

    # --- Laser / Electronics (same as isotropic) ---
    f_rolloff: float = Field(gt=0)
    delay_1: float
    delay_2: float

    # --- Layer properties ---
    # Unlike isotropic (always 3 layers), anisotropic uses variable-length lists
    lambda_down: list[float] = Field(
        min_length=1, description="Transducer conductivity"
    )
    c_down: list[float] = Field(
        min_length=1, description="Layer heat capacities (J/m^3-K)"
    )
    h_down: list[float] = Field(min_length=1, description="Layer thicknesses (m)")

    # --- Lens / Optics ---
    incident_pump: float = Field(gt=0)
    w_rms: float = Field(gt=0)
    x_offset: float
    phi: float = Field(description="Rotation angle (radians)")
    lens_transmittance: float = Field(gt=0, le=1)
    detector_factor: float

    # --- Transducer optical properties ---
    n_al: float
    k_al: float

    # --- Medium above sample ---
    lambda_up: float = Field(gt=0)
    c_up: float = Field(gt=0)

    # --- Transducer (Layer 1) elastic/thermal ---
    # These define the mechanical and thermal expansion properties of the
    # thin metal film (typically aluminum) deposited on the sample surface.
    rho: float = Field(gt=0, description="Transducer density (kg/m^3)")
    alphaT: float = Field(description="Transducer CTE (1/K)")
    # Elastic stiffness tensor components (Voigt notation) — describe how
    # the transducer deforms under stress. Named C11, C12, C44 following
    # the standard crystallography convention.
    C11_0: float = Field(gt=0, description="Transducer C11 (Pa)")
    C12_0: float = Field(description="Transducer C12 (Pa)")
    C44_0: float = Field(gt=0, description="Transducer C44 (Pa)")

    # --- Sample (Layer 2) anisotropic properties ---
    # Direction-dependent thermal conductivities — the key difference from
    # isotropic, where a single lambda_down[2] covers all directions.
    lambda_down_x_sample: float = Field(gt=0, description="Sample sigma_x (W/m-K)")
    lambda_down_y_sample: float = Field(gt=0, description="Sample sigma_y (W/m-K)")
    lambda_down_z_sample: float = Field(gt=0, description="Sample sigma_z (W/m-K)")
    rho_sample: float = Field(gt=0, description="Sample density (kg/m^3)")
    # Sample elastic stiffness tensor — more components than transducer because
    # the sample can be fully anisotropic (C13, C33 needed for non-cubic symmetry)
    C11_0_sample: float = Field(gt=0)
    C12_0_sample: float
    C13_0_sample: float
    C33_0_sample: float = Field(gt=0)
    C44_0_sample: float = Field(gt=0)
    # Thermal expansion is direction-dependent: perpendicular and parallel
    # to the sample surface (in isotropic, a single alpha_t suffices)
    alphaT_perp: float = Field(description="Sample CTE perpendicular (1/K)")
    alphaT_para: float = Field(description="Sample CTE parallel (1/K)")


class AnisotropicPlotData(BaseModel):
    """Plot data for anisotropic results — model and experiment on separate axes.

    Unlike isotropic PlotData (shared freq_fit axis), the model is computed at
    higher frequency resolution than the experimental data, so they need
    separate x-axis arrays. See InOutPhasePlot.tsx for how these are rendered.
    """

    model_freqs: list[float]    # model frequency points (higher resolution)
    in_model: list[float]       # model in-phase signal
    out_model: list[float]      # model out-of-phase signal
    ratio_model: list[float]    # model -V_in/V_out ratio
    exp_freqs: list[float]      # experimental frequency points (measured)
    in_exp: list[float]         # experimental in-phase signal
    out_exp: list[float]        # experimental out-of-phase signal
    ratio_exp: list[float]      # experimental ratio


class AnisotropicResult(BaseModel):
    """Result of anisotropic FD-PBD analysis.

    Fields are nullable (float | None) because the analysis may not converge
    or certain quantities may not be computable for all parameter combinations.
    For example, f_peak is None if the ratio curve has no clear peak.
    """

    f_peak: float | None = Field(description="Peak out-of-phase frequency (Hz)")
    ratio_at_peak: float | None = Field(description="Ratio at peak frequency")
    lambda_measure: float | None = None   # not always extractable in anisotropic mode
    alpha_t_fitted: float | None = None   # not always extractable in anisotropic mode
    t_ss_heat: float | None = None        # not always extractable in anisotropic mode
    plot_data: AnisotropicPlotData
