/**
 * Workflow tab bar — switches between "Forward Model" and "DE Fitting" views.
 *
 * The DE Fitting tab is disabled when the analysis mode is isotropic (fitting
 * is only available for anisotropic and transverse modes). When disabled, a
 * tooltip explains why.
 *
 * On the Forward Model tab, an additional collapse/expand all button appears
 * (arrow icon with rotate animation) to toggle all accordion sections at once.
 */
import { ToggleGroup } from "../ui/ToggleGroup";
import { Button } from "../ui/Button";
import { CollapseIcon } from "../ui/Icons";

export type WorkflowTab = "forward" | "fitting";

interface TabBarProps {
  activeTab: WorkflowTab;
  onChange: (tab: WorkflowTab) => void;
  fittingEnabled: boolean;
  allCollapsed: boolean;
  onToggleAll: () => void;
}

export function TabBar({
  activeTab,
  onChange,
  fittingEnabled,
  allCollapsed,
  onToggleAll,
}: TabBarProps) {
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
          <CollapseIcon
            className={`h-4 w-4 transition-transform duration-200 ${allCollapsed ? "" : "rotate-180"}`}
          />
        </Button>
      )}
    </div>
  );
}
