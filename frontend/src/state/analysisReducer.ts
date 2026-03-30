import type {
  FDPBDResult,
  AnisotropicResult,
  TransverseResult,
} from "../schemas/results";

export type AnalysisResult =
  | { mode: "isotropic"; data: FDPBDResult }
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
