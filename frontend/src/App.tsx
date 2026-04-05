/**
 * Root application component — orchestrates the entire FD-PBD analysis UI.
 *
 * ## Layout
 * Full-height flexbox with three sections:
 *   1. AppHeader — top bar with title + theme toggle
 *   2. Left panel (1/3 width) — form inputs, mode selector, file upload
 *   3. Right panel (2/3 width) — results, plots, fitting progress
 *
 * ## State management
 * Three independent state sources, each with different lifecycles:
 *   - formReducer (useReducer): all user inputs — params, file, presets,
 *     analysis mode, collapsed sections. Persists across runs.
 *   - useAnalysis hook: forward model results — clears on each new run.
 *   - useFitting hook: DE fitting state — progress, result, error.
 *   - useTheme hook: dark/light mode with localStorage persistence.
 *   - activeTab (useState): "forward" or "fitting" tab selection.
 *   - fitConfig (useState): DE fitting configuration (bounds, iterations).
 *
 * ## Data flow
 * All state lives here and flows down via props. Child components never
 * own state — they receive values and call callbacks:
 *   App owns state → passes to ForwardModelForm/FitConfigForm/ResultsSummary
 *   App owns handlers → wraps dispatch calls (handleFieldChange, etc.)
 *
 * ## Key behaviors
 * - Tab auto-reset: when switching to isotropic mode, the fitting tab is
 *   disabled and activeTab resets to "forward" via useEffect
 * - Mutual exclusion: starting a forward run resets fitting state and
 *   vice versa — prevents showing stale results from the other mode
 * - Validation: isFormValid() checks all required fields before enabling
 *   the Run button. Validates different field sets based on analysis mode
 * - Empty state: right panel shows file upload prompt when no results exist
 *
 * ## Why handlers wrap dispatch
 * Instead of passing `dispatch` directly to children, App wraps each
 * dispatch call in a named handler (handleFieldChange, handleReset, etc.).
 * This keeps children decoupled from the action type strings and lets
 * App add cross-cutting logic (e.g., handleReset also calls analysis.reset
 * and fitting.resetFit — something a child component wouldn't know to do).
 */
import { useEffect, useReducer, useState } from "react";
import { formReducer, initialFormState } from "./state/formReducer";
import { useAnalysis } from "./hooks/useAnalysis";
import { useFitting } from "./hooks/useFitting";
import { useTheme } from "./hooks/useTheme";
import { isValidDecimal, areAllValidDecimals } from "./lib/validation";
import { AppHeader } from "./components/layout/AppHeader";
import { FileUpload } from "./components/form/FileUpload";
import { AnalysisModeSelector } from "./components/form/AnalysisModeSelector";
import { ForwardModelForm } from "./components/form/ForwardModelForm";
import { TabBar, type WorkflowTab } from "./components/form/TabBar";
import { FitConfigForm } from "./components/form/FitConfigForm";
import { ActionBar } from "./components/form/ActionBar";
import { ResultsSummary } from "./components/results/ResultsSummary";
import { PlotPanel } from "./components/results/PlotPanel";
import { FittingProgress } from "./components/results/FittingProgress";
import {
  ANISO_FITTABLE_PARAMS,
  TRANS_FITTABLE_PARAMS,
  DEFAULT_FIT_CONFIG,
} from "./constants/defaults";
import type { FitConfigState } from "./constants/defaults";
import type {
  IsotropicParams,
  AnisotropicExtra,
  TransverseExtra,
} from "./schemas/params";

