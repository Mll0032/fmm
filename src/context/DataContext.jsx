import React, { useEffect, useReducer, useCallback, useMemo, useState } from 'react';
import { ModulesStore } from '../state/modulesStore';
import { SessionsStore } from '../state/sessionsStore';
import { DataContext } from './DataContextValue.js';
import { clearOldCache } from '../utils/clearOldCache.js';

const CACHE_KEYS = {
  ACTIVE_MODULE: 'fmm.cache.activeModule',
  ACTIVE_SESSION: 'fmm.cache.activeSession'
};


const initialState = {
  modules: [],
  sessions: {},
  activeModuleId: '',
  activeSessionId: '',
  loading: {
    modules: false,
    sessions: false
  }
};

function dataReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.key]: action.value
        }
      };

    case 'SET_MODULES':
      return {
        ...state,
        modules: action.modules
      };

    case 'SET_SESSIONS':
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [action.moduleId]: action.sessions
        }
      };

    case 'SET_ACTIVE_MODULE':
      return {
        ...state,
        activeModuleId: action.moduleId
      };

    case 'SET_ACTIVE_SESSION':
      return {
        ...state,
        activeSessionId: action.sessionId
      };

    case 'UPDATE_MODULE': {
      const updatedModules = state.modules.map(m => 
        m.id === action.module.id ? action.module : m
      );
      return {
        ...state,
        modules: updatedModules
      };
    }

    case 'ADD_MODULE': {
      const newModules = [...state.modules, action.module];
      return {
        ...state,
        modules: newModules
      };
    }

    case 'REMOVE_MODULE': {
      const filteredModules = state.modules.filter(m => m.id !== action.moduleId);
      const { [action.moduleId]: _removedSessions, ...remainingSessions } = state.sessions;
      return {
        ...state,
        modules: filteredModules,
        sessions: remainingSessions
      };
    }

    case 'UPDATE_SESSION': {
      const moduleId = action.session.moduleId;
      const updatedSessions = (state.sessions[moduleId] || []).map(s =>
        s.id === action.session.id ? action.session : s
      );
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [moduleId]: updatedSessions
        }
      };
    }

    case 'ADD_SESSION': {
      const addModuleId = action.session.moduleId;
      const addedSessions = [...(state.sessions[addModuleId] || []), action.session];
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [addModuleId]: addedSessions
        }
      };
    }

    case 'REMOVE_SESSION': {
      const removeModuleId = action.moduleId;
      const removedSessionList = (state.sessions[removeModuleId] || []).filter(s => s.id !== action.sessionId);
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [removeModuleId]: removedSessionList
        }
      };
    }

    case 'HYDRATE_FROM_CACHE':
      return {
        ...state,
        activeModuleId: action.activeModuleId || '',
        activeSessionId: action.activeSessionId || ''
      };

    default:
      return state;
  }
}


function loadFromCache() {
  try {
    const activeModuleId = localStorage.getItem(CACHE_KEYS.ACTIVE_MODULE) || '';
    const activeSessionId = localStorage.getItem(CACHE_KEYS.ACTIVE_SESSION) || '';
    
    return { activeModuleId, activeSessionId };
  } catch (error) {
    console.error('Error loading from cache:', error);
    return { activeModuleId: '', activeSessionId: '' };
  }
}

