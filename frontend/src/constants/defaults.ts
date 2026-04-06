/**
 * Default parameter values for all three FDPBD analysis modes.
 *
 * Hardware-related fields (lens, laser, medium) are derived from presets
 * so there's a single source of truth — changing a preset value automatically
 * updates the initial form state.
 *
 * Values are stored as strings (not numbers) because they feed directly
 * into form inputs, which work with string state.
 *
 * Also defines the DE (Differential Evolution) fitting configuration:
 * which parameters are fittable, their search bounds, and solver settings.
 *
 * Consumed by: formReducer, FitConfigPanel, and mode-switching logic.
 */
import type {
  IsotropicParams,
  AnisotropicExtra,
  TransverseExtra,
} from "../schemas/params";
import { LENS_PRESETS, MEDIUM_PRESETS, LASER_PRESETS } from "./presets";
import type { LensOption, MediumOption, LaserOption } from "./presets";

/** The three thermal analysis modes supported by the FDPBD solver. */
export type AnalysisMode = "isotropic" | "anisotropic" | "transverse_isotropic";

/** Which hardware preset is selected by default for each group. */
export const INITIAL_LENS: Exclude<LensOption, "custom"> = "5x";
export const INITIAL_MEDIUM: Exclude<MediumOption, "custom"> = "air";
export const INITIAL_LASER: Exclude<LaserOption, "custom"> = "TOPS 1";

/**
 * Sample and optical defaults — fields NOT covered by any hardware preset.
 * These describe the sample under test (Al transducer on silicon substrate).
 */
const SAMPLE_DEFAULTS = {
  n_al: "2.9",
  k_al: "8.2",
  lambda_down: ["149.0", "0.1", "9.7"] as [string, string, string],
  eta_down: ["1.0", "1.0", "1.0"] as [string, string, string],
  c_down: ["2.44", "0.1", "2.73"] as [string, string, string],
  h_down: ["0.07", "0.001", "1"] as [string, string, string],
  niu: "0.26",
  alpha_t: "1.885e-5",
};

/**
 * Isotropic mode defaults — composed from hardware presets + sample defaults.
 * No values are duplicated: lens, laser, and medium fields come from presets.
 */
export const ISOTROPIC_DEFAULTS: IsotropicParams = {
  ...LENS_PRESETS[INITIAL_LENS],
  ...MEDIUM_PRESETS[INITIAL_MEDIUM],
  ...LASER_PRESETS[INITIAL_LASER],
  ...SAMPLE_DEFAULTS,
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

/** Describes a parameter that can be selected for DE curve fitting,
 *  including its own solver defaults. Each parameter may need different
 *  solver settings — e.g., conductivities converge faster than CTEs. */
export interface FittableParam {
  key: string;
  label: string;
  defaultMin: string;
  defaultMax: string;
  defaultMaxIter: string;
  defaultPopSize: string;
  defaultTolerance: string;
}

/** Fittable parameters for full anisotropic mode. */
export const ANISO_FITTABLE_PARAMS: FittableParam[] = [
  {
    key: "sigma_x",
    label: "sigma_x (W/m-K)",
    defaultMin: "0.01",
    defaultMax: "2.0",
    defaultMaxIter: "20",
    defaultPopSize: "8",
    defaultTolerance: "1e-3",
  },
  {
    key: "sigma_y",
    label: "sigma_y (W/m-K)",
    defaultMin: "0.01",
    defaultMax: "2.0",
    defaultMaxIter: "20",
    defaultPopSize: "8",
    defaultTolerance: "1e-3",
  },
  {
    key: "sigma_z",
    label: "sigma_z (W/m-K)",
    defaultMin: "0.01",
    defaultMax: "2.0",
    defaultMaxIter: "20",
    defaultPopSize: "8",
    defaultTolerance: "1e-3",
  },
  {
    key: "alphaT_perp",
    label: "CTE perp (1/K)",
    defaultMin: "1e-6",
    defaultMax: "200e-6",
    defaultMaxIter: "25",
    defaultPopSize: "10",
    defaultTolerance: "1e-3",
  },
  {
    key: "alphaT_para",
    label: "CTE para (1/K)",
    defaultMin: "1e-6",
    defaultMax: "200e-6",
    defaultMaxIter: "25",
    defaultPopSize: "10",
    defaultTolerance: "1e-3",
  },
];

/** Fittable parameters for transverse isotropic mode. */
export const TRANS_FITTABLE_PARAMS: FittableParam[] = [
  {
    key: "sigma_r",
    label: "sigma_r (W/m-K)",
    defaultMin: "0.01",
    defaultMax: "3.0",
    defaultMaxIter: "30",
    defaultPopSize: "15",
    defaultTolerance: "1e-3",
  },
  {
    key: "sigma_z",
    label: "sigma_z (W/m-K)",
    defaultMin: "0.01",
    defaultMax: "2.0",
    defaultMaxIter: "30",
    defaultPopSize: "15",
    defaultTolerance: "1e-3",
  },
  {
    key: "alphaT_perp",
    label: "CTE perp (1/K)",
    defaultMin: "1e-6",
    defaultMax: "200e-6",
    defaultMaxIter: "35",
    defaultPopSize: "15",
    defaultTolerance: "1e-3",
  },
  {
    key: "alphaT_para",
    label: "CTE para (1/K)",
    defaultMin: "1e-6",
    defaultMax: "200e-6",
    defaultMaxIter: "35",
    defaultPopSize: "15",
    defaultTolerance: "1e-3",
  },
];
