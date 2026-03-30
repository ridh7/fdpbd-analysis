import type { IsotropicParams, AnisotropicExtra } from "../../schemas/params";
import type {
  LensOption,
  MediumOption,
  LaserOption,
} from "../../constants/presets";
import type { AnalysisMode } from "../../constants/defaults";
import { AccordionSection } from "./AccordionSection";
import { LaserSection } from "./sections/LaserSection";
import { LensSection } from "./sections/LensSection";
import { TransducerSection } from "./sections/TransducerSection";
import { TransducerElasticSection } from "./sections/TransducerElasticSection";
import { InterfaceSection } from "./sections/InterfaceSection";
import { SampleSection } from "./sections/SampleSection";
import { AnisotropicSampleSection } from "./sections/AnisotropicSampleSection";
import { MediumSection } from "./sections/MediumSection";

interface ForwardModelFormProps {
  analysisMode: AnalysisMode;
  params: IsotropicParams;
  anisotropicParams: AnisotropicExtra;
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
  onAnisoFieldChange: (field: keyof AnisotropicExtra, value: string) => void;
  onLensChange: (option: LensOption) => void;
  onMediumChange: (option: MediumOption) => void;
  onLaserChange: (option: LaserOption) => void;
  onToggleSection: (section: string) => void;
  disabled?: boolean;
}

export function ForwardModelForm({
  analysisMode,
  params,
  anisotropicParams,
  lensOption,
  mediumOption,
  laserOption,
  collapsedSections,
  onFieldChange,
  onArrayFieldChange,
  onAnisoFieldChange,
  onLensChange,
  onMediumChange,
  onLaserChange,
  onToggleSection,
  disabled,
}: ForwardModelFormProps) {
  const isAnisotropic = analysisMode === "anisotropic";

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
        {isAnisotropic && (
          <>
            <div className="my-2 border-t border-gray-700" />
            <TransducerElasticSection
              params={anisotropicParams}
              onFieldChange={onAnisoFieldChange}
              disabled={disabled}
            />
          </>
        )}
      </AccordionSection>

      {!isAnisotropic && (
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
      )}

      <AccordionSection
        title={
          isAnisotropic
            ? "Sample (Anisotropic)"
            : "Sample / Substrate (Layer 3)"
        }
        isCollapsed={collapsedSections.has("sample")}
        onToggle={() => onToggleSection("sample")}
      >
        {isAnisotropic ? (
          <AnisotropicSampleSection
            params={anisotropicParams}
            sharedParams={params}
            onFieldChange={onAnisoFieldChange}
            onArrayFieldChange={onArrayFieldChange}
            disabled={disabled}
          />
        ) : (
          <SampleSection
            params={params}
            onFieldChange={onFieldChange}
            onArrayFieldChange={onArrayFieldChange}
            disabled={disabled}
          />
        )}
      </AccordionSection>

      {!isAnisotropic && (
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
      )}
    </div>
  );
}
