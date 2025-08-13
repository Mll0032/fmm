// Minimal store with localStorage persistence.
// Swap these functions for API calls later without touching UI code.

const KEY = "fizzrix.modules.v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(mods) {
  localStorage.setItem(KEY, JSON.stringify(mods));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Public API
export const ModulesStore = {
  list() {
    return read();
  },

  get(id) {
    return read().find(m => m.id === id) || null;
  },

  add({ name, category }) {
    const mods = read();
    const module = {
      id: uid(),
      name: name.trim(),
      category, // 'one-shot' | 'campaign'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Initial editable structure
      data: {
  mapUrl: "",
  mapImage: { dataUrl: "", alt: "", showOnDashboard: false },

  introduction: "",
  introImage: { dataUrl: "", alt: "", showOnDashboard: false },

  overview: "",
  overviewImage: { dataUrl: "", alt: "", showOnDashboard: false },

  episodes: [], // each: { id, title, content, image: { dataUrl, alt, showOnDashboard } }

  appendices: {
    monsters: "",
    monstersImage: { dataUrl: "", alt: "", showOnDashboard: false },
    magicItems: "",
    magicItemsImage: { dataUrl: "", alt: "", showOnDashboard: false }
  }
}
    };
    mods.push(module);
    write(mods);
    return module;
  },

  rename(id, newName) {
    const mods = read();
    const m = mods.find(x => x.id === id);
    if (m) {
      m.name = newName.trim();
      m.updatedAt = new Date().toISOString();
      write(mods);
    }
    return m;
  },

  updateData(id, updater) {
    const mods = read();
    const m = mods.find(x => x.id === id);
    if (m) {
      m.data = updater(m.data);
      m.updatedAt = new Date().toISOString();
      write(mods);
    }
    return m;
  },

  remove(id) {
    const mods = read().filter(m => m.id !== id);
    write(mods);
  },
  replaceAll(list) {
    if (!Array.isArray(list)) return;
    write(list);
  }

};
