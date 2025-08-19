import React, { useEffect, useState } from "react";

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
          <HoverButton onClick={onClose} style={btn()} hoverStyle={btnHover()}>✕</HoverButton>
        </header>
        <div style={{ overflow: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function btn() {
  return {
    padding: "6px 10px",
    background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
    color: "#0b0d12",
    borderRadius: 8,
    border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)",
    cursor: "pointer",
    fontWeight: 600,
    transition: "background 0.2s ease"
  };
}

function btnHover() {
  return {
    padding: "6px 10px",
    background: "linear-gradient(270deg, var(--brand), var(--brand-2))",
    color: "#0b0d12",
    borderRadius: 8,
    border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)",
    cursor: "pointer",
    fontWeight: 600,
    transition: "background 0.2s ease"
  };
}

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
