import { useReducer, useCallback } from "react";
import {
  analysisReducer,
  initialAnalysisState,
} from "../state/analysisReducer";
import { analyzeIsotropic, analyzeAnisotropic } from "../api/analysis";
import {
  buildIsotropicPayload,
  buildAnisotropicPayload,
} from "../lib/unitConversions";
import type { IsotropicParams, AnisotropicExtra } from "../schemas/params";
import type { AnalysisMode } from "../constants/defaults";

export function useAnalysis() {
  const [state, dispatch] = useReducer(analysisReducer, initialAnalysisState);

  const runAnalysis = useCallback(
    async (
      mode: AnalysisMode,
      params: IsotropicParams,
      anisotropicParams: AnisotropicExtra,
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
        } else {
          const payload = buildAnisotropicPayload(params, anisotropicParams);
          const result = await analyzeAnisotropic(payload, file);
          const timeTaken = (performance.now() - startTime) / 1000;
          dispatch({
            type: "SUCCESS",
            result: { mode: "anisotropic", data: result },
            timeTaken,
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
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
