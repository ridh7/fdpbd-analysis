/**
 * Animated collapsible section with smooth height transitions.
 *
 * Each accordion is a card (rounded border + secondary bg) with a clickable
 * header that toggles the content visibility. The collapse/expand is animated
 * by transitioning the CSS `height` property rather than using display:none,
 * which gives a smooth slide effect.
 *
 * Animation strategy:
 *   Expand: set height to scrollHeight (measured content height) → CSS
 *           transition animates from 0 → scrollHeight → on transition end,
 *           switch to height:auto so the content can resize if it changes.
 *   Collapse: capture current scrollHeight → on next frame set to 0 →
 *           CSS transition animates the shrink. The requestAnimationFrame
 *           is needed so the browser registers the starting height before
 *           we set the target of 0 (otherwise it would jump instantly).
 *
 * The chevron icon rotates 180° when expanded (pointing up) vs collapsed
 * (pointing down), using Tailwind's rotate-180 with duration-200.
 *
 * Collapse state is managed externally via props (controlled component) —
 * the parent (ForwardModelForm) owns which sections are collapsed via
 * the formReducer's collapsedSections Set.
 *
 * Used by: ForwardModelForm (wraps each parameter group: Lens, Laser, etc.)
 */
import { useRef, useEffect, useState } from "react";
import { ChevronDownIcon } from "../ui/Icons";

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
  const [height, setHeight] = useState<number | undefined>(isCollapsed ? 0 : undefined);

  useEffect(() => {
    if (!contentRef.current) return;
    if (isCollapsed) {
      // Collapse: capture current height, wait for it to paint, then animate to 0.
      // Double rAF ensures the browser paints the starting height before we set 0 —
      // a single rAF can land in the same paint cycle as the setHeight(scrollHeight),
      // causing the transition to skip (no painted start value to animate from).
      setHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight(0));
      });
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
        <ChevronDownIcon
          className={`h-4 w-4 text-(--text-muted) transition-transform duration-200 ${
            isCollapsed ? "" : "rotate-180"
          }`}
        />
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
