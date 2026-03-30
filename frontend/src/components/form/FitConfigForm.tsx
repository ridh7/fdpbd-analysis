import type { FitConfigState, FittableParam } from "../../constants/defaults";

interface FitConfigFormProps {
  config: FitConfigState;
  fittableParams: FittableParam[];
  onChange: (field: keyof FitConfigState, value: string) => void;
  disabled?: boolean;
}

export function FitConfigForm({
  config,
  fittableParams,
  onChange,
  disabled,
}: FitConfigFormProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
        DE Fitting Configuration
      </h3>

      <div>
        <label className="mb-1 block text-xs text-(--text-muted)">
          Parameter to Fit
        </label>
        <select
          className="w-full rounded bg-(--bg-input) border border-(--border-input) px-2 py-1.5 text-sm text-(--text-primary)"
          value={config.parameterToFit}
          onChange={(e) => {
            const param = fittableParams.find((p) => p.key === e.target.value);
            onChange("parameterToFit", e.target.value);
            if (param) {
              onChange("boundsMin", param.defaultMin);
              onChange("boundsMax", param.defaultMax);
            }
          }}
          disabled={disabled}
        >
          {fittableParams.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs text-(--text-muted)">
            Lower Bound
          </label>
          <input
            type="text"
            className="w-full rounded bg-(--bg-input) border border-(--border-input) px-2 py-1.5 text-sm text-(--text-primary)"
            value={config.boundsMin}
            onChange={(e) => onChange("boundsMin", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--text-muted)">
            Upper Bound
          </label>
          <input
            type="text"
            className="w-full rounded bg-(--bg-input) border border-(--border-input) px-2 py-1.5 text-sm text-(--text-primary)"
            value={config.boundsMax}
            onChange={(e) => onChange("boundsMax", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs text-(--text-muted)">
            Max Iter
          </label>
          <input
            type="text"
            className="w-full rounded bg-(--bg-input) border border-(--border-input) px-2 py-1.5 text-sm text-(--text-primary)"
            value={config.maxIterations}
            onChange={(e) => onChange("maxIterations", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--text-muted)">
            Pop Size
          </label>
          <input
            type="text"
            className="w-full rounded bg-(--bg-input) border border-(--border-input) px-2 py-1.5 text-sm text-(--text-primary)"
            value={config.populationSize}
            onChange={(e) => onChange("populationSize", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--text-muted)">Tolerance</label>
          <input
            type="text"
            className="w-full rounded bg-(--bg-input) border border-(--border-input) px-2 py-1.5 text-sm text-(--text-primary)"
            value={config.tolerance}
            onChange={(e) => onChange("tolerance", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
