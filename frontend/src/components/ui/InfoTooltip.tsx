interface InfoTooltipProps {
  children: React.ReactNode;
}

export function InfoTooltip({ children }: InfoTooltipProps) {
  return (
    <div className="group relative inline-flex">
      <span className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-(--border-input) text-[10px] font-semibold leading-none text-(--text-muted) transition-colors group-hover:border-(--text-muted) group-hover:text-(--text-secondary)">
        ?
      </span>
      <div className="pointer-events-none absolute top-6 left-0 z-50 w-64 rounded-lg border border-(--border-primary) bg-(--bg-secondary) p-3 text-xs opacity-0 shadow-lg transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
        {children}
      </div>
    </div>
  );
}
