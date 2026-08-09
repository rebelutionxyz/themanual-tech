import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { isPwnedPassword, PWNED_PASSWORD_MESSAGE } from './security/pwnedPassword';

export interface Bee {
  id: string;
  handle: string;
  email: string;
  blingRank?: number; // 0-32 (33 levels)
  honeycombRing?: number; // 0-8 (9 levels)
  createdAt: string;
}

/**
 * FRONT32: the one message every failed sign-in shows. Wrong username, wrong
 * email, unknown account and wrong password are indistinguishable here on
 * purpose -- the DB39 endpoint already returns byte-identical 401s for all four,
 * and re-deriving a more specific message client-side would hand back the
 * enumeration oracle the endpoint was built to close.
 */
const SIGN_IN_ERROR = 'Invalid username, email, or password.';

/** Shape of a 200 from the auth-login edge function. No email field, by design. */
interface AuthLoginSession {
  access_token?: string;
  refresh_token?: string;
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
  /**
   * FRONT32: `identifier` is a USERNAME or an email -- the caller does not
   * decide which, and neither does this client. The auth-login edge function
   * resolves a username to an address server-side with the service role; the
   * address never reaches the browser.
   */
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

/**
 * Reads the JSON body off a non-2xx functions.invoke error, the same way
 * atlasoracle/client.ts does: supabase-js hands back a FunctionsHttpError with
 * the raw Response on `.context`, and without unwrapping it every failure
 * collapses into "Edge Function returned a non-2xx status code".
 *
 * Only 429 is allowed to say something specific. That is a rate-limit state,
 * not a credential verdict -- auth-login counts an attempt whether or not the
 * identifier resolves, so surfacing it tells an attacker nothing about whether
 * the account exists, and hiding it would leave a locked-out member staring at
 * "wrong password" while retrying correct credentials.
 */
async function signInErrorMessage(err: unknown): Promise<string> {
  const ctx = (err as { context?: unknown } | null)?.context;
  const res = ctx instanceof Response ? ctx : null;
  if (!res || res.status !== 429) return SIGN_IN_ERROR;

  let retry: unknown;
  try {
    retry = ((await res.clone().json()) as Record<string, unknown>).retry_after_seconds;
  } catch {
    // Non-JSON body -- fall through to the un-timed wording.
  }
  return typeof retry === 'number' && retry > 0
    ? `Too many sign-in attempts. Try again in ${retry} seconds.`
    : 'Too many sign-in attempts. Try again shortly.';
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

    // FRONT25: leaked-password gate. Runs BEFORE the password reaches Supabase,
    // and fails open, so a breach-list outage never blocks a signup.
    const { pwned } = await isPwnedPassword(password);
    if (pwned) return { error: new Error(PWNED_PASSWORD_MESSAGE) };

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

  const signIn: AuthContextValue['signIn'] = async (identifier, password) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const sb = supabase;

    // DB39's auth-login, NOT supabase.auth.signInWithPassword. The direct call
    // can only take an email, which is exactly the half of the handle system
    // that was missing.
    const { data, error } = await sb.functions.invoke<AuthLoginSession>('auth-login', {
      body: { identifier, password },
    });

    if (error) return { error: new Error(await signInErrorMessage(error)) };
    if (!data?.access_token || !data?.refresh_token) return { error: new Error(SIGN_IN_ERROR) };

    // The endpoint authenticates; it does not persist. setSession is what hands
    // the tokens to the browser client, writes them to storage, and fires
    // onAuthStateChange -> loadBeeProfile.
    const { error: sessionError } = await sb.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (sessionError) return { error: new Error(SIGN_IN_ERROR) };

    return { error: null };
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
        signIn,
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
