/** Transverse isotropic detection parameters: fixed sum voltage (v_sum_fixed), probe correction (c_probe), and interfacial thermal conductance (g_int). Only shown in transverse isotropic mode. */
import type { TransverseExtra } from "../../../schemas/params";
import { ParamInput } from "../ParamInput";

interface TransverseDetectionSectionProps {
  params: TransverseExtra;
  onFieldChange: (field: keyof TransverseExtra, value: string) => void;
  disabled?: boolean;
}

export function TransverseDetectionSection({
  params,
  onFieldChange,
  disabled,
}: TransverseDetectionSectionProps) {
  return (
    <div className="space-y-2">
      <ParamInput
        label="V_sum (fixed)"
        value={params.v_sum_fixed}
        unit="V"
        onChange={(v) => onFieldChange("v_sum_fixed", v)}
        disabled={disabled}
      />
      <ParamInput
        label="c_probe"
        value={params.c_probe}
        onChange={(v) => onFieldChange("c_probe", v)}
        disabled={disabled}
      />
      <ParamInput
        label="G_int (boundary)"
        value={params.g_int}
        unit={"W/m\u00B2-K"}
        onChange={(v) => onFieldChange("g_int", v)}
        disabled={disabled}
      />
    </div>
  );
}
