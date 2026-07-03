import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { withTimeout } from '@/utils/asyncTimeout';
import { deferUntilAfterFirstPaint, getDeferredSupabaseClient, type DeferredSupabaseClient } from '@/utils/deferredSupabase';
import { DEFAULT_TAX_RATE } from '@/constants/config';
import type { Session } from '@supabase/supabase-js';

// PATH is single-role: every account is a self-employed therapist.
export type UserRole = 'therapist';
export type SubscriptionStatus = 'free_trial' | 'active' | 'past_due' | 'cancelled';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  account_type: UserRole;
  practice_name?: string;
  bio?: string;
  modalities?: string[];
  specialisms?: string[];
  delivery?: string[];            // ['in_person','online']
  session_fee?: number;
  offers_sliding_scale?: boolean;
  sliding_scale_min?: number;
  sliding_scale_max?: number;
  city?: string;
  postcode_area?: string;
  avatar_url?: string;
  logo_url?: string;
  tax_rate?: number;
  accepting_clients?: boolean;
  onboarding_complete?: boolean;
  // Subscription
  subscription_status?: SubscriptionStatus;
  trial_ends_at?: string | null;
  trial_started_at?: string | null;
  // Verification (professional-body trust badge)
  professional_body?: string;
  membership_number?: string;
  insurance_provider?: string;
  dbs_checked?: boolean;
  verification_status?: VerificationStatus;
  verification_docs?: string[];
  verification_submitted_at?: string | null;
  // Admin/moderation access (read-only; the row can only be created server-side)
  is_admin?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  operationLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
  completeOnboarding: (data: Partial<UserProfile>) => Promise<{ error: string | null }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_TABLE = 'therapist_profiles';
const AUTH_STARTUP_TIMEOUT_MS = 6000;
const PROFILE_SYNC_TIMEOUT_MS = 6000;

