-- =============================================================================
-- Web Push subscriptions
-- Paste the whole file into Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run: every statement is idempotent.
-- Touches nothing that already exists except adding ONE row to `permissions`.
-- =============================================================================

-- 1) Table ---------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid()
                         references auth.users (id) on delete cascade,
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- 2) RLS: each user sees / adds / removes only their own subscriptions ----------
-- The Edge Function `send-push` reads everyone's rows with the service_role key,
-- which bypasses RLS — so no policy here grants any cross-user access.
alter table public.push_subscriptions enable row level security;

revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Needed only because the frontend saves with UPSERT (on conflict endpoint →
-- update p256dh/auth when the browser rotates keys). Still own-rows only.
drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- 3) Permission code that marks who may SEND notifications ---------------------
-- The app's "admin" is permission-based (my_perms / has_perm), not a role
-- column. `send-push` accepts callers holding `notifications.send`
-- (grant it from the الصلاحيات page) — see ADMIN_PERMS in the function.
insert into public.permissions (code, label_ar, category, description, sort_order)
select
  'notifications.send',
  'إرسال الإشعارات',
  'الإشعارات',
  'إرسال إشعارات فورية (Push) للمستخدمين من لوحة التحكم',
  900
where not exists (
  select 1 from public.permissions where code = 'notifications.send'
);
