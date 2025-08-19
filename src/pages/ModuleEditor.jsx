import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useBeforeUnload, useLocation } from "react-router-dom";
import { ModulesStore } from "../state/modulesStore";
import Toast from "../components/Toast/Toast";
import ImageField from "../components/ImageField/ImageField";

// Hover-enabled button component
function HoverButton({ children, onClick, style, hoverStyle, ...props }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={isHovered ? hoverStyle : style}
      {...props}
    >
      {children}
    </button>
  );
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
  const [moduleData, setModuleData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Local, editable form state - initialize with defaults to avoid conditional hooks
  const [rename, setRename] = useState("");
  const [data, setData] = useState(withDefaults({}));
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState("");
  const [toast, setToast] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [saving, setSaving] = useState(false);

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
        monsters: (() => {
          const monsters = d.appendices?.monsters;
          // Handle backward compatibility - if it's a string, convert to array format
          if (typeof monsters === 'string') {
            return monsters.trim() ? [{
              id: (crypto.randomUUID?.() ?? String(Date.now())),
              name: "Legacy Monster Entry",
              content: monsters,
              image: d.appendices?.monstersImage || { dataUrl: "", alt: "", showOnDashboard: false }
            }] : [];
          }
          // Handle new array format
          return (monsters || []).map(m => ({
            id: m.id || (crypto.randomUUID?.() ?? String(Date.now())),
            name: m.name ?? "",
            content: m.content ?? "",
            image: m.image || { dataUrl: "", alt: "", showOnDashboard: false }
          }));
        })(),
        magicItems: (() => {
          const magicItems = d.appendices?.magicItems;
          // Handle backward compatibility - if it's a string, convert to array format
          if (typeof magicItems === 'string') {
            return magicItems.trim() ? [{
              id: (crypto.randomUUID?.() ?? String(Date.now())),
              name: "Legacy Magic Item Entry",
              content: magicItems,
              image: d.appendices?.magicItemsImage || { dataUrl: "", alt: "", showOnDashboard: false }
            }] : [];
          }
          // Handle new array format
          return (magicItems || []).map(i => ({
            id: i.id || (crypto.randomUUID?.() ?? String(Date.now())),
            name: i.name ?? "",
            content: i.content ?? "",
            image: i.image || { dataUrl: "", alt: "", showOnDashboard: false }
          }));
        })()
      }
    };
  }
  
  // Load module data asynchronously
  useEffect(() => {
    async function loadModule() {
      try {
        setLoading(true);
        const current = await ModulesStore.get(id);
        if (current) {
          setModuleData(current);
          setRename(current.name);
          setData(withDefaults(current.data));
          setDirty(false);
          setLastSaved(current.updatedAt || current.createdAt);
        } else {
          setModuleData(null);
        }
      } catch (error) {
        console.error('Error loading module:', error);
        setModuleData(null);
      } finally {
        setLoading(false);
      }
    }
    
    loadModule();
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

  const location = useLocation();

  // Custom navigation blocking for BrowserRouter compatibility
  useEffect(() => {
    if (!dirty) return;

    // Store original navigation functions to restore later
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    // Intercept history API calls (used by React Router)
    window.history.pushState = function(state, title, url) {
      if (dirty && url && url !== location.pathname) {
        setShowSaveDialog(true);
        setPendingNavigation(url);
        return; // Block the navigation
      }
      return originalPushState.apply(window.history, arguments);
    };

    window.history.replaceState = function(state, title, url) {
      if (dirty && url && url !== location.pathname) {
        setShowSaveDialog(true);
        setPendingNavigation(url);
        return; // Block the navigation
      }
      return originalReplaceState.apply(window.history, arguments);
    };

    const handleClick = (event) => {
      if (!dirty) return;
      
      // Check for any link or clickable element that might navigate
      const clickedElement = event.target;
      
      // Look for NavLink or any element with navigation attributes
      const navElement = clickedElement.closest('[class*="link"], a, button');
      
      if (navElement) {
        console.log('Clicked navigation element:', navElement, 'Text:', navElement.textContent);
        
        // Check if it's likely a navigation element
        const isNavLink = navElement.className && navElement.className.includes('link');
        const isAnchor = navElement.tagName === 'A';
        const hasHref = navElement.href;
        
        if (isNavLink || (isAnchor && hasHref)) {
          let targetPath = null;
          
          if (hasHref) {
            try {
              const url = new URL(navElement.href);
              if (url.origin === window.location.origin) {
                targetPath = url.pathname;
              }
            } catch {
              // Handle relative URLs
              targetPath = navElement.getAttribute('href');
            }
          }
          
          // For NavLink components, we need to check the 'to' prop differently
          // Since we can't access React props directly, we'll check common navigation paths
          const navText = navElement.textContent?.toLowerCase().trim();
          if (!targetPath && navText) {
            const navMap = {
              'dashboard': '/',
              'modules': '/modules',
              'library': '/library',
              'settings': '/settings',
              'about': '/about'
            };
            targetPath = navMap[navText];
          }
          
          if (targetPath && targetPath !== location.pathname) {
            console.log('Blocking navigation to:', targetPath);
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            setShowSaveDialog(true);
            setPendingNavigation(targetPath);
            return false;
          }
        }
      }
    };

    const handlePopState = (event) => {
      if (dirty) {
        event.preventDefault();
        setShowSaveDialog(true);
        setPendingNavigation(window.location.pathname);
        // Push current state back to prevent navigation
        window.history.pushState(null, '', location.pathname);
      }
    };

    // Add popstate listener for browser back/forward
    window.addEventListener('popstate', handlePopState);
    // Add click listener for navigation links with capture to intercept before React Router
    document.addEventListener('click', handleClick, true);
    
    // Push a dummy state so we can intercept back navigation
    window.history.pushState(null, '', location.pathname);

    return () => {
      // Restore original functions
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleClick, true);
    };
  }, [dirty, location.pathname]);

  // Intercept navigation attempts when there are unsaved changes
  const handleNavigation = useCallback((path) => {
    if (dirty) {
      setShowSaveDialog(true);
      setPendingNavigation(path);
    } else {
      navigate(path);
    }
  }, [dirty, navigate]);

  // Loading and error states
  if (loading) {
    return (
      <section style={{ padding: "20px 0" }}>
        <div style={{ 
          padding: "40px", 
          textAlign: "center", 
          color: "var(--muted)",
          background: "var(--bg-elev)", 
          borderRadius: "var(--radius)", 
          border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)" 
        }}>
          Loading module...
        </div>
      </section>
    );
  }

  // 🚫 Guard - moved after all hooks to comply with Rules of Hooks
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

  // Monster management functions
  function addMonster() {
    setData((old) => ({
      ...old,
      appendices: {
        ...old.appendices,
        monsters: [
          ...(old.appendices.monsters || []),
          {
            id: (crypto.randomUUID?.() ?? String(Date.now())),
            name: `Monster ${((old.appendices.monsters?.length || 0) + 1)}`,
            content: "",
            image: { dataUrl: "", alt: "", showOnDashboard: false }
          }
        ]
      }
    }));
    markDirty();
  }

  function updateMonster(monsterId, patch) {
    setData((old) => ({
      ...old,
      appendices: {
        ...old.appendices,
        monsters: (old.appendices.monsters || []).map((m) => (m.id === monsterId ? { ...m, ...patch } : m))
      }
    }));
    markDirty();
  }

  function removeMonster(monsterId) {
    setData((old) => ({
      ...old,
      appendices: {
        ...old.appendices,
        monsters: (old.appendices.monsters || []).filter((m) => m.id !== monsterId)
      }
    }));
    markDirty();
  }

  // Magic Item management functions
  function addMagicItem() {
    setData((old) => ({
      ...old,
      appendices: {
        ...old.appendices,
        magicItems: [
          ...(old.appendices.magicItems || []),
          {
            id: (crypto.randomUUID?.() ?? String(Date.now())),
            name: `Magic Item ${((old.appendices.magicItems?.length || 0) + 1)}`,
            content: "",
            image: { dataUrl: "", alt: "", showOnDashboard: false }
          }
        ]
      }
    }));
    markDirty();
  }

  function updateMagicItem(itemId, patch) {
    setData((old) => ({
      ...old,
      appendices: {
        ...old.appendices,
        magicItems: (old.appendices.magicItems || []).map((i) => (i.id === itemId ? { ...i, ...patch } : i))
      }
    }));
    markDirty();
  }

  function removeMagicItem(itemId) {
    setData((old) => ({
      ...old,
      appendices: {
        ...old.appendices,
        magicItems: (old.appendices.magicItems || []).filter((i) => i.id !== itemId)
      }
    }));
    markDirty();
  }

  async function handleSave() {
    if (!moduleData || saving) return;
    
    try {
      setSaving(true);
      
      // Save title if changed
      if (rename.trim() && rename.trim() !== moduleData.name) {
        await ModulesStore.rename(moduleData.id, rename.trim());
      }
      // Save all section content
      await ModulesStore.updateData(moduleData.id, () => data);

      // Refresh local meta and toast
      const updated = await ModulesStore.get(moduleData.id);
      setLastSaved(updated?.updatedAt || new Date().toISOString());
      setDirty(false);
      setToast(true);
    } catch (error) {
      console.error('Error saving module:', error);
      alert('Error saving module. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndNavigate() {
    await handleSave();
    setShowSaveDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setPendingNavigation(null);
  }

  function handleDiscardAndNavigate() {
    setDirty(false);
    setShowSaveDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setPendingNavigation(null);
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
          <HoverButton
            onClick={handleBack}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)",
              background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
              color: "#0b0d12",
              fontWeight: 600,
              transition: "background 0.2s ease"
            }}
            hoverStyle={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)",
              background: "linear-gradient(270deg, var(--brand), var(--brand-2))",
              color: "#0b0d12",
              fontWeight: 600,
              transition: "background 0.2s ease"
            }}
          >
            ← Back
          </HoverButton>

          <h2 style={{ margin: 0, flex: "1 1 auto" }}>{rename}</h2>

          <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Last saved: {formatTS(lastSaved)}
            </div>
            <HoverButton
              onClick={handleSave}
              disabled={saving || (!dirty && rename.trim() === moduleData.name)}
              style={{
                padding: "10px 14px",
                background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                color: "#0b0d12",
                border: 0,
                borderRadius: 10,
                fontWeight: 700,
                cursor: (saving || (!dirty && rename.trim() === moduleData.name)) ? "not-allowed" : "pointer",
                opacity: (saving || (!dirty && rename.trim() === moduleData.name)) ? 0.7 : 1,
                transition: "background 0.2s ease"
              }}
              hoverStyle={{
                padding: "10px 14px",
                background: "linear-gradient(270deg, var(--brand), var(--brand-2))",
                color: "#0b0d12",
                border: 0,
                borderRadius: 10,
                fontWeight: 700,
                cursor: (saving || (!dirty && rename.trim() === moduleData.name)) ? "not-allowed" : "pointer",
                opacity: (saving || (!dirty && rename.trim() === moduleData.name)) ? 0.7 : 1,
                transition: "background 0.2s ease"
              }}
              title="Save all changes"
            >
              {saving ? "Saving..." : "Save"}
            </HoverButton>
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
            <HoverButton
              onClick={addEpisode}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: 0,
                cursor: "pointer",
                background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                color: "#0b0d12",
                fontWeight: 700,
                transition: "background 0.2s ease"
              }}
              hoverStyle={{
                padding: "8px 12px",
                borderRadius: 10,
                border: 0,
                cursor: "pointer",
                background: "linear-gradient(270deg, var(--brand), var(--brand-2))",
                color: "#0b0d12",
                fontWeight: 700,
                transition: "background 0.2s ease"
              }}
            >
              + Add Episode
            </HoverButton>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Monsters Appendix</h3>
              <HoverButton
                onClick={addMonster}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: 0,
                  cursor: "pointer",
                  background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                  color: "#0b0d12",
                  fontWeight: 700,
                  transition: "background 0.2s ease"
                }}
                hoverStyle={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: 0,
                  cursor: "pointer",
                  background: "linear-gradient(270deg, var(--brand), var(--brand-2))",
                  color: "#0b0d12",
                  fontWeight: 700,
                  transition: "background 0.2s ease"
                }}
              >
                + Add Monster
              </HoverButton>
            </div>

            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
              {(data.appendices.monsters || []).map((monster) => (
                <li key={monster.id}>
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
                      value={monster.name}
                      onChange={(e) => updateMonster(monster.id, { name: e.target.value })}
                      placeholder="Monster name..."
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
                      value={monster.content}
                      onChange={(e) => updateMonster(monster.id, { content: e.target.value })}
                      placeholder="Stat block, abilities, behavior, tactics..."
                      style={{
                        padding: "10px 12px",
                        background: "var(--bg-elev)",
                        color: "var(--text)",
                        borderRadius: 8,
                        border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
                      }}
                    />
                    <ImageField
                      label="Monster Image (JPG)"
                      value={monster.image || { dataUrl: "", alt: "", showOnDashboard: false }}
                      onChange={(img) => updateMonster(monster.id, { image: img })}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => removeMonster(monster.id)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid color-mix(in oklab, crimson 50%, var(--text) 20%)",
                          background: "transparent",
                          color: "var(--text)",
                          cursor: "pointer"
                        }}
                      >
                        Remove Monster
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Magic Items Appendix</h3>
              <HoverButton
                onClick={addMagicItem}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: 0,
                  cursor: "pointer",
                  background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                  color: "#0b0d12",
                  fontWeight: 700,
                  transition: "background 0.2s ease"
                }}
                hoverStyle={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: 0,
                  cursor: "pointer",
                  background: "linear-gradient(270deg, var(--brand), var(--brand-2))",
                  color: "#0b0d12",
                  fontWeight: 700,
                  transition: "background 0.2s ease"
                }}
              >
                + Add Magic Item
              </HoverButton>
            </div>

            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
              {(data.appendices.magicItems || []).map((item) => (
                <li key={item.id}>
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
                      value={item.name}
                      onChange={(e) => updateMagicItem(item.id, { name: e.target.value })}
                      placeholder="Magic item name..."
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
                      value={item.content}
                      onChange={(e) => updateMagicItem(item.id, { content: e.target.value })}
                      placeholder="Description, rarity, attunement, effects, usage..."
                      style={{
                        padding: "10px 12px",
                        background: "var(--bg-elev)",
                        color: "var(--text)",
                        borderRadius: 8,
                        border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
                      }}
                    />
                    <ImageField
                      label="Magic Item Image (JPG)"
                      value={item.image || { dataUrl: "", alt: "", showOnDashboard: false }}
                      onChange={(img) => updateMagicItem(item.id, { image: img })}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => removeMagicItem(item.id)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid color-mix(in oklab, crimson 50%, var(--text) 20%)",
                          background: "transparent",
                          color: "var(--text)",
                          cursor: "pointer"
                        }}
                      >
                        Remove Magic Item
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
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
              <HoverButton
                onClick={handleSaveAndNavigate}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: 0,
                  background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                  color: "#0b0d12",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.2s ease"
                }}
                hoverStyle={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: 0,
                  background: "linear-gradient(270deg, var(--brand), var(--brand-2))",
                  color: "#0b0d12",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.2s ease"
                }}
              >
                Save
              </HoverButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}