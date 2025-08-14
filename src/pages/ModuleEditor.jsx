import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useBeforeUnload } from "react-router-dom";
import { ModulesStore } from "../state/modulesStore";
import Toast from "../components/Toast/Toast";
import ImageField from "../components/ImageField/ImageField";

function TextRow({ label, value, onChange, placeholder, multiline = false }) {
  const common = {
    width: "100%",
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
    borderRadius: "10px",
    padding: "10px 12px"
  };
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 14, color: "var(--muted)" }}>{label}</label>
      {multiline ? (
        <textarea
          rows={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={common}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={common}
        />
      )}
    </div>
  );
}

export default function ModuleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const moduleData = useMemo(() => ModulesStore.get(id), [id]);

  // 🚫 Guard
  if (!moduleData) {
    return (
      <section style={{ padding: "20px 0" }}>
        <p>Module not found.</p>
        <button onClick={() => navigate("/modules")} style={{ padding: "8px 12px", borderRadius: 8 }}>
          Back to Modules
        </button>
      </section>
    );
  }

  // Local, editable form state
  const [rename, setRename] = useState(moduleData.name);
  const [data, setData] = useState(withDefaults(moduleData.data));
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(moduleData.updatedAt || moduleData.createdAt);
  const [toast, setToast] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  function withDefaults(d) {
    return {
      mapUrl: d.mapUrl || "",
      mapImage: d.mapImage || { dataUrl: "", alt: "", showOnDashboard: false },

      introduction: d.introduction || "",
      introImage: d.introImage || { dataUrl: "", alt: "", showOnDashboard: false },

      overview: d.overview || "",
      overviewImage: d.overviewImage || { dataUrl: "", alt: "", showOnDashboard: false },

      episodes: (d.episodes || []).map(e => ({
        id: e.id,
        title: e.title ?? "",
        content: e.content ?? "",
        image: e.image || { dataUrl: "", alt: "", showOnDashboard: false }
      })),

      appendices: {
        monsters: d.appendices?.monsters || "",
        monstersImage: d.appendices?.monstersImage || { dataUrl: "", alt: "", showOnDashboard: false },
        magicItems: d.appendices?.magicItems || "",
        magicItemsImage: d.appendices?.magicItemsImage || { dataUrl: "", alt: "", showOnDashboard: false }
      }
    };
  }
  
  // Reset form when switching modules
  useEffect(() => {
    const current = ModulesStore.get(id);
    if (current) {
      setRename(current.name);
      setData(withDefaults(current.data));
      setDirty(false);
      setLastSaved(current.updatedAt || current.createdAt);
    }
  }, [id]);

  // Browser beforeunload warning
  useBeforeUnload(
    useCallback(
      (e) => {
        if (dirty) {
          e.preventDefault();
          e.returnValue = '';
        }
      },
      [dirty]
    )
  );

  // Intercept navigation attempts when there are unsaved changes
  const handleNavigation = useCallback((path) => {
    if (dirty) {
      setShowSaveDialog(true);
      setPendingNavigation(path);
    } else {
      navigate(path);
    }
  }, [dirty, navigate]);

  // Custom back button with save check
  const handleBack = () => {
    handleNavigation("/modules");
  };

  // Helpers
  const markDirty = () => setDirty(true);

  const update = (patch) => {
    setData((old) => {
      const next = { ...old, ...patch };
      return next;
    });
    markDirty();
  };

  function addEpisode() {
    setData((old) => ({
      ...old,
      episodes: [
        ...(old.episodes || []),
        {
          id: crypto.randomUUID?.() ?? String(Date.now()),
          title: `Episode ${((old.episodes?.length || 0) + 1)}`,
          content: "",
          image: { dataUrl: "", alt: "", showOnDashboard: false }
        }
      ]
    }));
    markDirty();
  }

  function updateEpisode(epId, patch) {
    setData((old) => ({
      ...old,
      episodes: (old.episodes || []).map((e) => (e.id === epId ? { ...e, ...patch } : e))
    }));
    markDirty();
  }

  function removeEpisode(epId) {
    setData((old) => ({
      ...old,
      episodes: (old.episodes || []).filter((e) => e.id !== epId)
    }));
    markDirty();
  }

  function handleSave() {
    // Save title if changed
    if (rename.trim() && rename.trim() !== moduleData.name) {
      ModulesStore.rename(moduleData.id, rename.trim());
    }
    // Save all section content
    ModulesStore.updateData(moduleData.id, () => data);

    // Refresh local meta and toast
    const updated = ModulesStore.get(moduleData.id);
    setLastSaved(updated?.updatedAt || new Date().toISOString());
    setDirty(false);
    setToast(true);
  }

  function handleSaveAndNavigate() {
    handleSave();
    setShowSaveDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  }

  function handleDiscardAndNavigate() {
    setDirty(false);
    setShowSaveDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  }

  function formatTS(ts) {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts || "—";
    }
  }

  return (
    <>
      <section style={{ padding: "20px 0", display: "grid", gap: 16 }}>
        {/* Top bar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleBack}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
              background: "var(--bg-elev)",
              color: "var(--text)"
            }}
          >
            ← Back
          </button>

          <h2 style={{ margin: 0, flex: "1 1 auto" }}>{rename}</h2>

          <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Last saved: {formatTS(lastSaved)}
            </div>
            <button
              onClick={handleSave}
              disabled={!dirty && rename.trim() === moduleData.name}
              style={{
                padding: "10px 14px",
                background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                color: "#0b0d12",
                border: 0,
                borderRadius: 10,
                fontWeight: 700,
                cursor: "pointer",
                opacity: (!dirty && rename.trim() === moduleData.name) ? 0.7 : 1
              }}
              title="Save all changes"
            >
              Save
            </button>
          </div>
        </div>

        {/* Rename */}
        <div
          style={{
            display: "grid",
            gap: 8,
            background: "var(--bg-elev)",
            padding: 12,
            borderRadius: "var(--radius)",
            border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)"
          }}
        >
          <h3 style={{ margin: 0 }}>Title</h3>
          <input
            value={rename}
            onChange={(e) => {
              setRename(e.target.value);
              if (e.target.value.trim() !== moduleData.name) markDirty();
            }}
            style={{
              padding: "10px 12px",
              background: "var(--surface)",
              color: "var(--text)",
              borderRadius: 10,
              border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
            }}
          />
        </div>

        {/* Core sections */}
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gap: 12,
              background: "var(--bg-elev)",
              padding: 12,
              borderRadius: "var(--radius)",
              border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)"
            }}
          >
            <h3 style={{ margin: 0 }}>Map of Overall Area</h3>
            <TextRow
              label="Map URL"
              value={data.mapUrl}
              onChange={(v) => update({ mapUrl: v })}
              placeholder="https://… (image link, Notion board, Google Drive, etc.)"
            />
            <ImageField
              label="Map Image (JPG)"
              value={data.mapImage}
              onChange={(img) => { setData(o => ({ ...o, mapImage: img })); markDirty(); }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              background: "var(--bg-elev)",
              padding: 12,
              borderRadius: "var(--radius)",
              border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)"
            }}
          >
            <h3 style={{ margin: 0 }}>Introduction</h3>
            <TextRow
              label="Intro Text"
              multiline
              value={data.introduction}
              onChange={(v) => update({ introduction: v })}
              placeholder="Hook, stakes, how the players get involved…"
            />
            <ImageField
              label="Introduction Image (JPG)"
              value={data.introImage}
              onChange={(img) => { setData(o => ({ ...o, introImage: img })); markDirty(); }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              background: "var(--bg-elev)",
              padding: 12,
              borderRadius: "var(--radius)",
              border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)"
            }}
          >
            <h3 style={{ margin: 0 }}>Overview</h3>
            <TextRow
              label="Overview Text"
              multiline
              value={data.overview}
              onChange={(v) => update({ overview: v })}
              placeholder="Structure, themes, expected level range, major beats…"
            />
            <ImageField
              label="Overview Image (JPG)"
              value={data.overviewImage}
              onChange={(img) => { setData(o => ({ ...o, overviewImage: img })); markDirty(); }}
            />
          </div>
        </div>

        {/* Episodes */}
        <div
          style={{
            display: "grid",
            gap: 12,
            background: "var(--bg-elev)",
            padding: 12,
            borderRadius: "var(--radius)",
            border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Episodes</h3>
            <button
              onClick={addEpisode}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: 0,
                cursor: "pointer",
                background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                color: "#0b0d12",
                fontWeight: 700
              }}
            >
              + Add Episode
            </button>
          </div>

          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
            {(data.episodes || []).map((ep) => (
              <li key={ep.id}>
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    background: "var(--surface)",
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
                  }}
                >
                  <input
                    value={ep.title}
                    onChange={(e) => updateEpisode(ep.id, { title: e.target.value })}
                    style={{
                      padding: "8px 10px",
                      background: "var(--bg-elev)",
                      color: "var(--text)",
                      borderRadius: 8,
                      border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
                    }}
                  />
                  <textarea
                    rows={6}
                    value={ep.content}
                    onChange={(e) => updateEpisode(ep.id, { content: e.target.value })}
                    placeholder="Beats, scenes, encounters, checks, rewards…"
                    style={{
                      padding: "10px 12px",
                      background: "var(--bg-elev)",
                      color: "var(--text)",
                      borderRadius: 8,
                      border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
                    }}
                  />
                  <ImageField
                    label="Episode Image (JPG)"
                    value={ep.image || { dataUrl: "", alt: "", showOnDashboard: false }}
                    onChange={(img) => updateEpisode(ep.id, { image: img })}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => removeEpisode(ep.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid color-mix(in oklab, crimson 50%, var(--text) 20%)",
                        background: "transparent",
                        color: "var(--text)",
                        cursor: "pointer"
                      }}
                    >
                      Remove Episode
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Appendices */}
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gap: 12,
              background: "var(--bg-elev)",
              padding: 12,
              borderRadius: "var(--radius)",
              border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)"
            }}
          >
            <h3 style={{ margin: 0 }}>Monsters Appendix</h3>
            <TextRow
              label="Monsters"
              multiline
              value={data.appendices.monsters}
              onChange={(v) =>
                setData((old) => {
                  const next = { ...old, appendices: { ...old.appendices, monsters: v } };
                  return next;
                })
              }
              placeholder="Stat blocks, links, custom notes…"
            />
            <ImageField
              label="Monsters Appendix Image (JPG)"
              value={data.appendices.monstersImage}
              onChange={(img) =>
                setData(o => ({ ...o, appendices: { ...o.appendices, monstersImage: img } }))
              }
            />
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              background: "var(--bg-elev)",
              padding: 12,
              borderRadius: "var(--radius)",
              border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)"
            }}
          >
            <h3 style={{ margin: 0 }}>Magic Items Appendix</h3>
            <TextRow
              label="Magic Items"
              multiline
              value={data.appendices.magicItems}
              onChange={(v) =>
                setData((old) => {
                  const next = { ...old, appendices: { ...old.appendices, magicItems: v } };
                  return next;
                })
              }
              placeholder="Homebrew items, rarity, attunement, effects…"
            />
            <ImageField
              label="Magic Items Appendix Image (JPG)"
              value={data.appendices.magicItemsImage}
              onChange={(img) =>
                setData(o => ({ ...o, appendices: { ...o.appendices, magicItemsImage: img } }))
              }
            />
          </div>
        </div>

        {/* Toast */}
        <Toast show={toast} onHide={() => setToast(false)} message="Saved" />
      </section>

      {/* Save Dialog Modal */}
      {showSaveDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "grid",
            placeItems: "center",
            zIndex: 300
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSaveDialog(false);
              setPendingNavigation(null);
            }
          }}
        >
          <div
            style={{
              width: "min(400px, 90vw)",
              background: "var(--bg-elev)",
              color: "var(--text)",
              borderRadius: "var(--radius)",
              border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
              boxShadow: "var(--shadow)",
              padding: 20,
              display: "grid",
              gap: 16
            }}
          >
            <h3 style={{ margin: 0 }}>Unsaved Changes</h3>
            <p style={{ margin: 0 }}>
              You have unsaved changes. Do you want to save them before leaving?
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setPendingNavigation(null);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
                  background: "transparent",
                  color: "var(--text)",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardAndNavigate}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid color-mix(in oklab, crimson 50%, var(--text) 20%)",
                  background: "transparent",
                  color: "crimson",
                  cursor: "pointer"
                }}
              >
                Don't Save
              </button>
              <button
                onClick={handleSaveAndNavigate}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: 0,
                  background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                  color: "#0b0d12",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}