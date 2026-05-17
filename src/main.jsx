import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/globals.css";
import App from "./app/App.jsx";
import { SettingsStore } from "./state/settingsStore.js";

// Apply saved theme before first render to avoid flash of wrong theme
(function applyThemeOnLoad() {
  const s = SettingsStore.get();
  const root = document.documentElement;
  let mode = s.theme;
  if (s.theme === "system") {
    mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  root.dataset.theme = mode;
  root.dataset.highContrast = s.highContrast ? "true" : "false";
  root.style.setProperty("--font-scale",
    s.fontSize === "small" ? "0.9" : s.fontSize === "large" ? "1.15" : s.fontSize === "xxl" ? "1.35" : "1"
  );
  root.dataset.reducedMotion = s.reducedMotion ? "true" : "false";
  root.dataset.compactMode = s.compactMode ? "true" : "false";
})();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
