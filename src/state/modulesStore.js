// Store with Supabase persistence
import { supabase } from '../lib/supabase.js';

const LEGACY_KEY = "fizzrix.modules.v1";

// Read from Supabase
async function read() {
  try {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Convert database format to app format
    return (data || []).map(module => ({
      id: module.id,
      name: module.name,
      category: module.category,
      createdAt: module.created_at,
      updatedAt: module.updated_at,
      data: module.data
    }));
  } catch (error) {
    console.error('Error reading modules:', error);
    return [];
  }
}

// Legacy write function - no longer used
// Kept for backwards compatibility but not exported

// Create new module in Supabase
async function create(moduleData) {
  try {
    const { data, error } = await supabase
      .from('modules')
      .insert([{
        name: moduleData.name,
        category: moduleData.category,
        data: moduleData.data
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      category: data.category,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      data: data.data
    };
  } catch (error) {
    console.error('Error creating module:', error);
    throw error;
  }
}

// Update module in Supabase
async function update(id, moduleData) {
  try {
    const { data, error } = await supabase
      .from('modules')
      .update({
        name: moduleData.name,
        category: moduleData.category,
        data: moduleData.data
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      category: data.category,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      data: data.data
    };
  } catch (error) {
    console.error('Error updating module:', error);
    throw error;
  }
}

// Delete module from Supabase
async function remove(id) {
  try {
    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting module:', error);
    throw error;
  }
}

// Migration function to move localStorage data to Supabase
async function migrateFromLocalStorage() {
  try {
    const localData = localStorage.getItem(LEGACY_KEY);
    if (!localData) return { migrated: 0 };

    const modules = JSON.parse(localData);
    let migrated = 0;

    for (const module of modules) {
      try {
        await create({
          name: module.name,
          category: module.category || 'campaign',
          data: module.data || {}
        });
        migrated++;
      } catch (error) {
        console.error('Error migrating module:', module.name, error);
      }
    }

    // Backup localStorage data before clearing
    localStorage.setItem(LEGACY_KEY + '.backup', localData);
    localStorage.removeItem(LEGACY_KEY);

    return { migrated };
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Public API (now async)
export const ModulesStore = {
  async list() {
    return await read();
  },

  async get(id) {
    const modules = await read();
    return modules.find(m => m.id === id) || null;
  },

  async add({ name, category }) {
    const moduleData = {
      name: name.trim(),
      category, // 'one-shot' | 'campaign'
      // Initial editable structure
      data: {
        mapUrl: "",
        mapImage: { dataUrl: "", alt: "", showOnDashboard: false },
        introduction: "",
        introImage: { dataUrl: "", alt: "", showOnDashboard: false },
        overview: "",
        overviewImage: { dataUrl: "", alt: "", showOnDashboard: false },
        episodes: [],
        appendices: {
          monsters: [],
          magicItems: []
        }
      }
    };
    
    return await create(moduleData);
  },

  async rename(id, newName) {
    const module = await this.get(id);
    if (module) {
      module.name = newName.trim();
      return await update(id, module);
    }
  },

  async updateData(id, updater) {
    const module = await this.get(id);
    if (module) {
      module.data = updater(module.data);
      return await update(id, module);
    }
  },

  async remove(id) {
    return await remove(id);
  },

  // Migration utility
  async migrateFromLocalStorage() {
    return await migrateFromLocalStorage();
  }
};
