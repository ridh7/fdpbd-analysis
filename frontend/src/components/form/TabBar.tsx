export type WorkflowTab = "forward" | "fitting";

interface TabBarProps {
  activeTab: WorkflowTab;
  onChange: (tab: WorkflowTab) => void;
  fittingEnabled: boolean;
}

export function TabBar({ activeTab, onChange, fittingEnabled }: TabBarProps) {
  return (
    <div className="flex border-b border-gray-700">
      <button
        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
          activeTab === "forward"
            ? "border-b-2 border-blue-500 text-blue-400"
            : "text-gray-400 hover:text-gray-300"
        }`}
        onClick={() => onChange("forward")}
      >
        Forward Model
      </button>
      <button
        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
          activeTab === "fitting"
            ? "border-b-2 border-blue-500 text-blue-400"
            : fittingEnabled
              ? "text-gray-400 hover:text-gray-300"
              : "cursor-not-allowed text-gray-600"
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
