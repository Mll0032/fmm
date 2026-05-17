import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { callAI, getActiveKey, getSelectedProvider, PROVIDERS } from "../../lib/ai.js";

const isTouch = window.matchMedia("(pointer: coarse)").matches;

export default function SessionAssistant({ activeModule, activeSession }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const hasKey = !!getActiveKey();
  const providerName = PROVIDERS[getSelectedProvider()]?.name || "AI";

  const historyKey = useMemo(
    () => `fizzrix.assistant.history.${activeModule?.id || "none"}.${activeSession?.id || "none"}`,
    [activeModule?.id, activeSession?.id]
  );
  const historyKeyRef = useRef(historyKey);
  useEffect(() => { historyKeyRef.current = historyKey; }, [historyKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(historyKey);
      setMessages(raw ? JSON.parse(raw) : []);
    } catch {
      setMessages([]);
    }
    setError("");
  }, [historyKey]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const systemPrompt = activeModule
    ? `You are a D&D Dungeon Master assistant helping a DM run a live session of "${activeModule.name}"${activeSession ? ` (${activeSession.name})` : ""}. Keep responses concise and immediately actionable — the DM is at the table right now. When asked about player situations or unexpected actions, offer 2–3 specific creative options the DM can use immediately. Use short paragraphs or quick bullet points. No lengthy preamble.`
    : `You are a D&D Dungeon Master assistant. Keep responses concise and immediately actionable. When asked about situations, offer 2–3 specific creative options. Short paragraphs or bullet points only.`;

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!getActiveKey()) {
      setError("No API key set — add your key in Settings.");
      return;
    }

    const userMsg = { role: "user", content: text };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const reply = await callAI(withUser, systemPrompt);
      const withReply = [...withUser, { role: "assistant", content: reply }];
      setMessages(withReply);
      localStorage.setItem(historyKeyRef.current, JSON.stringify(withReply.slice(-100)));
    } catch (err) {
      setError(err.message || "Failed to get a response. Check your API key in Settings.");
      localStorage.setItem(historyKeyRef.current, JSON.stringify(withUser.slice(-100)));
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, systemPrompt]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && !isTouch) {
      e.preventDefault();
      send();
    }
  }

  function clearHistory() {
    setMessages([]);
    setError("");
    localStorage.removeItem(historyKeyRef.current);
  }

  function closeAll() {
    setOpen(false);
    setExpanded(false);
  }

  const canSend = hasKey && !!input.trim() && !loading;

  const panelStyle = expanded
    ? {
        position: "fixed",
        inset: 0,
        zIndex: 160,
        background: "var(--bg-elev)",
        border: "none",
        borderRadius: 0,
        boxShadow: "none",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        overflow: "hidden"
      }
    : {
        position: "fixed",
        bottom: 80,
        right: 16,
        zIndex: 150,
        width: "min(420px, calc(100vw - 32px))",
        height: "min(520px, 60vh)",
        background: "var(--bg-elev)",
        border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
        borderRadius: "var(--radius)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        overflow: "hidden"
      };

  return (
    <>
      {/* Floating toggle button — hidden when expanded (header has close instead) */}
      {!expanded && (
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 150,
            padding: "10px 18px",
            borderRadius: 999,
            background: open
              ? "var(--bg-elev)"
              : "linear-gradient(90deg, var(--brand), var(--brand-2))",
            color: open ? "var(--text)" : "#0b0d12",
            border: open
              ? "1px solid color-mix(in oklab, var(--text) 20%, transparent)"
              : "none",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            minHeight: 44,
            transition: "background 0.2s ease"
          }}
          title={open ? "Close AI Assistant" : "Open AI Assistant"}
        >
          <span style={{ fontSize: 16 }}>✦</span>
          {open ? "Close" : "AI"}
          {messages.length > 0 && !open && (
            <span style={{
              background: "rgba(0,0,0,0.25)",
              borderRadius: 999,
              fontSize: 11,
              padding: "1px 7px",
              fontWeight: 700
            }}>
              {messages.length}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div style={panelStyle}>
          {/* Header */}
          <header style={{
            padding: "12px 16px",
            borderBottom: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            background: "var(--bg-elev)"
          }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>✦ DM Assistant</span>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{providerName}</span>

              {/* Expand / Minimize */}
              <button
                onClick={() => setExpanded(e => !e)}
                title={expanded ? "Minimize" : "Expand to full screen"}
                style={headerBtn}
              >
                {expanded ? "⊟" : "⛶"}
              </button>

              <button
                onClick={clearHistory}
                title="Clear conversation history"
                style={headerBtn}
              >
                Clear
              </button>

              {/* Close button — only visible when expanded since the floating button handles it otherwise */}
              {expanded && (
                <button
                  onClick={closeAll}
                  title="Close"
                  style={{ ...headerBtn, color: "crimson" }}
                >
                  ✕
                </button>
              )}
            </div>
          </header>

          {/* Messages */}
          <div style={{
            overflow: "auto",
            padding: expanded ? "16px max(16px, calc((100% - 800px) / 2))" : "12px",
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}>
            {messages.length === 0 && !loading && (
              <div style={{
                color: "var(--muted)",
                fontSize: 13,
                textAlign: "center",
                padding: "24px 12px",
                lineHeight: 1.7
              }}>
                {hasKey
                  ? <>Describe what's happening at the table and I'll give you ideas.<br /><em style={{ fontSize: 11 }}>e.g. "Players want to bribe the city guard"</em></>
                  : <>Add an API key in <strong>Settings → AI Assistant</strong> to get started.</>
                }
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: m.role === "user"
                    ? "var(--surface)"
                    : "color-mix(in oklab, var(--brand) 10%, var(--bg-elev))",
                  border: m.role === "user"
                    ? "1px solid color-mix(in oklab, var(--text) 10%, transparent)"
                    : "1px solid color-mix(in oklab, var(--brand) 22%, transparent)",
                  fontSize: expanded ? 14 : 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: expanded ? "72%" : "92%"
                }}
              >
                {m.content}
              </div>
            ))}

            {loading && (
              <div style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "color-mix(in oklab, var(--brand) 10%, var(--bg-elev))",
                border: "1px solid color-mix(in oklab, var(--brand) 22%, transparent)",
                fontSize: 13,
                color: "var(--muted)",
                alignSelf: "flex-start"
              }}>
                Thinking…
              </div>
            )}

            {error && (
              <div style={{ fontSize: 12, color: "crimson", padding: "4px 6px" }}>
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: expanded ? "12px max(16px, calc((100% - 800px) / 2))" : "10px 12px",
            borderTop: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            background: "var(--surface)"
          }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasKey ? "What's happening at the table?" : "Add API key in Settings first"}
              disabled={!hasKey || loading}
              rows={expanded ? 3 : 2}
              style={{
                flex: 1,
                resize: "none",
                padding: "8px 10px",
                background: "var(--bg-elev)",
                color: "var(--text)",
                border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
                lineHeight: 1.4
              }}
            />
            <button
              onClick={send}
              disabled={!canSend}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: canSend
                  ? "linear-gradient(90deg, var(--brand), var(--brand-2))"
                  : "var(--bg-elev)",
                color: canSend ? "#0b0d12" : "var(--muted)",
                border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
                cursor: canSend ? "pointer" : "not-allowed",
                fontWeight: 700,
                minHeight: 44,
                minWidth: 60,
                alignSelf: "flex-end",
                transition: "background 0.2s ease"
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const headerBtn = {
  background: "none",
  border: "none",
  color: "var(--muted)",
  cursor: "pointer",
  fontSize: 14,
  padding: "4px 8px",
  borderRadius: 6,
  minHeight: 32,
  minWidth: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center"
};
