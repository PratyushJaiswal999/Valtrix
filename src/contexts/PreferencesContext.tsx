import React, { createContext, useContext, useEffect, useState } from 'react';

import { useAuth } from './AuthContext';

interface PreferencesContextType {
  captionsEnabled: boolean;
  setCaptionsEnabled: (enabled: boolean) => Promise<void>;
  loadingPreferences: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
};

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [captionsEnabled, setCaptionsEnabledState] = useState(true);
  const [loadingPreferences, setLoadingPreferences] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoadingPreferences(false);
      return;
    }
    
    // Read from localStorage
    const saved = localStorage.getItem(`prefs_${user.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.captionsEnabled === 'boolean') {
          setCaptionsEnabledState(parsed.captionsEnabled);
        }
      } catch (e) {}
    }
    setLoadingPreferences(false);
  }, [user]);

  const setCaptionsEnabled = async (enabled: boolean) => {
    setCaptionsEnabledState(enabled);
    if (user) {
      localStorage.setItem(`prefs_${user.id}`, JSON.stringify({ captionsEnabled: enabled }));
    }
  };

  return (
    <PreferencesContext.Provider value={{ captionsEnabled, setCaptionsEnabled, loadingPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
};
