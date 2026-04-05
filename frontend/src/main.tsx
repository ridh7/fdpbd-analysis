/**
 * Application entry point — bootstraps React and prevents theme flash.
 *
 * ## Theme flash prevention
 * Before React renders anything, this file reads the saved theme from
 * localStorage and calls applyTheme() synchronously. This sets CSS
 * custom properties on document.documentElement *before* the first paint,
 * so the user never sees a flash of the wrong theme (e.g., white flash
 * when they prefer dark mode).
 *
 * The same theme detection logic exists in useTheme's getInitialTheme(),
 * but that runs during React's render cycle — too late to prevent the
 * flash. This pre-render call is the critical one.
 *
 * ## StrictMode
 * Wraps the app in React.StrictMode which (in development only):
 *   - Renders components twice to detect impure renders
 *   - Runs effects twice to detect missing cleanup functions
 *   - Warns about deprecated lifecycle methods
 * StrictMode is stripped in production builds — zero runtime cost.
 *
 * ## DOM mounting
 * Uses createRoot (React 18+ concurrent API) targeting the #root div
 * in index.html. The non-null assertion (!) is safe because index.html
 * always contains <div id="root"></div>.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { applyTheme } from "./constants/theme";
import App from "./App.tsx";

// Apply theme before first render to avoid flash
const stored = localStorage.getItem("fdpbd-theme");
applyTheme(
  stored === "light"
    ? "light"
    : stored === "dark"
      ? "dark"
      : window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark",
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
