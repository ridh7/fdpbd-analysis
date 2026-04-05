/**
 * Analysis hook — encapsulates the forward model analysis lifecycle
 * (start → success/error → reset) behind a clean interface.
 *
 * ## What this hook does
 * Bundles the analysisReducer (state) with the API call logic (effects)
 * into a single reusable unit. The consuming component (App.tsx) just
 * calls `runAnalysis(mode, params, ..., file)` and reads the result —
 * it doesn't need to know about dispatching actions, building payloads,
 * or measuring timing.
 *
 * ## Flow
 * 1. Dispatches START → clears previous results, sets isProcessing=true
 * 2. Builds the API payload via buildPayload functions (string → number
 *    conversion + unit transformations happen here)
 * 3. Calls the appropriate analyzeX() function based on mode
 * 4. On success: measures wall-clock time, dispatches SUCCESS with the
 *    typed result wrapped in a discriminated union ({ mode, data })
 * 5. On error: dispatches ERROR with the error message
 *
 * ## Why useCallback with empty deps?
 * runAnalysis and reset are wrapped in useCallback([]) so they have
 * stable references across renders. This prevents unnecessary re-renders
 * in child components that receive these functions as props. The empty
 * dependency array is safe because the callbacks only use `dispatch`
 * (which is stable from useReducer) and imported functions (module-level).
 *
 * ## Timing
 * Uses performance.now() (microsecond precision) rather than Date.now()
 * (millisecond precision) for accurate wall-clock measurement. The time
 * includes network latency + server processing.
 */
import { useReducer, useCallback } from "react";
import { analysisReducer, initialAnalysisState } from "../state/analysisReducer";
import {
  analyzeIsotropic,
  analyzeAnisotropic,
  analyzeTransverse,
} from "../api/analysis";
import {
  buildIsotropicPayload,
  buildAnisotropicPayload,
  buildTransversePayload,
} from "../lib/unitConversions";
import type {
  IsotropicParams,
  AnisotropicExtra,
  TransverseExtra,
} from "../schemas/params";
import type { AnalysisMode } from "../constants/defaults";

export function useAnalysis() {
  const [state, dispatch] = useReducer(analysisReducer, initialAnalysisState);

  const runAnalysis = useCallback(
    async (
      mode: AnalysisMode,
      params: IsotropicParams,
      anisotropicParams: AnisotropicExtra,
      transverseParams: TransverseExtra,
      file: File,
    ) => {
      dispatch({ type: "START" });
      const startTime = performance.now();

      try {
        if (mode === "isotropic") {
          const payload = buildIsotropicPayload(params);
          const result = await analyzeIsotropic(payload, file);
          const timeTaken = (performance.now() - startTime) / 1000;
          dispatch({
            type: "SUCCESS",
            result: { mode: "isotropic", data: result },
            timeTaken,
          });
        } else if (mode === "anisotropic") {
          const payload = buildAnisotropicPayload(params, anisotropicParams);
          const result = await analyzeAnisotropic(payload, file);
          const timeTaken = (performance.now() - startTime) / 1000;
          dispatch({
            type: "SUCCESS",
            result: { mode: "anisotropic", data: result },
            timeTaken,
          });
        } else {
          const payload = buildTransversePayload(
            params,
            anisotropicParams,
            transverseParams,
          );
          const result = await analyzeTransverse(payload, file);
          const timeTaken = (performance.now() - startTime) / 1000;
          dispatch({
            type: "SUCCESS",
            result: { mode: "transverse_isotropic", data: result },
            timeTaken,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        dispatch({ type: "ERROR", error: message });
      }
    },
    [],
  );

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return { ...state, runAnalysis, reset };
}
