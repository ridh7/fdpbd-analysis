import type { AnalysisResult } from "../../state/analysisReducer";

interface ResultsSummaryProps {
  result: AnalysisResult;
  timeTaken: number | null;
}

export function ResultsSummary({ result, timeTaken }: ResultsSummaryProps) {
  return (
    <div className="rounded border border-(--border-primary) bg-(--bg-secondary) p-3">
      <h3 className="mb-3 text-sm font-semibold text-(--text-secondary)">
        Analysis Results
        <span className="ml-2 rounded bg-(--bg-tertiary) px-2 py-0.5 text-xs text-(--text-muted)">
          {result.mode === "isotropic"
            ? "Isotropic"
            : result.mode === "anisotropic"
              ? "Anisotropic"
              : "Transverse Isotropic"}
        </span>
      </h3>
      {result.mode === "isotropic" ? (
        <div className="grid grid-cols-3 gap-3">
          <ResultItem
            label={`Thermal Conductivity (\u03BB)`}
            value={result.data.lambda_measure.toFixed(4)}
            unit="W/m-K"
          />
          <ResultItem
            label={`Thermo-optic Coeff (\u03B1_T)`}
            value={result.data.alpha_t_fitted.toExponential(4)}
            unit="1/K"
          />
          <ResultItem
            label={`Steady-State Heating (\u0394T)`}
            value={result.data.t_ss_heat.toFixed(4)}
            unit="K"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <ResultItem
            label="Peak Frequency"
            value={result.data.f_peak != null ? result.data.f_peak.toFixed(0) : "N/A"}
            unit="Hz"
          />
          <ResultItem
            label="Ratio at Peak"
            value={
              result.data.ratio_at_peak != null
                ? result.data.ratio_at_peak.toFixed(4)
                : "N/A"
            }
          />
        </div>
      )}
      {timeTaken !== null && (
        <div className="mt-2 text-xs text-(--text-placeholder)">
          Completed in {timeTaken.toFixed(2)}s
        </div>
      )}
    </div>
  );
}

function ResultItem({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div>
      <div className="text-xs text-(--text-muted)">{label}</div>
      <div className="text-lg font-medium text-(--text-primary)">
        {value} {unit && <span className="text-sm text-(--text-muted)">{unit}</span>}
      </div>
    </div>
  );
}
