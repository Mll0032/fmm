const KEY = "fizzrix.settings.v1";

const defaultSettings = {
  theme: "system", // 'light' | 'dark' | 'system'
  highContrast: false,
  fontSize: "medium", // 'small' | 'medium' | 'large'
  reducedMotion: false,
  compactMode: false
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
