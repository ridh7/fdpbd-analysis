import { useState, useCallback, useRef } from "react";
import { streamFit } from "../api/fitting";
import type { FitProgress, FitResultData } from "../schemas/results";
import type { AnalysisMode } from "../constants/defaults";
import type {
  IsotropicParams,
  AnisotropicExtra,
  TransverseExtra,
} from "../schemas/params";
import type { FitConfigState } from "../constants/defaults";
import {
  buildAnisotropicPayload,
  buildTransversePayload,
} from "../lib/unitConversions";

export interface FittingState {
  isFitting: boolean;
  progress: FitProgress | null;
  result: FitResultData | null;
  error: string | null;
}

export function useFitting() {
  const [state, setState] = useState<FittingState>({
    isFitting: false,
    progress: null,
    result: null,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const startFit = useCallback(
    async (
      mode: AnalysisMode,
      params: IsotropicParams,
      anisotropicParams: AnisotropicExtra,
      transverseParams: TransverseExtra,
      fitConfig: FitConfigState,
      file: File,
    ) => {
      // Cancel any existing fit
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        isFitting: true,
        progress: null,
        result: null,
        error: null,
      });

      const fitConfigPayload = {
        parameter_to_fit: fitConfig.parameterToFit,
        bounds_min: parseFloat(fitConfig.boundsMin),
        bounds_max: parseFloat(fitConfig.boundsMax),
        max_iterations: parseInt(fitConfig.maxIterations),
        population_size: parseInt(fitConfig.populationSize),
        tolerance: parseFloat(fitConfig.tolerance),
      };

      try {
        let endpoint: "/fdpbd/fit_anisotropy" | "/fdpbd/fit_transverse";
        let payload: Record<string, unknown>;

        if (mode === "anisotropic") {
          endpoint = "/fdpbd/fit_anisotropy";
          payload = {
            ...buildAnisotropicPayload(params, anisotropicParams),
            fit_config: fitConfigPayload,
          };
        } else if (mode === "transverse_isotropic") {
          endpoint = "/fdpbd/fit_transverse";
          payload = {
            ...buildTransversePayload(params, anisotropicParams, transverseParams),
            fit_config: fitConfigPayload,
          };
        } else {
          setState((s) => ({
            ...s,
            isFitting: false,
            error: "DE fitting is only available for anisotropic and transverse modes",
          }));
          return;
        }

        for await (const event of streamFit(
          endpoint,
          payload,
          file,
          controller.signal,
        )) {
          if (event.type === "progress") {
            setState((s) => ({ ...s, progress: event.data }));
          } else if (event.type === "result") {
            setState((s) => ({
              ...s,
              isFitting: false,
              result: event.data,
            }));
          } else if (event.type === "error") {
            setState((s) => ({
              ...s,
              isFitting: false,
              error: event.detail,
            }));
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setState((s) => ({ ...s, isFitting: false }));
          return;
        }
        setState((s) => ({
          ...s,
          isFitting: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    },
    [],
  );

  const cancelFit = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => ({ ...s, isFitting: false }));
  }, []);

  const resetFit = useCallback(() => {
    abortRef.current?.abort();
    setState({
      isFitting: false,
      progress: null,
      result: null,
      error: null,
    });
  }, []);

  return { ...state, startFit, cancelFit, resetFit };
}
