/**
 * Forward model parameter form — the main left-panel content.
 *
 * Renders a scrollable list of AccordionSection cards, each containing
 * a group of related ParamInput fields (Lens, Detection, Laser, Medium,
 * Transducer, Interface, Sample). The visible sections change based on
 * the analysis mode:
 *   - Isotropic: shows all base sections + isotropic sample
 *   - Anisotropic: replaces isotropic sample with anisotropic sample +
 *     transducer elastic, hides interface section
 *   - Transverse: same as anisotropic + adds transverse detection section
 *
 * Section order matches the original TOPS measurement system frontend
 * (Lens → Detection → Laser → Medium → Transducer → Interface → Sample).
 *
 * Collapse state is controlled externally via the formReducer's
 * collapsedSections Set, enabling the global collapse/expand all button.
 */
import type {
  IsotropicParams,
  AnisotropicExtra,
  TransverseExtra,
} from "../../schemas/params";
import type { LensOption, MediumOption, LaserOption } from "../../constants/presets";
import type { AnalysisMode } from "../../constants/defaults";
import { AccordionSection } from "./AccordionSection";
import { LaserSection } from "./sections/LaserSection";
import { LensSection } from "./sections/LensSection";
import { TransducerSection } from "./sections/TransducerSection";
import { TransducerElasticSection } from "./sections/TransducerElasticSection";
import { InterfaceSection } from "./sections/InterfaceSection";
import { SampleSection } from "./sections/SampleSection";
import { AnisotropicSampleSection } from "./sections/AnisotropicSampleSection";
import { TransverseDetectionSection } from "./sections/TransverseDetectionSection";
import { MediumSection } from "./sections/MediumSection";

interface ForwardModelFormProps {
  analysisMode: AnalysisMode;
  params: IsotropicParams;
  anisotropicParams: AnisotropicExtra;
  transverseParams: TransverseExtra;
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
  onTransverseFieldChange: (field: keyof TransverseExtra, value: string) => void;
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
  transverseParams,
  lensOption,
  mediumOption,
  laserOption,
  collapsedSections,
  onFieldChange,
  onArrayFieldChange,
  onAnisoFieldChange,
  onTransverseFieldChange,
  onLensChange,
  onMediumChange,
  onLaserChange,
  onToggleSection,
  disabled,
}: ForwardModelFormProps) {
  const isIsotropic = analysisMode === "isotropic";
  const showElasticSections =
    analysisMode === "anisotropic" || analysisMode === "transverse_isotropic";

  return (
    <div className="mt-3 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
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

      {analysisMode === "transverse_isotropic" && (
        <AccordionSection
          title="Detection / Boundary"
          isCollapsed={collapsedSections.has("detection")}
          onToggle={() => onToggleSection("detection")}
        >
          <TransverseDetectionSection
            params={transverseParams}
            onFieldChange={onTransverseFieldChange}
            disabled={disabled}
          />
        </AccordionSection>
      )}

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
        title="Medium"
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

      <AccordionSection
        key={`transducer-${analysisMode}`}
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
        {showElasticSections && (
          <>
            <div className="my-2 border-t border-(--border-primary)" />
            <TransducerElasticSection
              params={anisotropicParams}
              onFieldChange={onAnisoFieldChange}
              disabled={disabled}
            />
          </>
        )}
      </AccordionSection>

      {isIsotropic && (
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
        key={analysisMode}
        title={isIsotropic ? "Sample (Layer 3)" : "Sample (Layer 2)"}
        isCollapsed={collapsedSections.has("sample")}
        onToggle={() => onToggleSection("sample")}
      >
        {showElasticSections ? (
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
    </div>
  );
}
