import React, { useEffect } from "react";

export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "grid", placeItems: "center", zIndex: 200
      }}
      aria-modal="true" role="dialog"
    >
      <div
        style={{
          width: "min(1000px, 92vw)", maxHeight: "88vh",
          background: "var(--bg-elev)", color: "var(--text)",
          borderRadius: "var(--radius)",
          border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
          boxShadow: "var(--shadow)", padding: 16, display: "grid", gap: 12
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={btn("transparent")}>✕</button>
        </header>
        <div style={{ overflow: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function btn(bg) {
  return {
    padding: "6px 10px",
    background: bg,
    color: "var(--text)",
    borderRadius: 8,
    border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
    cursor: "pointer"
  };
}
