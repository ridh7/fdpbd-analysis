/**
 * Parameter schemas for FD-PBD (Frequency-Domain Photothermal Beam Deflection)
 * analysis modes: isotropic, anisotropic, and transverse isotropic.
 *
 * These Zod schemas serve two purposes:
 *   1. Runtime validation -- form data is validated before submission, catching
 *      missing or malformed fields before they reach the API.
 *   2. Type inference   -- `z.infer<typeof Schema>` generates TypeScript types
 *      automatically, keeping the type definitions and validation rules in sync.
 *
 * All parameter values are typed as `z.string()` (not numbers) because they are
 * bound directly to HTML <input> elements, which always produce string values.
 * Conversion from display units (um, mW, GPa, etc.) to SI units happens in the
 * API request layer (`convertParams`) before the payload is sent to the backend.
 *
 * Backend counterparts (Pydantic models):
 *   - IsotropicParams   -> backend/app/models/isotropic.py :: IsotropicParams
 *   - AnisotropicExtra   -> backend/app/models/anisotropic.py :: AnisotropicParams
 *   - TransverseExtra    -> backend/app/models/transverse_isotropic.py :: TransverseParams
 *
 * The frontend splits parameters into a shared base (IsotropicParams) plus
 * mode-specific "Extra" schemas, while the backend defines flat, self-contained
 * Pydantic models for each mode. The conversion layer merges + transforms them
 * before submission.
 */
import { z } from "zod/v4";

/**
 * Base parameter schema shared by all analysis modes.
 *
 * Represents the core experimental setup: laser/electronics configuration,
 * optical path, transducer optical constants, the layered sample stack, and
 * the medium above the sample. These fields appear in every analysis form
 * regardless of symmetry mode.
 *
 * Values are in display units (um, mW, J/cm3-K, etc.) and converted to SI
 * before being sent to the API.
 */
export const IsotropicParamsSchema = z.object({
  // -- Laser / electronics --
  f_rolloff: z.string().min(1), // detector rolloff frequency (MHz)
  delay_1: z.string().min(1), // electronic delay channel 1 (ns)
  delay_2: z.string().min(1), // electronic delay channel 2 (ns)
  incident_pump: z.string().min(1), // incident pump power (mW)
  incident_probe: z.string().min(1), // incident probe power (mW)

  // -- Lens / optics --
  w_rms: z.string().min(1), // RMS beam spot size (um)
  x_offset: z.string().min(1), // probe offset distance (um)
  lens_transmittance: z.string().min(1), // lens transmittance factor (dimensionless)
  detector_factor: z.string().min(1), // detector calibration factor (dimensionless)

  // -- Transducer optical constants (Layer 1, typically aluminum) --
  n_al: z.string().min(1), // real part of refractive index
  k_al: z.string().min(1), // imaginary part (extinction coefficient)

  // -- Sample layer stack --
  // Each property is a 3-tuple: [transducer, interface, substrate].
  // This models the thin-film stack that the thermal wave propagates through.
  lambda_down: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]), // thermal conductivity per layer (W/m-K)
  eta_down: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]), // density per layer (g/cm3)
  c_down: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]), // heat capacity per layer (J/cm3-K)
  h_down: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]), // thickness per layer (nm)

  // -- Substrate bulk properties --
  niu: z.string().min(1), // Poisson's ratio (dimensionless)
  alpha_t: z.string().min(1), // coefficient of thermal expansion (1/K)

  // -- Medium above sample (typically air or vacuum) --
  lambda_up: z.string().min(1), // thermal conductivity (W/m-K)
  eta_up: z.string().min(1), // density (g/cm3)
  c_up: z.string().min(1), // heat capacity (J/cm3-K)
  h_up: z.string().min(1), // effective thickness (um)
});

// Inferred type used throughout the app for form state, default values, etc.
export type IsotropicParams = z.infer<typeof IsotropicParamsSchema>;

/**
 * Extra parameters required for anisotropic analysis, layered on top of the
 * shared IsotropicParams base.
 *
 * Anisotropic mode models materials whose thermal and elastic properties vary
 * with crystallographic direction (e.g., sapphire, quartz). This schema adds
 * the rotation angle, direction-dependent thermal conductivities, elastic
 * stiffness tensor components (Voigt notation), and per-direction thermal
 * expansion coefficients for both the transducer and the sample.
 *
 * At submission time the conversion layer merges IsotropicParams + AnisotropicExtra
 * into the flat AnisotropicParams payload expected by the backend.
 */
export const AnisotropicExtraSchema = z.object({
  // -- Geometry --
  phi: z.string().min(1), // crystal rotation angle (degrees)

  // -- Transducer elastic / thermal properties --
  rho: z.string().min(1), // density (g/cm3)
  alphaT: z.string().min(1), // coefficient of thermal expansion (1/K)
  C11_0: z.string().min(1), // elastic stiffness C11 (GPa) -- Voigt notation
  C12_0: z.string().min(1), // elastic stiffness C12 (GPa)
  C44_0: z.string().min(1), // elastic stiffness C44 (GPa)

  // -- Sample direction-dependent thermal conductivities --
  lambda_down_x_sample: z.string().min(1), // in-plane x (W/m-K)
  lambda_down_y_sample: z.string().min(1), // in-plane y (W/m-K)
  lambda_down_z_sample: z.string().min(1), // cross-plane  (W/m-K)

  // -- Sample elastic / thermal properties --
  rho_sample: z.string().min(1), // density (g/cm3)
  C11_0_sample: z.string().min(1), // elastic stiffness C11 (GPa)
  C12_0_sample: z.string().min(1), // elastic stiffness C12 (GPa)
  C13_0_sample: z.string().min(1), // elastic stiffness C13 (GPa)
  C33_0_sample: z.string().min(1), // elastic stiffness C33 (GPa)
  C44_0_sample: z.string().min(1), // elastic stiffness C44 (GPa)
  alphaT_perp: z.string().min(1), // thermal expansion, perpendicular (1/K)
  alphaT_para: z.string().min(1), // thermal expansion, parallel (1/K)
});

// Inferred type for anisotropic-specific form fields.
export type AnisotropicExtra = z.infer<typeof AnisotropicExtraSchema>;

/**
 * Extra parameters for transverse isotropic mode, layered on top of both
 * IsotropicParams and AnisotropicExtra.
 *
 * Transverse isotropic analysis is a specialized variant of the anisotropic
 * model for materials with one axis of symmetry (e.g., thin films, fiber
 * composites). It requires three additional probe/interface parameters that
 * the general anisotropic mode does not need.
 *
 * The full transverse isotropic form state is:
 *   IsotropicParams & AnisotropicExtra & TransverseExtra
 */
export const TransverseExtraSchema = z.object({
  v_sum_fixed: z.string().min(1), // fixed sum velocity (m/s)
  c_probe: z.string().min(1), // probe beam speed of light in medium (m/s)
  g_int: z.string().min(1), // interface thermal conductance (MW/m2-K)
});

// Inferred type for transverse-isotropic-specific form fields.
export type TransverseExtra = z.infer<typeof TransverseExtraSchema>;

/** UI state for the DE fitting controls — all strings for form input binding. */
export interface FitConfigState {
  parameterToFit: string;
  boundsMin: string;
  boundsMax: string;
  maxIterations: string;
  populationSize: string;
  tolerance: string;
}
