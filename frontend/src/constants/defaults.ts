import type { IsotropicParams, AnisotropicExtra } from "../schemas/params";

export type AnalysisMode = "isotropic" | "anisotropic";

export const ISOTROPIC_DEFAULTS: IsotropicParams = {
  f_rolloff: "95000",
  delay_1: "0.0000089",
  delay_2: "-1.3e-11",
  incident_pump: "1.06",
  incident_probe: "0.85",
  w_rms: "11.20",
  x_offset: "12.60",
  lens_transmittance: "0.93",
  detector_factor: "74.0",
  n_al: "2.9",
  k_al: "8.2",
  lambda_down: ["149.0", "0.1", "9.7"],
  eta_down: ["1.0", "1.0", "1.0"],
  c_down: ["2.44", "0.1", "2.73"],
  h_down: ["0.07", "0.001", "1"],
  niu: "0.26",
  alpha_t: "0.00001885",
  lambda_up: "0.028",
  eta_up: "1.0",
  c_up: "1192.0",
  h_up: "0.001",
};

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
