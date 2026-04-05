/**
 * Application header bar — displays the title and a dark/light theme
 * toggle switch.
 *
 * The toggle is a sliding pill button: a rounded track with an icon
 * circle that slides left (dark, moon icon) or right (light, sun icon).
 * Colors change to match the active theme — slate tones for dark mode,
 * amber tones for light mode.
 *
 * The icons are inline SVGs from Heroicons (20px solid) to avoid adding
 * an icon library dependency for just two icons. The sliding animation
 * uses Tailwind's translate-x utility with duration-300 for a smooth
 * 300ms transition.
 *
 * Accessibility: includes aria-label and title for screen readers,
 * announcing which theme the button will switch *to* (not the current one).
 */
import type { Theme } from "../../constants/theme";
import { MoonIcon, SunIcon } from "../ui/Icons";

interface AppHeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function AppHeader({ theme, onToggleTheme }: AppHeaderProps) {
  const isDark = theme === "dark";

  return (
    <header className="flex items-center justify-between border-b border-(--border-primary) bg-(--bg-secondary) px-3 py-3">
      <h1 className="text-lg font-semibold text-(--text-primary)">
        Frequency-Domain Photothermal Beam Deflection Analysis
      </h1>
      <button
        type="button"
        onClick={onToggleTheme}
        className={`relative flex h-7 w-14 items-center rounded-full p-0.5 transition-colors duration-300 ${
          isDark ? "bg-slate-600" : "bg-amber-300"
        }`}
        title={`Switch to ${isDark ? "light" : "dark"} mode`}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-all duration-300 ${
            isDark
              ? "translate-x-0 bg-slate-800 text-blue-300"
              : "translate-x-7 bg-white text-amber-500"
          }`}
        >
          {isDark ? <MoonIcon /> : <SunIcon />}
        </span>
      </button>
    </header>
  );
}
