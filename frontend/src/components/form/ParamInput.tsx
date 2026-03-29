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
      <label className="w-40 shrink-0 text-sm text-gray-300">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-32 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white
          focus:border-blue-500 focus:outline-none disabled:opacity-50"
      />
      {unit && <span className="text-xs text-gray-400">{unit}</span>}
    </div>
  );
}
