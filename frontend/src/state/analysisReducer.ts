/**
 * Analysis state reducer — manages the lifecycle of a forward model
 * analysis request (not DE fitting, which uses useFitting instead).
 *
 * ## State machine
 * The reducer models a simple request lifecycle:
 *   IDLE → START → SUCCESS or ERROR → RESET back to IDLE
 *
 * - START: clears previous results/errors, sets isProcessing=true
 * - SUCCESS: stores the typed result + wall-clock time, clears processing
 * - ERROR: stores error message, clears processing (keeps prior result null)
 * - RESET: returns to initial idle state
 *
 * ## Discriminated union for results
 * AnalysisResult uses a discriminated union on the `mode` field so that
 * downstream components can narrow the type:
 *   if (result.mode === "isotropic") → result.data is IsotropicResult
 *   if (result.mode === "anisotropic") → result.data is AnisotropicResult
 *   etc.
 * This avoids unsafe type assertions and gives TypeScript full knowledge
 * of which fields exist on `data` based on the mode check.
 *
 * ## Why a separate reducer from formReducer?
 * Form state (user inputs) and analysis state (server responses) have
 * different lifecycles. Form state persists across multiple runs; analysis
 * state resets on each new run. Separating them keeps each reducer focused
 * and prevents cross-contamination (e.g., a failed analysis shouldn't
 * clear the user's form inputs).
 */
import type {
  IsotropicResult,
  AnisotropicResult,
  TransverseResult,
} from "../schemas/results";

export type AnalysisResult =
  | { mode: "isotropic"; data: IsotropicResult }
  | { mode: "anisotropic"; data: AnisotropicResult }
  | { mode: "transverse_isotropic"; data: TransverseResult };

export interface AnalysisState {
  result: AnalysisResult | null;
  status: string;
  isProcessing: boolean;
  timeTaken: number | null;
  error: string | null;
}

export type AnalysisAction =
  | { type: "START" }
  | { type: "SUCCESS"; result: AnalysisResult; timeTaken: number }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

export const initialAnalysisState: AnalysisState = {
  result: null,
  status: "",
  isProcessing: false,
  timeTaken: null,
  error: null,
};

export function analysisReducer(
  state: AnalysisState,
  action: AnalysisAction,
): AnalysisState {
  switch (action.type) {
    case "START":
      return {
        ...state,
        isProcessing: true,
        status: "Processing...",
        error: null,
        result: null,
        timeTaken: null,
      };

    case "SUCCESS":
      return {
        ...state,
        isProcessing: false,
        status: "Analysis completed",
        result: action.result,
        timeTaken: action.timeTaken,
        error: null,
      };

    case "ERROR":
      return {
        ...state,
        isProcessing: false,
        status: `Error: ${action.error}`,
        error: action.error,
      };

    case "RESET":
      return initialAnalysisState;
  }
}
