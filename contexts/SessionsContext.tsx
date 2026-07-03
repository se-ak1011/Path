import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { withTimeout } from '@/utils/asyncTimeout';
import { deferUntilAfterFirstPaint, getDeferredSupabaseClient, type DeferredSupabaseClient } from '@/utils/deferredSupabase';

export type SessionType = 'assessment' | 'session' | 'review';
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'dna';

export interface TherapySession {
  id: string;
  therapist_id: string;
  client_id: string;
  scheduled_at: string;       // ISO timestamp
  duration_min: number;
  session_type: SessionType;
  delivery: 'in_person' | 'online';
  fee: number;
  status: SessionStatus;
  location: string | null;    // room / video link label — logistics, not clinical
  created_at: string;
}

interface SessionsContextType {
  sessions: TherapySession[];
  loading: boolean;
  todaysSessions: TherapySession[];
  upcomingSessions: TherapySession[];
  sessionsForClient: (clientId: string) => TherapySession[];
  addSession: (data: Partial<TherapySession>) => Promise<{ data: TherapySession | null; error: string | null }>;
  updateSession: (id: string, data: Partial<TherapySession>) => Promise<{ error: string | null }>;
  setStatus: (id: string, status: SessionStatus) => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
}

export const SessionsContext = createContext<SessionsContextType | undefined>(undefined);

const SYNC_TIMEOUT_MS = 8000;

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function SessionsProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;

  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [supabase, setSupabase] = useState<DeferredSupabaseClient | null>(null);

  useEffect(() => {
    if (!user) return;
    let canceled = false;
    const cancel = deferUntilAfterFirstPaint(() => {
      if (canceled) return;
      getDeferredSupabaseClient()
        .then((client) => { if (!canceled) setSupabase(client); })
        .catch((error) => console.warn('[SessionsContext] Supabase unavailable:', error));
    });
    return () => { canceled = true; cancel(); };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.from('sessions').select('*').eq('therapist_id', user.id).order('scheduled_at', { ascending: true }),
        SYNC_TIMEOUT_MS,
        '[SessionsContext] Timed out loading sessions'
      );
      if (!error && data) setSessions(data as TherapySession[]);
    } catch (error) {
      console.warn('[SessionsContext] Sync failed:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    if (!supabase) return;
    if (!user) { setSessions([]); return; }
    refresh();
  }, [supabase, user?.id, refresh]);

  const addSession = async (data: Partial<TherapySession>) => {
    if (!supabase || !user) return { data: null, error: 'Not authenticated' };
    const payload = {
      therapist_id: user.id,
      client_id: data.client_id,
      scheduled_at: data.scheduled_at,
      duration_min: data.duration_min ?? 50,
      session_type: data.session_type ?? 'session',
      delivery: data.delivery ?? 'in_person',
      fee: data.fee ?? 0,
      status: data.status ?? 'scheduled',
      location: data.location ?? null,
    };
    const { data: row, error } = await supabase.from('sessions').insert(payload).select().single();
    if (error) return { data: null, error: error.message };
    setSessions(prev => [...prev, row as TherapySession].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
    return { data: row as TherapySession, error: null };
  };

  const updateSession = async (id: string, data: Partial<TherapySession>) => {
    if (!supabase || !user) return { error: 'Not authenticated' };
    const { error } = await supabase.from('sessions').update(data).eq('id', id).eq('therapist_id', user.id);
    if (error) return { error: error.message };
    setSessions(prev => prev.map(s => (s.id === id ? { ...s, ...data } : s)));
    return { error: null };
  };

  const setStatus = (id: string, status: SessionStatus) => updateSession(id, { status });

  const now = new Date();
  const todaysSessions = sessions.filter(s => isSameDay(new Date(s.scheduled_at), now));
  const upcomingSessions = sessions.filter(s => new Date(s.scheduled_at) >= now && s.status === 'scheduled');
  const sessionsForClient = (clientId: string) =>
    sessions.filter(s => s.client_id === clientId).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));

  return (
    <SessionsContext.Provider value={{
      sessions, loading, todaysSessions, upcomingSessions, sessionsForClient,
      addSession, updateSession, setStatus, refresh,
    }}>
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessions() {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error('useSessions must be used within SessionsProvider');
  return ctx;
}
