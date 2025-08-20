// Clean up old localStorage entries that might be causing quota issues
export function clearOldCache() {
  try {
    // Remove the old large cache entries
    localStorage.removeItem('fmm.cache.modules');
    localStorage.removeItem('fmm.cache.sessions');
    
    // Keep only the lightweight entries
    console.log('Cleared old cache entries to prevent quota issues');
  } catch (error) {
    console.warn('Could not clear old cache:', error);
  }
}