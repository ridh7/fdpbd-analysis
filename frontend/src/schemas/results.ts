/**
 * Result and event schemas for FD-PBD analysis responses.
 *
 * These Zod schemas validate data coming *from* the backend -- the inverse
 * direction of the params schemas. Validating API responses at runtime guards
 * against silent breakage when the backend response shape changes, and
 * `z.infer` gives us matching TypeScript types for free.
 *
 * There are three groups of schemas here:
 *   1. Forward-model results (isotropic, anisotropic, transverse isotropic)
 *      -- returned by the one-shot /analyze endpoints.
 *   2. SSE fitting events (FitProgress, FitResult)
 *      -- streamed during differential-evolution fitting via Server-Sent Events.
 *
 * Backend counterparts (Pydantic models):
 *   - PlotData / IsotropicResult       -> backend/app/models/isotropic.py
 *   - AnisotropicPlotData / Result      -> backend/app/models/anisotropic.py
 *   - TransverseResult                  -> backend/app/models/transverse_isotropic.py
 *   - FitProgress / FitResult           -> backend/app/core/shared/fitting_de.py
 */
import { z } from "zod/v4";

/**
 * Plot data returned by the isotropic forward model.
 *
 * Contains the fitted model curves and the residual (delta) arrays used to
 * render the in-phase, out-of-phase, and ratio plots in the results panel.
 */
export const PlotDataSchema = z.object({
  freq_fit: z.array(z.number()),           // modulation frequencies (Hz)
  v_corr_in_fit: z.array(z.number()),      // corrected in-phase experimental signal
  v_corr_out_fit: z.array(z.number()),     // corrected out-of-phase experimental signal
  v_corr_ratio_fit: z.array(z.number()),   // in/out ratio from experimental data
  delta_in: z.array(z.number()),           // model prediction: in-phase beam deflection
  delta_out: z.array(z.number()),          // model prediction: out-of-phase beam deflection
  delta_ratio: z.array(z.number()),        // model prediction: in/out ratio
});

/**
 * Top-level isotropic analysis result.
 *
 * Returned by the /isotropic/analyze endpoint after a single forward-model
 * evaluation. Includes the measured thermal conductivity, fitted thermal
 * expansion, steady-state heating, and the full plot data for visualization.
 */
export const IsotropicResultSchema = z.object({
  lambda_measure: z.number(),  // measured thermal conductivity (W/m-K)
  alpha_t_fitted: z.number(),  // fitted thermal expansion coefficient (1/K)
  t_ss_heat: z.number(),       // steady-state surface temperature rise (K)
  plot_data: PlotDataSchema,
});

export type PlotData = z.infer<typeof PlotDataSchema>;
export type IsotropicResult = z.infer<typeof IsotropicResultSchema>;

/**
 * Plot data for anisotropic and transverse isotropic results.
 *
 * Unlike the isotropic PlotData (which stores residuals), this schema stores
 * both the model curves and the experimental data arrays side-by-side, so the
 * frontend can overlay them on the same plot axes.
 */
export const AnisotropicPlotDataSchema = z.object({
  model_freqs: z.array(z.number()),  // model frequency points (Hz)
  in_model: z.array(z.number()),     // model in-phase signal
  out_model: z.array(z.number()),    // model out-of-phase signal
  ratio_model: z.array(z.number()),  // model ratio
  exp_freqs: z.array(z.number()),    // experimental frequency points (Hz)
  in_exp: z.array(z.number()),       // experimental in-phase signal
  out_exp: z.array(z.number()),      // experimental out-of-phase signal
  ratio_exp: z.array(z.number()),    // experimental ratio
});

/**
 * Anisotropic analysis result.
 *
 * Fields are nullable because the analysis may not converge or certain
 * quantities may not be computable for all parameter combinations.
 */
export const AnisotropicResultSchema = z.object({
  f_peak: z.number().nullable(),          // peak frequency in ratio curve (Hz)
  ratio_at_peak: z.number().nullable(),   // ratio value at the peak
  lambda_measure: z.number().nullable(),  // measured thermal conductivity (W/m-K)
  alpha_t_fitted: z.number().nullable(),  // fitted thermal expansion (1/K)
  t_ss_heat: z.number().nullable(),       // steady-state heating (K)
  plot_data: AnisotropicPlotDataSchema,
});

export type AnisotropicPlotData = z.infer<typeof AnisotropicPlotDataSchema>;
export type AnisotropicResult = z.infer<typeof AnisotropicResultSchema>;

/**
 * Transverse isotropic result.
 *
 * Reuses AnisotropicPlotDataSchema for its plot data since both modes produce
 * the same model-vs-experiment overlay format. Has fewer scalar outputs than
 * the full anisotropic result because the transverse model focuses on peak
 * detection rather than conductivity extraction.
 */
export const TransverseResultSchema = z.object({
  f_peak: z.number().nullable(),         // peak frequency in ratio curve (Hz)
  ratio_at_peak: z.number().nullable(),  // ratio value at the peak
  plot_data: AnisotropicPlotDataSchema,
});

export type TransverseResult = z.infer<typeof TransverseResultSchema>;

// ---------------------------------------------------------------------------
// SSE (Server-Sent Events) fitting schemas
//
// The differential-evolution (DE) fitting process streams progress updates
// and a final result over an SSE connection. These schemas validate each
// event payload as it arrives, ensuring the UI can safely destructure the
// data without runtime surprises.
// ---------------------------------------------------------------------------

/**
 * Progress event emitted once per DE generation during fitting.
 * Drives the progress bar and live convergence readout in the UI.
 */
export const FitProgressSchema = z.object({
  generation: z.number(),       // current generation index
  max_generations: z.number(),  // total generations configured
  best_value: z.number(),       // best cost function value so far
  convergence: z.number(),      // convergence metric (lower = more converged)
  elapsed_s: z.number(),        // wall-clock time since fitting started (s)
});

/**
 * Final result event emitted when DE fitting completes.
 *
 * Contains the optimized parameter value, cost metrics, a human-readable
 * message, and the full model-vs-experiment arrays so the UI can immediately
 * re-render the plots with the fitted curves without a separate API call.
 */
export const FitResultSchema = z.object({
  fitted_param_name: z.string(),        // name of the parameter that was fitted
  fitted_param_value: z.number(),       // optimized value (SI units)
  final_cost: z.number(),               // final cost function value
  total_time_s: z.number(),             // total fitting wall-clock time (s)
  message: z.string(),                  // human-readable summary / status
  model_freqs: z.array(z.number()),     // fitted model frequencies (Hz)
  in_model: z.array(z.number()),        // fitted in-phase signal
  out_model: z.array(z.number()),       // fitted out-of-phase signal
  ratio_model: z.array(z.number()),     // fitted ratio
  exp_freqs: z.array(z.number()),       // experimental frequencies (Hz)
  in_exp: z.array(z.number()),          // experimental in-phase signal
  out_exp: z.array(z.number()),         // experimental out-of-phase signal
  ratio_exp: z.array(z.number()),       // experimental ratio
  f_peak: z.number().nullable(),        // peak frequency (Hz), if detected
  ratio_at_peak: z.number().nullable(), // ratio at peak, if detected
});

export type FitProgress = z.infer<typeof FitProgressSchema>;
export type FitResultData = z.infer<typeof FitResultSchema>;
