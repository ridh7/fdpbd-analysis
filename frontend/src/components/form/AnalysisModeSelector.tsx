import type { AnalysisMode } from "../../constants/defaults";

interface AnalysisModeSelectorProps {
  mode: AnalysisMode;
  onChange: (mode: AnalysisMode) => void;
  disabled?: boolean;
}

const MODES: { value: AnalysisMode; label: string }[] = [
  { value: "isotropic", label: "Isotropic" },
  { value: "anisotropic", label: "Anisotropic" },
];

export function AnalysisModeSelector({
  mode,
  onChange,
  disabled,
}: AnalysisModeSelectorProps) {
  return (
    <div className="flex gap-2">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          disabled={disabled}
          className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === m.value
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          } disabled:opacity-50`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
