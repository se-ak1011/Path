import Constants from 'expo-constants';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || (Constants.expoConfig?.extra as any)?.supabaseUrl || '';
const SUPABASE_ANON =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || (Constants.expoConfig?.extra as any)?.supabaseAnonKey || '';

/**
 * Call a Supabase Edge Function with a plain fetch (anon key auth). We avoid
 * supabase.functions.invoke here: on the New Architecture that path crashed
 * (native TurboModule interop SIGSEGV). A direct fetch is simpler and robust.
 */
export async function callEdgeFunction<T>(name: string, body: unknown): Promise<{ data: T | null; error: string | null }> {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return { data: null, error: 'Supabase is not configured.' };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify(body),
    });
    let json: any = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    if (!res.ok) return { data: null, error: json?.error || `Request failed (${res.status})` };
    if (json?.error) return { data: null, error: String(json.error) };
    return { data: (json?.data ?? null) as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// Structured note draft returned by the ai-notes Edge Function. Keys match the
// active template's fields (SOAP → subjective/objective/assessment/plan, etc.).
export interface AINoteDraft {
  fields: Record<string, string>;
  risk_flags?: string[];  // any safeguarding/risk language the model surfaced for review
  summary?: string;
}

/**
 * Turn messy free-text session notes into a structured draft the clinician
 * reviews and confirms. The draft is NEVER final — the therapist owns the record.
 *
 * IMPORTANT: pass pseudonymised text only. Do not send client-identifying
 * details (names, contact info) to the model.
 */
export async function structureSessionNote(params: {
  template: 'soap' | 'dap' | 'free';
  rawText: string;
  sessionType?: string;
  modalities?: string[];
}): Promise<{ data: AINoteDraft | null; error: string | null }> {
  return callEdgeFunction<AINoteDraft>('ai-notes', params);
}
