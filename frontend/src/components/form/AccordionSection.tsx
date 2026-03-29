interface AccordionSectionProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function AccordionSection({
  title,
  isCollapsed,
  onToggle,
  children,
}: AccordionSectionProps) {
  return (
    <div className="border-b border-gray-700">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-200 hover:bg-gray-750"
      >
        <span>{title}</span>
        <span className="text-gray-400">{isCollapsed ? "+" : "\u2212"}</span>
      </button>
      {!isCollapsed && <div className="space-y-2 px-3 pb-3">{children}</div>}
    </div>
  );
}
