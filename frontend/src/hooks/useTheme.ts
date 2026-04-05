/**
 * Theme hook — manages dark/light mode preference with localStorage
 * persistence and system preference detection.
 *
 * ## Initialization
 * getInitialTheme() checks (in order):
 *   1. localStorage for a previously saved preference
 *   2. prefers-color-scheme media query for OS-level preference
 *   3. Defaults to dark if neither provides a value
 *
 * ## Side effects (useEffect)
 * When the theme changes:
 *   1. Calls applyTheme() which sets CSS custom properties on :root
 *      (see constants/theme.ts for the full color palette)
 *   2. Persists the choice to localStorage so it survives page reloads
 *
 * ## Why localStorage over sessionStorage or cookies?
 * - localStorage persists across tabs and browser restarts — the user
 *   sets their preference once and it sticks
 * - sessionStorage would reset on every new tab
 * - Cookies would be sent to the server on every request, but theme
 *   is a purely client-side concern
 *
 * ## Flash prevention
 * Note: main.tsx also reads localStorage and calls applyTheme() *before*
 * React renders. This prevents a flash of the wrong theme on page load
 * (the theme is applied synchronously before the first paint). This hook
 * then takes over for runtime theme toggling.
 */
import { useState, useEffect, useCallback } from "react";
import { applyTheme, type Theme } from "../constants/theme";

const STORAGE_KEY = "fdpbd-theme";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
