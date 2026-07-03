import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Field sets per template — the model must return exactly these keys.
const TEMPLATE_FIELDS: Record<string, { key: string; label: string }[]> = {
  soap: [
    { key: 'subjective', label: 'Subjective — the client\'s report in their own words' },
    { key: 'objective', label: 'Objective — observable presentation, affect, engagement' },
    { key: 'assessment', label: 'Assessment — clinical formulation and progress' },
    { key: 'plan', label: 'Plan — interventions, homework, focus next session' },
  ],
  dap: [
    { key: 'data', label: 'Data — report and observation combined' },
    { key: 'assessment', label: 'Assessment — clinical interpretation and progress' },
    { key: 'plan', label: 'Plan — next steps and interventions' },
  ],
  free: [
    { key: 'body', label: 'Notes — clear, structured clinical notes' },
  ],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template, rawText, sessionType, modalities } = await req.json();

    if (!template || !rawText) {
      return new Response(
        JSON.stringify({ error: 'template and rawText are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fields = TEMPLATE_FIELDS[template as string];
    if (!fields) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a documentation assistant for a UK counsellor/psychotherapist.
You turn rough, messy session notes into a clear, professional structured DRAFT the clinician will review, edit and confirm. You are NOT the clinician and you do NOT make clinical decisions.

STRICT RULES:
- Output ONLY the requested JSON structure. No preamble.
- Use plain, professional, non-judgemental clinical language. British English.
- Reproduce only what is supported by the input. Do NOT invent symptoms, history, diagnoses or risk that the therapist did not mention.
- NEVER add an identifying name — refer to "the client" throughout, even if a name appears in the input.
- If the input mentions risk, self-harm, suicidal ideation or safeguarding, list short verbatim-ish phrases in "risk_flags" for the clinician to review. Do not downplay or escalate.
- This is a draft only. It is never a final clinical record.`;

    const fieldSpec = fields.map(f => `  "${f.key}": "${f.label}"`).join(',\n');
    const userPrompt = `Structure the following into a ${String(template).toUpperCase()} session-note draft.
${sessionType ? `Session type: ${sessionType}.` : ''}
${Array.isArray(modalities) && modalities.length ? `Therapist modalities: ${modalities.join(', ')}.` : ''}

ROUGH NOTES:
"""
${rawText}
"""

Respond with ONLY this JSON:
{
  "fields": {
${fieldSpec}
  },
  "risk_flags": ["short phrase for any risk/safeguarding content, else empty array"],
  "summary": "one-sentence neutral summary for the therapist"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `OpenAI: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No content returned from AI' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response as JSON' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: parsed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('ai-notes error:', err);
    return new Response(
      JSON.stringify({ error: `Server error: ${err instanceof Error ? err.message : String(err)}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
