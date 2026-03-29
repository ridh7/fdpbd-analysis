import type { IsotropicParams } from "../../../schemas/params";
import { ParamInput } from "../ParamInput";

interface TransducerSectionProps {
  params: IsotropicParams;
  onFieldChange: (field: keyof IsotropicParams, value: string) => void;
  onArrayFieldChange: (
    field: "lambda_down" | "c_down" | "h_down",
    index: number,
    value: string,
  ) => void;
  disabled?: boolean;
}

export function TransducerSection({
  params,
  onFieldChange,
  onArrayFieldChange,
  disabled,
}: TransducerSectionProps) {
  return (
    <div className="space-y-2">
      <ParamInput
        label="n (real)"
        value={params.n_al}
        onChange={(v) => onFieldChange("n_al", v)}
        disabled={disabled}
      />
      <ParamInput
        label="k (imaginary)"
        value={params.k_al}
        onChange={(v) => onFieldChange("k_al", v)}
        disabled={disabled}
      />
      <ParamInput
        label={"\u03BB (conductivity)"}
        value={params.lambda_down[0]}
        unit="W/m-K"
        onChange={(v) => onArrayFieldChange("lambda_down", 0, v)}
        disabled={disabled}
      />
      <ParamInput
        label="C (heat capacity)"
        value={params.c_down[0]}
        unit={"J/cm\u00B3-K"}
        onChange={(v) => onArrayFieldChange("c_down", 0, v)}
        disabled={disabled}
      />
      <ParamInput
        label="h (thickness)"
        value={params.h_down[0]}
        unit={"\u00B5m"}
        onChange={(v) => onArrayFieldChange("h_down", 0, v)}
        disabled={disabled}
      />
    </div>
  );
}
