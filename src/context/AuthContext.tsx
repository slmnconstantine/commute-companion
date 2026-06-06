import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string, fullName: string, role: 'driver' | 'commuter') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) setProfile(data as Profile);
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (identifier: string, password: string) => {
    let emailToUse = identifier;

    // If identifier doesn't look like an email, assume it's a username
    if (!identifier.includes('@')) {
      const { data, error } = await supabase.rpc('get_email_by_username', { p_username: identifier });
      if (error || !data) {
        return { error: new Error('Username not found.') };
      }
      emailToUse = data;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, username: string, fullName: string, role: 'driver' | 'commuter') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: fullName, username } },
    });
    
    if (error) return { error: error as Error | null };
    
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!session?.user) return { error: new Error('Not authenticated') };
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id);
      
      if (error) return { error: error as unknown as Error };
      
      // Update local profile state immediately
      setProfile((prev) => prev ? { ...prev, ...updates } : prev);
      
      return { error: null };
    } catch (e: any) {
      return { error: e as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, isLoading, signIn, signUp, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
