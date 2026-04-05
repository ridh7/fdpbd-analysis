"""
Pydantic models for transverse isotropic FD-PBD analysis.

## Key differences from anisotropic:
- Uses explicit layer1_/layer2_/layer3_ prefixed field names instead of
  separate model classes (AnisotropicExtra, TransverseExtra) like the frontend.
  This is a flatter structure — everything in one model.
- The sample (layer 2) has only TWO conductivities: sigma_r (in-plane) and
  sigma_z (through-plane), because transverse isotropy means the material is
  symmetric within the plane (x=y). Anisotropic has three (x, y, z independently).
- Includes simulation grid parameters (n_p, model_freq_start/end/points) that
  control the resolution of the model computation. These have defaults so the
  frontend doesn't need to expose them unless advanced tuning is needed.
- Adds thermal boundary conductance (g_int) which models the thermal resistance
  at the interface between the transducer film and the sample.
- TransverseResult is simpler than AnisotropicResult — only f_peak and
  ratio_at_peak (no lambda_measure, alpha_t_fitted, t_ss_heat) because the
  transverse model focuses on peak detection rather than conductivity extraction.
"""

from pydantic import BaseModel, Field


class TransverseParams(BaseModel):
    """Input parameters for transverse isotropic FD-PBD analysis (SI units)."""

    # --- Laser / Electronics (same as other modes) ---
    f_rolloff: float = Field(gt=0)
    delay_1: float
    delay_2: float

    # --- Optical / Detection ---
    incident_pump: float = Field(gt=0)
    v_sum_fixed: float = Field(gt=0)  # fixed DC sum voltage for normalization
    w_rms: float = Field(gt=0)
    r_0: float = Field(description="Probe offset (m)")  # called x_offset in other modes
    lens_transmittance: float = Field(gt=0, le=1)
    detector_gain: float  # called detector_factor in other modes
    c_probe: float = Field(gt=0)  # probe beam correction factor
    n_al: float
    k_al: float

    # --- Simulation grid ---
    # These control the model computation resolution. Defaults are set so the
    # frontend doesn't need to expose them for typical use cases.
    n_p: int = Field(default=63, gt=0)  # number of integration points
    model_freq_start: float = Field(default=5e3, gt=0)  # start frequency for model (Hz)
    model_freq_end: float = Field(default=300.0, gt=0)  # end frequency for model (Hz)
    model_freq_points: int = Field(default=40, gt=0)  # number of frequency points

    # --- Thermal boundary conductance ---
    # Models the thermal resistance at the transducer-sample interface.
    # Not present in isotropic/anisotropic — unique to transverse model.
    g_int: float = Field(gt=0)

    # --- Layer 1: Transducer film (same physics as anisotropic transducer) ---
    layer1_thickness: float = Field(gt=0)
    layer1_sigma: float = Field(gt=0, description="Conductivity (W/m-K)")
    layer1_capac: float = Field(gt=0, description="Heat capacity (J/m³-K)")
    layer1_rho: float = Field(gt=0, description="Density (kg/m³)")
    layer1_alphaT: float = Field(description="CTE (1/K)")
    layer1_C11_0: float = Field(gt=0, description="Elastic C11 (Pa)")
    layer1_C12_0: float = Field(description="Elastic C12 (Pa)")
    layer1_C44_0: float = Field(gt=0, description="Elastic C44 (Pa)")

    # --- Layer 2: Sample (transversely isotropic bulk) ---
    # Only 2 conductivities (sigma_r, sigma_z) vs 3 in anisotropic (x, y, z)
    # because transverse isotropy means in-plane symmetry: sigma_x = sigma_y = sigma_r
    layer2_sigma_r: float = Field(gt=0, description="In-plane conductivity (W/m-K)")
    layer2_sigma_z: float = Field(
        gt=0, description="Through-plane conductivity (W/m-K)"
    )
    layer2_capac: float = Field(gt=0, description="Heat capacity (J/m³-K)")
    layer2_rho: float = Field(gt=0, description="Density (kg/m³)")
    layer2_alphaT_perp: float = Field(description="CTE perpendicular (1/K)")
    layer2_alphaT_para: float = Field(description="CTE parallel (1/K)")
    # Elastic stiffness tensor — 5 independent components for transverse symmetry
    # (vs 3 for cubic transducer, vs 6 for fully anisotropic)
    layer2_C11_0: float = Field(gt=0)
    layer2_C12_0: float
    layer2_C13_0: float
    layer2_C33_0: float = Field(gt=0)
    layer2_C44_0: float = Field(gt=0)

    # --- Layer 3: Medium above sample (air/water) ---
    layer3_sigma: float = Field(gt=0, description="Conductivity (W/m-K)")
    layer3_capac: float = Field(gt=0, description="Heat capacity (J/m³-K)")

    # Number of frequency points sampled from the middle of the experimental data
    # for comparison with the model curve
    num_middle_points: int = Field(default=15, gt=0)


class TransverseIsotropicPlotData(BaseModel):
    """Plot data for transverse isotropic results.

    Same shape as AnisotropicPlotData — separate frequency axes for model
    and experiment. Reused by the same frontend components (InOutPhasePlot,
    RatioPlot) via the isAnisotropicData() type guard.
    """

    model_freqs: list[float]    # model frequency points (higher resolution)
    in_model: list[float]       # model in-phase signal
    out_model: list[float]      # model out-of-phase signal
    ratio_model: list[float]    # model ratio
    exp_freqs: list[float]      # experimental frequency points
    in_exp: list[float]         # experimental in-phase signal
    out_exp: list[float]        # experimental out-of-phase signal
    ratio_exp: list[float]      # experimental ratio


class TransverseResult(BaseModel):
    """Result of transverse isotropic FD-PBD analysis.

    Simpler than AnisotropicResult — only peak detection outputs, no
    conductivity extraction (lambda_measure, alpha_t_fitted, t_ss_heat).
    The transverse model is primarily used for fitting sigma_r/sigma_z
    via DE fitting, not for direct measurement.
    """

    f_peak: float | None = Field(default=None, description="Peak frequency (Hz)")
    ratio_at_peak: float | None = Field(default=None, description="Ratio at peak")
    plot_data: TransverseIsotropicPlotData
