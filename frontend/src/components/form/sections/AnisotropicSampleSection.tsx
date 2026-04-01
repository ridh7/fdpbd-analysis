import type { IsotropicParams, AnisotropicExtra } from "../../../schemas/params";
import { ParamInput } from "../ParamInput";

interface AnisotropicSampleSectionProps {
  params: AnisotropicExtra;
  sharedParams: IsotropicParams;
  onFieldChange: (field: keyof AnisotropicExtra, value: string) => void;
  onArrayFieldChange: (field: "c_down", index: number, value: string) => void;
  disabled?: boolean;
}

export function AnisotropicSampleSection({
  params,
  sharedParams,
  onFieldChange,
  onArrayFieldChange,
  disabled,
}: AnisotropicSampleSectionProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-(--text-muted)">Thermal Properties</h4>
      <ParamInput
        label="C (heat capacity)"
        value={sharedParams.c_down[2]}
        unit={"J/cm\u00B3-K"}
        onChange={(v) => onArrayFieldChange("c_down", 2, v)}
        disabled={disabled}
      />

      <h4 className="mt-3 text-xs font-medium text-(--text-muted)">
        Thermal Conductivity
      </h4>
      <ParamInput
        label={"\u03BB_x"}
        value={params.lambda_down_x_sample}
        unit="W/m-K"
        onChange={(v) => onFieldChange("lambda_down_x_sample", v)}
        disabled={disabled}
      />
      <ParamInput
        label={"\u03BB_y"}
        value={params.lambda_down_y_sample}
        unit="W/m-K"
        onChange={(v) => onFieldChange("lambda_down_y_sample", v)}
        disabled={disabled}
      />
      <ParamInput
        label={"\u03BB_z"}
        value={params.lambda_down_z_sample}
        unit="W/m-K"
        onChange={(v) => onFieldChange("lambda_down_z_sample", v)}
        disabled={disabled}
      />

      <h4 className="mt-3 text-xs font-medium text-(--text-muted)">
        Density & Elastic Constants
      </h4>
      <ParamInput
        label={"\u03C1 (density)"}
        value={params.rho_sample}
        unit={"g/cm\u00B3"}
        onChange={(v) => onFieldChange("rho_sample", v)}
        disabled={disabled}
      />
      <ParamInput
        label="C11"
        value={params.C11_0_sample}
        unit="GPa"
        onChange={(v) => onFieldChange("C11_0_sample", v)}
        disabled={disabled}
      />
      <ParamInput
        label="C12"
        value={params.C12_0_sample}
        unit="GPa"
        onChange={(v) => onFieldChange("C12_0_sample", v)}
        disabled={disabled}
      />
      <ParamInput
        label="C13"
        value={params.C13_0_sample}
        unit="GPa"
        onChange={(v) => onFieldChange("C13_0_sample", v)}
        disabled={disabled}
      />
      <ParamInput
        label="C33"
        value={params.C33_0_sample}
        unit="GPa"
        onChange={(v) => onFieldChange("C33_0_sample", v)}
        disabled={disabled}
      />
      <ParamInput
        label="C44"
        value={params.C44_0_sample}
        unit="GPa"
        onChange={(v) => onFieldChange("C44_0_sample", v)}
        disabled={disabled}
      />

      <h4 className="mt-3 text-xs font-medium text-(--text-muted)">
        Thermal Expansion
      </h4>
      <ParamInput
        label={"\u03B1_T perp"}
        value={params.alphaT_perp}
        unit="1/K"
        onChange={(v) => onFieldChange("alphaT_perp", v)}
        disabled={disabled}
      />
      <ParamInput
        label={"\u03B1_T para"}
        value={params.alphaT_para}
        unit="1/K"
        onChange={(v) => onFieldChange("alphaT_para", v)}
        disabled={disabled}
      />
    </div>
  );
}
