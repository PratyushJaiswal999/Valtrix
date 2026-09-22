import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'candidate' | 'recruiter' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole;
  profileComplete: boolean;
  signUp: (email: string, password: string, displayName?: string, role?: 'candidate' | 'recruiter') => Promise<{ error: any }>;
  signIn: (email: string, password: string, roleOverride?: 'candidate' | 'recruiter') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  setOnboardingComplete: (userId: string, role: 'candidate' | 'recruiter') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// ─── localStorage helpers (keyed per user so multi-account works) ───────────
const roleKey = (uid: string) => `valtrix_role_${uid}`;
const onboardedKey = (uid: string) => `valtrix_onboarded_${uid}`;

const getStoredRole = (uid: string): UserRole => {
  try {
    const r = localStorage.getItem(roleKey(uid));
    return (r === 'candidate' || r === 'recruiter') ? r : null;
  } catch { return null; }
};

const getStoredOnboarded = (uid: string): boolean => {
  try { return localStorage.getItem(onboardedKey(uid)) === 'true'; }
  catch { return false; }
};

// ─── AuthProvider ────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [profileComplete, setProfileComplete] = useState(false);

  // Read role & onboarding state for a given user from localStorage +
  // fall back to user_metadata (set during signUp) if localStorage is empty.
  const loadUserState = (u: User) => {
    let role = getStoredRole(u.id);

    // If not in localStorage, check user_metadata (populated on signUp)
    if (!role) {
      const metaRole = u.user_metadata?.role;
      if (metaRole === 'candidate' || metaRole === 'recruiter') {
        role = metaRole;
        try { localStorage.setItem(roleKey(u.id), role); } catch { /* ignore */ }
      }
    }

    const onboarded = getStoredOnboarded(u.id);

    setUserRole(role);
    setProfileComplete(onboarded);
  };

  // Called by Onboarding after the user finishes (or skips) the onboarding form.
  const setOnboardingComplete = (userId: string, role: 'candidate' | 'recruiter') => {
    try {
      localStorage.setItem(roleKey(userId), role);
      localStorage.setItem(onboardedKey(userId), 'true');
    } catch { /* ignore */ }
    setUserRole(role);
    setProfileComplete(true);
  };

  // refreshProfile re-reads state from localStorage (e.g. after Onboarding saves).
  const refreshProfile = async () => {
    if (!user) return;
    loadUserState(user);
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadUserState(u);
      } else {
        setUserRole(null);
        setProfileComplete(false);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (
    email: string,
    password: string,
    displayName?: string,
    role: 'candidate' | 'recruiter' = 'candidate'
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName,
          full_name: displayName,
          role,
        },
      },
    });
    // Pre-seed role in localStorage so it's available immediately after
    // onAuthStateChange fires (user_metadata may not be populated yet).
    if (!error && data.user) {
      try { localStorage.setItem(roleKey(data.user.id), role); } catch { /* ignore */ }
    }
    return { error };
  };

  const signIn = async (email: string, password: string, roleOverride?: 'candidate' | 'recruiter') => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    // If the user explicitly selected a role on the auth page, honour it
    // — this prevents stale localStorage from a previous role assignment taking over.
    if (!error && data.user && roleOverride) {
      try { localStorage.setItem(roleKey(data.user.id), roleOverride); } catch { /* ignore */ }
    }
    return { error };
  };

  const signOut = async () => {
    // Keep role/onboarded keys in localStorage so returning users
    // skip onboarding on next login.
    setUserRole(null);
    setProfileComplete(false);
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, userRole, profileComplete,
      signUp, signIn, signOut, resetPassword, refreshProfile, setOnboardingComplete,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
