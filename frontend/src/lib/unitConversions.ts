import type { IsotropicParams, AnisotropicExtra } from "../schemas/params";

/**
 * Convert display-unit form values to SI units for the API.
 *
 * Conversions:
 * - w_rms, x_offset: µm → m (×1e-6)
 * - h_down: µm → m (×1e-6)
 * - incident_pump, incident_probe: mW → W (×1e-3)
 * - c_down: J/cm³-K → J/m³-K (×1e6)
 */
export function buildIsotropicPayload(
  params: IsotropicParams,
): Record<string, unknown> {
  return {
    f_rolloff: parseFloat(params.f_rolloff),
    delay_1: parseFloat(params.delay_1),
    delay_2: parseFloat(params.delay_2),
    incident_pump: parseFloat(params.incident_pump) * 1e-3,
    incident_probe: parseFloat(params.incident_probe) * 1e-3,
    w_rms: parseFloat(params.w_rms) * 1e-6,
    x_offset: parseFloat(params.x_offset) * 1e-6,
    lens_transmittance: parseFloat(params.lens_transmittance),
    detector_factor: parseFloat(params.detector_factor),
    n_al: parseFloat(params.n_al),
    k_al: parseFloat(params.k_al),
    lambda_down: params.lambda_down.map((v) => parseFloat(v)),
    eta_down: params.eta_down.join(","),
    c_down: params.c_down.map((v) => parseFloat(v) * 1e6),
    h_down: params.h_down.map((v) => parseFloat(v) * 1e-6),
    niu: parseFloat(params.niu),
    alpha_t: parseFloat(params.alpha_t),
    lambda_up: parseFloat(params.lambda_up),
    eta_up: parseFloat(params.eta_up),
    c_up: parseFloat(params.c_up),
    h_up: parseFloat(params.h_up),
  };
}

/**
 * Convert display-unit form values to SI units for the anisotropic API.
 *
 * Additional conversions vs isotropic:
 * - rho, rho_sample: g/cm³ → kg/m³ (×1e3)
 * - C11_0, C12_0, C44_0, all sample elastic constants: GPa → Pa (×1e9)
 * - Only uses lambda_down[0] and h_down[0] (transducer layer only)
 * - Strips eta_down, h_up, niu, alpha_t (not used in anisotropic)
 */
export function buildAnisotropicPayload(
  params: IsotropicParams,
  extra: AnisotropicExtra,
): Record<string, unknown> {
  return {
    f_rolloff: parseFloat(params.f_rolloff),
    delay_1: parseFloat(params.delay_1),
    delay_2: parseFloat(params.delay_2),
    incident_pump: parseFloat(params.incident_pump) * 1e-3,
    w_rms: parseFloat(params.w_rms) * 1e-6,
    x_offset: parseFloat(params.x_offset) * 1e-6,
    lens_transmittance: parseFloat(params.lens_transmittance),
    detector_factor: parseFloat(params.detector_factor),
    n_al: parseFloat(params.n_al),
    k_al: parseFloat(params.k_al),
    lambda_down: [parseFloat(params.lambda_down[0])],
    c_down: params.c_down.map((v) => parseFloat(v) * 1e6),
    h_down: [parseFloat(params.h_down[0]) * 1e-6],
    lambda_up: parseFloat(params.lambda_up),
    c_up: parseFloat(params.c_up),
    phi: parseFloat(extra.phi),
    rho: parseFloat(extra.rho) * 1e3,
    alphaT: parseFloat(extra.alphaT),
    C11_0: parseFloat(extra.C11_0) * 1e9,
    C12_0: parseFloat(extra.C12_0) * 1e9,
    C44_0: parseFloat(extra.C44_0) * 1e9,
    lambda_down_x_sample: parseFloat(extra.lambda_down_x_sample),
    lambda_down_y_sample: parseFloat(extra.lambda_down_y_sample),
    lambda_down_z_sample: parseFloat(extra.lambda_down_z_sample),
    rho_sample: parseFloat(extra.rho_sample) * 1e3,
    C11_0_sample: parseFloat(extra.C11_0_sample) * 1e9,
    C12_0_sample: parseFloat(extra.C12_0_sample) * 1e9,
    C13_0_sample: parseFloat(extra.C13_0_sample) * 1e9,
    C33_0_sample: parseFloat(extra.C33_0_sample) * 1e9,
    C44_0_sample: parseFloat(extra.C44_0_sample) * 1e9,
    alphaT_perp: parseFloat(extra.alphaT_perp),
    alphaT_para: parseFloat(extra.alphaT_para),
  };
}
