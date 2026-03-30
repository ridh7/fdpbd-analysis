import { useReducer } from "react";
import { formReducer, initialFormState } from "./state/formReducer";
import { useAnalysis } from "./hooks/useAnalysis";
import { isValidDecimal, areAllValidDecimals } from "./lib/validation";
import { AppHeader } from "./components/layout/AppHeader";
import { FileUpload } from "./components/form/FileUpload";
import { AnalysisModeSelector } from "./components/form/AnalysisModeSelector";
import { ForwardModelForm } from "./components/form/ForwardModelForm";
import { ActionBar } from "./components/form/ActionBar";
import { ResultsSummary } from "./components/results/ResultsSummary";
import { PlotPanel } from "./components/results/PlotPanel";
import type { IsotropicParams, AnisotropicExtra } from "./schemas/params";

function App() {
  const [form, dispatch] = useReducer(formReducer, initialFormState);
  const analysis = useAnalysis();

  const isFormValid = () => {
    const p = form.params;
    const scalars = [
      p.f_rolloff,
      p.delay_1,
      p.delay_2,
      p.w_rms,
      p.x_offset,
      p.incident_pump,
      p.incident_probe,
      p.n_al,
      p.k_al,
      p.lens_transmittance,
      p.detector_factor,
    ];

    const baseValid =
      scalars.every(isValidDecimal) &&
      areAllValidDecimals([...p.lambda_down]) &&
      areAllValidDecimals([...p.c_down]) &&
      areAllValidDecimals([...p.h_down]) &&
      form.file !== null;

    if (form.analysisMode === "isotropic") {
      return (
        baseValid &&
        isValidDecimal(p.niu) &&
        isValidDecimal(p.alpha_t) &&
        isValidDecimal(p.lambda_up) &&
        isValidDecimal(p.eta_up) &&
        isValidDecimal(p.c_up) &&
        isValidDecimal(p.h_up) &&
        areAllValidDecimals([...p.eta_down])
      );
    }

    // Anisotropic: validate extra fields
    const a = form.anisotropicParams;
    return (
      baseValid &&
      isValidDecimal(p.lambda_up) &&
      isValidDecimal(p.c_up) &&
      Object.values(a).every(isValidDecimal)
    );
  };

  const handleRun = () => {
    if (form.file) {
      analysis.runAnalysis(
        form.analysisMode,
        form.params,
        form.anisotropicParams,
        form.file,
      );
    }
  };

  const handleClear = () => {
    dispatch({ type: "CLEAR" });
    analysis.reset();
  };

  const handleFieldChange = (field: keyof IsotropicParams, value: string) => {
    dispatch({ type: "SET_FIELD", field, value });
  };

  const handleArrayFieldChange = (
    field: "lambda_down" | "eta_down" | "c_down" | "h_down",
    index: number,
    value: string,
  ) => {
    dispatch({ type: "SET_ARRAY_FIELD", field, index, value });
  };

  const handleAnisoFieldChange = (
    field: keyof AnisotropicExtra,
    value: string,
  ) => {
    dispatch({ type: "SET_ANISO_FIELD", field, value });
  };

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      <AppHeader />

      <div className="flex min-h-0 flex-1">
        {/* Left panel: Input form */}
        <div className="flex w-1/3 min-w-80 flex-col border-r border-gray-700">
          <div className="space-y-3 border-b border-gray-700 p-3">
            <AnalysisModeSelector
              mode={form.analysisMode}
              onChange={(mode) => dispatch({ type: "SET_MODE", mode })}
              disabled={analysis.isProcessing}
            />
            <FileUpload
              file={form.file}
              onFileChange={(file) => dispatch({ type: "SET_FILE", file })}
              disabled={analysis.isProcessing}
            />
          </div>

          <ForwardModelForm
            analysisMode={form.analysisMode}
            params={form.params}
            anisotropicParams={form.anisotropicParams}
            lensOption={form.lensOption}
            mediumOption={form.mediumOption}
            laserOption={form.laserOption}
            collapsedSections={form.collapsedSections}
            onFieldChange={handleFieldChange}
            onArrayFieldChange={handleArrayFieldChange}
            onAnisoFieldChange={handleAnisoFieldChange}
            onLensChange={(opt) =>
              dispatch({ type: "SET_LENS_OPTION", option: opt })
            }
            onMediumChange={(opt) =>
              dispatch({ type: "SET_MEDIUM_OPTION", option: opt })
            }
            onLaserChange={(opt) =>
              dispatch({ type: "SET_LASER_OPTION", option: opt })
            }
            onToggleSection={(s) =>
              dispatch({ type: "TOGGLE_SECTION", section: s })
            }
            disabled={analysis.isProcessing}
          />

          <ActionBar
            onRun={handleRun}
            onClear={handleClear}
            isProcessing={analysis.isProcessing}
            isValid={isFormValid()}
          />
        </div>

        {/* Right panel: Results */}
        <div className="flex flex-1 flex-col overflow-y-auto p-4">
          {analysis.status && (
            <div
              className={`mb-4 rounded px-3 py-2 text-sm ${
                analysis.error
                  ? "bg-red-900/50 text-red-300"
                  : analysis.isProcessing
                    ? "bg-blue-900/50 text-blue-300"
                    : "bg-green-900/50 text-green-300"
              }`}
            >
              {analysis.status}
            </div>
          )}

          {analysis.result && (
            <>
              <ResultsSummary
                result={analysis.result}
                timeTaken={analysis.timeTaken}
              />
              <div className="mt-4 min-h-0 flex-1">
                <PlotPanel data={analysis.result.data.plot_data} />
              </div>
            </>
          )}

          {!analysis.result && !analysis.isProcessing && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-gray-500">
                Upload a data file and click "Run Analysis" to see results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
