/**
 * Single parameter input field — the most-used component in the form.
 *
 * Renders a label + text input + optional unit suffix in a horizontal row.
 * The label has a fixed width (w-40) so all inputs align vertically across
 * different accordion sections.
 *
 * Values are strings (not numbers) because HTML inputs produce strings and
 * we need to allow intermediate typing states like "0." or "-" without
 * the value being coerced. Numeric conversion happens at submission time
 * in unitConversions.ts.
 *
 * Used by: every section component (LaserSection, LensSection, etc.)
 */
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
          focus:border-(--border-focus) focus:outline-none disabled:opacity-50"
      />
      {unit && <span className="text-xs text-(--text-muted)">{unit}</span>}
    </div>
  );
}
