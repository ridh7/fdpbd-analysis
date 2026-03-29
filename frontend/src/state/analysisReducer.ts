import type { FDPBDResult } from "../schemas/results";

export interface AnalysisState {
  result: FDPBDResult | null;
  status: string;
  isProcessing: boolean;
  timeTaken: number | null;
  error: string | null;
}

export type AnalysisAction =
  | { type: "START" }
  | { type: "SUCCESS"; result: FDPBDResult; timeTaken: number }
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
