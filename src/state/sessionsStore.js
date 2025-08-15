// src/state/sessionsStore.js - Supabase version
import { supabase } from '../lib/supabase.js';
import { DashboardStore } from "./dashboardStore.js";

const LEGACY_KEY = "fizzrix.sessions.v1";
const CHANGE_EVENT = "fizzrix:sessions:changed";

function emit() {
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Silently handle errors in event dispatch
  }
}

// Convert database format to app format
function convertDbToAppFormat(session) {
  return {
    id: session.id,
    moduleId: session.module_id,
    name: session.name,
    locked: session.locked,
    items: session.items || [],
    createdAt: session.created_at,
    updatedAt: session.updated_at
  };
}

// Convert app format to database format
function convertAppToDbFormat(session) {
  return {
    module_id: session.moduleId,
    name: session.name,
    locked: session.locked,
    items: session.items || []
  };
}

// Read all sessions from Supabase
async function read() {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(convertDbToAppFormat);
  } catch (error) {
    console.error('Error reading sessions:', error);
    return [];
  }
}

// Create new session in Supabase
async function create(sessionData) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([convertAppToDbFormat(sessionData)])
      .select()
      .single();

    if (error) throw error;

    const newSession = convertDbToAppFormat(data);
    emit();
    return newSession;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

// Update session in Supabase
async function update(id, sessionData) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .update(convertAppToDbFormat(sessionData))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const updatedSession = convertDbToAppFormat(data);
    emit();
    return updatedSession;
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
}

// Delete session from Supabase
async function remove(id) {
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    emit();
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

// Migration function to move localStorage data to Supabase
async function migrateFromLocalStorage() {
  try {
    const localData = localStorage.getItem(LEGACY_KEY);
    if (!localData) return { migrated: 0 };

    const sessions = JSON.parse(localData);
    let migrated = 0;

    for (const session of sessions) {
      try {
        await create({
          moduleId: session.moduleId,
          name: session.name || 'Session 1',
          locked: session.locked || false,
          items: session.items || []
        });
        migrated++;
      } catch (error) {
        console.error('Error migrating session:', session.name, error);
      }
    }

    // Backup localStorage data before clearing
    localStorage.setItem(LEGACY_KEY + '.backup', localData);
    localStorage.removeItem(LEGACY_KEY);

    return { migrated };
  } catch (error) {
    console.error('Error during session migration:', error);
    throw error;
  }
}

// Legacy dashboard migration (kept for compatibility)
async function migrateLegacyDashboard() {
  try {
    // Check if we already have sessions
    const existingSessions = await read();
    if (existingSessions.length > 0) return existingSessions;

    // Check for legacy dashboard data
    const legacy = (typeof DashboardStore?.list === "function") ? DashboardStore.list() : [];
    if (!legacy || legacy.length === 0) return existingSessions;

    const byModule = legacy.reduce((acc, it) => {
      if (!acc[it.moduleId]) acc[it.moduleId] = [];
      acc[it.moduleId].push({ ...it, size: it.size || 1 });
      return acc;
    }, {});

    const migrated = [];
    for (const [moduleId, items] of Object.entries(byModule)) {
      try {
        const session = await create({
          moduleId,
          name: "Session 1",
          locked: false,
          items
        });
        migrated.push(session);
      } catch (error) {
        console.error('Error migrating legacy dashboard for module:', moduleId, error);
      }
    }

    // Clear legacy dashboard data
    if (typeof DashboardStore?.clear === "function") {
      DashboardStore.clear();
    }
    
    return migrated;
  } catch (error) {
    console.error('Error during legacy dashboard migration:', error);
    return [];
  }
}

// Public API (now async)
export const SessionsStore = {
  KEY: LEGACY_KEY,
  CHANGE_EVENT,

  async list() {
    return await read();
  },

  async listByModule(moduleId) {
    const sessions = await read();
    return sessions.filter(s => s.moduleId === moduleId);
  },

  async get(sessionId) {
    if (!sessionId) return null;
    const sessions = await read();
    return sessions.find(s => s.id === sessionId) || null;
  },

  async create(moduleId, name = "Session 1") {
    const sessionData = {
      moduleId,
      name,
      locked: false,
      items: []
    };
    
    return await create(sessionData);
  },

  async rename(sessionId, name) {
    const session = await this.get(sessionId);
    if (session) {
      session.name = name;
      return await update(sessionId, session);
    }
  },

  async duplicate(sessionId) {
    const session = await this.get(sessionId);
    if (!session) return null;
    
    return await create({
      moduleId: session.moduleId,
      name: `${session.name} (copy)`,
      locked: false,
      items: (session.items || []).map(it => ({ ...it }))
    });
  },

  async remove(sessionId) {
    return await remove(sessionId);
  },

  async setItems(sessionId, items) {
    const session = await this.get(sessionId);
    if (session) {
      session.items = items;
      return await update(sessionId, session);
    }
  },

  async setLocked(sessionId, locked) {
    const session = await this.get(sessionId);
    if (session) {
      session.locked = !!locked;
      return await update(sessionId, session);
    }
  },

  async ensureDefaultForModule(moduleId) {
    const sessions = await this.listByModule(moduleId);
    if (sessions.length > 0) return sessions;
    
    const created = await this.create(moduleId, "Session 1");
    return [created];
  },

  async removeByModule(moduleId) {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('module_id', moduleId);

      if (error) throw error;

      emit();
      return true;
    } catch (error) {
      console.error('Error removing sessions by module:', error);
      throw error;
    }
  },

  // Migration utilities
  async migrateFromLocalStorage() {
    return await migrateFromLocalStorage();
  },

  async migrateLegacyDashboard() {
    return await migrateLegacyDashboard();
  }
};