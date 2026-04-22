import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

export interface Bee {
  id: string;
  handle: string;
  email: string;
  blingRank?: number; // 0-32 (33 levels)
  honeycombRing?: number; // 0-8 (9 levels)
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  bee: Bee | null;
  loading: boolean;
  configured: boolean;
  signUpWithPassword: (
    email: string,
    password: string,
    handle: string,
  ) => Promise<{ error: Error | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [bee, setBee] = useState<Bee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadBeeProfile(data.session.user);
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) loadBeeProfile(newSession.user);
      else {
        setBee(null);
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const loadBeeProfile = async (u: User) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('bees')
      .select('id, handle, email, bling_rank, honeycomb_ring, created_at')
      .eq('id', u.id)
      .maybeSingle();

    if (data) {
      setBee({
        id: data.id,
        handle: data.handle,
        email: data.email,
        blingRank: data.bling_rank ?? 0,
        honeycombRing: data.honeycomb_ring ?? 0,
        createdAt: data.created_at,
      });
    }
    setLoading(false);
  };

  const signUpWithPassword: AuthContextValue['signUpWithPassword'] = async (
    email,
    password,
    handle,
  ) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { handle },
      },
    });
    if (error) return { error };
    if (data.user) {
      // Create Bee profile
      const { error: beeError } = await supabase.from('bees').insert({
        id: data.user.id,
        handle,
        email,
      });
      if (beeError && !beeError.message.includes('duplicate')) {
        return { error: beeError };
      }
    }
    return { error: null };
  };

  const signInWithPassword: AuthContextValue['signInWithPassword'] = async (
    email,
    password,
  ) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithMagicLink: AuthContextValue['signInWithMagicLink'] = async (email) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    return { error };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        bee,
        loading,
        configured: isSupabaseConfigured(),
        signUpWithPassword,
        signInWithPassword,
        signInWithMagicLink,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
