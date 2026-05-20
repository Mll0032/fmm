import React from "react";
import Layout from "../components/Layout/Layout.jsx";
import AppRoutes from "./routes.jsx";
import { DataProvider } from "../context/DataContext.jsx";
import { AuthProvider, useAuth } from "../context/AuthContext.jsx";
import Login from "../pages/Login.jsx";

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span style={{ color: 'var(--text)', opacity: 0.4, fontSize: '0.95rem' }}>Loading…</span>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <DataProvider>
      <a className="skip-link" href="#main">Skip to content</a>
      <Layout>
        <AppRoutes />
      </Layout>
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
