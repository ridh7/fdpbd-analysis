export type WorkflowTab = "forward" | "fitting";

interface TabBarProps {
  activeTab: WorkflowTab;
  onChange: (tab: WorkflowTab) => void;
  fittingEnabled: boolean;
}

export function TabBar({ activeTab, onChange, fittingEnabled }: TabBarProps) {
  return (
    <div className="flex gap-2 px-3">
      <button
        className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          activeTab === "forward"
            ? "bg-(--mode-btn-active-bg) text-(--mode-btn-active-text)"
            : "bg-(--mode-btn-bg) text-(--mode-btn-text) hover:bg-(--mode-btn-hover)"
        }`}
        onClick={() => onChange("forward")}
      >
        Forward Model
      </button>
      <button
        className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          activeTab === "fitting"
            ? "bg-(--mode-btn-active-bg) text-(--mode-btn-active-text)"
            : fittingEnabled
              ? "bg-(--mode-btn-bg) text-(--mode-btn-text) hover:bg-(--mode-btn-hover)"
              : "cursor-not-allowed bg-(--mode-btn-bg) text-(--tab-disabled-text) opacity-50"
        }`}
        onClick={() => fittingEnabled && onChange("fitting")}
        disabled={!fittingEnabled}
        title={
          fittingEnabled
            ? "Configure DE fitting"
            : "DE fitting is only available for anisotropic and transverse modes"
        }
      >
        DE Fitting
      </button>
    </div>
  );
}
