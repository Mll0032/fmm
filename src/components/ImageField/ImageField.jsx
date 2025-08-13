import React, { useRef } from "react";

export default function ImageField({
  label = "Image",
  value = { dataUrl: "", alt: "", showOnDashboard: false },
  onChange,
  accept = "image/jpeg",
}) {
  const fileRef = useRef(null);

  const { dataUrl = "", alt = "", showOnDashboard = false } = value || {};

  function pickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes("jpeg") && !file.name.toLowerCase().endsWith(".jpg")) {
      alert("Please choose a .jpg image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange?.({ dataUrl: String(reader.result), alt, showOnDashboard });
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    onChange?.({ dataUrl: "", alt: "", showOnDashboard });
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <label style={{ fontSize: 14, color: "var(--muted)" }}>{label}</label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={!!showOnDashboard}
            onChange={(e) => onChange?.({ dataUrl, alt, showOnDashboard: e.target.checked })}
          />
          Show on Dashboard
        </label>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            onChange={pickFile}
            style={{ color: "var(--muted)" }}
          />
          {dataUrl && (
            <button
              type="button"
              onClick={clearImage}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
                background: "transparent",
                color: "var(--text)",
                cursor: "pointer"
              }}
            >
              Remove
            </button>
          )}
        </div>

        {dataUrl && (
          <>
            <img
              src={dataUrl}
              alt={alt || label}
              style={{
                maxWidth: "100%",
                height: "auto",
                borderRadius: 10,
                border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
              }}
            />
            <input
              placeholder="Alt text (for accessibility)"
              value={alt}
              onChange={(e) => onChange?.({ dataUrl, alt: e.target.value, showOnDashboard })}
              style={{
                padding: "8px 10px",
                background: "var(--surface)",
                color: "var(--text)",
                borderRadius: 8,
                border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
              }}
            />
          </>
        )}
      </div>
      <small style={{ color: "var(--muted)" }}>
        JPG only. Note: saving images to localStorage counts against browser storage (~5–10 MB). A backend or file storage will be better later.
      </small>
    </div>
  );
}
