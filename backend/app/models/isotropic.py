"""Pydantic models for isotropic FD-PBD analysis."""

from pydantic import BaseModel, Field


class FDPBDParams(BaseModel):
    """Input parameters for isotropic FD-PBD analysis (SI units)."""

    f_rolloff: float = Field(gt=0, description="Amplitude frequency (Hz)")
    delay_1: float = Field(description="First delay parameter (s)")
    delay_2: float = Field(description="Second delay parameter (s)")
    lambda_down: list[float] = Field(
        min_length=3, max_length=3, description="Layer thermal conductivities (W/m-K)"
    )
    eta_down: list[float] = Field(
        min_length=3,
        max_length=3,
        description="Thermal diffusion length ratios",
    )
    c_down: list[float] = Field(
        min_length=3,
        max_length=3,
        description="Volumetric heat capacities (J/m^3-K)",
    )
    h_down: list[float] = Field(
        min_length=3, max_length=3, description="Layer thicknesses (m)"
    )
    niu: float = Field(description="Poisson's ratio")
    alpha_t: float = Field(description="Thermo-optic coefficient (1/K)")
    lambda_up: float = Field(gt=0, description="Medium thermal conductivity (W/m-K)")
    eta_up: float = Field(description="Medium diffusion length ratio")
    c_up: float = Field(gt=0, description="Medium volumetric heat capacity (J/m^3-K)")
    h_up: float = Field(gt=0, description="Medium thickness (m)")
    w_rms: float = Field(gt=0, description="Beam radius (m)")
    x_offset: float = Field(description="Pump-probe offset (m)")
    incident_pump: float = Field(gt=0, description="Pump power (W)")
    incident_probe: float = Field(gt=0, description="Probe power (W)")
    n_al: float = Field(description="Transducer refractive index (real)")
    k_al: float = Field(description="Transducer refractive index (imaginary)")
    lens_transmittance: float = Field(
        gt=0, le=1, description="Lens transmittance fraction"
    )
    detector_factor: float = Field(description="Detector sensitivity (1/rad)")


class PlotData(BaseModel):
    """Plot data arrays for isotropic analysis results."""

    freq_fit: list[float]
    v_corr_in_fit: list[float]
    v_corr_out_fit: list[float]
    v_corr_ratio_fit: list[float]
    delta_in: list[float]
    delta_out: list[float]
    delta_ratio: list[float]


class FDPBDResult(BaseModel):
    """Result of isotropic FD-PBD analysis."""

    lambda_measure: float = Field(description="Measured thermal conductivity (W/m-K)")
    alpha_t_fitted: float = Field(description="Fitted thermo-optic coefficient (1/K)")
    t_ss_heat: float = Field(description="Steady-state temperature rise (K)")
    plot_data: PlotData
