-- ============================================================================
-- PATH — apply_all_migrations.sql
-- Full schema for the PATH therapist practice-admin app. IDEMPOTENT: safe to
-- run (and re-run) in the Supabase SQL editor. Uses create-if-not-exists,
-- add-column-if-not-exists, create-or-replace and drop-policy-if-exists.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → paste all → Run.
-- Then run verify_schema.sql to confirm every check PASSes.
--
-- COMPLIANCE NOTE (UK GDPR): clinical content is special-category personal data.
-- Every table below is OWNER-ONLY under RLS (therapist_id = auth.uid()). Client
-- identifiers live in `client_contacts`, physically separate from clinical
-- content in `session_notes` / `outcome_measures`, which key off `client_id`
-- (a pseudonymous uuid) only. Never store raw identifiers alongside notes.
-- ============================================================================

-- ==================== extensions ====================
create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ==================== therapist_profiles ====================
-- One row per auth user (created on signup by handle_new_user()). Self-only RLS
-- — there is no public directory. Read app-wide via AuthContext.fetchProfile().
create table if not exists public.therapist_profiles (
  id                        uuid primary key references auth.users (id) on delete cascade,
  email                     text,
  full_name                 text,
  account_type              text not null default 'therapist' check (account_type in ('therapist')),
  practice_name             text,
  bio                       text,
  modalities                text[]  not null default '{}',
  specialisms               text[]  not null default '{}',
  delivery                  text[]  not null default array['in_person'],
  session_fee               numeric,
  offers_sliding_scale      boolean not null default false,
  sliding_scale_min         numeric,
  sliding_scale_max         numeric,
  city                      text,
  postcode_area             text,
  avatar_url                text,
  logo_url                  text,
  tax_rate                  numeric not null default 30,
  accepting_clients         boolean not null default true,
  onboarding_complete       boolean not null default false,
  -- subscription / trial
  subscription_status       text not null default 'free_trial'
                              check (subscription_status in ('free_trial','active','past_due','cancelled')),
  trial_started_at          timestamptz,
  trial_ends_at             timestamptz,
  -- verification (professional-body trust badge; admin-approved only)
  professional_body         text,
  membership_number         text,
  insurance_provider        text,
  dbs_checked               boolean not null default false,
  verification_status       text not null default 'unverified'
                              check (verification_status in ('unverified','pending','verified','rejected')),
  verification_docs         text[]  not null default '{}',
  verification_submitted_at timestamptz,
  created_at                timestamptz not null default now()
);

-- ==================== clients (pseudonymised caseload) ====================
create table if not exists public.clients (
  id               uuid primary key default gen_random_uuid(),
  therapist_id     uuid not null references auth.users (id) on delete cascade,
  client_ref       text not null,          -- pseudonym shown throughout the clinical UI
  alias            text,                    -- optional friendly label
  status           text not null default 'active' check (status in ('active','paused','ended')),
  presenting_issue text,
  risk_flag        boolean not null default false,
  start_date       date,
  end_date         date,
  created_at       timestamptz not null default now()
);
create index if not exists clients_therapist_idx on public.clients (therapist_id, status);

-- ==================== client_contacts (identifying data, separate) ====================
-- Identifying details are kept apart from clinical content so they can be
-- minimised, restricted and deleted independently. Supabase encrypts data at
-- rest (AES-256); for extra hardening you may encrypt individual fields with
-- pgcrypto (see README).
create table if not exists public.client_contacts (
  client_id                uuid primary key references public.clients (id) on delete cascade,
  therapist_id             uuid not null references auth.users (id) on delete cascade,
  full_name                text,
  email                    text,
  phone                    text,
  address                  text,
  dob                      date,
  emergency_contact_name   text,
  emergency_contact_phone  text,
  gp_name                  text,
  gp_practice              text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ==================== sessions (calendar) ====================
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  therapist_id  uuid not null references auth.users (id) on delete cascade,
  client_id     uuid not null references public.clients (id) on delete cascade,
  scheduled_at  timestamptz not null,
  duration_min  integer not null default 50,
  session_type  text not null default 'session' check (session_type in ('assessment','session','review')),
  delivery      text not null default 'in_person' check (delivery in ('in_person','online')),
  fee           numeric not null default 0,
  status        text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','dna')),
  location      text,
  created_at    timestamptz not null default now()
);
create index if not exists sessions_therapist_idx on public.sessions (therapist_id, scheduled_at);
create index if not exists sessions_client_idx    on public.sessions (client_id);

