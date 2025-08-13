import React, { useEffect, useMemo, useState } from "react";
import { ModulesStore } from "../state/modulesStore";
import { DashboardStore } from "../state/dashboardStore";
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

function useDashboard() {
  const [items, setItems] = useState(DashboardStore.list());
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "fizzrix.dashboard.v1") setItems(DashboardStore.list());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const persist = (next) => {
    DashboardStore.replaceAll(next);
    setItems(next);
  };
  return { items, setItems: persist };
}

function SortableCard({ item, span = 1, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    gridColumn: `span ${Math.max(1, Math.min(4, span))}`,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

const REORDER_KEY = "fizzrix.dashboard.reorder"; // 'drag' | 'arrows'

export default function Dashboard() {
  const modules = ModulesStore.list();
  const { items, setItems } = useDashboard();
  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id || "");
  const selectedModule = useMemo(
    () => ModulesStore.get(selectedModuleId),
    [selectedModuleId]
  );

  const [focus, setFocus] = useState(null);

  // Reorder mode (persisted)
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

  const selectableSections = useMemo(() => {
    if (!selectedModule) return [];
    const d = selectedModule.data;
    return [
      { key: "map", label: "Map of Overall Area" },
      { key: "intro", label: "Introduction" },
      { key: "overview", label: "Overview" },
      ...(d.episodes || []).map((ep) => ({
        key: `episode:${ep.id}`,
        label: ep.title || "Episode"
      })),
      { key: "appendix:monsters", label: "Monsters Appendix" },
      { key: "appendix:magicItems", label: "Magic Items Appendix" }
    ];
  }, [selectedModule]);

  function addSection(key) {
    if (!selectedModule) return;
    const [type, sectionId] = key.startsWith("episode:")
      ? ["episode", key.split(":")[1]]
      : [key, null];

    setItems([
      ...items,
      {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        moduleId: selectedModule.id,
        type,
        sectionId,
        size: 1 // default size
      }
    ]);
  }

  function onDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    setItems(arrayMove(items, oldIndex, newIndex));
  }

  function clearAll() {
    if (confirm("Remove all dashboard cards?")) setItems([]);
  }

  // Arrow-mode handlers
  const moveLeft = (idx) =>
    setItems(arrayMove(items, idx, Math.max(0, idx - 1)));
  const moveRight = (idx) =>
    setItems(arrayMove(items, idx, Math.min(items.length - 1, idx + 1)));

  const spanFor = (it) => Math.max(1, Math.min(4, it.size || 1));

  return (
    <section style={{ padding: "20px 0", display: "grid", gap: 16 }}>
      <h2>Session Dashboard</h2>
      <p style={{ marginTop: 0, color: "var(--muted)" }}>
        {modeDrag
          ? "Drag cards to reorder, or switch to arrows."
          : "Use the ← / → arrows on each card to reorder."}
      </p>

      {/* Reorder mode switch */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <PillToggle
          label={`Reorder: ${modeDrag ? "Drag & Drop" : "Arrows"}`}
          checked={modeDrag}
          onChange={(v) => setModeDrag(v)}
        />
      </div>

      {/* Picker */}
      <div style={picker}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={label}>Select Module</label>
          <select
            value={selectedModuleId}
            onChange={(e) => setSelectedModuleId(e.target.value)}
            style={select}
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            {modules.length === 0 && <option>No modules</option>}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={label}>Add Section</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
              gap: 8
            }}
          >
            {selectableSections.map((s) => (
              <button
                key={s.key}
                onClick={() => addSection(s.key)}
                style={addBtn}
              >
                + {s.label}
              </button>
            ))}
            {selectableSections.length === 0 && (
              <div style={{ color: "var(--muted)" }}>
                This module has no sections yet.
              </div>
            )}
          </div>
        </div>

        <div>
          <button onClick={clearAll} style={dangerBtn}>
            Clear All Cards
          </button>
        </div>
      </div>

      {/* Cards */}
      {modeDrag ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div style={grid}>
              {items.length === 0 && (
                <div style={{ color: "var(--muted)" }}>
                  No cards yet. Add a section to begin.
                </div>
              )}
              {items.map((it) => (
  <SortableCard key={it.id} item={it} span={spanFor(it)}>
    <DashboardCard
      item={it}
      onRemove={() => setItems(items.filter((x) => x.id !== it.id))}
      onFocus={(payload) => setFocus(payload)}
      showArrows={false} // hidden in drag mode
      onResize={(n) => {
        const next = items.map((x) =>
          x.id === it.id ? { ...x, size: n } : x
        );
        setItems(next);
      }}
    />
  </SortableCard>
))}

            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div style={grid}>
          {items.length === 0 && (
            <div style={{ color: "var(--muted)" }}>
              No cards yet. Add a section to begin.
            </div>
          )}
          {items.map((it, idx) => (
            <div key={it.id} style={{ gridColumn: `span ${spanFor(it)}` }}>
              <DashboardCard
                item={it}
                onRemove={() => setItems(items.filter((x) => x.id !== it.id))}
                onFocus={(payload) => setFocus(payload)}
                showArrows={true}
                onMoveLeft={() => moveLeft(idx)}
                onMoveRight={() => moveRight(idx)}
                onResize={(n) => {
                  const next = items.map((x) =>
                    x.id === it.id ? { ...x, size: n } : x
                  );
                  setItems(next);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Focus Mode */}
      <Modal
        open={!!focus}
        title={focus?.title || "Focus"}
        onClose={() => setFocus(null)}
      >
        {focus?.image?.dataUrl && focus?.image?.showOnDashboard && (
          <img
            src={focus.image.dataUrl}
            alt={focus.image.alt || focus.title}
            style={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: 12,
              border:
                "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
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
              border:
                "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
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
const select = {
  padding: "8px",
  background: "var(--surface)",
  color: "var(--text)",
  borderRadius: 8,
  border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
};
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
  border:
    "1px solid color-mix(in oklab, crimson 50%, var(--text) 20%)",
  cursor: "pointer"
};
const grid = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))"
};
