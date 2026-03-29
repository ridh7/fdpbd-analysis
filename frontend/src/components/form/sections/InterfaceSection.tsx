import type { IsotropicParams } from "../../../schemas/params";
import { ParamInput } from "../ParamInput";

interface InterfaceSectionProps {
  params: IsotropicParams;
  onArrayFieldChange: (
    field: "lambda_down" | "eta_down" | "c_down" | "h_down",
    index: number,
    value: string,
  ) => void;
  disabled?: boolean;
}

export function InterfaceSection({
  params,
  onArrayFieldChange,
  disabled,
}: InterfaceSectionProps) {
  return (
    <div className="space-y-2">
      <ParamInput
        label={"\u03BB (conductivity)"}
        value={params.lambda_down[1]}
        unit="W/m-K"
        onChange={(v) => onArrayFieldChange("lambda_down", 1, v)}
        disabled={disabled}
      />
      <ParamInput
        label={"\u03B7 (diffusion ratio)"}
        value={params.eta_down[1]}
        onChange={(v) => onArrayFieldChange("eta_down", 1, v)}
        disabled={disabled}
      />
      <ParamInput
        label="C (heat capacity)"
        value={params.c_down[1]}
        unit={"J/cm\u00B3-K"}
        onChange={(v) => onArrayFieldChange("c_down", 1, v)}
        disabled={disabled}
      />
      <ParamInput
        label="h (thickness)"
        value={params.h_down[1]}
        unit={"\u00B5m"}
        onChange={(v) => onArrayFieldChange("h_down", 1, v)}
        disabled={disabled}
      />
    </div>
  );
}
