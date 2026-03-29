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
      <span className="text-gray-300">{label}:</span>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              value === opt
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
