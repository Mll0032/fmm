import React, { useState, useRef, useEffect } from "react";
import { saveAudio, loadAudio, deleteAudio } from "../../lib/audioStore.js";
import { uploadAudio, getSoundboard, saveSoundboard, deleteAudioFile } from "../../lib/supabase.js";
import { useAuth } from "../../context/AuthContext.jsx";

const cfgKey = (moduleId) => `fizzrix.soundboard.${moduleId || "global"}`;

function loadBgConfig(moduleId) {
  try {
    const raw = localStorage.getItem(cfgKey(moduleId));
    return raw ? JSON.parse(raw).bg || null : null;
  } catch { return null; }
}

function saveBgConfig(moduleId, bg) {
  try { localStorage.setItem(cfgKey(moduleId), JSON.stringify({ bg })); } catch {}
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function fmtTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function fmtDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function shortLicense(url = "") {
  if (url.includes("publicdomain") || url.includes("cc0")) return "CC0";
  if (url.includes("by-nc")) return "CC BY-NC";
  if (url.includes("by/4")) return "CC BY 4.0";
  if (url.includes("by/3")) return "CC BY 3.0";
  return "CC";
}

const PRESETS = [
  { label: "Tavern", query: "fantasy tavern ambience" },
  { label: "Dungeon", query: "dungeon dark ambience" },
  { label: "Battle", query: "battle epic fantasy music" },
  { label: "Forest", query: "forest nature ambient night" },
  { label: "Town", query: "medieval town ambient market" },
  { label: "Boss", query: "boss fight epic dramatic music" },
];

export default function Soundboard({ moduleId }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [bg, setBg] = useState(() => loadBgConfig(moduleId));
  const [bites, setBites] = useState([]);
  const [loadingBites, setLoadingBites] = useState(false);

  const bgAudioRef = useRef(new Audio());
  const [bgPlaying, setBgPlaying] = useState(false);
  const [bgVolume, setBgVolume] = useState(bg?.volume ?? 0.8);
  const [bgLoop, setBgLoop] = useState(bg?.loop ?? true);
  const [bgLoading, setBgLoading] = useState(false);

  const activeBitesRef = useRef({});
  const [biteLoading, setBiteLoading] = useState(false);

  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const recTimerRef = useRef(null);
  const cancelRecRef = useRef(false);

  const blobCacheRef = useRef({});

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  // Freesound search
  const [browseOpen, setBrowseOpen] = useState(false);
  const [fsQuery, setFsQuery] = useState("");
  const [fsResults, setFsResults] = useState([]);
  const [fsLoading, setFsLoading] = useState(false);
  const [fsError, setFsError] = useState("");
  const [previewingId, setPreviewingId] = useState(null);
  const previewAudioRef = useRef(null);

  // ── helpers ───────────────────────────────────────────────────────────────

  function revokeBlobs(cache) {
    Object.values(cache).forEach(url => {
      if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
  }

  async function getBlobUrl(audioId, bitesSnapshot) {
    if (blobCacheRef.current[audioId]) return blobCacheRef.current[audioId];
    const bite = (bitesSnapshot || bites).find(b => b.id === audioId);
    if (bite?.url) { blobCacheRef.current[audioId] = bite.url; return bite.url; }
    const blob = await loadAudio(audioId);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    blobCacheRef.current[audioId] = url;
    return url;
  }

  async function persistBites(newBites) {
    setBites(newBites);
    if (moduleId) await saveSoundboard(moduleId, newBites);
  }

  // ── load bg when audioId or url changes ──────────────────────────────────

  useEffect(() => {
    const audio = bgAudioRef.current;
    setBgPlaying(false);
    audio.pause();

    if (bg?.url) {
      audio.src = bg.url;
      audio.volume = bg.volume ?? 0.8;
      audio.loop = bg.loop ?? true;
      return;
    }

    audio.src = "";
    if (!bg?.audioId) return;

    setBgLoading(true);
    getBlobUrl(bg.audioId).then(url => {
      if (url) { audio.src = url; audio.volume = bg.volume ?? 0.8; audio.loop = bg.loop ?? true; }
      setBgLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bg?.audioId, bg?.url, moduleId]);

  // ── reset + load bites from Supabase on module change ────────────────────

  useEffect(() => {
    bgAudioRef.current.pause();
    bgAudioRef.current.src = "";
    setBgPlaying(false);
    stopAllBites();
    previewAudioRef.current?.pause();
    setPreviewingId(null);
    setFsResults([]);
    setBrowseOpen(false);
    revokeBlobs(blobCacheRef.current);
    blobCacheRef.current = {};

    const newBg = loadBgConfig(moduleId);
    setBg(newBg);
    setBgVolume(newBg?.volume ?? 0.8);
    setBgLoop(newBg?.loop ?? true);
    setBites([]);

    if (!moduleId) return;
    setLoadingBites(true);
    getSoundboard(moduleId)
      .then(loaded => setBites(loaded))
      .catch(() => {})
      .finally(() => setLoadingBites(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  // ── preload cache ─────────────────────────────────────────────────────────

  useEffect(() => {
    bites.forEach(bite => {
      if (bite.url) { blobCacheRef.current[bite.id] = bite.url; }
      else if (!blobCacheRef.current[bite.id]) { getBlobUrl(bite.id, bites); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bites]);

  // ── Ctrl+Alt+Z hotkey ─────────────────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey && e.altKey && e.code === "KeyZ") {
        e.preventDefault();
        if (recording) { stopRecording(); } else { setOpen(true); startRecording(); }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [recording]);

  // ── iOS audio unlock ──────────────────────────────────────────────────────

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
      src.buffer = buf; src.connect(ctx.destination); src.start(0);
      ctx.resume().then(() => ctx.close());
    }
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", unlock);
  }, []);

  // ── unmount cleanup ───────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      bgAudioRef.current.pause();
      previewAudioRef.current?.pause();
      stopAllBites();
      clearInterval(recTimerRef.current);
      revokeBlobs(blobCacheRef.current);
    };
  }, []);

  // ── background music ──────────────────────────────────────────────────────

  async function handleBgFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const audioId = `bg-${moduleId || "global"}`;
    await saveAudio(audioId, file);

    if (blobCacheRef.current[audioId]?.startsWith("blob:"))
      URL.revokeObjectURL(blobCacheRef.current[audioId]);

    const url = URL.createObjectURL(file);
    blobCacheRef.current[audioId] = url;

    bgAudioRef.current.pause();
    bgAudioRef.current.src = url;
    bgAudioRef.current.volume = bgVolume;
    bgAudioRef.current.loop = bgLoop;
    setBgPlaying(false);

    const newBg = { audioId, name: file.name, volume: bgVolume, loop: bgLoop };
    setBg(newBg);
    saveBgConfig(moduleId, newBg);
  }

  function playBg() {
    bgAudioRef.current.volume = bgVolume;
    bgAudioRef.current.loop = bgLoop;
    bgAudioRef.current.play().then(() => setBgPlaying(true)).catch(console.error);
  }
  function pauseBg() { bgAudioRef.current.pause(); setBgPlaying(false); }
  function stopBg() { bgAudioRef.current.pause(); bgAudioRef.current.currentTime = 0; setBgPlaying(false); }

  function handleVolumeChange(v) {
    const vol = parseFloat(v);
    setBgVolume(vol);
    bgAudioRef.current.volume = vol;
    if (bg) { const updated = { ...bg, volume: vol }; setBg(updated); saveBgConfig(moduleId, updated); }
  }

  function toggleLoop() {
    const next = !bgLoop;
    setBgLoop(next);
    bgAudioRef.current.loop = next;
    if (bg) { const updated = { ...bg, loop: next }; setBg(updated); saveBgConfig(moduleId, updated); }
  }

  bgAudioRef.current.onended = () => { if (!bgLoop) setBgPlaying(false); };

  // ── freesound search ──────────────────────────────────────────────────────

  async function searchFreesound(query) {
    const key = localStorage.getItem("fizzrix.freesound.apikey") || "";
    if (!key) { setFsError("Add your Freesound API key in Settings first."); return; }
    if (!query.trim()) return;
    setFsLoading(true);
    setFsError("");
    setFsResults([]);
    try {
      const params = new URLSearchParams({
        query,
        filter: "duration:[30 TO 600]",
        fields: "id,name,previews,duration,username,license",
        page_size: "12",
        token: key,
      });
      const res = await fetch(`https://freesound.org/apiv2/search/text/?${params}`);
      if (!res.ok) throw new Error(`Freesound returned ${res.status} — check your API key in Settings.`);
      const data = await res.json();
      setFsResults(data.results || []);
      if (!data.results?.length) setFsError("No results. Try a different search term.");
    } catch (err) {
      setFsError(err.message);
    } finally {
      setFsLoading(false);
    }
  }

  function togglePreview(track) {
    const url = track.previews["preview-hq-mp3"];
    if (previewingId === track.id) {
      previewAudioRef.current?.pause();
      setPreviewingId(null);
      return;
    }
    previewAudioRef.current?.pause();
    const audio = new Audio(url);
    previewAudioRef.current = audio;
    audio.onended = () => setPreviewingId(null);
    audio.play().catch(console.error);
    setPreviewingId(track.id);
  }

  function useAsBg(track) {
    previewAudioRef.current?.pause();
    setPreviewingId(null);
    setBrowseOpen(false);

    const url = track.previews["preview-hq-mp3"];
    bgAudioRef.current.pause();
    bgAudioRef.current.src = url;
    bgAudioRef.current.volume = bgVolume;
    bgAudioRef.current.loop = bgLoop;
    setBgPlaying(false);

    const newBg = {
      url,
      name: track.name,
      volume: bgVolume,
      loop: bgLoop,
      attribution: `"${track.name}" by ${track.username} (freesound.org) — ${shortLicense(track.license)}`,
    };
    setBg(newBg);
    saveBgConfig(moduleId, newBg);
  }

  // ── soundbites ────────────────────────────────────────────────────────────

  async function handleBiteFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";
    setBiteLoading(true);

    const newBites = [];
    for (const file of files) {
      const id = makeId();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${user?.id || "anon"}/${moduleId || "global"}/${id}-${safeName}`;
      const result = await uploadAudio(file, storagePath);

      if (result.success) {
        blobCacheRef.current[id] = result.url;
        newBites.push({ id, name: file.name.replace(/\.[^.]+$/, ""), url: result.url, storagePath });
      } else {
        await saveAudio(id, file);
        blobCacheRef.current[id] = URL.createObjectURL(file);
        newBites.push({ id, name: file.name.replace(/\.[^.]+$/, "") });
      }
    }

    await persistBites([...bites, ...newBites]);
    setBiteLoading(false);
  }

  async function playBite(audioId) {
    let url = blobCacheRef.current[audioId];
    if (!url) { url = await getBlobUrl(audioId); if (!url) return; }
    const audio = new Audio(url);
    if (!activeBitesRef.current[audioId]) activeBitesRef.current[audioId] = [];
    activeBitesRef.current[audioId].push(audio);
    audio.addEventListener("ended", () => {
      if (activeBitesRef.current[audioId])
        activeBitesRef.current[audioId] = activeBitesRef.current[audioId].filter(a => a !== audio);
    });
    audio.play().catch(console.error);
  }

  function stopAllBites() {
    Object.values(activeBitesRef.current).flat().forEach(a => { a.pause(); a.currentTime = 0; });
    activeBitesRef.current = {};
  }

  async function removeBite(id) {
    const bite = bites.find(b => b.id === id);
    (activeBitesRef.current[id] || []).forEach(a => a.pause());
    delete activeBitesRef.current[id];

    if (bite?.storagePath) await deleteAudioFile(bite.storagePath);
    await deleteAudio(id);

    if (blobCacheRef.current[id]) {
      if (blobCacheRef.current[id].startsWith("blob:"))
        URL.revokeObjectURL(blobCacheRef.current[id]);
      delete blobCacheRef.current[id];
    }

    await persistBites(bites.filter(b => b.id !== id));
  }

  async function renameBite(id, name) {
    setEditingId(null);
    await persistBites(bites.map(b => b.id === id ? { ...b, name } : b));
  }

  // ── recording ─────────────────────────────────────────────────────────────

  async function startRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Microphone access requires HTTPS. Make sure you are using https:// in the address bar.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const mimeType = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"]
        .find(t => MediaRecorder.isTypeSupported(t)) || "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recTimerRef.current);
        setRecTime(0);
        if (cancelRecRef.current) { cancelRecRef.current = false; return; }

        const finalMime = mimeType || mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const id = makeId();
        const name = `Rec ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        const ext = finalMime.includes("mp4") ? "mp4" : "webm";
        const storagePath = `${user?.id || "anon"}/${moduleId || "global"}/${id}-rec.${ext}`;

        const result = await uploadAudio(blob, storagePath);
        if (result.success) {
          blobCacheRef.current[id] = result.url;
          const newBite = { id, name, url: result.url, storagePath };
          setBites(prev => { const next = [...prev, newBite]; if (moduleId) saveSoundboard(moduleId, next); return next; });
        } else {
          await saveAudio(id, blob);
          blobCacheRef.current[id] = URL.createObjectURL(blob);
          setBites(prev => { const next = [...prev, { id, name }]; if (moduleId) saveSoundboard(moduleId, next); return next; });
        }
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

  function stopRecording() { mediaRecRef.current?.stop(); setRecording(false); }
  function cancelRecording() { cancelRecRef.current = true; mediaRecRef.current?.stop(); setRecording(false); }

  // ── render ────────────────────────────────────────────────────────────────

  const hasBg = !!bg;
  const hasBites = bites.length > 0;
  const fsKey = !!localStorage.getItem("fizzrix.freesound.apikey");

  return (
    <div style={{
      background: "var(--bg-elev)",
      borderRadius: "var(--radius)",
      border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
      overflow: "hidden"
    }}>
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
          {bgPlaying && <span style={badge("var(--brand)")}>♪ Playing</span>}
          {recording && <span style={badge("crimson")}>● {fmtTime(recTime)}</span>}
        </div>
        <span style={{ color: "var(--muted)", fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          padding: "0 16px 16px",
          borderTop: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
          display: "grid", gap: 20
        }}>

          {/* ── Background Music ── */}
          <div style={{ display: "grid", gap: 10, paddingTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span style={sectionLabel}>Background Music</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setBrowseOpen(o => !o)}
                  style={{
                    ...pillBtn,
                    background: browseOpen
                      ? "linear-gradient(90deg, var(--brand-2), var(--brand))"
                      : "linear-gradient(90deg, var(--brand), var(--brand-2))"
                  }}
                  title={fsKey ? "Search Freesound" : "Add a Freesound API key in Settings to search"}
                >
                  {browseOpen ? "✕ Close Library" : "♫ Browse Library"}
                </button>
                <label style={{ cursor: "pointer" }}>
                  <input type="file" accept="audio/*" onChange={handleBgFile} hidden />
                  <span style={{ ...pillBtn, background: "var(--surface)", color: "var(--text)", border: "1px solid color-mix(in oklab, var(--text) 15%, transparent)" }}>
                    {hasBg ? "Replace File" : "Upload File"}
                  </span>
                </label>
              </div>
            </div>

            {/* Freesound search panel */}
            {browseOpen && (
              <div style={{ background: "var(--surface)", borderRadius: 10, padding: 14, display: "grid", gap: 12, border: "1px solid color-mix(in oklab, var(--brand) 20%, transparent)" }}>
                {!fsKey ? (
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
                    Add a free Freesound API key in <strong>Settings → Soundboard — Freesound Library</strong> to search royalty-free tracks.
                  </p>
                ) : (
                  <>
                    {/* Search bar */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={fsQuery}
                        onChange={e => setFsQuery(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && searchFreesound(fsQuery)}
                        placeholder="Search tracks…"
                        style={{ flex: 1, padding: "7px 10px", background: "var(--bg-elev)", color: "var(--text)", borderRadius: 8, border: "1px solid color-mix(in oklab, var(--text) 15%, transparent)", fontSize: 13 }}
                      />
                      <button
                        onClick={() => searchFreesound(fsQuery)}
                        disabled={fsLoading || !fsQuery.trim()}
                        style={{ padding: "7px 14px", borderRadius: 8, background: "linear-gradient(90deg, var(--brand), var(--brand-2))", color: "#0b0d12", border: 0, fontWeight: 700, cursor: fsLoading || !fsQuery.trim() ? "not-allowed" : "pointer", opacity: fsLoading || !fsQuery.trim() ? 0.5 : 1 }}
                      >
                        {fsLoading ? "…" : "Search"}
                      </button>
                    </div>

                    {/* Preset quick-search buttons */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {PRESETS.map(p => (
                        <button
                          key={p.label}
                          onClick={() => { setFsQuery(p.query); searchFreesound(p.query); }}
                          style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "var(--bg-elev)", color: "var(--muted)", border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)" }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {fsError && (
                      <p style={{ margin: 0, fontSize: 12, color: "crimson" }}>{fsError}</p>
                    )}

                    {/* Results */}
                    {fsResults.length > 0 && (
                      <div style={{ display: "grid", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                        {fsResults.map(track => (
                          <div key={track.id} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "8px 10px", borderRadius: 8,
                            background: "var(--bg-elev)",
                            border: "1px solid color-mix(in oklab, var(--text) 8%, transparent)"
                          }}>
                            <button
                              onPointerDown={e => { e.preventDefault(); togglePreview(track); }}
                              style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", background: previewingId === track.id ? "var(--brand)" : "var(--surface)", color: previewingId === track.id ? "#0b0d12" : "var(--text)", border: "1px solid color-mix(in oklab, var(--brand) 30%, transparent)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}
                              title="Preview"
                            >
                              {previewingId === track.id ? "⏸" : "▶"}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.name}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                                {track.username} · {fmtDuration(track.duration)} · {shortLicense(track.license)}
                              </div>
                            </div>
                            <button
                              onClick={() => useAsBg(track)}
                              style={{ flexShrink: 0, padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: "linear-gradient(90deg, var(--brand), var(--brand-2))", color: "#0b0d12", border: 0 }}
                            >
                              Use
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
                      Music from <strong>freesound.org</strong>. Preview clips are 30s. Attribution shown below the player.
                    </p>
                  </>
                )}
              </div>
            )}

            {hasBg ? (
              <>
                <div style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  ♪ {bg.name}
                </div>
                {bg.attribution && (
                  <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>{bg.attribution}</div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button onClick={playBg}  disabled={bgPlaying || bgLoading} style={ctrlBtn(bgPlaying || bgLoading)}>▶ Play</button>
                  <button onClick={pauseBg} disabled={!bgPlaying}             style={ctrlBtn(!bgPlaying)}>⏸ Pause</button>
                  <button onClick={stopBg}  disabled={!hasBg}                 style={ctrlBtn(!hasBg)}>⏹ Stop</button>
                  <button
                    onClick={toggleLoop}
                    style={{
                      ...ctrlBtn(false),
                      background: bgLoop ? "color-mix(in oklab, var(--brand) 14%, var(--surface))" : "var(--surface)",
                      color: bgLoop ? "var(--brand)" : "var(--muted)",
                      border: bgLoop ? "1px solid color-mix(in oklab, var(--brand) 35%, transparent)" : "1px solid color-mix(in oklab, var(--text) 12%, transparent)"
                    }}
                    title="Toggle loop"
                  >🔁 Loop</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14 }}>🔊</span>
                  <input type="range" min="0" max="1" step="0.05" value={bgVolume} onChange={e => handleVolumeChange(e.target.value)} style={{ flex: 1, accentColor: "var(--brand)" }} />
                  <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 34, textAlign: "right" }}>{Math.round(bgVolume * 100)}%</span>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
                No music loaded. Browse the library or upload a file.
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
                  <button onClick={stopAllBites} style={{ ...ctrlBtn(false), fontSize: 12, padding: "5px 10px" }}>⏹ Stop All</button>
                )}
                {recording ? (
                  <>
                    <button onClick={stopRecording} style={recSaveBtn}>✓ Save {fmtTime(recTime)}</button>
                    <button onClick={cancelRecording} style={recCancelBtn}>✕ Cancel</button>
                  </>
                ) : (
                  <button onClick={startRecording} disabled={biteLoading} style={recBtn}>● Record</button>
                )}
                <label style={{ cursor: biteLoading ? "not-allowed" : "pointer" }}>
                  <input type="file" accept="audio/*" multiple onChange={handleBiteFiles} disabled={biteLoading} hidden />
                  <span style={{ ...pillBtn, opacity: biteLoading ? 0.5 : 1, cursor: biteLoading ? "not-allowed" : "pointer" }}>
                    {biteLoading ? "Uploading…" : "+ Add Files"}
                  </span>
                </label>
              </div>
            </div>

            {loadingBites ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>Loading soundbites…</p>
            ) : !hasBites ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
                No soundbites yet. Add audio files or use the Record button.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                {bites.map(bite => (
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
                          style={{ flex: 1, padding: "6px 8px", background: "var(--surface)", color: "var(--text)", border: "1px solid var(--brand)", borderRadius: 8, fontSize: 12 }}
                        />
                        <button onClick={() => renameBite(bite.id, editName.trim() || bite.name)} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--brand)", color: "#0b0d12", border: "none", cursor: "pointer", fontWeight: 700 }}>✓</button>
                      </div>
                    ) : (
                      <button
                        onPointerDown={e => { e.preventDefault(); playBite(bite.id); }}
                        title={`Play: ${bite.name}`}
                        style={{ padding: "10px 8px", borderRadius: 10, background: "var(--surface)", color: "var(--text)", border: "1px solid color-mix(in oklab, var(--brand) 25%, transparent)", cursor: "pointer", fontWeight: 600, fontSize: 12, textAlign: "center", minHeight: 52, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}
                      >
                        ▶ {bite.name}
                      </button>
                    )}
                    {editingId !== bite.id && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => { setEditingId(bite.id); setEditName(bite.name); }} style={tinyBtn} title="Rename">✎</button>
                        <button onClick={() => removeBite(bite.id)} style={{ ...tinyBtn, color: "crimson" }} title="Remove">✕</button>
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

const recSaveBtn = {
  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
  cursor: "pointer", color: "var(--brand)",
  background: "color-mix(in oklab, var(--brand) 12%, var(--surface))",
  border: "1px solid color-mix(in oklab, var(--brand) 35%, transparent)", minHeight: 32
};

const recCancelBtn = {
  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
  cursor: "pointer", color: "var(--muted)",
  background: "var(--surface)",
  border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)", minHeight: 32
};

const tinyBtn = {
  flex: 1, padding: "3px 0", borderRadius: 6,
  background: "var(--surface)", color: "var(--muted)",
  border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
  cursor: "pointer", fontSize: 12, textAlign: "center"
};
