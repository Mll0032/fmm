import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../hooks/useData.js";

function Modules() {
  const navigate = useNavigate();
  const { modules, loading, loadModules, addModule, removeModule } = useData();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("one-shot");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load modules on mount
  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const byCategory = useMemo(() => {
    return {
      "One‑Shots": modules.filter(m => m.category === "one-shot"),
      "Campaigns": modules.filter(m => m.category === "campaign")
    };
  }, [modules]);

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

  function open(id) {
    navigate(`/modules/${id}`);
  }

  const handleDeleteModule = useCallback(async (id, name) => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      try {
        await removeModule(id);
      } catch (error) {
        console.error('Error deleting module:', error);
        alert('Error deleting module. Please try again.');
      }
    }
  }, [removeModule]);

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
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          style={{
            padding: "10px 14px",
            background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
            color: "#0b0d12",
            border: 0,
            borderRadius: "10px",
            cursor: isSubmitting || !name.trim() ? "not-allowed" : "pointer",
            fontWeight: 700,
            opacity: isSubmitting || !name.trim() ? 0.6 : 1
          }}
        >
          {isSubmitting ? "Adding..." : "Add"}
        </button>
      </form>

      {/* Lists */}
      <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
        {loading.modules ? (
          <div style={{ 
            padding: "40px", 
            textAlign: "center", 
            color: "var(--muted)",
            background: "var(--bg-elev)", 
            borderRadius: "var(--radius)", 
            border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)" 
          }}>
            Loading modules...
          </div>
        ) : (
          Object.entries(byCategory).map(([label, list]) => (
            <div key={label} style={{ background: "var(--bg-elev)", borderRadius: "var(--radius)", border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)" }}>
              <div style={{ padding: "12px 12px 0 12px" }}>
                <h3 style={{ margin: 0 }}>{label}</h3>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: "8px 8px 8px 8px", display: "grid", gap: "8px" }}>
                {list.length === 0 && (
                  <li style={{ color: "var(--muted)", padding: "8px 12px" }}>No modules yet.</li>
                )}
                {list.map(m => (
                  <li key={m.id}>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center"
                      }}
                    >
                      <button
                        onClick={() => open(m.id)}
                        title="Open module editor"
                        style={{
                          flex: 1,
                          textAlign: "left",
                          padding: "10px 12px",
                          background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                          color: "#0b0d12",
                          borderRadius: "10px",
                          border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)",
                          cursor: "pointer",
                          fontWeight: 600
                        }}
                      >
                        {m.name}
                      </button>
                      <button
                        onClick={() => handleDeleteModule(m.id, m.name)}
                        title="Delete module"
                        style={{
                          padding: "10px 12px",
                          background: "transparent",
                          color: "crimson",
                          borderRadius: "10px",
                          border: "1px solid color-mix(in oklab, crimson 50%, var(--text) 20%)",
                          cursor: "pointer",
                          fontWeight: 600
                        }}
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

export default React.memo(Modules);