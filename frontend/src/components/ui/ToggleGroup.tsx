/**
 * Generic segmented toggle button group — used for any "pick one of N" UI.
 *
 * Renders a horizontal row of buttons where exactly one is active at a time.
 * Generic over T so callers get type-safe values (e.g., ToggleGroup<AnalysisMode>
 * ensures onChange only receives valid mode strings).
 *
 * Two sizes:
 *   - md: flex-1 so buttons share available width equally (mode selector, tabs)
 *   - sm: shrink-to-fit with whitespace-nowrap (preset selectors like lens/laser)
 *
 * Active button gets a filled background (--mode-btn-active-bg), inactive buttons
 * get an outlined border. Disabled buttons are faded with opacity-50.
 *
 * Used by: AnalysisModeSelector, TabBar, PresetRadioGroup
 */
interface ToggleOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  title?: string;
}

type ToggleSize = "sm" | "md";

interface ToggleGroupProps<T extends string> {
  options: readonly ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: ToggleSize;
  disabled?: boolean;
}

const sizeClasses: Record<ToggleSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1.5 text-sm",
};

export function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  disabled,
}: ToggleGroupProps<T>) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const isActive = value === opt.value;
        const isDisabled = disabled || opt.disabled;

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => !isDisabled && onChange(opt.value)}
            disabled={isDisabled}
            title={opt.title}
            className={`${size === "md" ? "flex-1" : ""} whitespace-nowrap rounded border font-medium transition-colors ${sizeClasses[size]} ${
              isActive
                ? "bg-(--mode-btn-active-bg) text-(--mode-btn-active-text) border-transparent"
                : isDisabled
                  ? "cursor-not-allowed border-(--border-primary) text-(--tab-disabled-text) opacity-50"
                  : "border-(--border-primary) text-(--text-muted) hover:text-(--text-secondary) hover:bg-(--bg-tertiary)"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