function profileFromSession(session: Session): UserProfile {
  const metadata = session.user.user_metadata ?? {};
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    full_name: metadata.full_name || session.user.email?.split('@')[0],
    account_type: 'therapist',
    modalities: [],
    specialisms: [],
    delivery: ['in_person'],
    tax_rate: DEFAULT_TAX_RATE,
    accepting_clients: true,
    onboarding_complete: false,
    subscription_status: 'free_trial',
    trial_ends_at: null,
    trial_started_at: null,
    verification_status: 'unverified',
    verification_docs: [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [supabase, setSupabase] = useState<DeferredSupabaseClient | null>(null);
  const [supabaseUnavailable, setSupabaseUnavailable] = useState(false);

  useEffect(() => {
    let canceled = false;

    const cancelDeferredStartup = deferUntilAfterFirstPaint(() => {
      if (canceled) return;

      getDeferredSupabaseClient()
        .then((client) => {
          if (!canceled) setSupabase(client);
        })
        .catch((error) => {
          console.warn('[AuthContext] Supabase client unavailable during background startup:', error);
          if (!canceled) {
            setSupabaseUnavailable(true);
            setLoading(false);
          }
        });
    });

    return () => {
      canceled = true;
      cancelDeferredStartup();
    };
  }, []);

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!supabase) return null;
    const { data, error } = await withTimeout(
      supabase.from(PROFILE_TABLE).select('*').eq('id', userId).single(),
      PROFILE_SYNC_TIMEOUT_MS,
      `[AuthContext] Timed out loading profile after ${PROFILE_SYNC_TIMEOUT_MS}ms`
    );
    if (error || !data) return null;

    // Admin flag — read-only; the row can only be created server-side (service role).
    const { data: adminRow } = await supabase
      .from('admins').select('user_id').eq('user_id', userId).maybeSingle();

    return {
      is_admin: !!adminRow,
      id: data.id,
      email: data.email,
      full_name: data.full_name || data.email?.split('@')[0],
      account_type: 'therapist',
      practice_name: data.practice_name,
      bio: data.bio,
      modalities: data.modalities || [],
      specialisms: data.specialisms || [],
      delivery: data.delivery || ['in_person'],
      session_fee: data.session_fee ?? undefined,
      offers_sliding_scale: data.offers_sliding_scale ?? false,
      sliding_scale_min: data.sliding_scale_min ?? undefined,
      sliding_scale_max: data.sliding_scale_max ?? undefined,
      city: data.city,
      postcode_area: data.postcode_area,
      avatar_url: data.avatar_url,
      logo_url: data.logo_url,
      tax_rate: data.tax_rate ?? DEFAULT_TAX_RATE,
      accepting_clients: data.accepting_clients ?? true,
      onboarding_complete: data.onboarding_complete ?? false,
      subscription_status: (data.subscription_status as SubscriptionStatus) ?? 'free_trial',
      trial_ends_at: data.trial_ends_at ?? null,
      trial_started_at: data.trial_started_at ?? null,
      professional_body: data.professional_body ?? undefined,
      membership_number: data.membership_number ?? undefined,
      insurance_provider: data.insurance_provider ?? undefined,
      dbs_checked: data.dbs_checked ?? false,
      verification_status: (data.verification_status as VerificationStatus) ?? 'unverified',
      verification_docs: data.verification_docs || [],
      verification_submitted_at: data.verification_submitted_at ?? null,
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    let canceled = false;

    // Hang guard: never leave the user stuck on the loading screen if startup
    // stalls — but DO NOT sign them out (that was the cold-start sign-out bug).
    const loadingGuard = setTimeout(() => { if (!canceled) setLoading(false); }, AUTH_STARTUP_TIMEOUT_MS);

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (canceled) return;

        setSession(session);
        if (session?.user) {
          const profile = await fetchProfile(session.user.id).catch((error) => {
            console.warn('[AuthContext] Failed to sync profile during startup:', error);
            return null;
          });
          if (canceled) return;
          setUser(profile ?? profileFromSession(session));
        }
      } catch (error) {
        console.warn('[AuthContext] Failed to initialize session:', error);
      } finally {
        if (!canceled) {
          clearTimeout(loadingGuard);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const profile = await fetchProfile(session.user.id).catch((error) => {
          console.warn('[AuthContext] Failed to sync profile after auth state change:', error);
          return null;
        });
        setUser(profile ?? profileFromSession(session));
      } else {
        setUser(null);
      }
    });

    return () => {
      canceled = true;
      clearTimeout(loadingGuard);
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  // Placeholder provider while Supabase startup is deferred / unavailable.
  if (!supabase) {
    const unavailable = async () => ({ error: supabaseUnavailable
      ? 'Supabase is not configured. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
      : 'Authentication is still starting. Please try again in a moment.' });

    return (
      <AuthContext.Provider value={{
        user: null,
        session: null,
        loading: !supabaseUnavailable,
        operationLoading: false,
        isAuthenticated: false,
        isOnboarded: false,
        login: unavailable,
        signup: unavailable,
        logout: async () => {},
        deleteAccount: unavailable,
        completeOnboarding: unavailable,
        updateProfile: unavailable,
        refreshProfile: async () => {},
      }}>
        {children}
      </AuthContext.Provider>
    );
  }

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    setOperationLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setOperationLoading(false);
    if (error) return { error: error.message };
    return { error: null };
  };

  const signup = async (email: string, password: string, name: string): Promise<{ error: string | null }> => {
    setOperationLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, account_type: 'therapist' } },
    });
    setOperationLoading(false);
    if (error) return { error: error.message };
    if (data.user) {
      setUser({
        id: data.user.id,
        email,
        full_name: name,
        account_type: 'therapist',
        onboarding_complete: false,
        subscription_status: 'free_trial',
        trial_ends_at: null,
        verification_status: 'unverified',
      });
      if (data.session) setSession(data.session);
    }
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const deleteAccount = async (): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };
    setOperationLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc('delete_own_account');
      if (rpcError) {
        setOperationLoading(false);
        return { error: rpcError.message };
      }
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setOperationLoading(false);
      return { error: null };
    } catch (err: any) {
      setOperationLoading(false);
      return { error: err?.message || 'Failed to delete account' };
    }
  };

  const completeOnboarding = async (data: Partial<UserProfile>): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };
    setOperationLoading(true);

    // id and email seed the row fully in case the handle_new_user trigger has
    // not yet run (e.g. first deploy). Onboarding always runs as the same user.
    const now = new Date();
    const upsertData: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      account_type: 'therapist',
      onboarding_complete: true,
      subscription_status: 'free_trial',
      trial_started_at: now.toISOString(),
      trial_ends_at: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };
    if (data.full_name) upsertData.full_name = data.full_name;
    if (data.practice_name) upsertData.practice_name = data.practice_name;
    if (data.city) upsertData.city = data.city;
    if (data.postcode_area) upsertData.postcode_area = data.postcode_area;
    if (data.bio) upsertData.bio = data.bio;
    if (data.modalities) upsertData.modalities = data.modalities;
    if (data.specialisms) upsertData.specialisms = data.specialisms;
    if (data.delivery) upsertData.delivery = data.delivery;
    if (data.session_fee !== undefined) upsertData.session_fee = data.session_fee;
    if (data.tax_rate !== undefined) upsertData.tax_rate = data.tax_rate;

    const { error } = await supabase.from(PROFILE_TABLE).upsert(upsertData);
    if (error) {
      setOperationLoading(false);
      return { error: error.message };
    }

    const fresh = await fetchProfile(user.id);
    if (fresh) setUser(fresh);
    setOperationLoading(false);
    return { error: null };
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };
    const updateData: Record<string, unknown> = {};
    const passthrough: (keyof UserProfile)[] = [
      'full_name', 'practice_name', 'city', 'postcode_area', 'bio', 'modalities',
      'specialisms', 'delivery', 'session_fee', 'offers_sliding_scale', 'sliding_scale_min',
      'sliding_scale_max', 'tax_rate', 'accepting_clients', 'avatar_url', 'logo_url',
      'professional_body', 'membership_number', 'insurance_provider', 'dbs_checked',
      'verification_status', 'verification_docs', 'verification_submitted_at',
    ];
    for (const key of passthrough) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    const { error } = await supabase.from(PROFILE_TABLE).update(updateData).eq('id', user.id);
    if (error) return { error: error.message };
    setUser(prev => prev ? { ...prev, ...data } : null);
    return { error: null };
  };

  const refreshProfile = async () => {
    if (!user) return;
    const fresh = await fetchProfile(user.id);
    if (fresh) setUser(fresh);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      operationLoading,
      isAuthenticated: !!user && !!session,
      isOnboarded: user?.onboarding_complete ?? false,
      login,
      signup,
      logout,
      deleteAccount,
      completeOnboarding,
      updateProfile,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Subscription helpers ───────────────────────────────────
export function isTrialActive(user: UserProfile | null): boolean {
  if (!user) return false;
  if (user.subscription_status === 'active') return false;
  if (!user.trial_ends_at) return true; // no end date = still in grace
  return new Date(user.trial_ends_at) > new Date();
}

export function getTrialDaysLeft(user: UserProfile | null): number {
  if (!user?.trial_ends_at) return 14;
  const diff = Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function isSubscriptionActive(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.subscription_status === 'active' || isTrialActive(user);
}
