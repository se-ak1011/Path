# PATH

Private-practice administration for self-employed UK counsellors & therapists.
Sister app to **PAI** (trades back-office) — same engine, reskinned for therapy.

- **Stack:** Expo SDK 54 · React Native 0.81 · React 19 · Expo Router 6 · New Architecture · Hermes
- **Backend:** Supabase (Auth · Postgres · RLS · Storage · Deno Edge Functions)
- **CI:** Codemagic → TestFlight (`codemagic.yaml`)
- **Bundle id:** `com.pathse.app`

## What's in the box (MVP)

Auth + onboarding (email only) · pseudonymised caseload · professional-body
verification (admin-approved) · sessions/calendar with DNA + cancelled · session
notes (SOAP/DAP/free) with version history + AI structuring · outcome measures
(PHQ-9, GAD-7, CORE-10) charted over time · invoices (per-session + block, roll-up
line items) feeding the Tax Pot · Tax Pot (Self-Assessment set-aside + therapist
expense categories + mileage) · supervision log · secure client messaging (gated
to active clients).

### Compliance posture
Clinical data is treated as UK GDPR **special-category**. Every table is
**owner-only** under RLS. Client **identifiers** live in `client_contacts`,
physically separate from clinical content (`session_notes`, `outcome_measures`),
which reference a pseudonymous `client_id` only. AI output is always a **draft the
clinician reviews, confirms and owns** — never auto-final. PATH is
practice-admin software, not a clinical/medical service.

---

## Local development

```bash
npm install
npx expo start --dev-client   # or: npm run web
```

`.env` already contains the **public** Supabase URL + publishable key (safe to
commit — it is public-safe). `app.config.js` loads `.env` and passes the values
through `expo.extra`.

---

## ⚙️ Setup on your side — do these once

There is a copy-paste, step-by-step version of everything below (SQL, function
deploys, secrets, Codemagic + App Store Connect boxes) in **`SETUP.md`**. Short
version:

1. **Database** — Supabase Dashboard → SQL Editor → run `supabase/apply_all_migrations.sql`, then `supabase/verify_schema.sql` (every row must say PASS).
2. **Edge functions** — `supabase functions deploy ai-notes` and `supabase functions deploy admin-verify`.
3. **Secret** — `supabase secrets set OPENAI_API_KEY=sk-...` (same key PAI uses).
4. **Make yourself an admin** (to review verifications) — `insert into public.admins (user_id) values ('<your auth user id>');`
5. **Codemagic** — the workflow is ready; provide the App Store Connect API key
   env group + the `com.pathse.app` provisioning profile (integration
   `codemagicFlutter`, same as PAI).

See `SETUP.md` for the exact commands and dashboard steps.
