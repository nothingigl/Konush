-- =============================================================================
-- Migration: 0002_fix_feedback_fk_and_rls_perf.sql
-- Purpose:
--   1. Make content_feedback.user_id nullable so ON DELETE SET NULL succeeds
--      when a user deletes their account via public.delete_my_account().
--   2. Drop redundant single-column indexes that duplicate composite PK prefixes.
--   3. Optimize RLS policies with (select auth.uid()) to avoid per-row initplan
--      re-evaluation (Supabase auth_rls_initplan advisor).
--   4. Revoke PUBLIC execute on SECURITY DEFINER trigger function handle_new_user().
-- =============================================================================

-- 1. Fix NOT NULL vs ON DELETE SET NULL contradiction on content_feedback.user_id
alter table public.content_feedback
  alter column user_id drop not null;

-- 2. Drop redundant indexes (leading column already indexed by composite PK)
drop index if exists public.idx_unit_progress_user_id;
drop index if exists public.idx_review_state_user_id;
drop index if exists public.idx_daily_activity_user_id;

-- 3. Optimize RLS policies with (select auth.uid())
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "unit_progress_select_own" on public.unit_progress;
create policy "unit_progress_select_own"
  on public.unit_progress for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "unit_progress_insert_own" on public.unit_progress;
create policy "unit_progress_insert_own"
  on public.unit_progress for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "unit_progress_update_own" on public.unit_progress;
create policy "unit_progress_update_own"
  on public.unit_progress for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "unit_progress_delete_own" on public.unit_progress;
create policy "unit_progress_delete_own"
  on public.unit_progress for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "review_state_select_own" on public.review_state;
create policy "review_state_select_own"
  on public.review_state for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "review_state_insert_own" on public.review_state;
create policy "review_state_insert_own"
  on public.review_state for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "review_state_update_own" on public.review_state;
create policy "review_state_update_own"
  on public.review_state for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "review_state_delete_own" on public.review_state;
create policy "review_state_delete_own"
  on public.review_state for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "daily_activity_select_own" on public.daily_activity;
create policy "daily_activity_select_own"
  on public.daily_activity for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "daily_activity_insert_own" on public.daily_activity;
create policy "daily_activity_insert_own"
  on public.daily_activity for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "daily_activity_update_own" on public.daily_activity;
create policy "daily_activity_update_own"
  on public.daily_activity for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "daily_activity_delete_own" on public.daily_activity;
create policy "daily_activity_delete_own"
  on public.daily_activity for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "content_feedback_insert_own" on public.content_feedback;
create policy "content_feedback_insert_own"
  on public.content_feedback for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- 4. Defense-in-depth on SECURITY DEFINER trigger function
revoke execute on function public.handle_new_user() from public, anon, authenticated;