function saveToCache(activeModuleId, activeSessionId) {
  try {
    if (activeModuleId) {
      localStorage.setItem(CACHE_KEYS.ACTIVE_MODULE, activeModuleId);
    }
    if (activeSessionId) {
      localStorage.setItem(CACHE_KEYS.ACTIVE_SESSION, activeSessionId);
    }
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}


export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  // Load cached data on mount and clean up old cache
  useEffect(() => {
    clearOldCache(); // Clean up old large cache entries
    const cached = loadFromCache();
    dispatch({ type: 'HYDRATE_FROM_CACHE', ...cached });
  }, []);

  // Initialize active module when modules are loaded (only run once per modules change)
  const [modulesInitialized, setModulesInitialized] = useState(false);
  useEffect(() => {
    if (state.modules.length > 0 && !modulesInitialized) {
      setModulesInitialized(true);
      
      if (!state.activeModuleId) {
        // If we reach here, it means no active module was restored from cache
        // Default to first module alphabetically
        const sortedModules = [...state.modules].sort((a, b) => a.name.localeCompare(b.name));
        dispatch({ type: 'SET_ACTIVE_MODULE', moduleId: sortedModules[0]?.id || '' });
      } else {
        // Validate that the cached active module still exists
        const moduleExists = state.modules.some(m => m.id === state.activeModuleId);
        if (!moduleExists) {
          // If cached module no longer exists, fall back to first alphabetically
          const sortedModules = [...state.modules].sort((a, b) => a.name.localeCompare(b.name));
          dispatch({ type: 'SET_ACTIVE_MODULE', moduleId: sortedModules[0]?.id || '' });
        }
      }
    }
  }, [state.modules, state.activeModuleId, modulesInitialized]);

  // Save active selections to localStorage when they change
  useEffect(() => {
    saveToCache(state.activeModuleId, state.activeSessionId);
  }, [state.activeModuleId, state.activeSessionId]);

  // Load modules - always fresh from database, cache only selections
  const loadModules = useCallback(async (force = false) => {
    if (!force && state.modules.length > 0) {
      return state.modules;
    }

    dispatch({ type: 'SET_LOADING', key: 'modules', value: true });
    try {
      const modules = await ModulesStore.list();
      dispatch({ type: 'SET_MODULES', modules });
      return modules;
    } catch (error) {
      console.error('Error loading modules:', error);
      return [];
    } finally {
      dispatch({ type: 'SET_LOADING', key: 'modules', value: false });
    }
  }, [state.modules]);

  // Load sessions for a module - keep in memory only
  const loadSessions = useCallback(async (moduleId, force = false) => {
    if (!moduleId) return [];

    const cached = state.sessions[moduleId];
    if (!force && cached) {
      return cached;
    }

    dispatch({ type: 'SET_LOADING', key: 'sessions', value: true });
    try {
      const sessions = await SessionsStore.ensureDefaultForModule(moduleId);
      dispatch({ type: 'SET_SESSIONS', moduleId, sessions });
      return sessions;
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    } finally {
      dispatch({ type: 'SET_LOADING', key: 'sessions', value: false });
    }
  }, [state.sessions]);

  // Module operations with optimistic updates
  const addModule = useCallback(async (moduleData) => {
    try {
      const module = await ModulesStore.add(moduleData);
      dispatch({ type: 'ADD_MODULE', module });
      return module;
    } catch (error) {
      console.error('Error adding module:', error);
      throw error;
    }
  }, []);

  const updateModule = useCallback(async (id, updateFn) => {
    try {
      const module = await ModulesStore.updateData(id, updateFn);
      if (module) {
        dispatch({ type: 'UPDATE_MODULE', module });
      }
      return module;
    } catch (error) {
      console.error('Error updating module:', error);
      throw error;
    }
  }, []);

  const renameModule = useCallback(async (id, newName) => {
    try {
      const module = await ModulesStore.rename(id, newName);
      if (module) {
        dispatch({ type: 'UPDATE_MODULE', module });
      }
      return module;
    } catch (error) {
      console.error('Error renaming module:', error);
      throw error;
    }
  }, []);

  const removeModule = useCallback(async (moduleId) => {
    try {
      await ModulesStore.remove(moduleId);
      dispatch({ type: 'REMOVE_MODULE', moduleId });
    } catch (error) {
      console.error('Error removing module:', error);
      throw error;
    }
  }, []);

  // Session operations with optimistic updates
  const addSession = useCallback(async (moduleId, name) => {
    try {
      const session = await SessionsStore.create(moduleId, name);
      dispatch({ type: 'ADD_SESSION', session });
      return session;
    } catch (error) {
      console.error('Error adding session:', error);
      throw error;
    }
  }, []);

  const updateSession = useCallback(async (sessionId, updates) => {
    try {
      const session = await SessionsStore.get(sessionId);
      if (session) {
        const updatedSession = { ...session, ...updates };
        if (updates.name !== undefined) {
          await SessionsStore.rename(sessionId, updates.name);
        }
        if (updates.locked !== undefined) {
          await SessionsStore.setLocked(sessionId, updates.locked);
        }
        if (updates.items !== undefined) {
          await SessionsStore.setItems(sessionId, updates.items);
        }
        dispatch({ type: 'UPDATE_SESSION', session: updatedSession });
        return updatedSession;
      }
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }, []);

  const removeSession = useCallback(async (moduleId, sessionId) => {
    try {
      await SessionsStore.remove(sessionId);
      dispatch({ type: 'REMOVE_SESSION', moduleId, sessionId });
    } catch (error) {
      console.error('Error removing session:', error);
      throw error;
    }
  }, []);

  const duplicateSession = useCallback(async (sessionId) => {
    try {
      const session = await SessionsStore.duplicate(sessionId);
      if (session) {
        dispatch({ type: 'ADD_SESSION', session });
        return session;
      }
    } catch (error) {
      console.error('Error duplicating session:', error);
      throw error;
    }
  }, []);

  // Active selections
  const setActiveModule = useCallback((moduleId) => {
    dispatch({ type: 'SET_ACTIVE_MODULE', moduleId });
  }, []);

  const setActiveSession = useCallback((sessionId) => {
    dispatch({ type: 'SET_ACTIVE_SESSION', sessionId });
  }, []);

  // Computed values
  const activeModule = useMemo(() => {
    return state.modules.find(m => m.id === state.activeModuleId) || null;
  }, [state.modules, state.activeModuleId]);

  const activeSession = useMemo(() => {
    if (!state.activeModuleId || !state.activeSessionId) return null;
    const sessions = state.sessions[state.activeModuleId] || [];
    return sessions.find(s => s.id === state.activeSessionId) || null;
  }, [state.sessions, state.activeModuleId, state.activeSessionId]);

  const sessionsForActiveModule = useMemo(() => {
    return state.sessions[state.activeModuleId] || [];
  }, [state.sessions, state.activeModuleId]);

  const value = {
    // State
    modules: state.modules,
    sessions: state.sessions,
    activeModuleId: state.activeModuleId,
    activeSessionId: state.activeSessionId,
    loading: state.loading,
    
    // Computed
    activeModule,
    activeSession,
    sessionsForActiveModule,
    
    // Actions
    loadModules,
    loadSessions,
    addModule,
    updateModule,
    renameModule,
    removeModule,
    addSession,
    updateSession,
    removeSession,
    duplicateSession,
    setActiveModule,
    setActiveSession
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}