import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import styles from "./NavBar.module.css";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/modules", label: "Modules" },
  { to: "/library", label: "Library" },
  { to: "/settings", label: "Settings" },
  { to: "/about", label: "About" },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className={styles.nav} aria-label="Primary">
      <button
        className={styles.burger}
        aria-expanded={open}
        aria-controls="primary-nav"
        onClick={() => setOpen(v => !v)}
      >
        <span className={styles.burgerBar} />
        <span className="visually-hidden">{open ? "Close menu" : "Open menu"}</span>
      </button>

      <ul id="primary-nav" className={`${styles.list} ${open ? styles.open : ""}`}>
        {links.map(l => (
          <li key={l.to}>
            <NavLink
              to={l.to}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
              onClick={() => setOpen(false)}
              end={l.to === "/"}
            >
              {l.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
