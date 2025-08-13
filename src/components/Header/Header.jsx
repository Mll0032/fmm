import React from "react";
import NavBar from "../NavBar/NavBar.jsx";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header} role="banner">
      <div className="container">
        <div className={styles.bar}>
          <div className={styles.brand}>
            <span className={styles.sigil} aria-hidden>⚙︎</span>
            <h1 className={styles.title}>Fizzrix’s Massive Modulatorium</h1>
          </div>
          <NavBar />
        </div>
      </div>
    </header>
  );
}
