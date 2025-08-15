import React, { useState, useEffect } from "react";
import { ModulesStore } from "../../state/modulesStore";

function sectionData(module, item) {
  if (!module || !module.data) return { title: "Loading...", text: "" };
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
    case "monster": {
      const monster = (d.appendices?.monsters || []).find(m => m.id === item.sectionId);
      return { title: `${module.name} — ${monster?.name ?? "Monster"}`, text: monster?.content || "", image: monster?.image };
    }
    case "magicItem": {
      const magicItem = (d.appendices?.magicItems || []).find(i => i.id === item.sectionId);
      return { title: `${module.name} — ${magicItem?.name ?? "Magic Item"}`, text: magicItem?.content || "", image: magicItem?.image };
    }
    // Keep backward compatibility for old appendix format
    case "appendix:monsters": {
      const monsters = d.appendices?.monsters;
      // Handle both old string format and new array format
      const text = typeof monsters === 'string' ? monsters : 
                   Array.isArray(monsters) ? monsters.map(m => `${m.name || 'Unnamed Monster'}: ${m.content || ''}`).join('\n\n') : '';
      // For image, use the old monstersImage if it exists, otherwise use the first monster's image
      const image = d.appendices?.monstersImage || 
                   (Array.isArray(monsters) && monsters[0]?.image) || 
                   { dataUrl: "", alt: "", showOnDashboard: false };
      return { title: `${module.name} — Monsters Appendix`, text, image };
    }
    case "appendix:magicItems": {
      const magicItems = d.appendices?.magicItems;
      // Handle both old string format and new array format
      const text = typeof magicItems === 'string' ? magicItems : 
                   Array.isArray(magicItems) ? magicItems.map(i => `${i.name || 'Unnamed Item'}: ${i.content || ''}`).join('\n\n') : '';
      // For image, use the old magicItemsImage if it exists, otherwise use the first item's image
      const image = d.appendices?.magicItemsImage || 
                   (Array.isArray(magicItems) && magicItems[0]?.image) || 
                   { dataUrl: "", alt: "", showOnDashboard: false };
      return { title: `${module.name} — Magic Items Appendix`, text, image };
    }
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
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadModule() {
      try {
        setLoading(true);
        const moduleData = await ModulesStore.get(item.moduleId);
        setModule(moduleData);
      } catch (error) {
        console.error('Error loading module for dashboard card:', error);
        setModule(null);
      } finally {
        setLoading(false);
      }
    }
    
    if (item.moduleId) {
      loadModule();
    }
  }, [item.moduleId]);
  
  if (loading) {
    return (
      <article style={card}>
        <header style={head}>
          <h4 style={{ margin: 0, fontSize: 16 }}>Loading...</h4>
        </header>
      </article>
    );
  }
  
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
