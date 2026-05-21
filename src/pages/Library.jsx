import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useData } from "../hooks/useData.js";
import { getLibraryEntries, removeFromLibrary } from "../lib/supabase.js";
import { SYSTEMS } from "../lib/systems.js";

const CATEGORY_LABEL = { "one-shot": "One‑Shot", "campaign": "Campaign" };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Library() {
  const { user } = useAuth();
  const { importModule } = useData();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const [removingId, setRemovingId] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [searchSystem, setSearchSystem] = useState('');

  useEffect(() => {
    getLibraryEntries()
      .then(setEntries)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const myEntries = entries.filter(e => e.owner_id === user?.id);
  const allBrowseEntries = entries.filter(e => e.owner_id !== user?.id);

  const availableSystems = SYSTEMS;

  const browseEntries = allBrowseEntries.filter(entry => {
    const nameMatch = !searchName || entry.module_name.toLowerCase().includes(searchName.toLowerCase());
    const systemMatch = !searchSystem || entry.system === searchSystem;
    return nameMatch && systemMatch;
  });

  const handleAdd = useCallback(async (entry) => {
    setAddingId(entry.id);
    try {
      await importModule({
        name: entry.module_name,
        category: entry.module_category,
        data: entry.module_data,
      });
      setAddedIds(prev => new Set([...prev, entry.id]));
    } catch (err) {
      setError("Could not add module: " + err.message);
    } finally {
      setAddingId(null);
    }
  }, [importModule]);

  const handleRemove = useCallback(async (entry) => {
    if (!confirm(`Remove "${entry.module_name}" from the library? Others will no longer see it.`)) return;
    setRemovingId(entry.id);
    try {
      await removeFromLibrary(entry.id);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
    } catch (err) {
      setError("Could not remove: " + err.message);
    } finally {
      setRemovingId(null);
    }
  }, []);

  return (
    <section style={{ padding: "20px 0" }}>
      <h2 style={{ marginBottom: 4 }}>Library</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Share your modules with the community, or add community modules to your own collection.
      </p>

      {error && (
        <p style={s.errorBanner}>{error}</p>
      )}

      {loading ? (
        <div style={s.emptyBox}>Loading library…</div>
      ) : (
        <>
          {/* ── My Published Modules ── */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <h3 style={s.sectionTitle}>My Published Modules</h3>
              <span style={s.sectionCount}>{myEntries.length}</span>
            </div>

            {myEntries.length === 0 ? (
              <p style={s.emptyNote}>
                You haven't published any modules yet. Go to <strong>Modules</strong> and click <strong>+ Library</strong> on any module to share it here.
              </p>
            ) : (
              <div style={s.grid}>
                {myEntries.map(entry => (
                  <LibraryCard
                    key={entry.id}
                    entry={entry}
                    action={
                      <button
                        onClick={() => handleRemove(entry)}
                        disabled={removingId === entry.id}
                        style={s.removeBtn}
                      >
                        {removingId === entry.id ? "Removing…" : "Remove"}
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Browse Community Modules ── */}
          <div style={{ ...s.section, marginTop: 24 }}>
            <div style={s.sectionHeader}>
              <h3 style={s.sectionTitle}>Browse Community Modules</h3>
              <span style={s.sectionCount}>{browseEntries.length}{browseEntries.length !== allBrowseEntries.length ? ` of ${allBrowseEntries.length}` : ''}</span>
            </div>

            {/* Filter bar */}
            {allBrowseEntries.length > 0 && (
              <div style={s.filterBar}>
                <input
                  type="search"
                  placeholder="Search by name…"
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  style={s.filterInput}
                />
                <select
                  value={searchSystem}
                  onChange={e => setSearchSystem(e.target.value)}
                  style={s.filterSelect}
                >
                  <option value="">All Systems</option>
                  {availableSystems.map(sys => (
                    <option key={sys} value={sys}>{sys}</option>
                  ))}
                </select>
                {(searchName || searchSystem) && (
                  <button onClick={() => { setSearchName(''); setSearchSystem(''); }} style={s.clearBtn}>
                    Clear
                  </button>
                )}
              </div>
            )}

            {browseEntries.length === 0 ? (
              <p style={s.emptyNote}>
                {allBrowseEntries.length === 0
                  ? 'No community modules yet. Be the first to share one!'
                  : 'No modules match your search.'}
              </p>
            ) : (
              <div style={s.grid}>
                {browseEntries.map(entry => (
                  <LibraryCard
                    key={entry.id}
                    entry={entry}
                    action={
                      addedIds.has(entry.id) ? (
                        <span style={s.addedBadge}>✓ Added to My Modules</span>
                      ) : (
                        <button
                          onClick={() => handleAdd(entry)}
                          disabled={addingId === entry.id}
                          style={s.addBtn}
                        >
                          {addingId === entry.id ? "Adding…" : "+ Add to My Modules"}
                        </button>
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function LibraryCard({ entry, action }) {
  return (
    <div style={s.card}>
      <div style={s.cardTop}>
        <span style={s.categoryBadge}>
          {CATEGORY_LABEL[entry.module_category] ?? entry.module_category}
        </span>
        <span style={s.cardDate}>{formatDate(entry.published_at)}</span>
      </div>
      <h4 style={s.cardName}>{entry.module_name}</h4>
      {entry.system && <p style={s.cardSystem}>{entry.system}</p>}
      <p style={s.cardOwner}>by {entry.owner_name || "Anonymous"}</p>
      <div style={s.cardFooter}>
        {action}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  errorBanner: {
    background: "color-mix(in oklab, crimson 10%, transparent)",
    border: "1px solid color-mix(in oklab, crimson 30%, transparent)",
    color: "crimson",
    borderRadius: "var(--radius)",
    padding: "10px 14px",
    marginBottom: 16,
    fontSize: "0.88rem",
  },
  section: {
    background: "var(--bg-elev)",
    borderRadius: "var(--radius)",
    border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
    padding: "16px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
  },
  sectionCount: {
    background: "color-mix(in oklab, var(--text) 10%, transparent)",
    color: "var(--muted)",
    borderRadius: 99,
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "2px 8px",
  },
  emptyNote: {
    color: "var(--muted)",
    fontSize: "0.88rem",
    margin: 0,
  },
  emptyBox: {
    padding: "40px",
    textAlign: "center",
    color: "var(--muted)",
    background: "var(--bg-elev)",
    borderRadius: "var(--radius)",
    border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 12,
  },
  card: {
    background: "var(--surface)",
    border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
    borderRadius: "var(--radius)",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "var(--accent)",
    background: "color-mix(in oklab, var(--accent) 12%, transparent)",
    borderRadius: 99,
    padding: "2px 8px",
  },
  cardDate: {
    fontSize: "0.72rem",
    color: "var(--muted)",
  },
  cardName: {
    margin: "4px 0 0",
    fontSize: "0.95rem",
    fontWeight: 700,
    lineHeight: 1.3,
  },
  cardSystem: {
    margin: "2px 0 0",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text)",
  },
  cardOwner: {
    margin: 0,
    fontSize: "0.78rem",
    color: "var(--muted)",
  },
  filterBar: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 14,
    flexWrap: "wrap",
  },
  filterInput: {
    flex: 1,
    minWidth: 160,
    padding: "7px 10px",
    borderRadius: "var(--radius)",
    border: "1px solid color-mix(in oklab, var(--text) 15%, transparent)",
    background: "color-mix(in oklab, var(--text) 4%, transparent)",
    color: "var(--text)",
    fontSize: "0.85rem",
    fontFamily: "inherit",
  },
  filterSelect: {
    padding: "7px 10px",
    borderRadius: "var(--radius)",
    border: "1px solid color-mix(in oklab, var(--text) 15%, transparent)",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: "0.85rem",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  clearBtn: {
    padding: "7px 12px",
    borderRadius: "var(--radius)",
    border: "1px solid color-mix(in oklab, var(--text) 15%, transparent)",
    background: "transparent",
    color: "var(--muted)",
    fontSize: "0.82rem",
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  cardFooter: {
    marginTop: "auto",
    paddingTop: 10,
  },
  addBtn: {
    width: "100%",
    padding: "8px",
    background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
    color: "#0b0d12",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.85rem",
    fontFamily: "inherit",
  },
  addedBadge: {
    display: "block",
    textAlign: "center",
    fontSize: "0.82rem",
    color: "var(--accent)",
    fontWeight: 600,
    padding: "6px 0",
  },
  removeBtn: {
    width: "100%",
    padding: "8px",
    background: "transparent",
    color: "crimson",
    border: "1px solid color-mix(in oklab, crimson 40%, transparent)",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.85rem",
    fontFamily: "inherit",
  },
};
