/**
 * Bottom action bar — three buttons pinned below the form:
 *   - Run Analysis / Run Fit (primary) — submits the form; disabled when
 *     inputs are invalid or processing is in progress
 *   - Clear (secondary) — empties all field values to blank
 *   - Reset (secondary) — restores all fields to factory defaults
 *
 * The run button label changes based on the active tab ("Run Analysis"
 * for forward model, "Run Fit" for DE fitting, "Processing..." while running).
 */
import { Button } from "../ui/Button";

interface ActionBarProps {
  onRun: () => void;
  onReset: () => void;
  onClear: () => void;
  isProcessing: boolean;
  isValid: boolean;
  isFitting?: boolean;
}

export function ActionBar({
  onRun,
  onReset,
  onClear,
  isProcessing,
  isValid,
  isFitting,
}: ActionBarProps) {
  const label = isProcessing ? "Processing..." : isFitting ? "Run Fit" : "Run Analysis";

  return (
    <div className="flex gap-3 border-t border-(--border-primary) p-3">
      <Button
        variant="primary"
        onClick={onRun}
        disabled={isProcessing || !isValid}
        className="flex-1"
      >
        {label}
      </Button>
      <Button variant="secondary" onClick={onClear} disabled={isProcessing}>
        Clear
      </Button>
      <Button variant="secondary" onClick={onReset} disabled={isProcessing}>
        Reset
      </Button>
    </div>
  );
}
