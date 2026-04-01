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
