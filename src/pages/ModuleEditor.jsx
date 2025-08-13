import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ModulesStore } from "../state/modulesStore";

// Small helper: run effect after user stops typing for `delay` ms
function useDebouncedEffect(effect, deps, delay) {
  useEffect(() => {
    const h = setTimeout(effect, delay);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}

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
  const [rename, setRename] = useState(moduleData?.name || "");

  // 🚫 If module not found
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

  // ✅ Keep editable content in local state while typing
  const [data, setData] = useState(moduleData.data);

  // When switching to a different module id, reset local state
  useEffect(() => {
    setRename(moduleData.name);
    setData(moduleData.data);
  }, [moduleData?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Debounced autosave (runs 400ms after changes stop)
  useDebouncedEffect(() => {
    ModulesStore.updateData(moduleData.id, () => data);
  }, [data], 400);

  function saveRename() {
    if (rename.trim()) ModulesStore.rename(moduleData.id, rename.trim());
  }

  // Local updaters (no navigate/refresh!)
  const update = (patch) => setData((old) => ({ ...old, ...patch }));

  function addEpisode() {
    setData((old) => ({
      ...old,
      episodes: [
        ...(old.episodes || []),
        {
          id: crypto.randomUUID?.() ?? String(Date.now()),
          title: `Episode ${((old.episodes?.length || 0) + 1)}`,
          content: ""
        }
      ]
    }));
  }

  function updateEpisode(epId, patch) {
    setData((old) => ({
      ...old,
      episodes: (old.episodes || []).map((e) => (e.id === epId ? { ...e, ...patch } : e))
    }));
  }

  function removeEpisode(epId) {
    setData((old) => ({
      ...old,
      episodes: (old.episodes || []).filter((e) => e.id !== epId)
    }));
  }

  return (
    <section style={{ padding: "20px 0", display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => navigate("/modules")}
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr max-content", gap: 8 }}>
          <input
            value={rename}
            onChange={(e) => setRename(e.target.value)}
            style={{
              padding: "10px 12px",
              background: "var(--surface)",
              color: "var(--text)",
              borderRadius: 10,
              border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
            }}
          />
          <button
            onClick={saveRename}
            style={{
              padding: "10px 14px",
              background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
              color: "#0b0d12",
              border: 0,
              borderRadius: 10,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Save
          </button>
        </div>
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

        <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
          {(data.episodes || []).map((ep) => (
            <li key={ep.id} style={{ listStyle: "decimal" }}>
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
        </ol>
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
              setData((old) => ({
                ...old,
                appendices: { ...old.appendices, monsters: v }
              }))
            }
            placeholder="Stat blocks, links, custom notes…"
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
              setData((old) => ({
                ...old,
                appendices: { ...old.appendices, magicItems: v }
              }))
            }
            placeholder="Homebrew items, rarity, attunement, effects…"
          />
        </div>
      </div>
    </section>
  );
}
