const KEY = "fizzrix.dashboard.v1";

/**
 * Dashboard items reference a module + a section within it.
 * type: 'map' | 'intro' | 'overview' | 'episode' | 'appendix:monsters' | 'appendix:magicItems'
 * For episodes, use sectionId = episode.id
 */
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export const DashboardStore = {
  list() {
    return read();
  },
  add(item) {
    const items = read();
    items.push({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
      ...item
    });
    write(items);
  },
  remove(id) {
    write(read().filter(i => i.id !== id));
  },
  move(id, dir) {
    const items = read();
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const next = idx + (dir === "up" ? -1 : 1);
    if (next < 0 || next >= items.length) return;
    const [it] = items.splice(idx, 1);
    items.splice(next, 0, it);
    write(items);
  },
  replaceAll(newList) {
    write(Array.isArray(newList) ? newList : []);
  },
  clear() {
    write([]);
  }
};
