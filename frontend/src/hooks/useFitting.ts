/**
 * DE fitting hook — manages the lifecycle of a differential evolution
 * fitting run with real-time SSE streaming and cancellation support.
 *
 * ## Why useState instead of useReducer?
 * Unlike useAnalysis (which uses a reducer), this hook uses useState
 * because the state updates are simpler — mostly partial updates to
 * individual fields as SSE events arrive. A reducer would add ceremony
 * without much benefit here since we're updating progress incrementally
 * rather than transitioning between discrete states.
 *
 * ## AbortController lifecycle
 * Uses a ref (abortRef) to hold the current AbortController:
 *   - startFit: creates a new controller, aborts any previous one
 *   - cancelFit: aborts the current controller, resets isFitting
 *   - resetFit: aborts + clears all state (used when switching modes)
 *
 * The ref (not state) is used because changing the controller shouldn't
 * trigger a re-render, and we need to access it from stale closures.
 *
 * ## SSE event handling
 * Iterates over the async generator from streamFit() using for-await:
 *   - "progress" events: update progress state (generation, best cost, etc.)
 *   - "result" event: store final result, set isFitting=false
 *   - "error" event: store error message, set isFitting=false
 *
 * ## Cancellation behavior
 * When the user clicks Cancel:
 *   1. cancelFit() calls controller.abort()
 *   2. The fetch in streamFit() throws an AbortError
 *   3. The catch block detects AbortError by name and silently resets
 *      (no error shown to user — cancellation is intentional)
 *   4. The reader lock is released in streamFit's finally block
 *
 * Note: cancellation is client-side only — the backend continues its
 * computation until it naturally completes. Server-side cancellation
 * was attempted but reverted due to Starlette's SSE limitations.
 *
 * ## Fit config payload
 * The hook converts FitConfigState (string values from form inputs)
 * to numeric values for the API payload (parseFloat/parseInt). This
 * follows the same pattern as useAnalysis: strings in state, numbers
 * at the API boundary.
 */
import { useState, useCallback, useRef } from "react";
import { streamFit } from "../api/fitting";
import type { FitProgress, FitResultData } from "../schemas/results";
import type { AnalysisMode } from "../constants/defaults";
import type {
  IsotropicParams,
  AnisotropicExtra,
  TransverseExtra,
  FitConfigState,
} from "../schemas/params";
import type { FittableParam } from "../constants/defaults";
import {
  buildAnisotropicPayload,
  buildTransversePayload,
} from "../lib/unitConversions";

/** Build a FitConfigState from a FittableParam's defaults. */
export function buildFitConfig(param: FittableParam): FitConfigState {
  return {
    parameterToFit: param.key,
    boundsMin: param.defaultMin,
    boundsMax: param.defaultMax,
    maxIterations: param.defaultMaxIter,
    populationSize: param.defaultPopSize,
    tolerance: param.defaultTolerance,
  };
}

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
