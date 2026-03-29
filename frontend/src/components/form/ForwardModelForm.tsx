import type { IsotropicParams } from "../../schemas/params";
import type {
  LensOption,
  MediumOption,
  LaserOption,
} from "../../constants/presets";
import { AccordionSection } from "./AccordionSection";
import { LaserSection } from "./sections/LaserSection";
import { LensSection } from "./sections/LensSection";
import { TransducerSection } from "./sections/TransducerSection";
import { InterfaceSection } from "./sections/InterfaceSection";
import { SampleSection } from "./sections/SampleSection";
import { MediumSection } from "./sections/MediumSection";

interface ForwardModelFormProps {
  params: IsotropicParams;
  lensOption: LensOption;
  mediumOption: MediumOption;
  laserOption: LaserOption;
  collapsedSections: Set<string>;
  onFieldChange: (field: keyof IsotropicParams, value: string) => void;
  onArrayFieldChange: (
    field: "lambda_down" | "eta_down" | "c_down" | "h_down",
    index: number,
    value: string,
  ) => void;
  onLensChange: (option: LensOption) => void;
  onMediumChange: (option: MediumOption) => void;
  onLaserChange: (option: LaserOption) => void;
  onToggleSection: (section: string) => void;
  disabled?: boolean;
}

export function ForwardModelForm({
  params,
  lensOption,
  mediumOption,
  laserOption,
  collapsedSections,
  onFieldChange,
  onArrayFieldChange,
  onLensChange,
  onMediumChange,
  onLaserChange,
  onToggleSection,
  disabled,
}: ForwardModelFormProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <AccordionSection
        title="Laser / Electronics"
        isCollapsed={collapsedSections.has("laser")}
        onToggle={() => onToggleSection("laser")}
      >
        <LaserSection
          params={params}
          laserOption={laserOption}
          onFieldChange={onFieldChange}
          onPresetChange={onLaserChange}
          disabled={disabled}
        />
      </AccordionSection>

      <AccordionSection
        title="Lens / Optics"
        isCollapsed={collapsedSections.has("lens")}
        onToggle={() => onToggleSection("lens")}
      >
        <LensSection
          params={params}
          lensOption={lensOption}
          onFieldChange={onFieldChange}
          onPresetChange={onLensChange}
          disabled={disabled}
        />
      </AccordionSection>

      <AccordionSection
        title="Transducer (Layer 1)"
        isCollapsed={collapsedSections.has("transducer")}
        onToggle={() => onToggleSection("transducer")}
      >
        <TransducerSection
          params={params}
          onFieldChange={onFieldChange}
          onArrayFieldChange={onArrayFieldChange}
          disabled={disabled}
        />
      </AccordionSection>

      <AccordionSection
        title="Interface (Layer 2)"
        isCollapsed={collapsedSections.has("interface")}
        onToggle={() => onToggleSection("interface")}
      >
        <InterfaceSection
          params={params}
          onArrayFieldChange={onArrayFieldChange}
          disabled={disabled}
        />
      </AccordionSection>

      <AccordionSection
        title="Sample / Substrate (Layer 3)"
        isCollapsed={collapsedSections.has("sample")}
        onToggle={() => onToggleSection("sample")}
      >
        <SampleSection
          params={params}
          onFieldChange={onFieldChange}
          onArrayFieldChange={onArrayFieldChange}
          disabled={disabled}
        />
      </AccordionSection>

      <AccordionSection
        title="Medium (Above Sample)"
        isCollapsed={collapsedSections.has("medium")}
        onToggle={() => onToggleSection("medium")}
      >
        <MediumSection
          params={params}
          mediumOption={mediumOption}
          onFieldChange={onFieldChange}
          onPresetChange={onMediumChange}
          disabled={disabled}
        />
      </AccordionSection>
    </div>
  );
}
