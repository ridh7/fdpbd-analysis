import type { AnalysisMode } from "../../constants/defaults";
import { ToggleGroup } from "../ui/ToggleGroup";

interface AnalysisModeSelectorProps {
  mode: AnalysisMode;
  onChange: (mode: AnalysisMode) => void;
  disabled?: boolean;
}

const MODES = [
  { value: "isotropic" as const, label: "Isotropic" },
  { value: "anisotropic" as const, label: "Anisotropic" },
  { value: "transverse_isotropic" as const, label: "Transverse" },
];

export function AnalysisModeSelector({
  mode,
  onChange,
  disabled,
}: AnalysisModeSelectorProps) {
  return (
    <ToggleGroup options={MODES} value={mode} onChange={onChange} disabled={disabled} />
  );
}
