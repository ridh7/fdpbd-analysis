import { Button } from "../ui/Button";

interface ActionBarProps {
  onRun: () => void;
  onReset: () => void;
  onClear: () => void;
  isProcessing: boolean;
  isValid: boolean;
}

export function ActionBar({
  onRun,
  onReset,
  onClear,
  isProcessing,
  isValid,
}: ActionBarProps) {
  return (
    <div className="flex gap-3 border-t border-(--border-primary) p-3">
      <Button
        variant="primary"
        onClick={onRun}
        disabled={isProcessing || !isValid}
        className="flex-1"
      >
        {isProcessing ? "Processing..." : "Run Analysis"}
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
