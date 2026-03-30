interface PresetRadioGroupProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

export function PresetRadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: PresetRadioGroupProps<T>) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-(--text-secondary)">{label}:</span>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              value === opt
                ? "bg-(--mode-btn-active-bg) text-(--mode-btn-active-text)"
                : "bg-(--mode-btn-bg) text-(--text-secondary) hover:bg-(--mode-btn-hover)"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