function App() {
  const [form, dispatch] = useReducer(formReducer, initialFormState);
  const analysis = useAnalysis();
  const fitting = useFitting();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<WorkflowTab>("forward");
  const [fitConfig, setFitConfig] = useState<FitConfigState>(DEFAULT_FIT_CONFIG);

  const fittingEnabled =
    form.analysisMode === "anisotropic" || form.analysisMode === "transverse_isotropic";
  const fittableParams =
    form.analysisMode === "transverse_isotropic"
      ? TRANS_FITTABLE_PARAMS
      : ANISO_FITTABLE_PARAMS;

  // Reset to forward tab when switching to a mode that doesn't support fitting,
  // and reset fit config to match the new mode's default parameter + bounds
  useEffect(() => {
    if (!fittingEnabled) {
      setActiveTab("forward");
    }
    const params =
      form.analysisMode === "transverse_isotropic"
        ? TRANS_FITTABLE_PARAMS
        : ANISO_FITTABLE_PARAMS;
    const firstParam = params[0];
    setFitConfig({
      ...DEFAULT_FIT_CONFIG,
      parameterToFit: firstParam.key,
      boundsMin: firstParam.defaultMin,
      boundsMax: firstParam.defaultMax,
    });
  }, [form.analysisMode, fittingEnabled]);

  const handleFitConfigChange = (field: keyof FitConfigState, value: string) => {
    setFitConfig((prev) => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    const p = form.params;
    const scalars = [
      p.f_rolloff,
      p.delay_1,
      p.delay_2,
      p.w_rms,
      p.x_offset,
      p.incident_pump,
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
        isValidDecimal(p.incident_probe) &&
        isValidDecimal(p.niu) &&
        isValidDecimal(p.alpha_t) &&
        isValidDecimal(p.lambda_up) &&
        isValidDecimal(p.eta_up) &&
        isValidDecimal(p.c_up) &&
        isValidDecimal(p.h_up) &&
        areAllValidDecimals([...p.eta_down])
      );
    }

    // Anisotropic and transverse: validate extra fields
    const a = form.anisotropicParams;
    const anisoValid =
      baseValid &&
      isValidDecimal(p.lambda_up) &&
      isValidDecimal(p.c_up) &&
      Object.values(a).every(isValidDecimal);

    if (form.analysisMode === "transverse_isotropic") {
      const t = form.transverseParams;
      return anisoValid && Object.values(t).every(isValidDecimal);
    }

    return anisoValid;
  };

  const handleRun = () => {
    if (!form.file) return;
    if (activeTab === "fitting" && fittingEnabled) {
      analysis.reset();
      fitting.startFit(
        form.analysisMode,
        form.params,
        form.anisotropicParams,
        form.transverseParams,
        fitConfig,
        form.file,
      );
    } else {
      fitting.resetFit();
      analysis.runAnalysis(
        form.analysisMode,
        form.params,
        form.anisotropicParams,
        form.transverseParams,
        form.file,
      );
    }
  };

  const handleReset = () => {
    dispatch({ type: "RESET" });
    const params =
      form.analysisMode === "transverse_isotropic"
        ? TRANS_FITTABLE_PARAMS
        : ANISO_FITTABLE_PARAMS;
    const firstParam = params[0];
    setFitConfig({
      ...DEFAULT_FIT_CONFIG,
      parameterToFit: firstParam.key,
      boundsMin: firstParam.defaultMin,
      boundsMax: firstParam.defaultMax,
    });
    analysis.reset();
    fitting.resetFit();
  };

  const handleClear = () => {
    dispatch({ type: "CLEAR" });
    analysis.reset();
    fitting.resetFit();
  };

  const isProcessing = analysis.isProcessing || fitting.isFitting;

  const allSections = [
    "lens",
    "detection",
    "laser",
    "medium",
    "transducer",
    "interface",
    "sample",
  ];
  const allCollapsed = allSections.every((s) => form.collapsedSections.has(s));
  const handleToggleAll = () => {
    dispatch({ type: allCollapsed ? "EXPAND_ALL" : "COLLAPSE_ALL" });
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

  const handleAnisoFieldChange = (field: keyof AnisotropicExtra, value: string) => {
    dispatch({ type: "SET_ANISO_FIELD", field, value });
  };

  const handleTransverseFieldChange = (field: keyof TransverseExtra, value: string) => {
    dispatch({ type: "SET_TRANSVERSE_FIELD", field, value });
  };

  return (
    <div className="flex h-screen flex-col bg-(--bg-primary) text-(--text-primary)">
      <AppHeader theme={theme} onToggleTheme={toggleTheme} />

      <div className="flex min-h-0 flex-1">
        {/* Left panel */}
        <div className="flex w-1/3 min-w-80 flex-col border-r border-(--border-primary)">
          <div className="space-y-3 p-3">
            <div className="space-y-3 rounded-lg border border-(--border-primary) bg-(--bg-secondary) p-3">
              <AnalysisModeSelector
                mode={form.analysisMode}
                onChange={(mode) => dispatch({ type: "SET_MODE", mode })}
                disabled={isProcessing}
              />
              <FileUpload
                file={form.file}
                onFileChange={(file) => dispatch({ type: "SET_FILE", file })}
                disabled={isProcessing}
              />
            </div>
          </div>

          <TabBar
            activeTab={activeTab}
            onChange={setActiveTab}
            fittingEnabled={fittingEnabled}
            allCollapsed={allCollapsed}
            onToggleAll={handleToggleAll}
          />

          {activeTab === "forward" ? (
            <ForwardModelForm
              analysisMode={form.analysisMode}
              params={form.params}
              anisotropicParams={form.anisotropicParams}
              transverseParams={form.transverseParams}
              lensOption={form.lensOption}
              mediumOption={form.mediumOption}
              laserOption={form.laserOption}
              collapsedSections={form.collapsedSections}
              onFieldChange={handleFieldChange}
              onArrayFieldChange={handleArrayFieldChange}
              onAnisoFieldChange={handleAnisoFieldChange}
              onTransverseFieldChange={handleTransverseFieldChange}
              onLensChange={(opt) => dispatch({ type: "SET_LENS_OPTION", option: opt })}
              onMediumChange={(opt) =>
                dispatch({ type: "SET_MEDIUM_OPTION", option: opt })
              }
              onLaserChange={(opt) =>
                dispatch({ type: "SET_LASER_OPTION", option: opt })
              }
              onToggleSection={(s) => dispatch({ type: "TOGGLE_SECTION", section: s })}
              disabled={isProcessing}
            />
          ) : (
            <div className="mt-3 flex-1 overflow-y-auto px-3 pb-3">
              <div className="rounded-lg border border-(--border-primary) bg-(--bg-secondary) p-3">
                <FitConfigForm
                  config={fitConfig}
                  fittableParams={fittableParams}
                  onChange={handleFitConfigChange}
                  disabled={isProcessing}
                />
              </div>
            </div>
          )}

          <ActionBar
            onRun={handleRun}
            onReset={handleReset}
            onClear={handleClear}
            isProcessing={isProcessing}
            isValid={isFormValid()}
            isFitting={activeTab === "fitting"}
          />
        </div>

        {/* Right panel */}
        <div className="flex flex-1 flex-col overflow-y-auto p-3">
          {/* Status indicator */}
          {analysis.status && (
            <div
              className={`mb-3 flex items-center justify-between rounded px-3 py-1.5 text-sm ${
                analysis.error
                  ? "bg-(--status-error-bg) text-(--status-error-text)"
                  : analysis.isProcessing
                    ? "bg-(--status-info-bg) text-(--status-info-text)"
                    : "bg-(--status-success-bg) text-(--status-success-text)"
              }`}
            >
              {analysis.status}
            </div>
          )}

          {/* Fitting progress/result */}
          {(fitting.isFitting || fitting.result || fitting.error) && (
            <div className="mb-3">
              <FittingProgress
                progress={fitting.progress}
                result={fitting.result}
                isFitting={fitting.isFitting}
                error={fitting.error}
                onCancel={fitting.cancelFit}
              />
            </div>
          )}

          {/* Forward model results */}
          {analysis.result && (
            <>
              <ResultsSummary result={analysis.result} timeTaken={analysis.timeTaken} />
              <div className="mt-3 min-h-0 flex-1">
                <PlotPanel data={analysis.result.data.plot_data} theme={theme} />
              </div>
            </>
          )}

          {/* Fitting results plot */}
          {fitting.result && !analysis.result && (
            <div className="min-h-0 flex-1">
              <PlotPanel
                theme={theme}
                data={{
                  model_freqs: fitting.result.model_freqs,
                  in_model: fitting.result.in_model,
                  out_model: fitting.result.out_model,
                  ratio_model: fitting.result.ratio_model,
                  exp_freqs: fitting.result.exp_freqs,
                  in_exp: fitting.result.in_exp,
                  out_exp: fitting.result.out_exp,
                  ratio_exp: fitting.result.ratio_exp,
                }}
              />
            </div>
          )}

          {!analysis.result && !fitting.result && !isProcessing && (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <p className="text-(--text-muted)">
                  {form.file
                    ? activeTab === "fitting"
                      ? 'Click "Run Fit" to start DE fitting.'
                      : 'Click "Run Analysis" to see results.'
                    : activeTab === "fitting"
                      ? 'Upload a data file and click "Run Fit" to start DE fitting.'
                      : 'Upload a data file and click "Run Analysis" to see results.'}
                </p>
                {!form.file && (
                  <FileUpload
                    file={form.file}
                    onFileChange={(f) => dispatch({ type: "SET_FILE", file: f })}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
