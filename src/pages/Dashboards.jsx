// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { ModulesStore } from "../state/modulesStore";
import { SessionsStore } from "../state/sessionsStore";
import DashboardCard from "../components/DashboardCard/DashboardCard";
import Modal from "../components/Modal/Modal";
import PillToggle from "../components/PillToggle/PillToggle";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableCard({ item, span = 1, disabled = false, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled });
  const style = {
    gridColumn: `span ${Math.max(1, Math.min(4, span))}`,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1
  };
  const dragProps = disabled ? {} : { ...attributes, ...listeners };
  return (
    <div ref={setNodeRef} style={style} {...dragProps}>
      {children}
    </div>
  );
}

const REORDER_KEY = "fizzrix.dashboard.reorder";      // 'drag' | 'arrows'
const ACTIVE_MODULE_KEY = "fizzrix.dashboard.activeModule";
const ACTIVE_SESSION_KEY = "fizzrix.dashboard.activeSession";

export default function Dashboard() {
  const modules = ModulesStore.list();

  // ----- Active module (persisted) -----
  const [activeModuleId, setActiveModuleId] = useState(() => {
    const fromLS = localStorage.getItem(ACTIVE_MODULE_KEY);
    const exists = modules.some(m => m.id === fromLS);
    return exists ? fromLS : (modules[0]?.id || "");
  });
  useEffect(() => {
    localStorage.setItem(ACTIVE_MODULE_KEY, activeModuleId);
  }, [activeModuleId]);

  // Ensure the module has at least one session
  const sessionsForModule = SessionsStore.ensureDefaultForModule(activeModuleId);

  // ----- Active session (persisted and validated per module) -----
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const fromLS = localStorage.getItem(ACTIVE_SESSION_KEY);
    const valid = SessionsStore.get(fromLS);
    return valid?.moduleId === activeModuleId
      ? fromLS
      : (sessionsForModule[0]?.id || "");
  });
  useEffect(() => {
    // when module changes, choose first session under that module
    const list = SessionsStore.ensureDefaultForModule(activeModuleId);
    const current = SessionsStore.get(localStorage.getItem(ACTIVE_SESSION_KEY));
    const nextId = current?.moduleId === activeModuleId ? current.id : (list[0]?.id || "");
    setActiveSessionId(nextId);
  }, [activeModuleId]);
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

  const activeSession = useMemo(
    () => SessionsStore.get(activeSessionId),
    [activeSessionId, tick]
  );
  const items = activeSession?.items || [];
  const locked = !!activeSession?.locked;

  // ----- Reorder mode (persisted) -----
  const [modeDrag, setModeDrag] = useState(
    () => (localStorage.getItem(REORDER_KEY) || "drag") === "drag"
  );
  useEffect(() => {
    localStorage.setItem(REORDER_KEY, modeDrag ? "drag" : "arrows");
  }, [modeDrag]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  // Sections list is from the active module
  const selectedModule = useMemo(() => ModulesStore.get(activeModuleId), [activeModuleId]);
  const selectableSections = useMemo(() => {
    if (!selectedModule) return [];
    const d = selectedModule.data;
    return [
      { key: "map", label: "Map of Overall Area" },
      { key: "intro", label: "Introduction" },
      { key: "overview", label: "Overview" },
      ...(d.episodes || []).map((ep) => ({
        key: `episode:${ep.id}`, label: ep.title || "Episode"
      })),
      { key: "appendix:monsters", label: "Monsters Appendix" },
      { key: "appendix:magicItems", label: "Magic Items Appendix" }
    ];
  }, [selectedModule]);

  // --- Session CRUD ---
  function addSession() {
    const count = SessionsStore.listByModule(activeModuleId).length;
    const s = SessionsStore.create(activeModuleId, `Session ${count + 1}`);
    setActiveSessionId(s.id);
  }
  function renameSession(sessionId) {
    const current = SessionsStore.get(sessionId);
    const name = prompt("Rename session", current?.name || "");
    if (name && name.trim()) {
      SessionsStore.rename(sessionId, name.trim());
      setTick(t => t + 1);
    }
  }
  function duplicateSession(sessionId) {
    const dup = SessionsStore.duplicate(sessionId);
    if (dup) {
      setActiveModuleId(dup.moduleId);
      setActiveSessionId(dup.id);
    }
  }
  function deleteSession(sessionId) {
    const list = SessionsStore.listByModule(activeModuleId);
    if (list.length <= 1) {
      alert("A module must have at least one session.");
      return;
    }
    if (confirm("Delete this session? This cannot be undone.")) {
      SessionsStore.remove(sessionId);
      const remaining = SessionsStore.listByModule(activeModuleId);
      setActiveSessionId(remaining[0]?.id || "");
    }
  }

  // --- Items ops (persist via SessionsStore) ---
  const setItems = (next) => SessionsStore.setItems(activeSessionId, next);

  function addSection(key) {
    if (!selectedModule || locked) return;
    const [type, sectionId] = key.startsWith("episode:") ? ["episode", key.split(":")[1]] : [key, null];
    setItems([
      ...items,
      {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        moduleId: activeModuleId,
        type,
        sectionId,
        size: 1
      }
    ]);
  }
  function clearAll() {
    if (locked) return;
    if (confirm("Remove all cards from this session?")) setItems([]);
  }
  function onDragEnd(event) {
    if (locked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    setItems(arrayMove(items, oldIndex, newIndex));
  }
  const moveLeft  = (idx) => (locked ? null : setItems(arrayMove(items, idx, Math.max(0, idx - 1))));
  const moveRight = (idx) => (locked ? null : setItems(arrayMove(items, idx, Math.min(items.length - 1, idx + 1))));

  const spanFor = (it) => Math.max(1, Math.min(4, it.size || 1));

  // Focus
  const [focus, setFocus] = useState(null);

  return (
    <section style={{ padding: "20px 0", display: "grid", gap: 16 }}>
      <h2>Session Dashboard</h2>

      {/* Module tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {modules.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveModuleId(m.id)}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
              background: m.id === activeModuleId ? "linear-gradient(90deg, var(--brand), var(--brand-2))" : "var(--surface)",
              color: m.id === activeModuleId ? "#0b0d12" : "var(--text)",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Sessions under the active module */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-elev)",
          borderRadius: "var(--radius)",
          border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
          padding: 12
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SessionsStore.listByModule(activeModuleId).map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
                background: s.id === activeSessionId ? "linear-gradient(90deg, var(--brand), var(--brand-2))" : "var(--surface)",
                color: s.id === activeSessionId ? "#0b0d12" : "var(--text)",
                fontWeight: 700,
                cursor: "pointer"
              }}
              title={s.name}
            >
              {s.name}
            </button>
          ))}

          <button
            onClick={addSession}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
              background: "var(--surface)",
              color: "var(--text)",
              cursor: "pointer"
            }}
          >
            + New Session
          </button>
        </div>

        {/* Session actions + mode/lock */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <PillToggle
            label={`Reorder: ${modeDrag ? "Drag & Drop" : "Arrows"}`}
            checked={modeDrag}
            onChange={(v) => setModeDrag(v)}
          />
          <PillToggle
            label={locked ? "Locked" : "Unlocked"}
            checked={locked}
            onChange={(v) => {
              SessionsStore.setLocked(activeSessionId, v);
            }}
          />
          <button onClick={() => renameSession(activeSessionId)} style={liteBtn} disabled={!activeSessionId}>
            Rename
          </button>
          <button onClick={() => duplicateSession(activeSessionId)} style={liteBtn} disabled={!activeSessionId}>
            Duplicate
          </button>
          <button
            onClick={() => deleteSession(activeSessionId)}
            style={{ ...liteBtn, color: "crimson", borderColor: "crimson" }}
            disabled={!activeSessionId}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Picker for sections */}
      <div style={picker}>
        <div style={{ display: "grid", gap: 8 }}>
          <label style={label}>Add Section from {selectedModule?.name || "Module"}</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
            {selectableSections.map((s) => (
              <button
                key={s.key}
                onClick={() => addSection(s.key)}
                style={{
                  ...addBtn,
                  opacity: locked ? 0.6 : 1,
                  cursor: locked ? "not-allowed" : "pointer"
                }}
                disabled={locked}
              >
                + {s.label}
              </button>
            ))}
            {selectableSections.length === 0 && (
              <div style={{ color: "var(--muted)" }}>This module has no sections yet.</div>
            )}
          </div>
        </div>

        <div>
          <button
            onClick={clearAll}
            style={{ ...dangerBtn, opacity: locked ? 0.6 : 1, cursor: locked ? "not-allowed" : "pointer" }}
            disabled={locked}
          >
            Clear All Cards
          </button>
        </div>
      </div>

      {/* Cards grid */}
      {modeDrag ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div style={grid}>
              {items.length === 0 && <div style={{ color: "var(--muted)" }}>No cards in this session yet.</div>}
              {items.map((it) => (
                <SortableCard key={it.id} item={it} span={spanFor(it)} disabled={locked}>
                  <DashboardCard
                    item={it}
                    locked={locked}
                    onRemove={() => setItems(items.filter((x) => x.id !== it.id))}
                    onFocus={(payload) => setFocus(payload)}
                    showArrows={false}
                    onResize={(n) => {
                      if (locked) return;
                      setItems(items.map((x) => (x.id === it.id ? { ...x, size: n } : x)));
                    }}
                  />
                </SortableCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div style={grid}>
          {items.length === 0 && <div style={{ color: "var(--muted)" }}>No cards in this session yet.</div>}
          {items.map((it, idx) => (
            <div key={it.id} style={{ gridColumn: `span ${spanFor(it)}` }}>
              <DashboardCard
                item={it}
                locked={locked}
                onRemove={() => setItems(items.filter((x) => x.id !== it.id))}
                onFocus={(payload) => setFocus(payload)}
                showArrows={!locked}
                onMoveLeft={() => moveLeft(idx)}
                onMoveRight={() => moveRight(idx)}
                onResize={(n) => {
                  if (locked) return;
                  setItems(items.map((x) => (x.id === it.id ? { ...x, size: n } : x)));
                }}
              />
            </div>
          ))}
        </div>
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
  background: "var(--surface)",
  color: "var(--text)",
  borderRadius: 10,
  border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
  cursor: "pointer"
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
  background: "var(--surface)",
  color: "var(--text)",
  borderRadius: 999,
  border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
  cursor: "pointer"
};
const grid = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))"
};
