import React from "react";
import styles from "./PillToggle.module.css";

export default function PillToggle({ label, checked, onChange }) {
  return (
    <label className={styles.wrap}>
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`${styles.pill} ${checked ? styles.on : styles.off}`}
      >
        <span className={styles.thumb} />
      </button>
    </label>
  );
}
