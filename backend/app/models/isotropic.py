"""
Pydantic models for isotropic FD-PBD analysis — request and response schemas.

## What is Pydantic?
Pydantic is Python's equivalent of Zod (used on the frontend). It validates
data at runtime using Python type hints. When the frontend sends a JSON payload,
Pydantic ensures every field exists, has the right type, and satisfies constraints
(like gt=0 meaning "must be positive") — before our code ever sees the data.

If validation fails, FastAPI automatically returns a 422 response with details
about what went wrong. We don't write any validation logic ourselves.

## Pydantic imports used here:
- BaseModel: the base class for all Pydantic models. Any class that inherits
  from BaseModel gets automatic validation, serialization (to dict/JSON), and
  type coercion (e.g., "1.5" → 1.5 for a float field).
- Field: adds constraints and metadata to individual fields. Examples:
    Field(gt=0)              → value must be > 0, rejects 0 and negatives
    Field(le=1)              → value must be <= 1
    Field(min_length=3)      → list must have at least 3 elements
    Field(description="...") → shows up in auto-generated API docs at /docs

## How these models are used:
1. IsotropicParams — the INCOMING request. The frontend sends JSON with these
   fields, FastAPI parses it into this model, validates all constraints, and
   passes it to the service layer. This is the backend equivalent of the
   frontend's IsotropicParams Zod schema in schemas/params.ts.

2. PlotData — nested model for the arrays that get plotted on the frontend.
   Contains experimental data (v_corr_*) and model predictions (delta_*).

3. IsotropicResult — the OUTGOING response. The analysis pipeline returns this,
   and FastAPI auto-serializes it to JSON. This is what the frontend's
   IsotropicResultSchema (Zod) validates on the other end.

Note: all values are in SI units. The frontend stores values as strings and
converts to SI in buildIsotropicPayload() (lib/unitConversions.ts) before
sending. By the time data reaches these models, it's already numeric and in SI.
"""

from pydantic import BaseModel, Field


class IsotropicParams(BaseModel):
    """Input parameters for isotropic FD-PBD analysis (SI units)."""

    # --- Laser / Electronics ---
    f_rolloff: float = Field(gt=0, description="Amplitude frequency (Hz)")
    delay_1: float = Field(description="First delay parameter (s)")
    delay_2: float = Field(description="Second delay parameter (s)")

    # --- Layer properties (3 layers: transducer, interface, sample) ---
    # Each is a list of 3 values, one per layer [transducer, interface, sample]
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

    # --- Sample properties ---
    niu: float = Field(description="Poisson's ratio")
    alpha_t: float = Field(description="Thermo-optic coefficient (1/K)")

    # --- Medium above sample (air/water) ---
    lambda_up: float = Field(gt=0, description="Medium thermal conductivity (W/m-K)")
    eta_up: float = Field(description="Medium diffusion length ratio")
    c_up: float = Field(gt=0, description="Medium volumetric heat capacity (J/m^3-K)")
    h_up: float = Field(gt=0, description="Medium thickness (m)")

    # --- Lens / Optics ---
    w_rms: float = Field(gt=0, description="Beam radius (m)")
    x_offset: float = Field(description="Pump-probe offset (m)")
    incident_pump: float = Field(gt=0, description="Pump power (W)")
    incident_probe: float = Field(gt=0, description="Probe power (W)")

    # --- Transducer optical properties ---
    n_al: float = Field(description="Transducer refractive index (real)")
    k_al: float = Field(description="Transducer refractive index (imaginary)")

    # --- Detection ---
    lens_transmittance: float = Field(
        gt=0, le=1, description="Lens transmittance fraction"
    )
    detector_factor: float = Field(description="Detector sensitivity (1/rad)")


class PlotData(BaseModel):
    """Plot data arrays for isotropic analysis results.

    Contains the data needed to render InOutPhasePlot and RatioPlot on the frontend.
    All arrays share the same length and correspond to the same frequency points.
    """

    freq_fit: list[float]            # modulation frequencies (Hz)
    v_corr_in_fit: list[float]       # corrected in-phase experimental signal
    v_corr_out_fit: list[float]      # corrected out-of-phase experimental signal
    v_corr_ratio_fit: list[float]    # in/out ratio from experimental data
    delta_in: list[float]            # model prediction: in-phase beam deflection
    delta_out: list[float]           # model prediction: out-of-phase beam deflection
    delta_ratio: list[float]         # model prediction: in/out ratio


class IsotropicResult(BaseModel):
    """Result of isotropic FD-PBD analysis — returned as JSON to the frontend."""

    lambda_measure: float = Field(description="Measured thermal conductivity (W/m-K)")
    alpha_t_fitted: float = Field(description="Fitted thermo-optic coefficient (1/K)")
    t_ss_heat: float = Field(description="Steady-state temperature rise (K)")
    plot_data: PlotData  # nested model — Pydantic serializes this recursively
