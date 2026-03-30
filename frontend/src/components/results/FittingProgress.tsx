import type { FitProgress, FitResultData } from "../../schemas/results";

interface FittingProgressProps {
  progress: FitProgress | null;
  result: FitResultData | null;
  isFitting: boolean;
  error: string | null;
  onCancel: () => void;
}

export function FittingProgress({
  progress,
  result,
  isFitting,
  error,
  onCancel,
}: FittingProgressProps) {
  if (error) {
    return (
      <div className="rounded bg-red-900/50 px-3 py-2 text-sm text-red-300">
        Fitting error: {error}
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-2 rounded bg-green-900/50 px-3 py-3 text-sm text-green-300">
        <div className="font-medium">Fitting Complete</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-gray-400">Fitted Parameter:</span>
          <span>{result.fitted_param_name}</span>
          <span className="text-gray-400">Fitted Value:</span>
          <span>{result.fitted_param_value.toExponential(4)}</span>
          <span className="text-gray-400">Final Cost:</span>
          <span>{result.final_cost.toExponential(4)}</span>
          <span className="text-gray-400">Total Time:</span>
          <span>{result.total_time_s.toFixed(1)}s</span>
          {result.f_peak != null && (
            <>
              <span className="text-gray-400">Peak Frequency:</span>
              <span>{result.f_peak.toFixed(1)} Hz</span>
            </>
          )}
          {result.ratio_at_peak != null && (
            <>
              <span className="text-gray-400">Ratio at Peak:</span>
              <span>{result.ratio_at_peak.toFixed(4)}</span>
            </>
          )}
        </div>
        <div className="text-xs text-gray-500">{result.message}</div>
      </div>
    );
  }

  if (!isFitting && !progress) {
    return null;
  }

  if (isFitting && !progress) {
    return (
      <div className="space-y-2 rounded bg-blue-900/50 px-3 py-3 text-sm text-blue-300">
        <div className="font-medium">
          Starting DE fitting...
        </div>
        <div className="text-xs text-gray-400">
          Evaluating initial population. First progress update will appear after generation 1 completes.
        </div>
        {/* Indeterminate sliding progress bar */}
        <div className="h-2 overflow-hidden rounded-full bg-gray-700">
          <div className="h-full w-1/3 animate-slide rounded-full bg-blue-500" />
        </div>
      </div>
    );
  }

  if (!progress) return null;

  const pct = (progress.generation / progress.max_generations) * 100;

  return (
    <div className="space-y-2 rounded bg-blue-900/50 px-3 py-3 text-sm text-blue-300">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          DE Fitting: Generation {progress.generation} / {progress.max_generations}
        </span>
        <button
          onClick={onCancel}
          className="rounded bg-red-700 px-2 py-0.5 text-xs text-white hover:bg-red-600"
        >
          Cancel
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-gray-700">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
        <span>
          Best: {progress.best_value.toExponential(4)}
        </span>
        <span>
          Conv: {progress.convergence.toExponential(2)}
        </span>
        <span>
          Elapsed: {progress.elapsed_s.toFixed(1)}s
        </span>
      </div>
    </div>
  );
}
