interface ParamInputProps {
  label: string;
  value: string;
  unit?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ParamInput({
  label,
  value,
  unit,
  onChange,
  disabled,
}: ParamInputProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-40 shrink-0 text-sm text-(--text-secondary)">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-32 rounded border border-(--border-input) bg-(--bg-input) px-2 py-1 text-sm text-(--text-primary)
          focus:border-blue-500 focus:outline-none disabled:opacity-50"
      />
      {unit && <span className="text-xs text-(--text-muted)">{unit}</span>}
    </div>
  );
}
