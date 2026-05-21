const KEY = "fizzrix.settings.v1";

export function applySettings(s) {
  const root = document.documentElement;
  let mode = s.theme;
  if (s.theme === "system") {
    mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  root.dataset.theme = mode;
  root.dataset.highContrast = s.highContrast ? "true" : "false";
  root.style.setProperty("--font-scale",
    s.fontSize === "small" ? "0.9" :
    s.fontSize === "large" ? "1.15" :
    s.fontSize === "xxl" ? "1.35" : "1"
  );
  root.dataset.reducedMotion = s.reducedMotion ? "true" : "false";
  root.dataset.widescreen = s.widescreen ? "true" : "false";
}

const defaultSettings = {
  theme: "system", // 'light' | 'dark' | 'system'
  highContrast: false,
  fontSize: "medium", // 'small' | 'medium' | 'large' | 'xxl'
  reducedMotion: false,
  widescreen: false
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function write(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export const SettingsStore = {
  get() {
    return read();
  },
  set(updates) {
    const newSettings = { ...read(), ...updates };
    write(newSettings);
    return newSettings;
  },
  reset() {
    write(defaultSettings);
    return defaultSettings;
  },
    setAll(newSettings) {
    const merged = { ...defaultSettings, ...(newSettings || {}) };
    write(merged);
    return merged;
}

};
