import Constants from 'expo-constants';
import { getSupabaseClient } from '@/template/core';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || (Constants.expoConfig?.extra as any)?.supabaseUrl || '';
const SUPABASE_ANON =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || (Constants.expoConfig?.extra as any)?.supabaseAnonKey || '';

export interface PendingVerification {
  id: string;
  full_name: string | null;
  professional_body: string | null;
  membership_number: string | null;
  insurance_provider: string | null;
  dbs_checked: boolean;
  verification_docs: string[];
  verification_submitted_at: string | null;
  doc_urls: string[];   // short-lived signed URLs, generated server-side
}

/**
 * Call the `admin-verify` Edge Function with the CALLER'S session JWT so the
 * function can confirm the caller is an admin (is_admin) before using the
 * service role to read/modify other therapists' verification state.
 */
async function callAdmin<T>(action: string, payload: Record<string, unknown> = {}): Promise<{ data: T | null; error: string | null }> {
  if (!SUPABASE_URL || !SUPABASE_ANON) return { data: null, error: 'Supabase is not configured.' };
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: null, error: 'Not authenticated.' };

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    });
    let json: any = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    if (!res.ok) return { data: null, error: json?.error || `Request failed (${res.status})` };
    return { data: (json?.data ?? null) as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export const listPendingVerifications = () => callAdmin<PendingVerification[]>('list');
export const approveVerification = (therapistId: string) => callAdmin<{ ok: true }>('approve', { therapistId });
export const rejectVerification = (therapistId: string) => callAdmin<{ ok: true }>('reject', { therapistId });
