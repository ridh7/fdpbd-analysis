/** Laser/electronics parameters: rolloff frequency, delays, pump/probe power. Includes TOPS 1/TOPS 2 preset selector. */
import type { IsotropicParams } from "../../../schemas/params";
import type { LaserOption } from "../../../constants/presets";
import { ParamInput } from "../ParamInput";
import { PresetRadioGroup } from "../PresetRadioGroup";

interface LaserSectionProps {
  params: IsotropicParams;
  laserOption: LaserOption;
  onFieldChange: (field: keyof IsotropicParams, value: string) => void;
  onPresetChange: (option: LaserOption) => void;
  disabled?: boolean;
}

const LASER_OPTIONS = ["TOPS 1", "TOPS 2", "custom"] as const;

export function LaserSection({
  params,
  laserOption,
  onFieldChange,
  onPresetChange,
  disabled,
}: LaserSectionProps) {
  return (
    <div className="space-y-2">
      <PresetRadioGroup
        label="System"
        options={LASER_OPTIONS}
        value={laserOption}
        onChange={onPresetChange}
      />
      <ParamInput
        label="Roll-off Frequency"
        value={params.f_rolloff}
        unit="Hz"
        onChange={(v) => onFieldChange("f_rolloff", v)}
        disabled={disabled}
      />
      <ParamInput
        label="Delay 1"
        value={params.delay_1}
        unit="s"
        onChange={(v) => onFieldChange("delay_1", v)}
        disabled={disabled}
      />
      <ParamInput
        label="Delay 2"
        value={params.delay_2}
        unit="s"
        onChange={(v) => onFieldChange("delay_2", v)}
        disabled={disabled}
      />
      <ParamInput
        label="Pump Power"
        value={params.incident_pump}
        unit="mW"
        onChange={(v) => onFieldChange("incident_pump", v)}
        disabled={disabled}
      />
      <ParamInput
        label="Probe Power"
        value={params.incident_probe}
        unit="mW"
        onChange={(v) => onFieldChange("incident_probe", v)}
        disabled={disabled}
      />
    </div>
  );
}
