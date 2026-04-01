import type { FitProgress, FitResultData } from "../../schemas/results";
import { Button } from "../ui/Button";

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
      <div className="rounded bg-(--status-error-bg) px-3 py-1.5 text-sm text-(--status-error-text)">
        Fitting error: {error}
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-2 rounded bg-(--status-success-bg) px-3 py-3 text-sm text-(--status-success-text)">
        <div className="font-medium">Fitting Complete</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-(--text-muted)">Fitted Parameter:</span>
          <span>{result.fitted_param_name}</span>
          <span className="text-(--text-muted)">Fitted Value:</span>
          <span>{result.fitted_param_value.toExponential(4)}</span>
          <span className="text-(--text-muted)">Final Cost:</span>
          <span>{result.final_cost.toExponential(4)}</span>
          <span className="text-(--text-muted)">Total Time:</span>
          <span>{result.total_time_s.toFixed(1)}s</span>
          {result.f_peak != null && (
            <>
              <span className="text-(--text-muted)">Peak Frequency:</span>
              <span>{result.f_peak.toFixed(1)} Hz</span>
            </>
          )}
          {result.ratio_at_peak != null && (
            <>
              <span className="text-(--text-muted)">Ratio at Peak:</span>
              <span>{result.ratio_at_peak.toFixed(4)}</span>
            </>
          )}
        </div>
        <div className="text-xs text-(--text-placeholder)">{result.message}</div>
      </div>
    );
  }

  if (!isFitting && !progress) {
    return null;
  }

  if (isFitting && !progress) {
    return (
      <div className="space-y-2 rounded bg-(--status-info-bg) px-3 py-3 text-sm text-(--status-info-text)">
        <div className="font-medium">Starting DE fitting...</div>
        <div className="text-xs text-(--text-muted)">
          Evaluating initial population. First progress update will appear after
          generation 1 completes.
        </div>
        {/* Indeterminate sliding progress bar */}
        <div className="h-2 overflow-hidden rounded-full bg-(--progress-bar-bg)">
          <div className="h-full w-1/3 animate-slide rounded-full bg-(--progress-bar-fill)" />
        </div>
      </div>
    );
  }

  if (!progress) return null;

  const pct = (progress.generation / progress.max_generations) * 100;

  return (
    <div className="space-y-2 rounded bg-(--status-info-bg) px-3 py-3 text-sm text-(--status-info-text)">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          DE Fitting: Generation {progress.generation} / {progress.max_generations}
        </span>
        <Button variant="danger" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-(--progress-bar-bg)">
        <div
          className="h-full rounded-full bg-(--progress-bar-fill) transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-(--text-muted)">
        <span>Best: {progress.best_value.toExponential(4)}</span>
        <span>Conv: {progress.convergence.toExponential(2)}</span>
        <span>Elapsed: {progress.elapsed_s.toFixed(1)}s</span>
      </div>
    </div>
  );
}
