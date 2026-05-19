import React, { useState, useRef, useEffect, useCallback } from "react";
import { saveAudio, loadAudio, deleteAudio } from "../../lib/audioStore.js";

const isTouch = window.matchMedia("(pointer: coarse)").matches;

const cfgKey = (moduleId) => `fizzrix.soundboard.${moduleId || "global"}`;

function loadConfig(moduleId) {
  try {
    const raw = localStorage.getItem(cfgKey(moduleId));
    return raw ? JSON.parse(raw) : { bg: null, bites: [] };
  } catch {
    return { bg: null, bites: [] };
  }
}

function saveConfig(moduleId, cfg) {
  try { localStorage.setItem(cfgKey(moduleId), JSON.stringify(cfg)); } catch {}
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function fmtTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function Soundboard({ moduleId }) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState(() => loadConfig(moduleId));

  // Background music
  const bgAudioRef = useRef(new Audio());
  const [bgPlaying, setBgPlaying] = useState(false);
  const [bgVolume, setBgVolume] = useState(config.bg?.volume ?? 0.8);
  const [bgLoop, setBgLoop] = useState(config.bg?.loop ?? true);
  const [bgLoading, setBgLoading] = useState(false);

  // Active bite instances: { [biteId]: Audio[] } — multiple instances allowed per bite
  const activeBitesRef = useRef({});
  const [biteLoading, setBiteLoading] = useState(false);

  // Recording
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const recTimerRef = useRef(null);

  // Blob URL cache — created on demand, revoked on unmount
  const blobCacheRef = useRef({});

  // Inline renaming
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  // ── helpers ──────────────────────────────────────────────────────────────

  async function getBlobUrl(audioId) {
    if (blobCacheRef.current[audioId]) return blobCacheRef.current[audioId];
    const blob = await loadAudio(audioId);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    blobCacheRef.current[audioId] = url;
    return url;
  }

  function updateConfig(updates) {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      saveConfig(moduleId, next);
      return next;
    });
  }

  // ── load bg audio when module or bg audioId changes ──────────────────────

  useEffect(() => {
    const audio = bgAudioRef.current;
    setBgPlaying(false);
    audio.pause();
    audio.src = "";

    if (!config.bg?.audioId) return;

    setBgLoading(true);
    getBlobUrl(config.bg.audioId).then(url => {
      if (url) {
        audio.src = url;
        audio.volume = config.bg.volume ?? 0.8;
        audio.loop = config.bg.loop ?? true;
      }
      setBgLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.bg?.audioId, moduleId]);

  // ── reset on module change ────────────────────────────────────────────────

  useEffect(() => {
    const audio = bgAudioRef.current;
    audio.pause();
    audio.src = "";
    setBgPlaying(false);
    stopAllBites();

    // Revoke cached blob URLs from previous module
    Object.values(blobCacheRef.current).forEach(URL.revokeObjectURL);
    blobCacheRef.current = {};

    const cfg = loadConfig(moduleId);
    setConfig(cfg);
    setBgVolume(cfg.bg?.volume ?? 0.8);
    setBgLoop(cfg.bg?.loop ?? true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  // ── Ctrl+Alt+R hotkey to toggle recording ────────────────────────────────

  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey && e.altKey && e.code === "KeyZ") {
        e.preventDefault();
        if (recording) {
          stopRecording();
        } else {
          setOpen(true);
          startRecording();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [recording]);

  // ── iOS audio unlock — first touch on the page unlocks audio context ─────

  useEffect(() => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    let unlocked = false;
    function unlock() {
      if (unlocked) return;
      unlocked = true;
      const ctx = new AudioCtx();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      ctx.resume().then(() => ctx.close());
    }
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", unlock);
  }, []);

  // ── unmount cleanup ───────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      bgAudioRef.current.pause();
      stopAllBites();
      clearInterval(recTimerRef.current);
      Object.values(blobCacheRef.current).forEach(URL.revokeObjectURL);
    };
  }, []);

  // ── background music ─────────────────────────────────────────────────────

  async function handleBgFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const audioId = `bg-${moduleId || "global"}`;
    await saveAudio(audioId, file);

    // Revoke old cached URL for this id
    if (blobCacheRef.current[audioId]) {
      URL.revokeObjectURL(blobCacheRef.current[audioId]);
      delete blobCacheRef.current[audioId];
    }

    const url = URL.createObjectURL(file);
    blobCacheRef.current[audioId] = url;

    bgAudioRef.current.pause();
    bgAudioRef.current.src = url;
    bgAudioRef.current.volume = bgVolume;
    bgAudioRef.current.loop = bgLoop;
    setBgPlaying(false);

    updateConfig({ bg: { audioId, name: file.name, volume: bgVolume, loop: bgLoop } });
  }

  function playBg() {
    bgAudioRef.current.volume = bgVolume;
    bgAudioRef.current.loop = bgLoop;
    bgAudioRef.current.play().then(() => setBgPlaying(true)).catch(console.error);
  }

  function pauseBg() {
    bgAudioRef.current.pause();
    setBgPlaying(false);
  }

  function stopBg() {
    bgAudioRef.current.pause();
    bgAudioRef.current.currentTime = 0;
    setBgPlaying(false);
  }

  function handleVolumeChange(v) {
    const vol = parseFloat(v);
    setBgVolume(vol);
    bgAudioRef.current.volume = vol;
    if (config.bg) updateConfig({ bg: { ...config.bg, volume: vol } });
  }

  function toggleLoop() {
    const next = !bgLoop;
    setBgLoop(next);
    bgAudioRef.current.loop = next;
    if (config.bg) updateConfig({ bg: { ...config.bg, loop: next } });
  }

  bgAudioRef.current.onended = () => { if (!bgLoop) setBgPlaying(false); };

  // ── soundbites ────────────────────────────────────────────────────────────

  async function handleBiteFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";
    setBiteLoading(true);

    const newBites = [];
    for (const file of files) {
      const id = makeId();
      await saveAudio(id, file);
      blobCacheRef.current[id] = URL.createObjectURL(file);
      newBites.push({ id, name: file.name.replace(/\.[^.]+$/, "") });
    }

    updateConfig({ bites: [...config.bites, ...newBites] });
    setBiteLoading(false);
  }

  // Pre-load blob URLs for all bites into cache (runs on mount and when bites change)
  useEffect(() => {
    config.bites.forEach(bite => {
      if (!blobCacheRef.current[bite.id]) {
        getBlobUrl(bite.id);
      }
    });
  }, [config.bites]);

  async function playBite(audioId) {
    let url = blobCacheRef.current[audioId];
    if (!url) {
      url = await getBlobUrl(audioId);
      if (!url) return;
    }

    const audio = new Audio(url);
    if (!activeBitesRef.current[audioId]) activeBitesRef.current[audioId] = [];
    activeBitesRef.current[audioId].push(audio);
    audio.addEventListener("ended", () => {
      if (activeBitesRef.current[audioId]) {
        activeBitesRef.current[audioId] = activeBitesRef.current[audioId].filter(a => a !== audio);
      }
    });
    audio.play().catch(console.error);
  }

  function stopAllBites() {
    Object.values(activeBitesRef.current).flat().forEach(a => { a.pause(); a.currentTime = 0; });
    activeBitesRef.current = {};
  }

  async function removeBite(id) {
    (activeBitesRef.current[id] || []).forEach(a => a.pause());
    delete activeBitesRef.current[id];
    await deleteAudio(id);
    if (blobCacheRef.current[id]) {
      URL.revokeObjectURL(blobCacheRef.current[id]);
      delete blobCacheRef.current[id];
    }
    updateConfig({ bites: config.bites.filter(b => b.id !== id) });
  }

  function renameBite(id, name) {
    updateConfig({ bites: config.bites.map(b => b.id === id ? { ...b, name } : b) });
    setEditingId(null);
  }

  // ── recording ─────────────────────────────────────────────────────────────

  async function startRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Microphone access requires HTTPS. Make sure you are using https:// in the address bar, not http://.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      // Pick the best format this browser supports — iOS Safari needs mp4, Chrome uses webm
      const mimeType = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"]
        .find(t => MediaRecorder.isTypeSupported(t)) || "";

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recTimerRef.current);
        setRecTime(0);

        const blob = new Blob(chunksRef.current, { type: mimeType || mr.mimeType || "audio/webm" });
        const id = makeId();
        await saveAudio(id, blob);
        blobCacheRef.current[id] = URL.createObjectURL(blob);
        const name = `Rec ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        setConfig(prev => {
          const next = { ...prev, bites: [...prev.bites, { id, name }] };
          saveConfig(moduleId, next);
          return next;
        });
      };
      mediaRecRef.current = mr;
      mr.start();
      setRecording(true);
      setRecTime(0);
      recTimerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch (err) {
      alert("Microphone access denied: " + err.message);
    }
  }

  function stopRecording() {
    mediaRecRef.current?.stop();
    setRecording(false);
  }

  // ── render ────────────────────────────────────────────────────────────────

  const hasBg = !!config.bg;
  const hasBites = config.bites.length > 0;

  return (
    <div style={{
      background: "var(--bg-elev)",
      borderRadius: "var(--radius)",
      border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
      overflow: "hidden"
    }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", background: "none", border: "none",
          color: "var(--text)", cursor: "pointer", justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 17 }}>🎵</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Soundboard</span>
          {bgPlaying && (
            <span style={badge("var(--brand)")}>♪ Playing</span>
          )}
          {recording && (
            <span style={badge("crimson")}>● {fmtTime(recTime)}</span>
          )}
        </div>
        <span style={{ color: "var(--muted)", fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Body */}
      {open && (
        <div style={{
          padding: "0 16px 16px",
          borderTop: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
          display: "grid",
          gap: 20
        }}>

          {/* ── Background Music ── */}
          <div style={{ display: "grid", gap: 10, paddingTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={sectionLabel}>Background Music</span>
              <label style={{ cursor: "pointer" }}>
                <input type="file" accept="audio/*" onChange={handleBgFile} hidden />
                <span style={pillBtn}>{hasBg ? "Replace" : "Choose File"}</span>
              </label>
            </div>

            {hasBg ? (
              <>
                <div style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  ♪ {config.bg.name}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button onClick={playBg}  disabled={bgPlaying || bgLoading}  style={ctrlBtn(bgPlaying || bgLoading)}>▶ Play</button>
                  <button onClick={pauseBg} disabled={!bgPlaying} style={ctrlBtn(!bgPlaying)}>⏸ Pause</button>
                  <button onClick={stopBg}  disabled={!hasBg}     style={ctrlBtn(!hasBg)}>⏹ Stop</button>
                  <button
                    onClick={toggleLoop}
                    style={{
                      ...ctrlBtn(false),
                      background: bgLoop ? "color-mix(in oklab, var(--brand) 14%, var(--surface))" : "var(--surface)",
                      color: bgLoop ? "var(--brand)" : "var(--muted)",
                      border: bgLoop
                        ? "1px solid color-mix(in oklab, var(--brand) 35%, transparent)"
                        : "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
                    }}
                    title="Toggle loop"
                  >🔁 Loop</button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14 }}>🔊</span>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={bgVolume}
                    onChange={e => handleVolumeChange(e.target.value)}
                    style={{ flex: 1, accentColor: "var(--brand)" }}
                  />
                  <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 34, textAlign: "right" }}>
                    {Math.round(bgVolume * 100)}%
                  </span>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
                No music loaded. Choose an MP3, WAV, or OGG file.
              </p>
            )}
          </div>

          <div style={{ height: 1, background: "color-mix(in oklab, var(--text) 10%, transparent)" }} />

          {/* ── Soundbites ── */}
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span style={sectionLabel}>Soundbites</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {hasBites && (
                  <button
                    onClick={stopAllBites}
                    style={{ ...ctrlBtn(false), fontSize: 12, padding: "5px 10px" }}
                    title="Stop all currently playing soundbites"
                  >
                    ⏹ Stop All
                  </button>
                )}

                {recording ? (
                  <button onClick={stopRecording} style={recStopBtn}>
                    ⏹ Stop {fmtTime(recTime)}
                  </button>
                ) : (
                  <button onClick={startRecording} disabled={biteLoading} style={recBtn}>
                    ● Record
                  </button>
                )}

                <label style={{ cursor: biteLoading ? "not-allowed" : "pointer" }}>
                  <input type="file" accept="audio/*" multiple onChange={handleBiteFiles} disabled={biteLoading} hidden />
                  <span style={{ ...pillBtn, opacity: biteLoading ? 0.5 : 1, cursor: biteLoading ? "not-allowed" : "pointer" }}>
                    {biteLoading ? "Saving…" : "+ Add Files"}
                  </span>
                </label>
              </div>
            </div>

            {!hasBites ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
                No soundbites yet. Add audio files or use the Record button to capture from your microphone.
              </p>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: 8
              }}>
                {config.bites.map(bite => (
                  <div key={bite.id} style={{ display: "grid", gap: 4 }}>
                    {editingId === bite.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") renameBite(bite.id, editName.trim() || bite.name);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          style={{
                            flex: 1, padding: "6px 8px",
                            background: "var(--surface)", color: "var(--text)",
                            border: "1px solid var(--brand)", borderRadius: 8, fontSize: 12
                          }}
                        />
                        <button
                          onClick={() => renameBite(bite.id, editName.trim() || bite.name)}
                          style={{ padding: "6px 10px", borderRadius: 8, background: "var(--brand)", color: "#0b0d12", border: "none", cursor: "pointer", fontWeight: 700 }}
                        >✓</button>
                      </div>
                    ) : (
                      <button
                        onPointerDown={(e) => { e.preventDefault(); playBite(bite.id); }}
                        title={`Play: ${bite.name}`}
                        style={{
                          padding: "10px 8px",
                          borderRadius: 10,
                          background: "var(--surface)",
                          color: "var(--text)",
                          border: "1px solid color-mix(in oklab, var(--brand) 25%, transparent)",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 12,
                          textAlign: "center",
                          minHeight: 52,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          width: "100%"
                        }}
                      >
                        ▶ {bite.name}
                      </button>
                    )}

                    {editingId !== bite.id && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => { setEditingId(bite.id); setEditName(bite.name); }}
                          style={tinyBtn}
                          title="Rename"
                        >✎</button>
                        <button
                          onClick={() => removeBite(bite.id)}
                          style={{ ...tinyBtn, color: "crimson" }}
                          title="Remove"
                        >✕</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── style helpers ─────────────────────────────────────────────────────────────

function badge(color) {
  return {
    fontSize: 11, color, padding: "2px 8px", borderRadius: 999,
    background: `color-mix(in oklab, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in oklab, ${color} 25%, transparent)`
  };
}

const sectionLabel = {
  fontSize: 12, fontWeight: 700, color: "var(--muted)",
  textTransform: "uppercase", letterSpacing: "0.06em"
};

const pillBtn = {
  display: "inline-block",
  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
  background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
  color: "#0b0d12", cursor: "pointer", userSelect: "none"
};

function ctrlBtn(disabled) {
  return {
    padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    background: "var(--surface)", color: disabled ? "var(--muted)" : "var(--text)",
    border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
    opacity: disabled ? 0.45 : 1, minHeight: 36
  };
}

const recBtn = {
  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
  cursor: "pointer", background: "var(--surface)", color: "crimson",
  border: "1px solid color-mix(in oklab, crimson 35%, transparent)", minHeight: 32
};

const recStopBtn = {
  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
  cursor: "pointer", color: "crimson",
  background: "color-mix(in oklab, crimson 12%, var(--surface))",
  border: "1px solid color-mix(in oklab, crimson 35%, transparent)", minHeight: 32
};

const tinyBtn = {
  flex: 1, padding: "3px 0", borderRadius: 6,
  background: "var(--surface)", color: "var(--muted)",
  border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
  cursor: "pointer", fontSize: 12, textAlign: "center"
};
