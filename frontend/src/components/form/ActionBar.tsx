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
      <button
        type="button"
        onClick={onRun}
        disabled={isProcessing || !isValid}
        className="flex-1 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white
          hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? "Processing..." : "Run Analysis"}
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={isProcessing}
        className="rounded bg-(--btn-secondary-bg) px-4 py-2 text-sm font-medium text-(--btn-secondary-text)
          hover:bg-(--btn-secondary-hover) disabled:opacity-50"
      >
        Clear
      </button>
      <button
        type="button"
        onClick={onReset}
        disabled={isProcessing}
        className="rounded bg-(--btn-secondary-bg) px-4 py-2 text-sm font-medium text-(--btn-secondary-text)
          hover:bg-(--btn-secondary-hover) disabled:opacity-50"
      >
        Reset
      </button>
    </div>
  );
}
