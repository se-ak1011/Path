-- ============================================================================
-- PATH — verify_schema.sql  (READ-ONLY; changes nothing)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run.
-- Every row should read PASS. Any FAIL → re-run apply_all_migrations.sql.
-- ============================================================================
with
expected_tables(name) as (
  values ('therapist_profiles'),('clients'),('client_contacts'),('sessions'),
         ('session_notes'),('session_note_versions'),('outcome_measures'),
         ('invoices'),('manual_income'),('expenses'),('supervision_log'),
         ('conversations'),('messages'),('admins')
),
t_count as (
  select count(*) n from information_schema.tables
  where table_schema='public' and table_name in (select name from expected_tables)
),
rls_on as (
  select count(*) n from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
  where ns.nspname='public' and c.relrowsecurity and c.relname in (select name from expected_tables)
),
pol as (
  select count(*) n from pg_policies
  where schemaname='public' and tablename in (select name from expected_tables)
),
fn_delete as (select count(*) n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname='delete_own_account'),
fn_newuser as (select count(*) n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname='handle_new_user'),
fn_admin as (select count(*) n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname='is_admin'),
trg as (select count(*) n from pg_trigger where tgname='on_auth_user_created' and not tgisinternal),
trg_msg as (select count(*) n from pg_trigger where tgname='messages_touch_conversation' and not tgisinternal),
buckets as (select count(*) n from storage.buckets where id in ('verification-docs','receipts','branding'))
select * from (
  select 1 as ord, '1. Tables (expect 14)' as check_name,
         (select n from t_count)::text||' / 14' as found,
         case when (select n from t_count)=14 then 'PASS' else 'FAIL — re-run apply_all_migrations.sql' end as status
  union all select 2, '2. RLS enabled on all 14',
         (select n from rls_on)::text||' / 14',
         case when (select n from rls_on)=14 then 'PASS' else 'FAIL' end
  union all select 3, '3. RLS policies present',
         (select n from pol)::text||' policies',
         case when (select n from pol) > 0 then 'PASS' else 'FAIL' end
  union all select 4, '4. RPC delete_own_account()',
         (select n from fn_delete)::text||' / 1',
         case when (select n from fn_delete)=1 then 'PASS' else 'FAIL' end
  union all select 5, '5. Fn handle_new_user()',
         (select n from fn_newuser)::text||' / 1',
         case when (select n from fn_newuser)=1 then 'PASS' else 'FAIL' end
  union all select 6, '6. Fn is_admin()',
         (select n from fn_admin)::text||' / 1',
         case when (select n from fn_admin)=1 then 'PASS' else 'FAIL' end
  union all select 7, '7. Trigger on_auth_user_created',
         (select n from trg)::text||' / 1',
         case when (select n from trg)=1 then 'PASS' else 'FAIL' end
  union all select 8, '8. Trigger messages_touch_conversation',
         (select n from trg_msg)::text||' / 1',
         case when (select n from trg_msg)=1 then 'PASS' else 'FAIL' end
  union all select 9, '9. Storage buckets (verification-docs/receipts/branding)',
         (select n from buckets)::text||' / 3',
         case when (select n from buckets)=3 then 'PASS' else 'FAIL — re-run apply_all_migrations.sql' end
) s order by ord;
