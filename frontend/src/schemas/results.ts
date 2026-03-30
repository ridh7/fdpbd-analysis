import { z } from "zod/v4";

export const PlotDataSchema = z.object({
  freq_fit: z.array(z.number()),
  v_corr_in_fit: z.array(z.number()),
  v_corr_out_fit: z.array(z.number()),
  v_corr_ratio_fit: z.array(z.number()),
  delta_in: z.array(z.number()),
  delta_out: z.array(z.number()),
  delta_ratio: z.array(z.number()),
});

export const FDPBDResultSchema = z.object({
  lambda_measure: z.number(),
  alpha_t_fitted: z.number(),
  t_ss_heat: z.number(),
  plot_data: PlotDataSchema,
});

export type PlotData = z.infer<typeof PlotDataSchema>;
export type FDPBDResult = z.infer<typeof FDPBDResultSchema>;

// Anisotropic result schemas
export const AnisotropicPlotDataSchema = z.object({
  model_freqs: z.array(z.number()),
  in_model: z.array(z.number()),
  out_model: z.array(z.number()),
  ratio_model: z.array(z.number()),
  exp_freqs: z.array(z.number()),
  in_exp: z.array(z.number()),
  out_exp: z.array(z.number()),
  ratio_exp: z.array(z.number()),
});

export const AnisotropicResultSchema = z.object({
  f_peak: z.number().nullable(),
  ratio_at_peak: z.number().nullable(),
  lambda_measure: z.number().nullable(),
  alpha_t_fitted: z.number().nullable(),
  t_ss_heat: z.number().nullable(),
  plot_data: AnisotropicPlotDataSchema,
});

export type AnisotropicPlotData = z.infer<typeof AnisotropicPlotDataSchema>;
export type AnisotropicResult = z.infer<typeof AnisotropicResultSchema>;

// Transverse isotropic result (same plot data shape as anisotropic)
export const TransverseResultSchema = z.object({
  f_peak: z.number().nullable(),
  ratio_at_peak: z.number().nullable(),
  plot_data: AnisotropicPlotDataSchema,
});

export type TransverseResult = z.infer<typeof TransverseResultSchema>;

// SSE fitting event schemas
export const FitProgressSchema = z.object({
  generation: z.number(),
  max_generations: z.number(),
  best_value: z.number(),
  convergence: z.number(),
  elapsed_s: z.number(),
});

export const FitResultSchema = z.object({
  fitted_param_name: z.string(),
  fitted_param_value: z.number(),
  final_cost: z.number(),
  total_time_s: z.number(),
  message: z.string(),
  model_freqs: z.array(z.number()),
  in_model: z.array(z.number()),
  out_model: z.array(z.number()),
  ratio_model: z.array(z.number()),
  exp_freqs: z.array(z.number()),
  in_exp: z.array(z.number()),
  out_exp: z.array(z.number()),
  ratio_exp: z.array(z.number()),
  f_peak: z.number().nullable(),
  ratio_at_peak: z.number().nullable(),
});

export type FitProgress = z.infer<typeof FitProgressSchema>;
export type FitResultData = z.infer<typeof FitResultSchema>;
