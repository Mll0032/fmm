import React, { useEffect, useState } from "react";
import styles from "./Toast.module.css";

export default function Toast({ message = "Saved", show = false, duration = 1500, onHide }) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onHide?.();
    }, duration);
    return () => clearTimeout(t);
  }, [show, duration, onHide]);

  return (
    <div className={`${styles.toast} ${visible ? styles.show : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
