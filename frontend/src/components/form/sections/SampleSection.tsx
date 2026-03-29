import type { IsotropicParams } from "../../../schemas/params";
import { ParamInput } from "../ParamInput";

interface SampleSectionProps {
  params: IsotropicParams;
  onFieldChange: (field: keyof IsotropicParams, value: string) => void;
  onArrayFieldChange: (
    field: "lambda_down" | "eta_down" | "c_down" | "h_down",
    index: number,
    value: string,
  ) => void;
  disabled?: boolean;
}

export function SampleSection({
  params,
  onFieldChange,
  onArrayFieldChange,
  disabled,
}: SampleSectionProps) {
  return (
    <div className="space-y-2">
      <ParamInput
        label={"\u03BB (conductivity)"}
        value={params.lambda_down[2]}
        unit="W/m-K"
        onChange={(v) => onArrayFieldChange("lambda_down", 2, v)}
        disabled={disabled}
      />
      <ParamInput
        label={"\u03B7 (diffusion ratio)"}
        value={params.eta_down[2]}
        onChange={(v) => onArrayFieldChange("eta_down", 2, v)}
        disabled={disabled}
      />
      <ParamInput
        label="C (heat capacity)"
        value={params.c_down[2]}
        unit={"J/cm\u00B3-K"}
        onChange={(v) => onArrayFieldChange("c_down", 2, v)}
        disabled={disabled}
      />
      <ParamInput
        label="h (thickness)"
        value={params.h_down[2]}
        unit={"\u00B5m"}
        onChange={(v) => onArrayFieldChange("h_down", 2, v)}
        disabled={disabled}
      />
      <ParamInput
        label={"\u03BD (Poisson's ratio)"}
        value={params.niu}
        onChange={(v) => onFieldChange("niu", v)}
        disabled={disabled}
      />
      <ParamInput
        label={"\u03B1_T (thermo-optic)"}
        value={params.alpha_t}
        unit="1/K"
        onChange={(v) => onFieldChange("alpha_t", v)}
        disabled={disabled}
      />
    </div>
  );
}
