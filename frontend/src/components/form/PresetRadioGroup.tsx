/** Generic preset selector — renders a label + small ToggleGroup for hardware presets (lens magnification, medium type, laser system). Uses size="sm" so buttons shrink-to-fit rather than stretching. Generic over T for type-safe preset values. */
import { ToggleGroup } from "../ui/ToggleGroup";

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
  const toggleOptions = options.map((opt) => ({ value: opt, label: opt }));

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-(--text-secondary)">{label}:</span>
      <ToggleGroup
        options={toggleOptions}
        value={value}
        onChange={onChange}
        size="sm"
      />
    </div>
  );
}
