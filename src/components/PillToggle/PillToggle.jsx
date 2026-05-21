import React from "react";
import styles from "./PillToggle.module.css";

export default function PillToggle({ label, offLabel, onLabel, checked, onChange }) {
  const displayLabel = offLabel && onLabel
    ? `${label ? label + ': ' : ''}${checked ? onLabel : offLabel}`
    : label;

  return (
    <label className={styles.wrap}>
      <span>{displayLabel}</span>
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
