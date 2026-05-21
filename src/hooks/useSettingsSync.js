import { useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { getUserSettings } from "../lib/supabase.js";
import { SettingsStore, applySettings } from "../state/settingsStore.js";

export function useSettingsSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    getUserSettings().then(remote => {
      if (!remote) return;
      const merged = { ...SettingsStore.get(), ...remote };
      SettingsStore.setAll(merged);
      applySettings(merged);
    });
  }, [user?.id]);
}
