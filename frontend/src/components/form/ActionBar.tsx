interface ActionBarProps {
  onRun: () => void;
  onClear: () => void;
  isProcessing: boolean;
  isValid: boolean;
}

export function ActionBar({
  onRun,
  onClear,
  isProcessing,
  isValid,
}: ActionBarProps) {
  return (
    <div className="flex gap-3 border-t border-gray-700 p-3">
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
        className="rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white
          hover:bg-gray-500 disabled:opacity-50"
      >
        Clear
      </button>
    </div>
  );
}
