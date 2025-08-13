import React from "react";
import Layout from "../components/Layout/Layout.jsx";
import AppRoutes from "./routes.jsx";

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Layout>
        <AppRoutes />
      </Layout>
    </>
  );
}
