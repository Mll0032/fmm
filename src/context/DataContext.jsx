import React, { useEffect, useReducer, useCallback, useMemo } from 'react';
import { ModulesStore } from '../state/modulesStore';
import { SessionsStore } from '../state/sessionsStore';
import { DataContext } from './DataContextValue.js';

const CACHE_KEYS = {
  MODULES: 'fmm.cache.modules',
  SESSIONS: 'fmm.cache.sessions',
  ACTIVE_MODULE: 'fmm.cache.activeModule',
  ACTIVE_SESSION: 'fmm.cache.activeSession'
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const initialState = {
  modules: [],
  sessions: {},
  activeModuleId: '',
  activeSessionId: '',
  loading: {
    modules: false,
    sessions: false
  },
  cache: {
    modules: { data: [], timestamp: 0 },
    sessions: { data: {}, timestamp: 0 }
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
        modules: action.modules,
        cache: {
          ...state.cache,
          modules: {
            data: action.modules,
            timestamp: Date.now()
          }
        }
      };

    case 'SET_SESSIONS':
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [action.moduleId]: action.sessions
        },
        cache: {
          ...state.cache,
          sessions: {
            data: {
              ...state.cache.sessions.data,
              [action.moduleId]: action.sessions
            },
            timestamp: Date.now()
          }
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
        modules: updatedModules,
        cache: {
          ...state.cache,
          modules: {
            data: updatedModules,
            timestamp: Date.now()
          }
        }
      };
    }

    case 'ADD_MODULE': {
      const newModules = [...state.modules, action.module];
      return {
        ...state,
        modules: newModules,
        cache: {
          ...state.cache,
          modules: {
            data: newModules,
            timestamp: Date.now()
          }
        }
      };
    }

    case 'REMOVE_MODULE': {
      const filteredModules = state.modules.filter(m => m.id !== action.moduleId);
      const { [action.moduleId]: _removedSessions, ...remainingSessions } = state.sessions;
      return {
        ...state,
        modules: filteredModules,
        sessions: remainingSessions,
        cache: {
          ...state.cache,
          modules: {
            data: filteredModules,
            timestamp: Date.now()
          },
          sessions: {
            data: remainingSessions,
            timestamp: Date.now()
          }
        }
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
        },
        cache: {
          ...state.cache,
          sessions: {
            data: {
              ...state.cache.sessions.data,
              [moduleId]: updatedSessions
            },
            timestamp: Date.now()
          }
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
        },
        cache: {
          ...state.cache,
          sessions: {
            data: {
              ...state.cache.sessions.data,
              [addModuleId]: addedSessions
            },
            timestamp: Date.now()
          }
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
        },
        cache: {
          ...state.cache,
          sessions: {
            data: {
              ...state.cache.sessions.data,
              [removeModuleId]: removedSessionList
            },
            timestamp: Date.now()
          }
        }
      };
    }

    case 'HYDRATE_FROM_CACHE':
      return {
        ...state,
        modules: action.modules || [],
        sessions: action.sessions || {},
        activeModuleId: action.activeModuleId || '',
        activeSessionId: action.activeSessionId || '',
        cache: {
          modules: { data: action.modules || [], timestamp: Date.now() },
          sessions: { data: action.sessions || {}, timestamp: Date.now() }
        }
      };

    default:
      return state;
  }
}


function loadFromCache() {
  try {
    const modules = JSON.parse(localStorage.getItem(CACHE_KEYS.MODULES) || '[]');
    const sessions = JSON.parse(localStorage.getItem(CACHE_KEYS.SESSIONS) || '{}');
    const activeModuleId = localStorage.getItem(CACHE_KEYS.ACTIVE_MODULE) || '';
    const activeSessionId = localStorage.getItem(CACHE_KEYS.ACTIVE_SESSION) || '';
    
    return { modules, sessions, activeModuleId, activeSessionId };
  } catch (error) {
    console.error('Error loading from cache:', error);
    return { modules: [], sessions: {}, activeModuleId: '', activeSessionId: '' };
  }
}

function saveToCache(modules, sessions, activeModuleId, activeSessionId) {
  try {
    localStorage.setItem(CACHE_KEYS.MODULES, JSON.stringify(modules));
    localStorage.setItem(CACHE_KEYS.SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(CACHE_KEYS.ACTIVE_MODULE, activeModuleId);
    localStorage.setItem(CACHE_KEYS.ACTIVE_SESSION, activeSessionId);
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

function isCacheValid(timestamp) {
  return Date.now() - timestamp < CACHE_DURATION;
}

export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  // Load cached data on mount
  useEffect(() => {
    const cached = loadFromCache();
    dispatch({ type: 'HYDRATE_FROM_CACHE', ...cached });
  }, []);

  // Save to cache when state changes
  useEffect(() => {
    saveToCache(state.modules, state.sessions, state.activeModuleId, state.activeSessionId);
  }, [state.modules, state.sessions, state.activeModuleId, state.activeSessionId]);

  // Load modules with cache check
  const loadModules = useCallback(async (force = false) => {
    if (!force && state.modules.length > 0 && isCacheValid(state.cache.modules.timestamp)) {
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
  }, [state.modules, state.cache.modules.timestamp]);

  // Load sessions for a module with cache check
  const loadSessions = useCallback(async (moduleId, force = false) => {
    if (!moduleId) return [];

    const cached = state.sessions[moduleId];
    if (!force && cached && isCacheValid(state.cache.sessions.timestamp)) {
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
  }, [state.sessions, state.cache.sessions.timestamp]);

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