import React, { useMemo } from "react";
import { ModulesStore } from "../../state/modulesStore";

function sectionData(module, item) {
  const d = module.data;
  switch (item.type) {
    case "map":
      return { title: `${module.name} — Map`, text: d.mapUrl || "", image: d.mapImage };
    case "intro":
      return { title: `${module.name} — Introduction`, text: d.introduction || "", image: d.introImage };
    case "overview":
      return { title: `${module.name} — Overview`, text: d.overview || "", image: d.overviewImage };
    case "episode": {
      const ep = (d.episodes || []).find(e => e.id === item.sectionId);
      return { title: `${module.name} — ${ep?.title ?? "Episode"}`, text: ep?.content || "", image: ep?.image };
    }
    case "appendix:monsters":
      return { title: `${module.name} — Monsters Appendix`, text: d.appendices?.monsters || "", image: d.appendices?.monstersImage };
    case "appendix:magicItems":
      return { title: `${module.name} — Magic Items Appendix`, text: d.appendices?.magicItems || "", image: d.appendices?.magicItemsImage };
    default:
      return { title: module.name, text: "" };
  }
}

export default function DashboardCard({
  item,
  onRemove,
  onFocus,
  showArrows = false,
  onMoveLeft,
  onMoveRight,
  onResize, // (size: 1|2|3|4)
  locked = false,
}) {
  const module = useMemo(() => ModulesStore.get(item.moduleId), [item.moduleId]);
  if (!module) return null;

  const s = sectionData(module, item);
  const showImage = s.image?.dataUrl && s.image?.showOnDashboard;

  return (
    <article style={card}>
      <header style={head}>
        <h4 style={{ margin: 0, fontSize: 16 }}>{s.title}</h4>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {/* Size control */}
          {!locked && (
            <div
              style={sizeWrap}
              title="Resize card"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {[{ n: 1, label: "S" }, { n: 2, label: "M" }, { n: 3, label: "L" }, { n: 4, label: "XL" }].map(opt => (
                <button
                  key={opt.n}
                  onClick={() => onResize?.(opt.n)}
                  style={sizeBtn(opt.n === (item.size || 1))}
                  aria-pressed={opt.n === (item.size || 1)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => onFocus?.(s)} title="Focus" style={btn("var(--surface)")}>
            Focus
          </button>

          {!locked && showArrows && (
            <>
              <button onClick={onMoveLeft}  title="Move left"  style={btn("var(--surface)")}>←</button>
              <button onClick={onMoveRight} title="Move right" style={btn("var(--surface)")}>→</button>
            </>
          )}

          {!locked && (
            <button onClick={onRemove} title="Remove" style={btn("transparent", "crimson")}>✕</button>
          )}
        </div>
      </header>

      {showImage && <img src={s.image.dataUrl} alt={s.image.alt || s.title} style={img} />}

      {s.text && <div style={body}>{s.text}</div>}
    </article>
  );
}

/* ---- styles/helpers (top-level, not nested) ---- */

const card = {
  display: "grid",
  gap: 10,
  background: "var(--bg-elev)",
  borderRadius: "var(--radius)",
  border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
  padding: 12,
};

const head = { display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" };

const img = {
  maxWidth: "100%",
  height: "auto",
  borderRadius: 10,
  border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
};

const body = {
  whiteSpace: "pre-wrap",
  color: "var(--text)",
  background: "var(--surface)",
  borderRadius: 10,
  border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
  padding: 10,
  maxHeight: 240,
  overflow: "auto",
};

function btn(bg, color) {
  return {
    padding: "6px 10px",
    background: bg,
    color: color || "var(--text)",
    borderRadius: 8,
    border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
    cursor: "pointer",
  };
}

const sizeWrap = {
  display: "inline-flex",
  gap: 4,
  background: "var(--surface)",
  border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
  borderRadius: 999,
  padding: 2,
  opacity: 0.8,
};

function sizeBtn(active) {
  return {
    padding: "4px 8px",
    borderRadius: 999,
    border: 0,
    cursor: "pointer",
    background: active ? "linear-gradient(90deg, var(--brand), var(--brand-2))" : "transparent",
    color: active ? "#0b0d12" : "var(--text)",
    fontWeight: 700,
  };
}
