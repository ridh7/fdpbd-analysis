import { useRef, useEffect, useState } from "react";

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
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(
    isCollapsed ? 0 : undefined,
  );

  useEffect(() => {
    if (!contentRef.current) return;
    if (isCollapsed) {
      // Collapse: capture current height then animate to 0
      setHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    } else {
      // Expand: animate from 0 to scrollHeight, then set auto
      setHeight(contentRef.current.scrollHeight);
    }
  }, [isCollapsed]);

  const handleTransitionEnd = () => {
    if (!isCollapsed) {
      setHeight(undefined); // switch to auto so content can resize
    }
  };

  return (
    <div className="rounded-lg border border-(--border-primary) bg-(--bg-secondary)">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-(--text-secondary) hover:bg-(--bg-tertiary) transition-colors"
      >
        <span>{title}</span>
        <svg
          className={`h-4 w-4 text-(--text-muted) transition-transform duration-200 ${
            isCollapsed ? "" : "rotate-180"
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-[height] duration-200 ease-in-out"
        style={{ height: height !== undefined ? `${height}px` : "auto" }}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="space-y-2 px-3 pt-3 pb-3">{children}</div>
      </div>
    </div>
  );
}
