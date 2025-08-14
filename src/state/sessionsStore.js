// src/state/sessionsStore.js
import { DashboardStore } from "./dashboardStore";

const KEY = "fizzrix.sessions.v1";
const CHANGE_EVENT = "fizzrix:sessions:changed";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function emit() {
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {}
}
function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  emit();
}
function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function migrateIfNeeded() {
  const sessions = read();
  if (sessions.length > 0) return sessions;

  // Migrate legacy dashboard items (pre-sessions)
  const legacy = (typeof DashboardStore?.list === "function") ? DashboardStore.list() : [];
  if (!legacy || legacy.length === 0) return sessions;

  const byModule = legacy.reduce((acc, it) => {
    if (!acc[it.moduleId]) acc[it.moduleId] = [];
    acc[it.moduleId].push({ ...it, size: it.size || 1 });
    return acc;
  }, {});

  const migrated = Object.entries(byModule).map(([moduleId, items]) => ({
    id: uid(),
    moduleId,
    name: "Session 1",
    locked: false,
    items
  }));

  write(migrated);
  if (typeof DashboardStore?.clear === "function") {
    DashboardStore.clear();
  }
  return migrated;
}

export const SessionsStore = {
  KEY,
  CHANGE_EVENT,
  list() {
    return migrateIfNeeded();
  },
  listByModule(moduleId) {
    return migrateIfNeeded().filter(s => s.moduleId === moduleId);
  },
  get(sessionId) {
    return migrateIfNeeded().find(s => s.id === sessionId) || null;
  },
  create(moduleId, name = "Session 1") {
    const sessions = migrateIfNeeded();
    const s = { id: uid(), moduleId, name, locked: false, items: [] };
    write([...sessions, s]);
    return s;
  },
  rename(sessionId, name) {
    const sessions = migrateIfNeeded().map(s => s.id === sessionId ? { ...s, name } : s);
    write(sessions);
  },
  duplicate(sessionId) {
    const sessions = migrateIfNeeded();
    const src = sessions.find(s => s.id === sessionId);
    if (!src) return null;
    const dup = {
      ...src,
      id: uid(),
      name: `${src.name} (copy)`,
      items: (src.items || []).map(it => ({ ...it }))
    };
    write([...sessions, dup]);
    return dup;
  },
  remove(sessionId) {
    const sessions = migrateIfNeeded().filter(s => s.id !== sessionId);
    write(sessions);
  },
  setItems(sessionId, items) {
    const sessions = migrateIfNeeded().map(s => s.id === sessionId ? { ...s, items } : s);
    write(sessions);
  },
  setLocked(sessionId, locked) {
    const sessions = migrateIfNeeded().map(s => s.id === sessionId ? { ...s, locked: !!locked } : s);
    write(sessions);
  },
  ensureDefaultForModule(moduleId) {
    const sessions = migrateIfNeeded();
    const exists = sessions.some(s => s.moduleId === moduleId);
    if (exists) return this.listByModule(moduleId);
    const created = this.create(moduleId, "Session 1");
    return [created];
  },
  removeByModule(moduleId) {
  const sessions = this.list().filter(s => s.moduleId !== moduleId);
  localStorage.setItem(KEY, JSON.stringify(sessions));
  // emit change if you implemented CHANGE_EVENT earlier
  try { window.dispatchEvent(new Event("fizzrix:sessions:changed")); } catch {}
},
};
