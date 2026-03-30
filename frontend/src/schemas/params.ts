import { z } from "zod/v4";

/**
 * Isotropic FD-PBD analysis parameters schema.
 * Values are in display units (µm, mW, J/cm³-K, etc.)
 * and converted to SI before sending to the API.
 */
export const IsotropicParamsSchema = z.object({
  // Laser/electronics
  f_rolloff: z.string().min(1),
  delay_1: z.string().min(1),
  delay_2: z.string().min(1),
  incident_pump: z.string().min(1),
  incident_probe: z.string().min(1),

  // Lens/optics
  w_rms: z.string().min(1),
  x_offset: z.string().min(1),
  lens_transmittance: z.string().min(1),
  detector_factor: z.string().min(1),

  // Transducer (Layer 1)
  n_al: z.string().min(1),
  k_al: z.string().min(1),

  // Sample layers (3 layers: transducer, interface, substrate)
  lambda_down: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
  eta_down: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
  c_down: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
  h_down: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),

  // Substrate properties
  niu: z.string().min(1),
  alpha_t: z.string().min(1),

  // Medium (above sample)
  lambda_up: z.string().min(1),
  eta_up: z.string().min(1),
  c_up: z.string().min(1),
  h_up: z.string().min(1),
});

export type IsotropicParams = z.infer<typeof IsotropicParamsSchema>;

/**
 * Additional fields for anisotropic mode (on top of shared fields).
 * Values in display units.
 */
export const AnisotropicExtraSchema = z.object({
  // Rotation angle
  phi: z.string().min(1),
  // Transducer elastic/thermal
  rho: z.string().min(1), // g/cm³
  alphaT: z.string().min(1), // 1/K
  C11_0: z.string().min(1), // GPa
  C12_0: z.string().min(1), // GPa
  C44_0: z.string().min(1), // GPa
  // Sample anisotropic conductivities
  lambda_down_x_sample: z.string().min(1), // W/m-K
  lambda_down_y_sample: z.string().min(1), // W/m-K
  lambda_down_z_sample: z.string().min(1), // W/m-K
  // Sample elastic/thermal
  rho_sample: z.string().min(1), // g/cm³
  C11_0_sample: z.string().min(1), // GPa
  C12_0_sample: z.string().min(1), // GPa
  C13_0_sample: z.string().min(1), // GPa
  C33_0_sample: z.string().min(1), // GPa
  C44_0_sample: z.string().min(1), // GPa
  alphaT_perp: z.string().min(1), // 1/K
  alphaT_para: z.string().min(1), // 1/K
});

export type AnisotropicExtra = z.infer<typeof AnisotropicExtraSchema>;
