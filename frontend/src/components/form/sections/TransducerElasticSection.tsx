/** Transducer elastic/thermal properties for anisotropic modes: density (rho), thermal expansion (alphaT), and elastic stiffness constants (C11, C12, C44) in Voigt notation. Only shown in anisotropic/transverse modes. */
import type { AnisotropicExtra } from "../../../schemas/params";
import { ParamInput } from "../ParamInput";

interface TransducerElasticSectionProps {
  params: AnisotropicExtra;
  onFieldChange: (field: keyof AnisotropicExtra, value: string) => void;
  disabled?: boolean;
}

export function TransducerElasticSection({
  params,
  onFieldChange,
  disabled,
}: TransducerElasticSectionProps) {
  return (
    <div className="space-y-2">
      <ParamInput
        label={"\u03C6 (rotation angle)"}
        value={params.phi}
        unit="rad"
        onChange={(v) => onFieldChange("phi", v)}
        disabled={disabled}
      />
      <ParamInput
        label={"\u03C1 (density)"}
        value={params.rho}
        unit={"g/cm\u00B3"}
        onChange={(v) => onFieldChange("rho", v)}
        disabled={disabled}
      />
      <ParamInput
        label={"\u03B1_T (CTE)"}
        value={params.alphaT}
        unit="1/K"
        onChange={(v) => onFieldChange("alphaT", v)}
        disabled={disabled}
      />
      <ParamInput
        label="C11"
        value={params.C11_0}
        unit="GPa"
        onChange={(v) => onFieldChange("C11_0", v)}
        disabled={disabled}
      />
      <ParamInput
        label="C12"
        value={params.C12_0}
        unit="GPa"
        onChange={(v) => onFieldChange("C12_0", v)}
        disabled={disabled}
      />
      <ParamInput
        label="C44"
        value={params.C44_0}
        unit="GPa"
        onChange={(v) => onFieldChange("C44_0", v)}
        disabled={disabled}
      />
    </div>
  );
}
