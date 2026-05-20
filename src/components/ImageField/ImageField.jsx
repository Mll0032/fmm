import React, { useRef, useState } from "react";
import { uploadImage } from "../../lib/supabase.js";
import { getApiKey } from "../../lib/ai.js";

const IMAGE_KEY_STORAGE = "fizzrix.imagegen.apikey";
// Use the dedicated image key, or fall back to the OpenAI key from AI Assistant settings
function getImageKey() {
  return localStorage.getItem(IMAGE_KEY_STORAGE) || getApiKey("openai") || "";
}
function saveImageKey(k) { localStorage.setItem(IMAGE_KEY_STORAGE, k); }

const isTouch = window.matchMedia("(pointer: coarse)").matches;

const STYLES = [
  { id: "fantasy",    label: "Fantasy Art",    suffix: "fantasy digital art, detailed illustration, Dungeons and Dragons style, epic fantasy" },
  { id: "gritty",     label: "Dark & Gritty",  suffix: "dark gritty fantasy, moody dramatic lighting, atmospheric shadows, cinematic" },
  { id: "watercolor", label: "Watercolor",      suffix: "watercolor painting, soft artistic edges, fantasy book illustration" },
  { id: "ink",        label: "Ink & Parchment", suffix: "detailed ink drawing, medieval manuscript illumination, black and white illustration" },
  { id: "cinematic",  label: "Cinematic",       suffix: "photorealistic cinematic fantasy, epic scale, dramatic lighting" },
];

// Maps to API `quality` parameter
const SIZES = [
  { id: "low",    label: "Small",  note: "Fastest · lowest detail" },
  { id: "medium", label: "Medium", note: "Balanced" },
  { id: "high",   label: "Large",  note: "Best quality · slower" },
];

