import React, { useState, useRef, useEffect, useCallback } from "react";
import { callAI, getActiveKey, getSelectedProvider, PROVIDERS } from "../../lib/ai.js";

const isTouch = window.matchMedia("(pointer: coarse)").matches;

export default function SessionAssistant({ activeModule, activeSession }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const hasKey = !!getActiveKey();
  const providerName = PROVIDERS[getSelectedProvider()]?.name || "AI";

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    setMessages([]);
    setError("");
  }, [activeModule?.id]);

  const systemPrompt = activeModule
    ? `You are a D&D Dungeon Master assistant helping a DM run a live session of "${activeModule.name}"${activeSession ? ` (${activeSession.name})` : ""}. Keep responses concise and immediately actionable — the DM is at the table right now. When asked about player situations or unexpected actions, offer 2–3 specific creative options the DM can use immediately. Use short paragraphs or quick bullet points. No lengthy preamble.`
    : `You are a D&D Dungeon Master assistant. Keep responses concise and immediately actionable. When asked about situations, offer 2–3 specific creative options. Short paragraphs or bullet points only.`;

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!getActiveKey()) {
      setError(`No API key set — add your key in Settings.`);
      return;
    }

    const userMsg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const reply = await callAI(nextMessages, systemPrompt);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err.message || "Failed to get a response. Check your API key in Settings.");
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

  const canSend = hasKey && !!input.trim() && !loading;

  return (
    <>
      {/* Floating toggle button */}
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
        title={open ? "Close DM Assistant" : "Open DM Assistant"}
      >
        <span style={{ fontSize: 16 }}>✦</span>
        {open ? "Close" : "DM Assistant"}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
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
          }}
        >
          {/* Header */}
          <header style={{
            padding: "12px 16px",
            borderBottom: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
              <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>✦ DM Assistant</span>
              {activeModule && (
                <span style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  background: "var(--surface)",
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  {activeModule.name}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{providerName}</span>
              <button
                onClick={() => { setMessages([]); setError(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 6
                }}
                title="Clear conversation"
              >
                Clear
              </button>
            </div>
          </header>

          {/* Messages */}
          <div style={{
            overflow: "auto",
            padding: "12px",
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
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "92%"
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
            padding: "10px 12px",
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
              rows={2}
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
