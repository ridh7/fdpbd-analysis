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
