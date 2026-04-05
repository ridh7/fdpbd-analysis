/** Upper medium parameters: thermal conductivity, density, heat capacity, thickness of the medium above the sample (typically air). Includes air/custom preset selector. */
import type { IsotropicParams } from "../../../schemas/params";
import type { MediumOption } from "../../../constants/presets";
import { ParamInput } from "../ParamInput";
import { PresetRadioGroup } from "../PresetRadioGroup";

interface MediumSectionProps {
  params: IsotropicParams;
  mediumOption: MediumOption;
  onFieldChange: (field: keyof IsotropicParams, value: string) => void;
  onPresetChange: (option: MediumOption) => void;
  disabled?: boolean;
}

const MEDIUM_OPTIONS = ["air", "custom"] as const;

export function MediumSection({
  params,
  mediumOption,
  onFieldChange,
  onPresetChange,
  disabled,
}: MediumSectionProps) {
  return (
    <div className="space-y-2">
      <PresetRadioGroup
        label="Medium"
        options={MEDIUM_OPTIONS}
        value={mediumOption}
        onChange={onPresetChange}
      />
      <ParamInput
        label={"\u03BB (conductivity)"}
        value={params.lambda_up}
        unit="W/m-K"
        onChange={(v) => onFieldChange("lambda_up", v)}
        disabled={disabled}
      />
      <ParamInput
        label={"\u03B7 (diffusion ratio)"}
        value={params.eta_up}
        onChange={(v) => onFieldChange("eta_up", v)}
        disabled={disabled}
      />
      <ParamInput
        label="C (heat capacity)"
        value={params.c_up}
        unit={"J/m\u00B3-K"}
        onChange={(v) => onFieldChange("c_up", v)}
        disabled={disabled}
      />
      <ParamInput
        label="h (thickness)"
        value={params.h_up}
        unit="m"
        onChange={(v) => onFieldChange("h_up", v)}
        disabled={disabled}
      />
    </div>
  );
}
