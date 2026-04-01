import { useMemo } from "react";
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
  const toggleOptions = useMemo(
    () => options.map((opt) => ({ value: opt, label: opt })),
    [options],
  );

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
