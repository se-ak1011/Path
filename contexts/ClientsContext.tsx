import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { withTimeout } from '@/utils/asyncTimeout';
import { deferUntilAfterFirstPaint, getDeferredSupabaseClient, type DeferredSupabaseClient } from '@/utils/deferredSupabase';

// A PSEUDONYMISED caseload record. `client_ref` is the pseudonym shown throughout
// the clinical UI; identifying contact details live separately in client_contacts
// (owner-only) and are never joined onto clinical content.
export interface Client {
  id: string;
  therapist_id: string;
  client_ref: string;         // e.g. "C-001" or initials — the pseudonym
  alias: string | null;       // optional friendly label the therapist chooses
  status: 'active' | 'paused' | 'ended';
  presenting_issue: string | null;
  risk_flag: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

// Identifying details — special-category, stored in a separate table.
export interface ClientContact {
  client_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  dob: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  gp_name: string | null;
  gp_practice: string | null;
}

interface ClientsContextType {
  clients: Client[];
  loading: boolean;
  activeClients: Client[];
  addClient: (data: Partial<Client>) => Promise<{ data: Client | null; error: string | null }>;
  updateClient: (id: string, data: Partial<Client>) => Promise<{ error: string | null }>;
  getContact: (clientId: string) => Promise<ClientContact | null>;
  saveContact: (clientId: string, data: Partial<ClientContact>) => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
}

export const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

const SYNC_TIMEOUT_MS = 8000;

export function ClientsProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [supabase, setSupabase] = useState<DeferredSupabaseClient | null>(null);

  useEffect(() => {
    if (!user) return;
    let canceled = false;
    const cancel = deferUntilAfterFirstPaint(() => {
      if (canceled) return;
      getDeferredSupabaseClient()
        .then((client) => { if (!canceled) setSupabase(client); })
        .catch((error) => console.warn('[ClientsContext] Supabase unavailable:', error));
    });
    return () => { canceled = true; cancel(); };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.from('clients').select('*').eq('therapist_id', user.id).order('created_at', { ascending: false }),
        SYNC_TIMEOUT_MS,
        '[ClientsContext] Timed out loading caseload'
      );
      if (!error && data) setClients(data as Client[]);
    } catch (error) {
      console.warn('[ClientsContext] Sync failed:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    if (!supabase) return;
    if (!user) { setClients([]); return; }
    refresh();
  }, [supabase, user?.id, refresh]);

  const addClient = async (data: Partial<Client>) => {
    if (!supabase || !user) return { data: null, error: 'Not authenticated' };
    const payload = {
      therapist_id: user.id,
      client_ref: data.client_ref,
      alias: data.alias ?? null,
      status: data.status ?? 'active',
      presenting_issue: data.presenting_issue ?? null,
      risk_flag: data.risk_flag ?? false,
      start_date: data.start_date ?? new Date().toISOString().slice(0, 10),
    };
    const { data: row, error } = await supabase.from('clients').insert(payload).select().single();
    if (error) return { data: null, error: error.message };
    setClients(prev => [row as Client, ...prev]);
    return { data: row as Client, error: null };
  };

  const updateClient = async (id: string, data: Partial<Client>) => {
    if (!supabase || !user) return { error: 'Not authenticated' };
    const { error } = await supabase.from('clients').update(data).eq('id', id).eq('therapist_id', user.id);
    if (error) return { error: error.message };
    setClients(prev => prev.map(c => (c.id === id ? { ...c, ...data } : c)));
    return { error: null };
  };

  const getContact = async (clientId: string): Promise<ClientContact | null> => {
    if (!supabase || !user) return null;
    const { data, error } = await supabase
      .from('client_contacts').select('*').eq('client_id', clientId).maybeSingle();
    if (error || !data) return null;
    return data as ClientContact;
  };

  const saveContact = async (clientId: string, data: Partial<ClientContact>) => {
    if (!supabase || !user) return { error: 'Not authenticated' };
    const payload = { client_id: clientId, therapist_id: user.id, ...data };
    const { error } = await supabase.from('client_contacts').upsert(payload, { onConflict: 'client_id' });
    if (error) return { error: error.message };
    return { error: null };
  };

  const activeClients = clients.filter(c => c.status === 'active');

  return (
    <ClientsContext.Provider value={{
      clients, loading, activeClients,
      addClient, updateClient, getContact, saveContact, refresh,
    }}>
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients() {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error('useClients must be used within ClientsProvider');
  return ctx;
}
