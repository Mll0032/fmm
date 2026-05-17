import React, { useRef, useState } from "react";
import { uploadImage } from "../../lib/supabase.js";

const isTouch = window.matchMedia("(pointer: coarse)").matches;

function HoverButton({ children, onClick, style, hoverStyle, ...props }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={isTouch ? undefined : () => setIsHovered(true)}
      onMouseLeave={isTouch ? undefined : () => setIsHovered(false)}
      style={isHovered ? hoverStyle : style}
      {...props}
    >
      {children}
    </button>
  );
}

export default function ImageField({
  label = "Image",
  value = { url: "", dataUrl: "", alt: "", showOnDashboard: false },
  onChange,
  accept = "image/jpeg",
  storagePath,
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const { url = "", dataUrl = "", alt = "", showOnDashboard = false } = value || {};
  const displaySrc = url || dataUrl;

  async function pickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes("jpeg") && !file.name.toLowerCase().endsWith(".jpg")) {
      alert("Please choose a .jpg image.");
      return;
    }

    if (storagePath) {
      setUploading(true);
      setUploadError("");
      try {
        const result = await uploadImage(file, `${storagePath}.jpg`);
        if (result.success) {
          onChange?.({ url: result.url, dataUrl: "", alt, showOnDashboard });
        } else {
          setUploadError("Upload failed. Please try again.");
        }
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    } else {
      // No storage path — fall back to base64
      const reader = new FileReader();
      reader.onload = () => {
        onChange?.({ url: "", dataUrl: String(reader.result), alt, showOnDashboard });
      };
      reader.readAsDataURL(file);
    }
  }

  function clearImage() {
    onChange?.({ url: "", dataUrl: "", alt: "", showOnDashboard });
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
            onChange={(e) => onChange?.({ url, dataUrl, alt, showOnDashboard: e.target.checked })}
          />
          Show on Dashboard
        </label>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            onChange={pickFile}
            disabled={uploading}
            style={{ color: "var(--muted)" }}
          />
          {uploading && (
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Uploading…</span>
          )}
          {displaySrc && !uploading && (
            <HoverButton
              type="button"
              onClick={clearImage}
              style={{
                padding: "6px 10px", borderRadius: 8,
                border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)",
                background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                color: "#0b0d12", cursor: "pointer", fontWeight: 600, transition: "background 0.2s ease"
              }}
              hoverStyle={{
                padding: "6px 10px", borderRadius: 8,
                border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)",
                background: "linear-gradient(270deg, var(--brand), var(--brand-2))",
                color: "#0b0d12", cursor: "pointer", fontWeight: 600, transition: "background 0.2s ease"
              }}
            >
              Remove
            </HoverButton>
          )}
        </div>

        {uploadError && (
          <small style={{ color: "crimson" }}>{uploadError}</small>
        )}

        {displaySrc && (
          <>
            <img
              src={displaySrc}
              alt={alt || label}
              style={{
                maxWidth: "100%", height: "auto", borderRadius: 10,
                border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
              }}
            />
            <input
              placeholder="Alt text (for accessibility)"
              value={alt}
              onChange={(e) => onChange?.({ url, dataUrl, alt: e.target.value, showOnDashboard })}
              style={{
                padding: "8px 10px", background: "var(--surface)", color: "var(--text)",
                borderRadius: 8, border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
              }}
            />
          </>
        )}
      </div>
      <small style={{ color: "var(--muted)" }}>
        JPG only. Images upload directly to Supabase Storage.
      </small>
    </div>
  );
}
