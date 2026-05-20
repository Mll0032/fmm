import React, { useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function switchMode(next) {
    setMode(next);
    setError('');
    setMessage('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (password !== confirm) {
          setError('Passwords do not match.');
          return;
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your email for a confirmation link to complete sign up.');
        setEmail('');
        setPassword('');
        setConfirm('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // AuthContext picks up the session change automatically
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider) {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  }

  return (
    <div style={s.bg}>
      <div style={s.card}>
        <div style={s.brand}>
          <span style={s.sigil} aria-hidden>⚙︎</span>
          <div>
            <h1 style={s.title}>Fizzrix's Massive Modulatorium</h1>
            <p style={s.subtitle}>Your TTRPG module command center</p>
          </div>
        </div>

        <div style={s.tabs}>
          <button style={{ ...s.tab, ...(mode === 'signin' ? s.tabActive : {}) }} onClick={() => switchMode('signin')}>
            Sign In
          </button>
          <button style={{ ...s.tab, ...(mode === 'signup' ? s.tabActive : {}) }} onClick={() => switchMode('signup')}>
            Create Account
          </button>
        </div>

        {error && <p style={s.error}>{error}</p>}
        {message && <p style={s.success}>{message}</p>}

        {!message && (
          <form onSubmit={handleSubmit} style={s.form}>
            <label style={s.label}>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={s.input}
                autoComplete="email"
                placeholder="your@email.com"
              />
            </label>
            <label style={s.label}>
              Password
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={s.input}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder="••••••••"
              />
            </label>
            {mode === 'signup' && (
              <label style={s.label}>
                Confirm Password
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={s.input}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </label>
            )}
            <button type="submit" style={{ ...s.btn, ...s.primaryBtn }} disabled={loading}>
              {loading ? 'Please wait…' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        )}

        <div style={s.divider}>
          <span style={s.dividerLine} />
          <span style={s.dividerText}>or continue with</span>
          <span style={s.dividerLine} />
        </div>

        <div style={s.oauthRow}>
          <button style={{ ...s.btn, ...s.googleBtn }} onClick={() => handleOAuth('google')}>
            <GoogleIcon />
            Google
          </button>
          <button style={{ ...s.btn, ...s.discordBtn }} onClick={() => handleOAuth('discord')}>
            <DiscordIcon />
            Discord
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.057a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  );
}

const s = {
  bg: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: '20px',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid color-mix(in oklab, var(--text) 12%, transparent)',
    borderRadius: 'var(--radius)',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 8px 40px color-mix(in oklab, var(--text) 10%, transparent)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  sigil: {
    fontSize: 36,
    color: 'var(--accent)',
    lineHeight: 1,
    flexShrink: 0,
  },
  title: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
    lineHeight: 1.3,
  },
  subtitle: {
    fontSize: '0.78rem',
    color: 'color-mix(in oklab, var(--text) 50%, transparent)',
    margin: '3px 0 0',
  },
  tabs: {
    display: 'flex',
    borderRadius: 'var(--radius)',
    background: 'color-mix(in oklab, var(--text) 7%, transparent)',
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  tab: {
    flex: 1,
    padding: '8px 0',
    border: 'none',
    borderRadius: 'calc(var(--radius) - 2px)',
    background: 'transparent',
    color: 'color-mix(in oklab, var(--text) 55%, transparent)',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '0.88rem',
  },
  tabActive: {
    background: 'var(--surface)',
    color: 'var(--text)',
    boxShadow: '0 1px 4px color-mix(in oklab, var(--text) 12%, transparent)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'color-mix(in oklab, var(--text) 75%, transparent)',
    letterSpacing: '0.02em',
  },
  input: {
    padding: '9px 12px',
    borderRadius: 'var(--radius)',
    border: '1px solid color-mix(in oklab, var(--text) 15%, transparent)',
    background: 'color-mix(in oklab, var(--text) 4%, transparent)',
    color: 'var(--text)',
    fontSize: '0.95rem',
    outline: 'none',
    fontFamily: 'inherit',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  primaryBtn: {
    marginTop: 4,
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    width: '100%',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '24px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'color-mix(in oklab, var(--text) 12%, transparent)',
    display: 'block',
  },
  dividerText: {
    fontSize: '0.78rem',
    color: 'color-mix(in oklab, var(--text) 45%, transparent)',
    whiteSpace: 'nowrap',
  },
  oauthRow: {
    display: 'flex',
    gap: 10,
  },
  googleBtn: {
    flex: 1,
    border: '1px solid color-mix(in oklab, var(--text) 15%, transparent)',
    background: 'color-mix(in oklab, var(--text) 3%, transparent)',
    color: 'var(--text)',
  },
  discordBtn: {
    flex: 1,
    border: 'none',
    background: '#5865F2',
    color: '#fff',
  },
  error: {
    color: '#d63',
    fontSize: '0.83rem',
    background: 'color-mix(in oklab, #d63 10%, transparent)',
    border: '1px solid color-mix(in oklab, #d63 25%, transparent)',
    borderRadius: 'var(--radius)',
    padding: '8px 12px',
    margin: '0 0 8px',
  },
  success: {
    color: '#0a7',
    fontSize: '0.83rem',
    background: 'color-mix(in oklab, #0a7 10%, transparent)',
    border: '1px solid color-mix(in oklab, #0a7 25%, transparent)',
    borderRadius: 'var(--radius)',
    padding: '8px 12px',
    margin: '0 0 8px',
  },
};
