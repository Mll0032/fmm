import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import { useAuth } from "../context/AuthContext.jsx";
import { publishToLibrary } from "../lib/supabase.js";

const isTouch = window.matchMedia("(pointer: coarse)").matches;

function HoverButton({ children, onClick, style, hoverStyle, ...props }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={isTouch ? undefined : () => setIsHovered(true)}
      onMouseLeave={isTouch ? undefined : () => setIsHovered(false)}
      style={isHovered ? hoverStyle : style}
      {...props}
    >
      {children}
    </button>
  );
}

function Modules() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { modules, loading, loadModules, addModule, removeModule } = useData();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("one-shot");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(null); // module id pending confirm
  const [publishing, setPublishing] = useState(false);
  const [publishedIds, setPublishedIds] = useState(new Set()); // IDs published this session

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const byCategory = useMemo(() => ({
    "One‑Shots": modules.filter(m => m.category === "one-shot"),
    "Campaigns": modules.filter(m => m.category === "campaign")
  }), [modules]);

  const handleAdd = useCallback(async (e) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const m = await addModule({ name, category });
      setName("");
      navigate(`/modules/${m.id}`);
    } catch (error) {
      console.error('Error creating module:', error);
      alert('Error creating module. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [name, category, isSubmitting, addModule, navigate]);

  const handleDeleteModule = useCallback(async (id, name) => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      try {
        await removeModule(id);
      } catch (error) {
        console.error('Error deleting module:', error.message ?? error);
        alert('Error deleting module: ' + (error.message ?? 'Please try again.'));
      }
    }
  }, [removeModule]);

  const handlePublish = useCallback(async (module) => {
    setPublishing(true);
    try {
      const ownerName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        'Anonymous';
      await publishToLibrary(module, ownerName);
      setPublishedIds(prev => new Set([...prev, module.id]));
      setConfirmPublish(null);
    } catch (err) {
      alert('Could not publish: ' + err.message);
    } finally {
      setPublishing(false);
    }
  }, [user]);

  return (
    <section style={{ padding: "20px 0" }}>
      <h2>Modules</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Add a module name, pick a category, then click any module to edit details.
      </p>

      {/* Add form */}
      <form
        onSubmit={handleAdd}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr max-content max-content",
          gap: "8px",
          alignItems: "center",
          background: "var(--bg-elev)",
          padding: "12px",
          borderRadius: "var(--radius)",
          border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)"
        }}
      >
        <input
          aria-label="New module name"
          placeholder="e.g. Breathborne, Echo Archive, or The Sunken Vault"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: "10px 12px",
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
            borderRadius: "10px"
          }}
        />
        <select
          aria-label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "10px 12px",
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
            borderRadius: "10px"
          }}
        >
          <option value="one-shot">One‑Shot</option>
          <option value="campaign">Campaign</option>
        </select>
        <HoverButton
          type="submit"
          disabled={isSubmitting || !name.trim()}
          style={addBtnStyle(isSubmitting || !name.trim())}
          hoverStyle={addBtnHoverStyle(isSubmitting || !name.trim())}
        >
          {isSubmitting ? "Adding..." : "Add"}
        </HoverButton>
      </form>

      {/* Module lists */}
      <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
        {loading.modules ? (
          <div style={loadingBox}>Loading modules...</div>
        ) : (
          Object.entries(byCategory).map(([label, list]) => (
            <div key={label} style={sectionBox}>
              <div style={{ padding: "12px 12px 0 12px" }}>
                <h3 style={{ margin: 0 }}>{label}</h3>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: "8px", display: "grid", gap: "8px" }}>
                {list.length === 0 && (
                  <li style={{ color: "var(--muted)", padding: "8px 12px" }}>No modules yet.</li>
                )}
                {list.map(m => (
                  <li key={m.id}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {/* Module name button */}
                      <HoverButton
                        onClick={() => navigate(`/modules/${m.id}`)}
                        title="Open module editor"
                        style={moduleBtnStyle}
                        hoverStyle={moduleBtnHoverStyle}
                      >
                        {m.name}
                      </HoverButton>

                      {/* + Library / inline confirm */}
                      {confirmPublish === m.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: "0.78rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                            Share publicly?
                          </span>
                          <button
                            onClick={() => handlePublish(m)}
                            disabled={publishing}
                            style={confirmYesBtn}
                          >
                            {publishing ? "…" : "Yes"}
                          </button>
                          <button
                            onClick={() => setConfirmPublish(null)}
                            disabled={publishing}
                            style={confirmCancelBtn}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : publishedIds.has(m.id) ? (
                        <span style={publishedBadge}>✓ In Library</span>
                      ) : (
                        <button
                          onClick={() => setConfirmPublish(m.id)}
                          title="Share this module to the Library"
                          style={libraryBtn}
                        >
                          + Library
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteModule(m.id, m.name)}
                        title="Delete module"
                        style={deleteBtnStyle}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const addBtnStyle = (disabled) => ({
  padding: "10px 14px",
  background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
  color: "#0b0d12",
  border: 0,
  borderRadius: "10px",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 700,
  opacity: disabled ? 0.6 : 1,
  transition: "background 0.2s ease",
  fontFamily: "inherit",
});

const addBtnHoverStyle = (disabled) => ({
  ...addBtnStyle(disabled),
  background: "linear-gradient(270deg, var(--brand), var(--brand-2))",
});

const sectionBox = {
  background: "var(--bg-elev)",
  borderRadius: "var(--radius)",
  border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
};

const loadingBox = {
  padding: "40px",
  textAlign: "center",
  color: "var(--muted)",
  background: "var(--bg-elev)",
  borderRadius: "var(--radius)",
  border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
};

const moduleBtnStyle = {
  flex: 1,
  textAlign: "left",
  padding: "10px 12px",
  background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
  color: "#0b0d12",
  borderRadius: "10px",
  border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)",
  cursor: "pointer",
  fontWeight: 600,
  transition: "background 0.2s ease",
  fontFamily: "inherit",
};

const moduleBtnHoverStyle = {
  ...moduleBtnStyle,
  background: "linear-gradient(270deg, var(--brand), var(--brand-2))",
};

const libraryBtn = {
  padding: "10px 12px",
  background: "transparent",
  color: "var(--accent)",
  borderRadius: "10px",
  border: "1px solid color-mix(in oklab, var(--accent) 40%, transparent)",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.82rem",
  whiteSpace: "nowrap",
  fontFamily: "inherit",
};

const confirmYesBtn = {
  padding: "6px 12px",
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.82rem",
  fontFamily: "inherit",
};

const confirmCancelBtn = {
  padding: "6px 10px",
  background: "transparent",
  color: "var(--muted)",
  border: "1px solid color-mix(in oklab, var(--text) 15%, transparent)",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "0.82rem",
  fontFamily: "inherit",
};

const publishedBadge = {
  padding: "10px 12px",
  fontSize: "0.78rem",
  color: "var(--accent)",
  whiteSpace: "nowrap",
};

const deleteBtnStyle = {
  padding: "10px 12px",
  background: "transparent",
  color: "crimson",
  borderRadius: "10px",
  border: "1px solid color-mix(in oklab, crimson 50%, var(--text) 20%)",
  cursor: "pointer",
  fontWeight: 600,
  fontFamily: "inherit",
};

export default React.memo(Modules);
