import { ToggleGroup } from "../ui/ToggleGroup";
import { Button } from "../ui/Button";

export type WorkflowTab = "forward" | "fitting";

interface TabBarProps {
  activeTab: WorkflowTab;
  onChange: (tab: WorkflowTab) => void;
  fittingEnabled: boolean;
  allCollapsed: boolean;
  onToggleAll: () => void;
}

export function TabBar({ activeTab, onChange, fittingEnabled, allCollapsed, onToggleAll }: TabBarProps) {
  const options = [
    { value: "forward" as const, label: "Forward Model" },
    {
      value: "fitting" as const,
      label: "DE Fitting",
      disabled: !fittingEnabled,
      title: fittingEnabled
        ? "Configure DE fitting"
        : "DE fitting is only available for anisotropic and transverse modes",
    },
  ];

  return (
    <div className="flex items-stretch gap-2 px-3">
      <div className="flex-1">
        <ToggleGroup options={options} value={activeTab} onChange={onChange} />
      </div>
      {activeTab === "forward" && (
        <Button
          variant="secondary"
          onClick={onToggleAll}
          title={allCollapsed ? "Expand all sections" : "Collapse all sections"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 transition-transform duration-200 ${allCollapsed ? "" : "rotate-180"}`}
          >
            <path fillRule="evenodd" d="M17.768 7.793a.75.75 0 0 1-1.06-.025L12.75 3.622v10.003a5.375 5.375 0 0 1-10.75 0V10.75a.75.75 0 0 1 1.5 0v2.875a3.875 3.875 0 0 0 7.75 0V3.622L7.293 7.768a.75.75 0 0 1-1.086-1.036l5.25-5.5a.75.75 0 0 1 1.086 0l5.25 5.5a.75.75 0 0 1-.025 1.06Z" clipRule="evenodd" />
          </svg>
        </Button>
      )}
    </div>
  );
}