// Maps to API `size` parameter (aspect ratio)
const SHAPES = [
  { id: "1024x1024", label: "Square" },
  { id: "1536x1024", label: "Landscape" },
  { id: "1024x1536", label: "Portrait" },
];

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

  // Generator state
  const [genOpen, setGenOpen] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [genStyle, setGenStyle] = useState("fantasy");
  const [genSize, setGenSize] = useState("medium");   // drives API quality
  const [genShape, setGenShape] = useState("1024x1024"); // drives API size
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState(null); // { url, revisedPrompt }
  const [genError, setGenError] = useState("");
  const [genUploading, setGenUploading] = useState(false);

  const { url = "", dataUrl = "", alt = "", showOnDashboard = false } = value || {};
  const displaySrc = url || dataUrl;

  // ── manual file upload ────────────────────────────────────────────────────

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

  // ── image generation ──────────────────────────────────────────────────────

  async function handleGenerate() {
    const key = getImageKey();
    if (!key) {
      setGenError("Add your OpenAI API key in Settings → Image Generation.");
      return;
    }
    if (!genPrompt.trim()) { setGenError("Enter a description first."); return; }

    const style = STYLES.find(s => s.id === genStyle);
    const fullPrompt = `${genPrompt.trim()}, ${style.suffix}`;

    setGenLoading(true);
    setGenError("");
    setGenResult(null);

    try {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-image-2",
          prompt: fullPrompt,
          n: 1,
          size: genShape,
          quality: genSize,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenAI error ${res.status}`);
      }

      const data = await res.json();
      const item = data.data[0];
      const b64 = item.b64_json || null;
      const previewUrl = b64
        ? `data:image/png;base64,${b64}`
        : item.url || null;
      if (!previewUrl) throw new Error("No image data in response.");
      setGenResult({ previewUrl, b64, revisedPrompt: item.revised_prompt });
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenLoading(false);
    }
  }

  async function handleUseGenerated() {
    if (!genResult?.previewUrl) return;
    setGenUploading(true);
    setGenError("");

    try {
      // Step 1: get a PNG blob from the b64 or URL response
      let pngBlob;
      if (genResult.b64) {
        const binary = atob(genResult.b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        pngBlob = new Blob([bytes], { type: "image/png" });
      } else {
        const imgRes = await fetch(genResult.previewUrl);
        if (!imgRes.ok) throw new Error("Could not fetch generated image.");
        pngBlob = await imgRes.blob();
      }

      // Step 2: convert PNG → JPEG via canvas so it matches the bucket's expected format
      const jpegBlob = await pngToJpeg(pngBlob);

      if (storagePath) {
        const file = new File([jpegBlob], "generated.jpg", { type: "image/jpeg" });
        const result = await uploadImage(file, `${storagePath}.jpg`);
        if (!result.success) throw new Error(result.error || "Supabase upload failed.");
        onChange?.({ url: result.url, dataUrl: "", alt: genPrompt.slice(0, 120), showOnDashboard });
      } else {
        const reader = new FileReader();
        reader.onload = () =>
          onChange?.({ url: "", dataUrl: String(reader.result), alt: genPrompt.slice(0, 120), showOnDashboard });
        reader.readAsDataURL(jpegBlob);
      }

      setGenOpen(false);
      setGenResult(null);
      setGenPrompt("");
    } catch (err) {
      setGenError(`Could not save: ${err.message}`);
    } finally {
      setGenUploading(false);
    }
  }

  function pngToJpeg(pngBlob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blobUrl = URL.createObjectURL(pngBlob);
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff"; // JPEG has no transparency; fill white
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error("Canvas JPEG conversion failed.")),
          "image/jpeg",
          0.92
        );
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("Could not load image for conversion.")); };
      img.src = blobUrl;
    });
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {/* Header row */}
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

      {/* Controls row */}
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

          {/* Generate toggle button */}
          <button
            type="button"
            onClick={() => { setGenOpen(o => !o); setGenError(""); setGenResult(null); }}
            style={{
              padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", border: "none", userSelect: "none",
              background: genOpen
                ? "linear-gradient(90deg, var(--brand-2), var(--brand))"
                : "linear-gradient(90deg, var(--brand), var(--brand-2))",
              color: "#0b0d12",
            }}
          >
            {genOpen ? "✕ Close" : "✦ Generate"}
          </button>

          {uploading && <span style={{ fontSize: 13, color: "var(--muted)" }}>Uploading…</span>}

          {displaySrc && !uploading && (
            <HoverButton
              type="button"
              onClick={clearImage}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)", background: "linear-gradient(90deg, var(--brand), var(--brand-2))", color: "#0b0d12", cursor: "pointer", fontWeight: 600, transition: "background 0.2s ease" }}
              hoverStyle={{ padding: "6px 10px", borderRadius: 8, border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)", background: "linear-gradient(270deg, var(--brand), var(--brand-2))", color: "#0b0d12", cursor: "pointer", fontWeight: 600, transition: "background 0.2s ease" }}
            >
              Remove
            </HoverButton>
          )}
        </div>

        {uploadError && <small style={{ color: "crimson" }}>{uploadError}</small>}

        {/* ── AI Image Generator panel ── */}
        {genOpen && (
          <div style={{
            background: "var(--surface)", borderRadius: 10, padding: 14,
            display: "grid", gap: 12,
            border: "1px solid color-mix(in oklab, var(--brand) 20%, transparent)"
          }}>
            {/* Prompt */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Describe the image
              </label>
              <textarea
                value={genPrompt}
                onChange={e => setGenPrompt(e.target.value)}
                placeholder="e.g. A dark stone dungeon entrance covered in vines, torchlight flickering inside"
                rows={2}
                style={{
                  padding: "8px 10px", background: "var(--bg-elev)", color: "var(--text)",
                  borderRadius: 8, border: "1px solid color-mix(in oklab, var(--text) 15%, transparent)",
                  fontSize: 13, resize: "vertical", fontFamily: "inherit"
                }}
              />
            </div>

            {/* Size */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Size</label>
              <div style={{ display: "flex", gap: 6 }}>
                {SIZES.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setGenSize(s.id)}
                    title={s.note}
                    style={{
                      padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                      cursor: "pointer",
                      background: genSize === s.id ? "linear-gradient(90deg, var(--brand), var(--brand-2))" : "var(--bg-elev)",
                      color: genSize === s.id ? "#0b0d12" : "var(--muted)",
                      border: genSize === s.id ? "1px solid transparent" : "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Style presets */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Style</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STYLES.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setGenStyle(s.id)}
                    style={{
                      padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                      cursor: "pointer",
                      background: genStyle === s.id
                        ? "linear-gradient(90deg, var(--brand), var(--brand-2))"
                        : "var(--bg-elev)",
                      color: genStyle === s.id ? "#0b0d12" : "var(--muted)",
                      border: genStyle === s.id
                        ? "1px solid transparent"
                        : "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shape */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Shape</label>
              <div style={{ display: "flex", gap: 6 }}>
                {SHAPES.map(sh => (
                  <button
                    key={sh.id}
                    type="button"
                    onClick={() => setGenShape(sh.id)}
                    style={{
                      padding: "4px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                      cursor: "pointer",
                      background: genShape === sh.id
                        ? "linear-gradient(90deg, var(--brand), var(--brand-2))"
                        : "var(--bg-elev)",
                      color: genShape === sh.id ? "#0b0d12" : "var(--muted)",
                      border: genShape === sh.id
                        ? "1px solid transparent"
                        : "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
                    }}
                  >
                    {sh.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={genLoading || !genPrompt.trim()}
              style={{
                padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: genLoading || !genPrompt.trim() ? "not-allowed" : "pointer",
                background: genLoading || !genPrompt.trim()
                  ? "var(--bg-elev)"
                  : "linear-gradient(90deg, var(--brand), var(--brand-2))",
                color: genLoading || !genPrompt.trim() ? "var(--muted)" : "#0b0d12",
                border: "none", opacity: genLoading || !genPrompt.trim() ? 0.6 : 1,
              }}
            >
              {genLoading ? "Generating… (10–20s)" : "✦ Generate Image"}
            </button>

            {genError && (
              <small style={{ color: "crimson", lineHeight: 1.5 }}>{genError}</small>
            )}

            {/* Result preview */}
            {genResult && !genLoading && (
              <div style={{ display: "grid", gap: 10 }}>
                <img
                  src={genResult.previewUrl}
                  alt="Generated"
                  style={{ maxWidth: "100%", maxHeight: 260, width: "auto", borderRadius: 10, border: "1px solid color-mix(in oklab, var(--brand) 20%, transparent)", display: "block" }}
                />
                {genResult.revisedPrompt && (
                  <small style={{ color: "var(--muted)", fontStyle: "italic", lineHeight: 1.5 }}>
                    DALL-E interpreted: "{genResult.revisedPrompt}"
                  </small>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleUseGenerated}
                    disabled={genUploading}
                    style={{
                      flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                      cursor: genUploading ? "not-allowed" : "pointer", border: "none",
                      background: genUploading ? "var(--bg-elev)" : "linear-gradient(90deg, var(--brand), var(--brand-2))",
                      color: genUploading ? "var(--muted)" : "#0b0d12",
                    }}
                  >
                    {genUploading ? "Saving…" : "✓ Use this image"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setGenResult(null); setGenError(""); }}
                    disabled={genUploading}
                    style={{
                      padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", background: "var(--bg-elev)", color: "var(--muted)",
                      border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
                    }}
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            <small style={{ color: "var(--muted)", lineHeight: 1.5 }}>
              GPT Image 2 · Requires an OpenAI API key · Quality affects cost and generation time
            </small>
          </div>
        )}

        {/* Current image display */}
        {displaySrc && (
          <>
            <img
              src={displaySrc}
              alt={alt || label}
              style={{ maxWidth: "100%", height: "auto", borderRadius: 10, border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)" }}
            />
            <input
              placeholder="Alt text (for accessibility)"
              value={alt}
              onChange={(e) => onChange?.({ url, dataUrl, alt: e.target.value, showOnDashboard })}
              style={{ padding: "8px 10px", background: "var(--surface)", color: "var(--text)", borderRadius: 8, border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)" }}
            />
          </>
        )}
      </div>

      <small style={{ color: "var(--muted)" }}>
        JPG only for uploads · Images stored in Supabase Storage
      </small>
    </div>
  );
}
