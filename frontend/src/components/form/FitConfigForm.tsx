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
  const selectedParam = fittableParams.find(
    (p) => p.key === config.parameterToFit,
  );

  return (
    <div className="space-y-3 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        DE Fitting Configuration
      </h3>

      <div>
        <label className="mb-1 block text-xs text-gray-400">
          Parameter to Fit
        </label>
        <select
          className="w-full rounded bg-gray-700 px-2 py-1.5 text-sm text-white"
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
          <label className="mb-1 block text-xs text-gray-400">
            Lower Bound
          </label>
          <input
            type="text"
            className="w-full rounded bg-gray-700 px-2 py-1.5 text-sm text-white"
            value={config.boundsMin}
            onChange={(e) => onChange("boundsMin", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Upper Bound
          </label>
          <input
            type="text"
            className="w-full rounded bg-gray-700 px-2 py-1.5 text-sm text-white"
            value={config.boundsMax}
            onChange={(e) => onChange("boundsMax", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Max Iter
          </label>
          <input
            type="text"
            className="w-full rounded bg-gray-700 px-2 py-1.5 text-sm text-white"
            value={config.maxIterations}
            onChange={(e) => onChange("maxIterations", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Pop Size
          </label>
          <input
            type="text"
            className="w-full rounded bg-gray-700 px-2 py-1.5 text-sm text-white"
            value={config.populationSize}
            onChange={(e) => onChange("populationSize", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Tolerance</label>
          <input
            type="text"
            className="w-full rounded bg-gray-700 px-2 py-1.5 text-sm text-white"
            value={config.tolerance}
            onChange={(e) => onChange("tolerance", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {selectedParam && (
        <p className="text-xs text-gray-500">
          Fitting {selectedParam.label} with bounds [{config.boundsMin},{" "}
          {config.boundsMax}]
        </p>
      )}
    </div>
  );
}
