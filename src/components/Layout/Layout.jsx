import React from "react";
import Header from "../Header/Header.jsx";
import styles from "./Layout.module.css";
import { useSettingsSync } from "../../hooks/useSettingsSync.js";

export default function Layout({ children }) {
  useSettingsSync();
  return (
    <div className={styles.shell}>
      <Header />
      <main id="main" className="container">
        {children}
      </main>
    </div>
  );
}
