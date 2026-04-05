/**
 * Default parameter values for all three FDPBD analysis modes.
 *
 * Values are stored as strings (not numbers) because they feed directly
 * into form inputs, which work with string state. This avoids repeated
 * number-to-string conversions and preserves user-entered formatting
 * (e.g., scientific notation like "1.3e-11").
 *
 * Also defines the DE (Differential Evolution) fitting configuration:
 * which parameters are fittable, their search bounds, and solver settings.
 *
 * Consumed by: useParameterForm hook, FitConfigPanel, and mode-switching logic.
 */
import type {
  IsotropicParams,
  AnisotropicExtra,
  TransverseExtra,
} from "../schemas/params";

/** The three thermal analysis modes supported by the FDPBD solver. */
export type AnalysisMode = "isotropic" | "anisotropic" | "transverse_isotropic";

/**
 * Isotropic mode defaults — based on a typical Al transducer on silicon substrate
 * measured with the 5x lens in air. Array fields represent per-layer values
 * (e.g., lambda_down has 3 layers: transducer, interface, substrate).
 */
export const ISOTROPIC_DEFAULTS: IsotropicParams = {
  f_rolloff: "95000",
  delay_1: "8.9e-6",
  delay_2: "-1.3e-11",
  incident_pump: "1.06",
  incident_probe: "0.85",
  w_rms: "11.20",
  x_offset: "12.60",
  lens_transmittance: "0.93",
  detector_factor: "74.0",
  n_al: "2.9",
  k_al: "8.2",
  lambda_down: ["149.0", "0.1", "9.7"], // W/m-K per layer: Al, interface, substrate
  eta_down: ["1.0", "1.0", "1.0"], // all layers isotropic
  c_down: ["2.44", "0.1", "2.73"], // volumetric heat capacity per layer
  h_down: ["0.07", "0.001", "1"], // thickness (µm): thin Al film, interface, thick substrate
  niu: "0.26",
  alpha_t: "1.885e-5",
  lambda_up: "0.028", // air thermal conductivity
  eta_up: "1.0",
  c_up: "1192.0",
  h_up: "0.001",
};

/**
 * Anisotropic mode extra parameters — elastic constants (Cij) and directional
 * thermal conductivities for a fully anisotropic sample. Values here are
 * representative of an epoxy-based composite on an Al transducer.
 */
export const ANISOTROPIC_DEFAULTS: AnisotropicExtra = {
  phi: "0", // degrees
  rho: "2.70", // g/cm³
  alphaT: "23.1e-6", // 1/K
  C11_0: "107.4", // GPa
  C12_0: "60.5", // GPa
  C44_0: "28.3", // GPa
  lambda_down_x_sample: "0.3", // W/m-K
  lambda_down_y_sample: "0.5", // W/m-K
  lambda_down_z_sample: "0.3", // W/m-K
  rho_sample: "1.38", // g/cm³
  C11_0_sample: "12.11", // GPa
  C12_0_sample: "5.06", // GPa
  C13_0_sample: "5.68", // GPa
  C33_0_sample: "7.06", // GPa
  C44_0_sample: "1.20", // GPa
  alphaT_perp: "70e-6", // 1/K
  alphaT_para: "60e-6", // 1/K
};

/**
 * Transverse isotropic mode defaults — in-plane symmetry (x = y) so
 * lambda_down_x and lambda_down_y are the same (sigma_r), while
 * lambda_down_z (sigma_z) differs. Fewer free parameters than full anisotropic.
 */
export const TRANSVERSE_ANISO_DEFAULTS: AnisotropicExtra = {
  phi: "0",
  rho: "2.70", // g/cm³
  alphaT: "23.1e-6", // 1/K
  C11_0: "107.4", // GPa
  C12_0: "60.5", // GPa
  C44_0: "28.3", // GPa
  lambda_down_x_sample: "0.64", // W/m-K (sigma_r)
  lambda_down_y_sample: "0.64", // W/m-K (unused, same as x)
  lambda_down_z_sample: "0.21", // W/m-K (sigma_z)
  rho_sample: "1.43", // g/cm³
  C11_0_sample: "8.9", // GPa
  C12_0_sample: "5.4", // GPa
  C13_0_sample: "5.4", // GPa
  C33_0_sample: "5.6", // GPa
  C44_0_sample: "2.1", // GPa
  alphaT_perp: "28e-6", // 1/K
  alphaT_para: "120e-6", // 1/K
};

/** Additional parameters unique to transverse isotropic fitting. */
export const TRANSVERSE_EXTRA_DEFAULTS: TransverseExtra = {
  v_sum_fixed: "0.18", // fixed beam overlap parameter
  c_probe: "0.65", // probe beam correction coefficient
  g_int: "100e6", // interfacial thermal conductance (W/m²-K)
};

// ---------------------------------------------------------------------------
// DE (Differential Evolution) fitting configuration
// ---------------------------------------------------------------------------

/** Describes a parameter that can be selected for DE curve fitting. */
export interface FittableParam {
  key: string; // backend parameter key sent to the solver
  label: string; // human-readable label shown in the UI
  defaultMin: string; // lower search bound (string for form compatibility)
  defaultMax: string; // upper search bound
}

/** Fittable parameters in full anisotropic mode (3 conductivities + 2 CTEs). */
export const ANISO_FITTABLE_PARAMS: FittableParam[] = [
  { key: "sigma_x", label: "sigma_x (W/m-K)", defaultMin: "0.01", defaultMax: "2.0" },
  { key: "sigma_y", label: "sigma_y (W/m-K)", defaultMin: "0.01", defaultMax: "2.0" },
  { key: "sigma_z", label: "sigma_z (W/m-K)", defaultMin: "0.01", defaultMax: "2.0" },
  {
    key: "alphaT_perp",
    label: "CTE perp (1/K)",
    defaultMin: "1e-6",
    defaultMax: "200e-6",
  },
  {
    key: "alphaT_para",
    label: "CTE para (1/K)",
    defaultMin: "1e-6",
    defaultMax: "200e-6",
  },
];

/** Fittable parameters in transverse isotropic mode (2 conductivities + 2 CTEs). */
export const TRANS_FITTABLE_PARAMS: FittableParam[] = [
  { key: "sigma_r", label: "sigma_r (W/m-K)", defaultMin: "0.01", defaultMax: "3.0" },
  { key: "sigma_z", label: "sigma_z (W/m-K)", defaultMin: "0.01", defaultMax: "2.0" },
  {
    key: "alphaT_perp",
    label: "CTE perp (1/K)",
    defaultMin: "1e-6",
    defaultMax: "200e-6",
  },
  {
    key: "alphaT_para",
    label: "CTE para (1/K)",
    defaultMin: "1e-6",
    defaultMax: "200e-6",
  },
];

/** UI state for the DE fitting controls — all strings for form input binding. */
export interface FitConfigState {
  parameterToFit: string;
  boundsMin: string;
  boundsMax: string;
  maxIterations: string; // DE solver max generations
  populationSize: string; // DE population (higher = more exploration, slower)
  tolerance: string; // convergence threshold for early stopping
}

/** Sensible starting configuration for DE fitting. */
export const DEFAULT_FIT_CONFIG: FitConfigState = {
  parameterToFit: "sigma_x",
  boundsMin: "0.01",
  boundsMax: "2.0",
  maxIterations: "20",
  populationSize: "8", // kept small for interactive use; increase for precision
  tolerance: "1e-3",
};
