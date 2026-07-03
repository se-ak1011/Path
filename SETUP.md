# PATH — Setup runbook (your side)

Everything you need to do to take this repo live. Copy-paste in order.
Estimated time: ~20 minutes. You need: the Supabase project, the OpenAI key
(the same one PAI uses), and your Apple / Codemagic access.

Backend project (already provisioned):
- **URL:** `https://tsaqteklnhkdbfusppbf.supabase.co`
- **Publishable (anon) key:** `sb_publishable_-pukdrVjm9tpPIwHYQk8wA_4ERu-5Ya`

These are already wired into `.env` and `app.config.js` — nothing to do there.

---

## 1. Database — run the SQL (2 min)

1. Supabase Dashboard → your project → **SQL Editor** → **New query**.
2. Open `supabase/apply_all_migrations.sql` from this repo, copy the **whole file**, paste, **Run**.
   - It is idempotent — safe to run now and again later. Creates all 14 tables, RLS, functions, triggers and the 3 storage buckets.
3. New query → paste **all** of `supabase/verify_schema.sql` → **Run**.
   - Every row must read **PASS**. If any says FAIL, re-run `apply_all_migrations.sql`.

---

## 2. Auth settings (1 min)

Dashboard → **Authentication → Providers → Email**:
- **Email** provider: **Enabled** (Google/Apple are intentionally off — PATH is email-only).
- **Confirm email**: your choice. For fastest testing, toggle it **off** so new signups log in immediately. (Turn back on for production.)

Dashboard → **Authentication → URL Configuration**:
- Add redirect URL `pathapp://` (the app scheme) if you later enable email links. Not required for password login.

---

## 3. Edge Functions — deploy (5 min)

You need the Supabase CLI once:

```bash
npm install -g supabase          # or: brew install supabase/tap/supabase
supabase login                   # opens browser
supabase link --project-ref tsaqteklnhkdbfusppbf
```

Deploy both functions from the repo root:

```bash
# AI note-structuring (client calls this)
supabase functions deploy ai-notes --project-ref tsaqteklnhkdbfusppbf

# Admin verification approval (service-role; used by the admin screen)
supabase functions deploy admin-verify --project-ref tsaqteklnhkdbfusppbf
```

> `admin-verify` uses the built-in `SUPABASE_SERVICE_ROLE_KEY` — Supabase injects
> it automatically, you do **not** set it yourself.

---

## 4. Set the OpenAI secret (1 min)

Same key PAI uses. Never hardcode it — it lives only in Supabase function secrets.

```bash
supabase secrets set OPENAI_API_KEY=sk-REPLACE_WITH_YOUR_KEY --project-ref tsaqteklnhkdbfusppbf
```

Verify:

```bash
supabase secrets list --project-ref tsaqteklnhkdbfusppbf   # should list OPENAI_API_KEY
```

(If you change the secret later, you do **not** need to redeploy the function.)

---

## 5. Make yourself an admin (1 min)

Only admins can approve verification submissions. First, sign up in the app once
so your auth user exists. Then:

1. Dashboard → **Authentication → Users** → copy **your** user's UUID.
2. SQL Editor → run (paste your UUID):

```sql
insert into public.admins (user_id) values ('PASTE-YOUR-AUTH-USER-UUID')
on conflict (user_id) do nothing;
```

Reopen the app → **Profile** now shows **Admin — verification queue**.

---

## 6. Smoke test (3 min)

In the app:
1. **Sign up** with email + password → complete onboarding.
2. **Clients** → add a client (reference like `C-001`).
3. **Sessions** → schedule a session → open it → **Session note** → type rough
   notes → **Structure with AI** (confirms step 3–4 work end-to-end) → Finalise.
4. **Outcome measure** → PHQ-9 → answer → Save. Add a second one on another day
   to see the progress chart on the client screen.
5. **Invoice** → new → tick the completed session → Create → **Mark as paid** →
   check it appears in **Tax Pot**.
6. **Verification** → fill body + membership + upload a document → Submit. Then
   open **Admin — verification queue** → Approve → your badge turns *verified*.

If the AI step errors: re-check steps 3 (deploy) and 4 (secret).

---

## 7. iOS build → TestFlight (Codemagic)

`codemagic.yaml` is ready (New Architecture, auto build-number from timestamp,
`submit_to_testflight: true`). It matches PAI; only the app name/bundle differ.

**App Store Connect** (once):
- Create the app record with bundle id **`com.pathse.app`** (Apps → + → New App).
- SKU: anything (e.g. `pathse`). Primary language: English (U.K.).

**Codemagic** (once):
- Connect this GitHub repo.
- **Integrations → App Store Connect**: use the API key integration named
  **`codemagicFlutter`** (same one PAI uses) — already referenced in the yaml.
- **Environment variables → Groups**: create/confirm a group named **`Ios_signing`**
  containing your App Store Connect API key vars:
  - `APP_STORE_CONNECT_KEY_IDENTIFIER` (or `APP_STORE_CONNECT_KEY_ID`)
  - `APP_STORE_CONNECT_ISSUER_ID`
  - `APP_STORE_CONNECT_PRIVATE_KEY`
  - (optional) `CERTIFICATE_PRIVATE_KEY_PASSWORD`
- **Code signing / provisioning profile**: the **Path** provisioning profile for
  `com.pathse.app` (you said this is set in the Codemagic env). The build step
  runs `app-store-connect fetch-signing-files com.pathse.app --create`, so it will
  fetch/create the App Store profile automatically if the API key has access.

**Run it:** Codemagic → Start new build → workflow **Expo iOS**. On success it
uploads to **TestFlight** automatically.

**App Store review — boxes to tick** (when you submit for review later):
- **Encryption:** already declared — `ITSAppUsesNonExemptEncryption = false`. Answer "No" to the export-compliance question.
- **Data safety / privacy (App Privacy):** you collect Health & clinical data and
  contact info. Declare: *Health data*, *Contact info*, *User content* — used for
  **App Functionality**, **not** for tracking, **not** linked to identity for ads.
- **Age rating:** 17+ is safe (clinical/medical themes).
- **Sign-in for review:** provide a demo email/password (create a throwaway
  account) in App Review notes so the reviewer can get past auth.
- **Privacy policy URL:** required — host one (e.g. a GitHub Pages page like
  Alchono's) before submitting. Not needed for TestFlight-only.

> TestFlight (internal testing) does **not** require the privacy policy or full
> App Privacy answers — you can start testing as soon as the build uploads.

---

## Notes & assumptions

- **Secure client messaging** is therapist-side for the MVP (clients are
  pseudonymised records, not app users). The `conversations`/`messages` tables and
  RLS are built to gate strictly to **active** clients and to extend to client
  logins later. If you want two-way client access, that's a follow-up.
- **Payments/subscription** are date-based trial only for now. RevenueCat +
  StoreKit entitlement is the intended next step (mirrors PAI's PAYMENTS plan).
- **Encryption of identifiers:** Supabase encrypts at rest (AES-256) and
  `client_contacts` is owner-only and physically separate from clinical content.
  For belt-and-braces field-level encryption you can wrap contact fields with
  `pgcrypto`’s `pgp_sym_encrypt`/`pgp_sym_decrypt` behind SECURITY DEFINER RPCs —
  ask and I'll add it.
