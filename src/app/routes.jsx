import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboards.jsx";
import Modules from "../pages/Modules.jsx";
import Library from "../pages/Library.jsx";
import Settings from "../pages/Settings.jsx";
import About from "../pages/About.jsx";
import ModuleEditor from "../pages/ModuleEditor.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/modules" element={<Modules />} />
      <Route path="/modules/:id" element={<ModuleEditor />} />
      <Route path="/library" element={<Library />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
}
