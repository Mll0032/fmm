import React, { useState, useEffect, useRef } from "react";
import { SettingsStore } from "../state/settingsStore";
import { ModulesStore } from "../state/modulesStore";
import PillToggle from "../components/PillToggle/PillToggle";
import Toast from "../components/Toast/Toast";

export default function Settings() {
  const [settings, setSettings] = useState(SettingsStore.get());
  const [toast, setToast] = useState({ show: false, msg: "" });
  const [importMode, setImportMode] = useState("replace"); // 'replace' | 'merge'
  const fileRef = useRef(null);

  useEffect(() => { applyTheme(settings); }, [settings]);

  function applyTheme(s) {
    const root = document.documentElement;
    let mode = s.theme;
    if (s.theme === "system") {
      mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    root.dataset.theme = mode;
    root.dataset.highContrast = s.highContrast ? "true" : "false";
    root.style.setProperty(
  "--font-scale",
  s.fontSize === "small"
    ? "0.9"
    : s.fontSize === "large"
    ? "1.15"
    : s.fontSize === "xxl"
    ? "1.35"
    : "1"
);
    root.dataset.reducedMotion = s.reducedMotion ? "true" : "false";
    root.dataset.compactMode = s.compactMode ? "true" : "false";
  }

  function update(updates) {
    const newSettings = SettingsStore.set(updates);
    setSettings(newSettings);
  }

  function resetData() {
    if (window.confirm("This will delete ALL local data (modules & settings). Continue?")) {
      localStorage.clear();
      window.location.reload();
    }
  }

  // ---------- Export ----------
  function exportJSON() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: SettingsStore.get(),
      modules: ModulesStore.list()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fizzrix-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setToast({ show: true, msg: "Exported backup" });
  }

  // ---------- Import ----------
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Basic validation
      if (!data || typeof data !== "object" || !Array.isArray(data.modules) || !data.settings) {
        alert("Invalid backup file.");
        return;
      }

      if (importMode === "replace") {
        // Replace everything
        ModulesStore.replaceAll(data.modules);
        SettingsStore.setAll(data.settings);
      } else {
        // Merge: settings shallow-merge, modules by id (skip duplicates)
        const currentMods = ModulesStore.list();
        const currentIds = new Set(currentMods.map(m => m.id));
        const mergedMods = [...currentMods, ...data.modules.filter(m => m && !currentIds.has(m.id))];
        ModulesStore.replaceAll(mergedMods);
        SettingsStore.setAll({ ...SettingsStore.get(), ...data.settings });
      }

      setToast({ show: true, msg: "Imported backup" });
      // refresh page state
      setSettings(SettingsStore.get());
    } catch (err) {
      console.error(err);
      alert("Could not import backup.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section style={{ padding: "20px 0", display: "grid", gap: 16 }}>
      <h2>Settings</h2>

      {/* Theme */}
      <div style={{ display: "grid", gap: 8 }}>
        <label>Theme Mode</label>
        <select
          value={settings.theme}
          onChange={(e) => update({ theme: e.target.value })}
          style={{ padding: "8px", background: "var(--surface)", color: "var(--text)", borderRadius: "8px" }}
        >
          <option value="system">System Default</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <PillToggle label="High Contrast Mode" checked={settings.highContrast} onChange={(v) => update({ highContrast: v })} />

      {/* Font size */}
      <div style={{ display: "grid", gap: 8 }}>
        <label>Font Size</label>
        <select
          value={settings.fontSize}
          onChange={(e) => update({ fontSize: e.target.value })}
          style={{ padding: "8px", background: "var(--surface)", color: "var(--text)", borderRadius: "8px" }}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
          <option value="xxl">XXL</option>
        </select>
      </div>

      <PillToggle label="Reduced Motion" checked={settings.reducedMotion} onChange={(v) => update({ reducedMotion: v })} />
      <PillToggle label="Compact Mode" checked={settings.compactMode} onChange={(v) => update({ compactMode: v })} />

      {/* Data Management */}
      <div style={{ display: "grid", gap: 10, marginTop: 12, background: "var(--bg-elev)", padding: 12, borderRadius: "var(--radius)", border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)" }}>
        <h3 style={{ margin: 0 }}>Data</h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={exportJSON}
            style={{ padding: "8px 12px", borderRadius: 8, background: "linear-gradient(90deg, var(--brand), var(--brand-2))", color: "#0b0d12", border: 0, fontWeight: 700, cursor: "pointer" }}
          >
            Export JSON
          </button>

          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input
              type="radio"
              name="importMode"
              value="replace"
              checked={importMode === "replace"}
              onChange={() => setImportMode("replace")}
            />
            Replace
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input
              type="radio"
              name="importMode"
              value="merge"
              checked={importMode === "merge"}
              onChange={() => setImportMode("merge")}
            />
            Merge
          </label>

          <button
            onClick={() => fileRef.current?.click()}
            style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface)", color: "var(--text)", border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)", cursor: "pointer" }}
          >
            Import JSON…
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImportFile} hidden />
        </div>

        <small style={{ color: "var(--muted)" }}>
          Export bundles your <strong>modules</strong> and <strong>settings</strong> together. Import with “Replace” to fully restore, or “Merge” to keep your current data and add new modules from the file.
        </small>

        <div>
          <button onClick={resetData} style={{ padding: "8px 12px", borderRadius: 8, background: "crimson", color: "white", border: "none", cursor: "pointer" }}>
            Clear All Data
          </button>
        </div>
      </div>

      <Toast show={toast.show} message={toast.msg} onHide={() => setToast({ show: false, msg: "" })} />
    </section>
  );
}
