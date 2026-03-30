export type Theme = "dark" | "light";

export interface ThemePalette {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgInput: string;

  // Borders
  borderPrimary: string;
  borderInput: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textPlaceholder: string;

  // Buttons (secondary/neutral)
  btnSecondaryBg: string;
  btnSecondaryHover: string;
  btnSecondaryText: string;

  // Active/selected tab
  tabActiveBorder: string;
  tabActiveText: string;
  tabInactiveText: string;
  tabDisabledText: string;

  // Status banners
  statusErrorBg: string;
  statusErrorText: string;
  statusInfoBg: string;
  statusInfoText: string;
  statusSuccessBg: string;
  statusSuccessText: string;

  // Fitting progress
  progressBarBg: string;
  progressBarFill: string;
  cancelBtnBg: string;
  cancelBtnHover: string;

  // Plots
  plotBg: string;
  plotFont: string;
  plotGridline: string;

  // Mode selector
  modeBtnBg: string;
  modeBtnActiveBg: string;
  modeBtnActiveText: string;
  modeBtnText: string;
  modeBtnHover: string;
}

export const darkTheme: ThemePalette = {
  bgPrimary: "#111827",       // gray-900
  bgSecondary: "#1f2937",     // gray-800
  bgTertiary: "#374151",      // gray-700
  bgInput: "#374151",         // gray-700

  borderPrimary: "#374151",   // gray-700
  borderInput: "#4b5563",     // gray-600

  textPrimary: "#ffffff",
  textSecondary: "#d1d5db",   // gray-300
  textMuted: "#9ca3af",       // gray-400
  textPlaceholder: "#6b7280", // gray-500

  btnSecondaryBg: "#4b5563",  // gray-600
  btnSecondaryHover: "#6b7280", // gray-500
  btnSecondaryText: "#ffffff",

  tabActiveBorder: "#3b82f6", // blue-500
  tabActiveText: "#60a5fa",   // blue-400
  tabInactiveText: "#9ca3af", // gray-400
  tabDisabledText: "#4b5563", // gray-600

  statusErrorBg: "rgba(127, 29, 29, 0.5)",   // red-900/50
  statusErrorText: "#fca5a5",                  // red-300
  statusInfoBg: "rgba(30, 58, 138, 0.5)",     // blue-900/50
  statusInfoText: "#93c5fd",                   // blue-300
  statusSuccessBg: "rgba(20, 83, 45, 0.5)",   // green-900/50
  statusSuccessText: "#86efac",                // green-300

  progressBarBg: "#374151",   // gray-700
  progressBarFill: "#3b82f6", // blue-500
  cancelBtnBg: "#b91c1c",    // red-700
  cancelBtnHover: "#dc2626", // red-600

  plotBg: "#1f2937",             // gray-800, matches bgSecondary card
  plotFont: "#d1d5db",
  plotGridline: "#374151",       // gray-700

  modeBtnBg: "#374151",       // gray-700
  modeBtnActiveBg: "#3b82f6", // blue-600
  modeBtnActiveText: "#ffffff",
  modeBtnText: "#9ca3af",     // gray-400
  modeBtnHover: "#4b5563",    // gray-600
};

export const lightTheme: ThemePalette = {
  bgPrimary: "#ffffff",
  bgSecondary: "#f9fafb",     // gray-50
  bgTertiary: "#f3f4f6",      // gray-100
  bgInput: "#ffffff",

  borderPrimary: "#e5e7eb",   // gray-200
  borderInput: "#d1d5db",     // gray-300

  textPrimary: "#111827",     // gray-900
  textSecondary: "#4b5563",   // gray-600
  textMuted: "#6b7280",       // gray-500
  textPlaceholder: "#9ca3af", // gray-400

  btnSecondaryBg: "#e5e7eb",  // gray-200
  btnSecondaryHover: "#d1d5db", // gray-300
  btnSecondaryText: "#111827",

  tabActiveBorder: "#3b82f6",
  tabActiveText: "#2563eb",   // blue-600
  tabInactiveText: "#6b7280", // gray-500
  tabDisabledText: "#d1d5db", // gray-300

  statusErrorBg: "#fef2f2",   // red-50
  statusErrorText: "#b91c1c", // red-700
  statusInfoBg: "#eff6ff",    // blue-50
  statusInfoText: "#1d4ed8",  // blue-700
  statusSuccessBg: "#f0fdf4", // green-50
  statusSuccessText: "#15803d", // green-700

  progressBarBg: "#e5e7eb",
  progressBarFill: "#3b82f6",
  cancelBtnBg: "#dc2626",
  cancelBtnHover: "#b91c1c",

  plotBg: "#ffffff",              // white, distinct from gray-50 card
  plotFont: "#374151",
  plotGridline: "#e5e7eb",       // gray-200

  modeBtnBg: "#e5e7eb",
  modeBtnActiveBg: "#3b82f6",
  modeBtnActiveText: "#ffffff",
  modeBtnText: "#6b7280",
  modeBtnHover: "#d1d5db",
};

const themes: Record<Theme, ThemePalette> = { dark: darkTheme, light: lightTheme };

/**
 * Apply theme palette as CSS custom properties on :root.
 */
export function applyTheme(theme: Theme): void {
  const palette = themes[theme];
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);

  for (const [key, value] of Object.entries(palette)) {
    // Convert camelCase to kebab-case: bgPrimary -> --bg-primary
    const cssVar = "--" + key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
    root.style.setProperty(cssVar, value);
  }
}
