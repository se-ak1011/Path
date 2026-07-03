import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DOCS_BUCKET = 'verification-docs';
const SIGNED_TTL = 60 * 10; // 10 minutes — long enough to review, short enough to be safe

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // The caller's JWT — used only to identify and authorise the caller.
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Missing authorization' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Identify the caller from their JWT.
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401);
    const callerId = userData.user.id;

    // Authorise: caller MUST be in the admins table. No self-grant, ever.
    const { data: adminRow } = await admin.from('admins').select('user_id').eq('user_id', callerId).maybeSingle();
    if (!adminRow) return json({ error: 'Admin access required' }, 403);

    const { action, therapistId } = await req.json();

    if (action === 'list') {
      const { data, error } = await admin
        .from('therapist_profiles')
        .select('id, full_name, professional_body, membership_number, insurance_provider, dbs_checked, verification_docs, verification_submitted_at')
        .eq('verification_status', 'pending')
        .order('verification_submitted_at', { ascending: true });
      if (error) return json({ error: error.message }, 500);

      const items = await Promise.all((data ?? []).map(async (row: any) => {
        const docs: string[] = row.verification_docs || [];
        const doc_urls: string[] = [];
        for (const path of docs) {
          const { data: signed } = await admin.storage.from(DOCS_BUCKET).createSignedUrl(path, SIGNED_TTL);
          if (signed?.signedUrl) doc_urls.push(signed.signedUrl);
        }
        return { ...row, doc_urls };
      }));

      return json({ data: items });
    }

    if (action === 'approve' || action === 'reject') {
      if (!therapistId) return json({ error: 'therapistId required' }, 400);
      const status = action === 'approve' ? 'verified' : 'rejected';
      const { error } = await admin.from('therapist_profiles').update({ verification_status: status }).eq('id', therapistId);
      if (error) return json({ error: error.message }, 500);
      return json({ data: { ok: true } });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error('admin-verify error:', err);
    return json({ error: `Server error: ${err instanceof Error ? err.message : String(err)}` }, 500);
  }
});
