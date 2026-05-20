import React, { useState, useEffect, useRef } from "react";
import { SettingsStore } from "../state/settingsStore";
import { ModulesStore } from "../state/modulesStore";
import {
  getApiKey, setApiKey,
  getSelectedProvider, setSelectedProvider,
  getSelectedModel, setSelectedModel,
  PROVIDERS, PROVIDER_LIST
} from "../lib/ai.js";
import PillToggle from "../components/PillToggle/PillToggle";
import Toast from "../components/Toast/Toast";

export default function Settings() {
  const [settings, setSettings] = useState(SettingsStore.get());
  const [toast, setToast] = useState({ show: false, msg: "" });
  const [importMode, setImportMode] = useState("replace"); // 'replace' | 'merge'
  const fileRef = useRef(null);
  const [selectedProvider, setSelectedProviderState] = useState(getSelectedProvider());
  const [selectedModel, setSelectedModelState] = useState(() => {
    const p = getSelectedProvider();
    const stored = getSelectedModel(p);
    return (stored && PROVIDERS[p]?.models.find(m => m.id === stored)) ? stored : (PROVIDERS[p]?.models[0]?.id || "");
  });
  const [apiKeyInput, setApiKeyInput] = useState(() => getApiKey(getSelectedProvider()));
  const [showKey, setShowKey] = useState(false);
  const [fsKeyInput, setFsKeyInput] = useState(() => localStorage.getItem("fizzrix.freesound.apikey") || "");
  const [showFsKey, setShowFsKey] = useState(false);
  const [fsSaved, setFsSaved] = useState(() => !!localStorage.getItem("fizzrix.freesound.apikey"));
  const [imgKeyInput, setImgKeyInput] = useState(() => localStorage.getItem("fizzrix.imagegen.apikey") || "");
  const [showImgKey, setShowImgKey] = useState(false);
  const [imgKeySaved, setImgKeySaved] = useState(() => !!localStorage.getItem("fizzrix.imagegen.apikey"));

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
  async function exportJSON() {
    try {
      const modules = await ModulesStore.list();
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: SettingsStore.get(),
        modules
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `fizzrix-backup-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setToast({ show: true, msg: "Exported backup" });
    } catch (err) {
      console.error(err);
      alert("Could not export backup.");
    }
  }

  // ---------- Import ----------
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || typeof data !== "object" || !Array.isArray(data.modules) || !data.settings) {
        alert("Invalid backup file.");
        return;
      }

      if (importMode === "replace") {
        await ModulesStore.clearAll();
        for (const m of data.modules) {
          await ModulesStore.importModule({ name: m.name, category: m.category, data: m.data });
        }
        SettingsStore.setAll(data.settings);
      } else {
        // Merge: add only modules not already present (matched by name)
        const currentMods = await ModulesStore.list();
        const currentNames = new Set(currentMods.map(m => m.name));
        for (const m of data.modules) {
          if (m && !currentNames.has(m.name)) {
            await ModulesStore.importModule({ name: m.name, category: m.category, data: m.data });
          }
        }
        SettingsStore.setAll({ ...SettingsStore.get(), ...data.settings });
      }

      setToast({ show: true, msg: "Imported backup" });
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

      {/* AI Assistant */}
      {(() => {
        const provider = PROVIDERS[selectedProvider];
        const hasKey = !!getApiKey(selectedProvider);

        function handleProviderChange(id) {
          setSelectedProvider(id);
          setSelectedProviderState(id);
          const stored = getSelectedModel(id);
          const p = PROVIDERS[id];
          const model = (stored && p?.models.find(m => m.id === stored)) ? stored : (p?.models[0]?.id || "");
          setSelectedModel(id, model);
          setSelectedModelState(model);
          setApiKeyInput(getApiKey(id));
          setShowKey(false);
        }

        function handleModelChange(modelId) {
          setSelectedModel(selectedProvider, modelId);
          setSelectedModelState(modelId);
        }

        function handleSaveKey() {
          setApiKey(selectedProvider, apiKeyInput);
          setToast({ show: true, msg: `API key saved for ${provider.name}` });
        }

        function handleRemoveKey() {
          setApiKey(selectedProvider, "");
          setApiKeyInput("");
          setToast({ show: true, msg: "API key removed" });
        }

        return (
          <div style={{ display: "grid", gap: 12, marginTop: 12, background: "var(--bg-elev)", padding: 12, borderRadius: "var(--radius)", border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)" }}>
            <h3 style={{ margin: 0 }}>AI Assistant</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              Powers the DM Assistant panel on the Session Dashboard. API keys are stored only in this browser.
            </p>

            {/* Provider + Model selects */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Provider</label>
                <select
                  value={selectedProvider}
                  onChange={e => handleProviderChange(e.target.value)}
                  style={{ padding: "8px", background: "var(--surface)", color: "var(--text)", borderRadius: 8, border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)" }}
                >
                  {PROVIDER_LIST.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.freeNote ? " ✦" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Model</label>
                <select
                  value={selectedModel}
                  onChange={e => handleModelChange(e.target.value)}
                  style={{ padding: "8px", background: "var(--surface)", color: "var(--text)", borderRadius: 8, border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)" }}
                >
                  {provider?.models.map(m => (
                    <option key={m.id} value={m.id}>{m.label} [{m.badge}]</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Provider info */}
            <small style={{ color: "var(--muted)", lineHeight: 1.5 }}>
              {provider?.freeNote && <><strong style={{ color: "var(--brand)" }}>✦ {provider.freeNote}</strong> — </>}
              Get an API key at <strong>{provider?.keyUrl?.replace("https://", "")}</strong>
            </small>

            {/* API key input */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder={provider?.keyPlaceholder || "API key..."}
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: "8px 10px",
                  background: "var(--surface)",
                  color: "var(--text)",
                  borderRadius: 8,
                  border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
                  fontFamily: "monospace",
                  fontSize: 13
                }}
              />
              <button
                onClick={() => setShowKey(s => !s)}
                style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface)", color: "var(--text)", border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)", cursor: "pointer" }}
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>

            {/* Save / Remove */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={handleSaveKey}
                disabled={!apiKeyInput.trim()}
                style={{ padding: "8px 12px", borderRadius: 8, background: apiKeyInput.trim() ? "linear-gradient(90deg, var(--brand), var(--brand-2))" : "var(--surface)", color: apiKeyInput.trim() ? "#0b0d12" : "var(--muted)", border: 0, fontWeight: 700, cursor: apiKeyInput.trim() ? "pointer" : "not-allowed" }}
              >
                Save Key
              </button>
              {hasKey && (
                <button
                  onClick={handleRemoveKey}
                  style={{ padding: "8px 12px", borderRadius: 8, background: "transparent", color: "crimson", border: "1px solid color-mix(in oklab, crimson 50%, var(--text) 20%)", cursor: "pointer" }}
                >
                  Remove Key
                </button>
              )}
              {hasKey && (
                <small style={{ color: "var(--muted)" }}>✓ Key saved for {provider?.name}</small>
              )}
            </div>
          </div>
        );
      })()}

      {/* Freesound Library */}
      <div style={{ display: "grid", gap: 12, marginTop: 12, background: "var(--bg-elev)", padding: 12, borderRadius: "var(--radius)", border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)" }}>
        <h3 style={{ margin: 0 }}>Soundboard — Freesound Library</h3>
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
          Enables royalty-free music search inside the Soundboard. Get a free key at <strong>freesound.org</strong> — create an account, then go to Edit Profile → API Credentials.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type={showFsKey ? "text" : "password"}
            value={fsKeyInput}
            onChange={e => setFsKeyInput(e.target.value)}
            placeholder="Freesound API key..."
            style={{ flex: 1, minWidth: 200, padding: "8px 10px", background: "var(--surface)", color: "var(--text)", borderRadius: 8, border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)", fontFamily: "monospace", fontSize: 13 }}
          />
          <button
            onClick={() => setShowFsKey(s => !s)}
            style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface)", color: "var(--text)", border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)", cursor: "pointer" }}
          >{showFsKey ? "Hide" : "Show"}</button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => { localStorage.setItem("fizzrix.freesound.apikey", fsKeyInput); setFsSaved(true); setToast({ show: true, msg: "Freesound key saved" }); }}
            disabled={!fsKeyInput.trim()}
            style={{ padding: "8px 12px", borderRadius: 8, background: fsKeyInput.trim() ? "linear-gradient(90deg, var(--brand), var(--brand-2))" : "var(--surface)", color: fsKeyInput.trim() ? "#0b0d12" : "var(--muted)", border: 0, fontWeight: 700, cursor: fsKeyInput.trim() ? "pointer" : "not-allowed" }}
          >Save Key</button>
          {fsSaved && (
            <button
              onClick={() => { localStorage.removeItem("fizzrix.freesound.apikey"); setFsKeyInput(""); setFsSaved(false); setToast({ show: true, msg: "Freesound key removed" }); }}
              style={{ padding: "8px 12px", borderRadius: 8, background: "transparent", color: "crimson", border: "1px solid color-mix(in oklab, crimson 50%, var(--text) 20%)", cursor: "pointer" }}
            >Remove Key</button>
          )}
          {fsSaved && <small style={{ color: "var(--muted)" }}>✓ Key saved</small>}
        </div>
      </div>

      {/* Image Generation */}
      <div style={{ display: "grid", gap: 12, marginTop: 12, background: "var(--bg-elev)", padding: 12, borderRadius: "var(--radius)", border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)" }}>
        <h3 style={{ margin: 0 }}>Image Generation</h3>
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
          Powers the <strong>✦ Generate</strong> button in the module editor. Uses OpenAI DALL-E (same key as text AI — if you already saved an OpenAI key under AI Assistant, you don't need to enter it again here).
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type={showImgKey ? "text" : "password"}
            value={imgKeyInput}
            onChange={e => setImgKeyInput(e.target.value)}
            placeholder="sk-..."
            style={{ flex: 1, minWidth: 200, padding: "8px 10px", background: "var(--surface)", color: "var(--text)", borderRadius: 8, border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)", fontFamily: "monospace", fontSize: 13 }}
          />
          <button onClick={() => setShowImgKey(s => !s)} style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface)", color: "var(--text)", border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)", cursor: "pointer" }}>
            {showImgKey ? "Hide" : "Show"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => { localStorage.setItem("fizzrix.imagegen.apikey", imgKeyInput.trim()); setImgKeySaved(true); setToast({ show: true, msg: "Image generation key saved" }); }}
            disabled={!imgKeyInput.trim()}
            style={{ padding: "8px 12px", borderRadius: 8, background: imgKeyInput.trim() ? "linear-gradient(90deg, var(--brand), var(--brand-2))" : "var(--surface)", color: imgKeyInput.trim() ? "#0b0d12" : "var(--muted)", border: 0, fontWeight: 700, cursor: imgKeyInput.trim() ? "pointer" : "not-allowed" }}
          >Save Key</button>
          {imgKeySaved && (
            <button
              onClick={() => { localStorage.removeItem("fizzrix.imagegen.apikey"); setImgKeyInput(""); setImgKeySaved(false); setToast({ show: true, msg: "Image generation key removed" }); }}
              style={{ padding: "8px 12px", borderRadius: 8, background: "transparent", color: "crimson", border: "1px solid color-mix(in oklab, crimson 50%, var(--text) 20%)", cursor: "pointer" }}
            >Remove Key</button>
          )}
          {imgKeySaved && <small style={{ color: "var(--muted)" }}>✓ Key saved</small>}
        </div>
      </div>

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
