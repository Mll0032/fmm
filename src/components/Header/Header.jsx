import React from "react";
import NavBar from "../NavBar/NavBar.jsx";
import styles from "./Header.module.css";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Header() {
  const { user, signOut } = useAuth();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';

  return (
    <header className={styles.header} role="banner">
      <div className="container">
        <div className={styles.bar}>
          <div className={styles.brand}>
            <span className={styles.sigil} aria-hidden>⚙︎</span>
            <h1 className={styles.title}>Fizzrix's Massive Modulatorium</h1>
          </div>
          <NavBar />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: '0.78rem',
              color: 'color-mix(in oklab, var(--text) 55%, transparent)',
              maxWidth: 140,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {displayName}
            </span>
            <button
              onClick={signOut}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius)',
                border: '1px solid color-mix(in oklab, var(--text) 15%, transparent)',
                background: 'transparent',
                color: 'color-mix(in oklab, var(--text) 65%, transparent)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