-- ==================== session_notes (special-category) ====================
create table if not exists public.session_notes (
  id            uuid primary key default gen_random_uuid(),
  therapist_id  uuid not null references auth.users (id) on delete cascade,
  session_id    uuid unique references public.sessions (id) on delete cascade,
  client_id     uuid not null references public.clients (id) on delete cascade,
  template      text not null default 'soap' check (template in ('soap','dap','free')),
  content       jsonb not null default '{}'::jsonb,
  status        text not null default 'draft' check (status in ('draft','final')),
  ai_generated  boolean not null default false,
  ai_confirmed  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists session_notes_client_idx on public.session_notes (client_id);

-- ==================== session_note_versions (append-only history) ====================
create table if not exists public.session_note_versions (
  id            uuid primary key default gen_random_uuid(),
  note_id       uuid not null references public.session_notes (id) on delete cascade,
  therapist_id  uuid not null references auth.users (id) on delete cascade,
  template      text not null,
  content       jsonb not null default '{}'::jsonb,
  status        text not null,
  version       integer not null,
  created_at    timestamptz not null default now()
);
create index if not exists note_versions_note_idx on public.session_note_versions (note_id, version desc);

-- ==================== outcome_measures (PHQ-9 / GAD-7 / CORE-10) ====================
create table if not exists public.outcome_measures (
  id            uuid primary key default gen_random_uuid(),
  therapist_id  uuid not null references auth.users (id) on delete cascade,
  client_id     uuid not null references public.clients (id) on delete cascade,
  session_id    uuid references public.sessions (id) on delete set null,
  instrument    text not null check (instrument in ('phq9','gad7','core10','asrs','pcl5')),
  responses     jsonb not null default '[]'::jsonb,
  total_score   integer not null,
  severity      text,
  taken_on      date not null default current_date,
  created_at    timestamptz not null default now()
);
create index if not exists outcome_measures_client_idx on public.outcome_measures (client_id, instrument, taken_on);

-- Idempotently widen the allowed instruments on existing databases (adds ASRS + PCL-5).
alter table public.outcome_measures drop constraint if exists outcome_measures_instrument_check;
alter table public.outcome_measures add constraint outcome_measures_instrument_check
  check (instrument in ('phq9','gad7','core10','asrs','pcl5'));

-- ==================== invoices ====================
create table if not exists public.invoices (
  id            uuid primary key default gen_random_uuid(),
  therapist_id  uuid not null references auth.users (id) on delete cascade,
  client_id     uuid not null references public.clients (id) on delete cascade,
  number        text not null,
  line_items    jsonb not null default '[]'::jsonb,   -- [{ description, date, qty, unit_fee, amount }]
  subtotal      numeric not null default 0,
  total         numeric not null default 0,
  status        text not null default 'draft' check (status in ('draft','sent','paid')),
  issued_at     timestamptz,
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists invoices_therapist_idx on public.invoices (therapist_id, status);

-- ==================== manual_income (Tax Pot) ====================
create table if not exists public.manual_income (
  id            uuid primary key default gen_random_uuid(),
  therapist_id  uuid not null references auth.users (id) on delete cascade,
  amount        numeric not null,
  date          date not null,
  source_label  text,
  category      text,
  tax_rate      numeric not null default 30,
  tax_set_aside numeric not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists manual_income_therapist_idx on public.manual_income (therapist_id);

-- ==================== expenses (Receipt Vault) ====================
create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  therapist_id  uuid not null references auth.users (id) on delete cascade,
  amount        numeric not null default 0,
  category      text not null default 'other',
  vendor        text,
  note          text,
  spent_on      date,
  mileage_miles numeric,
  receipt_path  text,
  created_at    timestamptz not null default now()
);
create index if not exists expenses_therapist_idx on public.expenses (therapist_id);

-- ==================== supervision_log ====================
create table if not exists public.supervision_log (
  id              uuid primary key default gen_random_uuid(),
  therapist_id    uuid not null references auth.users (id) on delete cascade,
  supervisor_name text not null,
  session_date    date not null default current_date,
  hours           numeric not null default 0,
  type            text not null default 'individual' check (type in ('individual','group')),
  cost            numeric,
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists supervision_therapist_idx on public.supervision_log (therapist_id, session_date desc);

-- ==================== conversations + messages (gated to ACTIVE clients) ====================
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  therapist_id    uuid not null references auth.users (id) on delete cascade,
  client_id       uuid not null references public.clients (id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_unique_per_client unique (therapist_id, client_id)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  therapist_id    uuid not null references auth.users (id) on delete cascade,
  sender          text not null default 'therapist' check (sender in ('therapist','client')),
  body            text not null check (length(btrim(body)) > 0),
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- ==================== admins (no client writes) ====================
-- Seed an admin in the SQL editor:  insert into public.admins (user_id) values ('<auth user id>');
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
grant execute on function public.is_admin() to authenticated;

-- ==================== handle_new_user() ====================
-- Creates the profile row immediately on signup, seeding full_name from the
-- auth metadata so the app can UPDATE (never blind-insert) thereafter.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.therapist_profiles (id, email, full_name, account_type)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    'therapist'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==================== delete_own_account() ====================
-- Called by AuthContext.deleteAccount(). SECURITY DEFINER so the authenticated
-- client can delete its own auth.users row; cascades to every owned row.
create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- ============================================================================
-- Row Level Security — every table OWNER-ONLY
-- ============================================================================
alter table public.therapist_profiles    enable row level security;
alter table public.clients                enable row level security;
alter table public.client_contacts        enable row level security;
alter table public.sessions               enable row level security;
alter table public.session_notes          enable row level security;
alter table public.session_note_versions  enable row level security;
alter table public.outcome_measures       enable row level security;
alter table public.invoices               enable row level security;
alter table public.manual_income          enable row level security;
alter table public.expenses               enable row level security;
alter table public.supervision_log        enable row level security;
alter table public.conversations          enable row level security;
alter table public.messages               enable row level security;
alter table public.admins                 enable row level security;

-- therapist_profiles — self only (no public directory)
drop policy if exists therapist_profiles_select_self on public.therapist_profiles;
drop policy if exists therapist_profiles_insert_self on public.therapist_profiles;
drop policy if exists therapist_profiles_update_self on public.therapist_profiles;
create policy therapist_profiles_select_self on public.therapist_profiles for select using (auth.uid() = id);
create policy therapist_profiles_insert_self on public.therapist_profiles for insert with check (auth.uid() = id);
create policy therapist_profiles_update_self on public.therapist_profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Owner-only "for all" policies keyed on therapist_id.
drop policy if exists clients_owner on public.clients;
create policy clients_owner on public.clients for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

drop policy if exists client_contacts_owner on public.client_contacts;
create policy client_contacts_owner on public.client_contacts for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

drop policy if exists sessions_owner on public.sessions;
create policy sessions_owner on public.sessions for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

drop policy if exists session_notes_owner on public.session_notes;
create policy session_notes_owner on public.session_notes for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

drop policy if exists note_versions_owner on public.session_note_versions;
create policy note_versions_owner on public.session_note_versions for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

drop policy if exists outcome_measures_owner on public.outcome_measures;
create policy outcome_measures_owner on public.outcome_measures for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

drop policy if exists invoices_owner on public.invoices;
create policy invoices_owner on public.invoices for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

drop policy if exists manual_income_owner on public.manual_income;
create policy manual_income_owner on public.manual_income for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

drop policy if exists expenses_owner on public.expenses;
create policy expenses_owner on public.expenses for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

drop policy if exists supervision_owner on public.supervision_log;
create policy supervision_owner on public.supervision_log for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

-- conversations — owner reads/updates; INSERT gated to an ACTIVE client relationship.
drop policy if exists conversations_select on public.conversations;
drop policy if exists conversations_modify on public.conversations;
drop policy if exists conversations_insert on public.conversations;
create policy conversations_select on public.conversations for select using (auth.uid() = therapist_id);
create policy conversations_modify on public.conversations for update using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);
create policy conversations_insert on public.conversations for insert with check (
  auth.uid() = therapist_id
  and exists (
    select 1 from public.clients c
    where c.id = conversations.client_id and c.therapist_id = auth.uid() and c.status = 'active'
  )
);

-- messages — visible/insertable only within the therapist's own conversations.
drop policy if exists messages_select on public.messages;
drop policy if exists messages_insert on public.messages;
drop policy if exists messages_update on public.messages;
create policy messages_select on public.messages for select using (
  auth.uid() = therapist_id
  and exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.therapist_id = auth.uid())
);
create policy messages_insert on public.messages for insert with check (
  auth.uid() = therapist_id
  and exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.therapist_id = auth.uid())
);
create policy messages_update on public.messages for update using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

-- admins — a user may read only their own admin row (used for the is_admin UI flag).
drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins for select using (user_id = auth.uid());

-- ============================================================================
-- Storage buckets + policies
--   verification-docs : PRIVATE (owner-scoped)  — path {auth.uid()}/{file}
--   receipts          : PRIVATE (owner-scoped)  — path {auth.uid()}/{file}
--   branding          : PUBLIC (avatars/logos)  — path {auth.uid()}/{file}
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('verification-docs', 'verification-docs', false),
  ('receipts',          'receipts',          false),
  ('branding',          'branding',          true)
on conflict (id) do nothing;

-- verification-docs (private)
drop policy if exists "verification-docs owner upload" on storage.objects;
create policy "verification-docs owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "verification-docs owner read" on storage.objects;
create policy "verification-docs owner read" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "verification-docs owner delete" on storage.objects;
create policy "verification-docs owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- receipts (private)
drop policy if exists "receipts owner upload" on storage.objects;
create policy "receipts owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "receipts owner read" on storage.objects;
create policy "receipts owner read" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "receipts owner delete" on storage.objects;
create policy "receipts owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- branding (public read, owner writes)
drop policy if exists "branding public read" on storage.objects;
create policy "branding public read" on storage.objects for select using (bucket_id = 'branding');
drop policy if exists "branding owner upload" on storage.objects;
create policy "branding owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "branding owner update" on storage.objects;
create policy "branding owner update" on storage.objects for update to authenticated
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "branding owner delete" on storage.objects;
create policy "branding owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- Done. Run verify_schema.sql next.
-- ============================================================================
