import { useReducer, useCallback } from "react";
import {
  analysisReducer,
  initialAnalysisState,
} from "../state/analysisReducer";
import { analyzeIsotropic } from "../api/analysis";
import { buildIsotropicPayload } from "../lib/unitConversions";
import type { IsotropicParams } from "../schemas/params";

export function useAnalysis() {
  const [state, dispatch] = useReducer(analysisReducer, initialAnalysisState);

  const runAnalysis = useCallback(
    async (params: IsotropicParams, file: File) => {
      dispatch({ type: "START" });
      const startTime = performance.now();

      try {
        const payload = buildIsotropicPayload(params);
        const result = await analyzeIsotropic(payload, file);
        const timeTaken = (performance.now() - startTime) / 1000;
        dispatch({ type: "SUCCESS", result, timeTaken });
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
