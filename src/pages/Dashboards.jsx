// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { ModulesStore } from "../state/modulesStore";
import { SessionsStore } from "../state/sessionsStore";
import DashboardCard from "../components/DashboardCard/DashboardCard";
import Modal from "../components/Modal/Modal";
import PillToggle from "../components/PillToggle/PillToggle";
import SearchableDropdown from "../components/SearchableDropdown/SearchableDropdown";

import DraggableGrid from "../components/DraggableGrid/DraggableGrid";


const ACTIVE_MODULE_KEY = "fizzrix.dashboard.activeModule";
const ACTIVE_SESSION_KEY = "fizzrix.dashboard.activeSession";

// Hover-enabled button components
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

export default function Dashboard() {
  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);

  // Load modules asynchronously
  useEffect(() => {
    async function loadModules() {
      try {
        setLoadingModules(true);
        const modulesList = await ModulesStore.list();
        setModules(modulesList);
      } catch (error) {
        console.error('Error loading modules:', error);
        setModules([]);
      } finally {
        setLoadingModules(false);
      }
    }
    loadModules();
  }, []);

  // ----- Active module (persisted) -----
  const [activeModuleId, setActiveModuleId] = useState("");
  
  // Set initial active module when modules load
  useEffect(() => {
    if (modules.length > 0 && !activeModuleId) {
      const fromLS = localStorage.getItem(ACTIVE_MODULE_KEY);
      const exists = modules.some(m => m.id === fromLS);
      setActiveModuleId(exists ? fromLS : (modules[0]?.id || ""));
    }
  }, [modules, activeModuleId]);
  useEffect(() => {
    if (activeModuleId) {
      localStorage.setItem(ACTIVE_MODULE_KEY, activeModuleId);
    }
  }, [activeModuleId]);

  // ----- Active session (persisted and validated per module) -----
  const [activeSessionId, setActiveSessionId] = useState("");
  const [sessionsForModule, setSessionsForModule] = useState([]);
  const [_loadingSessions, setLoadingSessions] = useState(false);
  
  // Ensure the module has at least one session when activeModuleId changes
  useEffect(() => {
    async function loadSessions() {
      if (activeModuleId) {
        try {
          setLoadingSessions(true);
          const sessions = await SessionsStore.ensureDefaultForModule(activeModuleId);
          setSessionsForModule(sessions);
          
          // Set active session
          const fromLS = localStorage.getItem(ACTIVE_SESSION_KEY);
          const valid = await SessionsStore.get(fromLS);
          const nextId = valid?.moduleId === activeModuleId
            ? fromLS
            : (sessions[0]?.id || "");
          setActiveSessionId(nextId);
        } catch (error) {
          console.error('Error loading sessions:', error);
          setSessionsForModule([]);
        } finally {
          setLoadingSessions(false);
        }
      }
    }
    loadSessions();
  }, [activeModuleId]);
  // This useEffect is now handled above in the activeModuleId effect
  useEffect(() => {
    if (activeSessionId) localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
  }, [activeSessionId]);

  // ----- Reactivity: listen to store changes and storage events -----
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick(t => t + 1);
    window.addEventListener(SessionsStore.CHANGE_EVENT, bump);
    window.addEventListener("storage", (e) => {
      if (e.key === SessionsStore.KEY) bump();
    });
    return () => {
      window.removeEventListener(SessionsStore.CHANGE_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const [activeSession, setActiveSession] = useState(null);
  const [_loadingActiveSession, setLoadingActiveSession] = useState(false);
  
  // Load active session when activeSessionId changes
  useEffect(() => {
    async function loadActiveSession() {
      if (activeSessionId) {
        try {
          setLoadingActiveSession(true);
          const session = await SessionsStore.get(activeSessionId);
          setActiveSession(session);
        } catch (error) {
          console.error('Error loading active session:', error);
          setActiveSession(null);
        } finally {
          setLoadingActiveSession(false);
        }
      } else {
        setActiveSession(null);
      }
    }
    loadActiveSession();
  }, [activeSessionId, tick]);
  
  const items = activeSession?.items || [];
  const locked = !!activeSession?.locked;



  // Sections list is from the active module
  const selectedModule = useMemo(() => {
    return modules.find(m => m.id === activeModuleId) || null;
  }, [modules, activeModuleId]);
  // Basic sections that always show as buttons
  const basicSections = useMemo(() => [
    { key: "map", label: "Map of Overall Area" },
    { key: "intro", label: "Introduction" },
    { key: "overview", label: "Overview" }
  ], []);

  // Episodes for searchable dropdown
  const availableEpisodes = useMemo(() => {
    if (!selectedModule) return [];
    const d = selectedModule.data;
    return (d.episodes || []).map((ep) => ({
      key: `episode:${ep.id}`, 
      label: ep.title || "Episode"
    }));
  }, [selectedModule]);

  // Monsters for searchable dropdown (show all monsters, not just those with showOnDashboard)
  const availableMonsters = useMemo(() => {
    if (!selectedModule) return [];
    const d = selectedModule.data;
    return (d.appendices?.monsters || [])
      .map((monster) => ({
        key: `monster:${monster.id}`, 
        label: monster.name || "Monster"
      }));
  }, [selectedModule]);

  // Magic items for searchable dropdown (show all items, not just those with showOnDashboard)
  const availableMagicItems = useMemo(() => {
    if (!selectedModule) return [];
    const d = selectedModule.data;
    return (d.appendices?.magicItems || [])
      .map((item) => ({
        key: `magicItem:${item.id}`, 
        label: item.name || "Magic Item"
      }));
  }, [selectedModule]);

  // --- Session CRUD ---
  async function addSession() {
    try {
      const sessions = await SessionsStore.listByModule(activeModuleId);
      const count = sessions.length;
      const s = await SessionsStore.create(activeModuleId, `Session ${count + 1}`);
      setActiveSessionId(s.id);
      // Refresh sessions list
      const updatedSessions = await SessionsStore.listByModule(activeModuleId);
      setSessionsForModule(updatedSessions);
      setTick(t => t + 1);
    } catch (error) {
      console.error('Error adding session:', error);
      alert('Error creating session. Please try again.');
    }
  }
  async function renameSession(sessionId) {
    try {
      const current = await SessionsStore.get(sessionId);
      const name = prompt("Rename session", current?.name || "");
      if (name && name.trim()) {
        await SessionsStore.rename(sessionId, name.trim());
        // Refresh sessions list
        const updatedSessions = await SessionsStore.listByModule(activeModuleId);
        setSessionsForModule(updatedSessions);
        setTick(t => t + 1);
      }
    } catch (error) {
      console.error('Error renaming session:', error);
      alert('Error renaming session. Please try again.');
    }
  }
  async function duplicateSession(sessionId) {
    try {
      const dup = await SessionsStore.duplicate(sessionId);
      if (dup) {
        setActiveModuleId(dup.moduleId);
        setActiveSessionId(dup.id);
        // Refresh sessions list
        const updatedSessions = await SessionsStore.listByModule(activeModuleId);
        setSessionsForModule(updatedSessions);
        setTick(t => t + 1);
      }
    } catch (error) {
      console.error('Error duplicating session:', error);
      alert('Error duplicating session. Please try again.');
    }
  }
  async function deleteSession(sessionId) {
    try {
      const list = await SessionsStore.listByModule(activeModuleId);
      if (list.length <= 1) {
        alert("A module must have at least one session.");
        return;
      }
      if (confirm("Delete this session? This cannot be undone.")) {
        await SessionsStore.remove(sessionId);
        const remaining = await SessionsStore.listByModule(activeModuleId);
        setActiveSessionId(remaining[0]?.id || "");
        setSessionsForModule(remaining);
        setTick(t => t + 1);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session. Please try again.');
    }
  }

  // --- Items ops (persist via SessionsStore) ---
  const setItems = async (next) => {
    try {
      await SessionsStore.setItems(activeSessionId, next);
      setTick(t => t + 1);
    } catch (error) {
      console.error('Error updating session items:', error);
      alert('Error updating dashboard. Please try again.');
    }
  };

  function addSection(key) {
    if (!selectedModule || locked) return;
    
    let type, sectionId;
    if (key.startsWith("episode:")) {
      type = "episode";
      sectionId = key.split(":")[1];
    } else if (key.startsWith("monster:")) {
      type = "monster";
      sectionId = key.split(":")[1];
    } else if (key.startsWith("magicItem:")) {
      type = "magicItem";
      sectionId = key.split(":")[1];
    } else {
      type = key;
      sectionId = null;
    }
    
    setItems([
      ...items,
      {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        moduleId: activeModuleId,
        type,
        sectionId,
        position: null // Will be assigned by DraggableGrid
      }
    ]);
  }
  function clearAll() {
    if (locked) return;
    if (confirm("Remove all cards from this session?")) setItems([]);
  }


  // Focus
  const [focus, setFocus] = useState(null);

  // Show loading state while modules are being loaded
  if (loadingModules) {
    return (
      <section style={{ padding: "20px 0" }}>
        <h2>Session Dashboard</h2>
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
      </section>
    );
  }

  return (
    <section style={{ padding: "20px 0", display: "grid", gap: 16 }}>
      <h2>Session Dashboard</h2>

      {/* Module selection */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "var(--bg-elev)",
        borderRadius: "var(--radius)",
        border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
        padding: 12
      }}>
        <label style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, minWidth: "60px" }}>Module:</label>
        <SearchableDropdown
          label=""
          placeholder="Select a module..."
          items={modules.map(m => ({ key: m.id, label: m.name }))}
          onSelect={(item) => setActiveModuleId(item.key)}
          selectedValue={modules.find(m => m.id === activeModuleId)?.name || ""}
        />
      </div>

      {/* Session selection and actions */}
      <div
        style={{
          display: "grid",
          gap: 12,
          background: "var(--bg-elev)",
          borderRadius: "var(--radius)",
          border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
          padding: 12
        }}
      >
        {/* Session dropdown and new session button */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <label style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, minWidth: "60px" }}>Session:</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
            <SearchableDropdown
              label=""
              placeholder="Select a session..."
              items={sessionsForModule.map(s => ({ key: s.id, label: s.name }))}
              onSelect={(item) => setActiveSessionId(item.key)}
              selectedValue={sessionsForModule.find(s => s.id === activeSessionId)?.name || ""}
            />
            <HoverButton
              onClick={addSession}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)",
                background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                color: "#0b0d12",
                cursor: "pointer",
                fontWeight: 600,
                transition: "background 0.2s ease"
              }}
              hoverStyle={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)",
                background: "linear-gradient(270deg, var(--brand), var(--brand-2))",
                color: "#0b0d12",
                cursor: "pointer",
                fontWeight: 600,
                transition: "background 0.2s ease"
              }}
            >
              + New Session
            </HoverButton>
          </div>
        </div>

        {/* Session actions + lock */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          <PillToggle
            label={locked ? "Locked" : "Unlocked"}
            checked={locked}
            onChange={async (v) => {
              try {
                await SessionsStore.setLocked(activeSessionId, v);
                setTick(t => t + 1);
              } catch (error) {
                console.error('Error updating session lock:', error);
                alert('Error updating session lock. Please try again.');
              }
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <HoverButton 
              onClick={() => renameSession(activeSessionId)} 
              style={liteBtn}
              hoverStyle={liteBtnHover}
              disabled={!activeSessionId}
            >
              Rename
            </HoverButton>
            <HoverButton 
              onClick={() => duplicateSession(activeSessionId)} 
              style={liteBtn}
              hoverStyle={liteBtnHover}
              disabled={!activeSessionId}
            >
              Duplicate
            </HoverButton>
            <button
              onClick={() => deleteSession(activeSessionId)}
              style={{ ...liteBtn, color: "crimson", borderColor: "crimson" }}
              disabled={!activeSessionId}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Picker for sections - hidden when locked */}
      {!locked && (
        <div style={picker}>
          <div style={{ display: "grid", gap: 16 }}>
            <label style={label}>Add Section from {selectedModule?.name || "Module"}</label>
            
            {/* Basic sections as buttons */}
            <div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "var(--text)" }}>Basic Sections</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
                {basicSections.map((s) => (
                  <HoverButton
                    key={s.key}
                    onClick={() => addSection(s.key)}
                    style={addBtn}
                    hoverStyle={addBtnHover}
                  >
                    + {s.label}
                  </HoverButton>
                ))}
              </div>
            </div>

            {/* Searchable dropdowns */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
              <SearchableDropdown
                label="Episodes"
                placeholder="Search episodes..."
                items={availableEpisodes}
                onSelect={(item) => addSection(item.key)}
                disabled={availableEpisodes.length === 0}
              />
              
              <SearchableDropdown
                label="Monsters"
                placeholder="Search monsters..."
                items={availableMonsters}
                onSelect={(item) => addSection(item.key)}
                disabled={availableMonsters.length === 0}
              />
              
              <SearchableDropdown
                label="Magic Items"
                placeholder="Search magic items..."
                items={availableMagicItems}
                onSelect={(item) => addSection(item.key)}
                disabled={availableMagicItems.length === 0}
              />
            </div>

            {basicSections.length === 0 && availableEpisodes.length === 0 && availableMonsters.length === 0 && availableMagicItems.length === 0 && (
              <div style={{ color: "var(--muted)", fontStyle: "italic" }}>
                This module has no sections yet. Create episodes, monsters, or magic items in the Module Editor.
              </div>
            )}
          </div>

          <div>
            <button
              onClick={clearAll}
              style={dangerBtn}
            >
              Clear All Cards
            </button>
          </div>
        </div>
      )}

      {/* Cards grid */}
      {items.length === 0 ? (
        <div style={{ 
          color: "var(--muted)", 
          textAlign: "center", 
          padding: "40px",
          background: "var(--bg-elev)",
          borderRadius: "var(--radius)",
          border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)"
        }}>
          No cards in this session yet.
        </div>
      ) : (
        <DraggableGrid
          items={items}
          disabled={locked}
          onItemsChange={setItems}
          renderItem={(item) => (
            <DashboardCard
              item={item}
              locked={locked}
              onRemove={() => setItems(items.filter((x) => x.id !== item.id))}
              onFocus={(payload) => setFocus(payload)}
            />
          )}
        />
      )}

      {/* Focus Mode */}
      <Modal open={!!focus} title={focus?.title || "Focus"} onClose={() => setFocus(null)}>
        {focus?.image?.dataUrl && focus?.image?.showOnDashboard && (
          <img
            src={focus.image.dataUrl}
            alt={focus.image.alt || focus.title}
            style={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: 12,
              border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
              marginBottom: 12
            }}
          />
        )}
        {focus?.text && (
          <div
            style={{
              whiteSpace: "pre-wrap",
              background: "var(--surface)",
              borderRadius: 12,
              border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
              padding: 12
            }}
          >
            {focus.text}
          </div>
        )}
      </Modal>
    </section>
  );
}

const picker = {
  display: "grid",
  gap: 10,
  background: "var(--bg-elev)",
  borderRadius: "var(--radius)",
  border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
  padding: 12
};
const label = { fontSize: 14, color: "var(--muted)" };
const addBtn = {
  padding: "8px 10px",
  textAlign: "left",
  background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
  color: "#0b0d12",
  borderRadius: 10,
  border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)",
  cursor: "pointer",
  fontWeight: 600,
  transition: "background 0.2s ease"
};

const addBtnHover = {
  ...addBtn,
  background: "linear-gradient(270deg, var(--brand), var(--brand-2))"
};
const dangerBtn = {
  padding: "8px 12px",
  borderRadius: 8,
  background: "transparent",
  color: "crimson",
  border: "1px solid color-mix(in oklab, crimson 50%, var(--text) 20%)",
  cursor: "pointer"
};
const liteBtn = {
  padding: "6px 10px",
  background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
  color: "#0b0d12",
  borderRadius: 999,
  border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)",
  cursor: "pointer",
  fontWeight: 600,
  transition: "background 0.2s ease"
};

const liteBtnHover = {
  ...liteBtn,
  background: "linear-gradient(270deg, var(--brand), var(--brand-2))"
};
