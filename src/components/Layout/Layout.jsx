import React from "react";
import Header from "../Header/Header.jsx";
import styles from "./Layout.module.css";

export default function Layout({ children }) {
  return (
    <div className={styles.shell}>
      <Header />
      <main id="main" className="container">
        {children}
      </main>
    </div>
  );
}
