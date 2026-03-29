import type { IsotropicParams } from "../../../schemas/params";
import type { LensOption } from "../../../constants/presets";
import { ParamInput } from "../ParamInput";
import { PresetRadioGroup } from "../PresetRadioGroup";

interface LensSectionProps {
  params: IsotropicParams;
  lensOption: LensOption;
  onFieldChange: (field: keyof IsotropicParams, value: string) => void;
  onPresetChange: (option: LensOption) => void;
  disabled?: boolean;
}

const LENS_OPTIONS = ["5x", "10x", "20x", "custom"] as const;

export function LensSection({
  params,
  lensOption,
  onFieldChange,
  onPresetChange,
  disabled,
}: LensSectionProps) {
  return (
    <div className="space-y-2">
      <PresetRadioGroup
        label="Objective"
        options={LENS_OPTIONS}
        value={lensOption}
        onChange={onPresetChange}
      />
      <ParamInput
        label="Beam Radius (w_rms)"
        value={params.w_rms}
        unit={"\u00B5m"}
        onChange={(v) => onFieldChange("w_rms", v)}
        disabled={disabled}
      />
      <ParamInput
        label="Pump-Probe Offset"
        value={params.x_offset}
        unit={"\u00B5m"}
        onChange={(v) => onFieldChange("x_offset", v)}
        disabled={disabled}
      />
      <ParamInput
        label="Lens Transmittance"
        value={params.lens_transmittance}
        onChange={(v) => onFieldChange("lens_transmittance", v)}
        disabled={disabled}
      />
      <ParamInput
        label="Detector Factor"
        value={params.detector_factor}
        unit="1/rad"
        onChange={(v) => onFieldChange("detector_factor", v)}
        disabled={disabled}
      />
    </div>
  );
}
