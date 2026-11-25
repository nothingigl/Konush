-- =============================================================================
-- Migration: 0001_initial_schema.sql
-- Project:   Konuş! — Free Turkish & English PWA
-- Purpose:   User-owned data tables, indexes, Row Level Security (RLS),
--            automatic profile creation trigger, keepalive healthcheck,
--            and self-service account deletion RPC (no service_role on client).
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Automatic updated_at trigger helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. public.profiles — User profile and learning preferences
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  avatar_key text check (avatar_key is null or char_length(avatar_key) <= 64),
  ui_lang text not null default 'ru' check (ui_lang in ('ru')),
  preferred_course text not null default 'tr' check (preferred_course in ('tr', 'en')),
  daily_goal_xp int not null default 20 check (daily_goal_xp in (10, 20, 30)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'User profile and learning preferences synced across devices.';

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. public.unit_progress — Per-unit and 4-skill completion scores
-- -----------------------------------------------------------------------------
create table if not exists public.unit_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id text not null check (char_length(unit_id) between 3 and 64),
  course_id text not null check (course_id in ('tr', 'en')),
  words_done boolean not null default false,
  speaking_best smallint check (speaking_best is null or (speaking_best between 0 and 100)),
  listening_best smallint check (listening_best is null or (listening_best between 0 and 100)),
  writing_best smallint check (writing_best is null or (writing_best between 0 and 100)),
  reading_best smallint check (reading_best is null or (reading_best between 0 and 100)),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);

comment on table public.unit_progress is 'Per-unit and 4-skill completion scores for each user.';

create index if not exists idx_unit_progress_user_id
  on public.unit_progress (user_id);

create index if not exists idx_unit_progress_user_course
  on public.unit_progress (user_id, course_id);

drop trigger if exists trg_unit_progress_updated_at on public.unit_progress;
create trigger trg_unit_progress_updated_at
  before update on public.unit_progress
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. public.review_state — Spaced repetition schedule (1 -> 3 -> 7 -> 14 days)
--    step: 0 = not started, 1 = +1d, 2 = +3d, 3 = +7d, 4 = +14d, 5 = graduated
-- -----------------------------------------------------------------------------
create table if not exists public.review_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id text not null check (char_length(unit_id) between 3 and 64),
  course_id text not null check (course_id in ('tr', 'en')),
  step smallint not null default 1 check (step between 0 and 5),
  due_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);

comment on table public.review_state is 'Spaced repetition state (1/3/7/14 day intervals) per unit.';

create index if not exists idx_review_state_user_id
  on public.review_state (user_id);

create index if not exists idx_review_state_user_due
  on public.review_state (user_id, due_at);

drop trigger if exists trg_review_state_updated_at on public.review_state;
create trigger trg_review_state_updated_at
  before update on public.review_state
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. public.daily_activity — Daily XP, lessons, and practice duration
-- -----------------------------------------------------------------------------
create table if not exists public.daily_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  xp int not null default 0 check (xp >= 0 and xp <= 100000),
  lessons int not null default 0 check (lessons >= 0 and lessons <= 10000),
  seconds int not null default 0 check (seconds >= 0 and seconds <= 86400),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

comment on table public.daily_activity is 'Daily XP and activity log used for streak calculation.';

create index if not exists idx_daily_activity_user_id
  on public.daily_activity (user_id);

create index if not exists idx_daily_activity_user_day_desc
  on public.daily_activity (user_id, day desc);

drop trigger if exists trg_daily_activity_updated_at on public.daily_activity;
create trigger trg_daily_activity_updated_at
  before update on public.daily_activity
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. public.content_feedback — Write-only exercise error reports
--    user_id is nullable so ON DELETE SET NULL succeeds when a user deletes
--    their account while preserving anonymized content bug reports.
--    RLS INSERT policy still requires user_id = auth.uid().
-- -----------------------------------------------------------------------------
create table if not exists public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  course_id text not null default 'tr' check (course_id in ('tr', 'en')),
  unit_id text not null check (char_length(unit_id) between 3 and 64),
  exercise_id text not null check (char_length(exercise_id) between 3 and 96),
  message text not null check (char_length(trim(message)) between 3 and 2000),
  created_at timestamptz not null default now()
);

comment on table public.content_feedback is 'Write-only user error reports for exercises.';

create index if not exists idx_content_feedback_user_id
  on public.content_feedback (user_id);

-- -----------------------------------------------------------------------------
-- 7. public.healthcheck — Public read-only single row for health/keepalive
-- -----------------------------------------------------------------------------
create table if not exists public.healthcheck (
  id int primary key check (id = 1),
  status text not null default 'ok',
  checked_at timestamptz not null default now()
);

comment on table public.healthcheck is 'Read-only healthcheck table for connectivity and keepalive checks.';

insert into public.healthcheck (id, status, checked_at)
values (1, 'ok', now())
on conflict (id) do nothing;

-- =============================================================================
-- 8. Row Level Security (RLS) Policies
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.unit_progress enable row level security;
alter table public.review_state enable row level security;
alter table public.daily_activity enable row level security;
alter table public.content_feedback enable row level security;
alter table public.healthcheck enable row level security;

-- 8.1 profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using (id = auth.uid());

-- 8.2 unit_progress
drop policy if exists "unit_progress_select_own" on public.unit_progress;
create policy "unit_progress_select_own"
  on public.unit_progress for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "unit_progress_insert_own" on public.unit_progress;
create policy "unit_progress_insert_own"
  on public.unit_progress for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "unit_progress_update_own" on public.unit_progress;
create policy "unit_progress_update_own"
  on public.unit_progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "unit_progress_delete_own" on public.unit_progress;
create policy "unit_progress_delete_own"
  on public.unit_progress for delete
  to authenticated
  using (user_id = auth.uid());

-- 8.3 review_state
drop policy if exists "review_state_select_own" on public.review_state;
create policy "review_state_select_own"
  on public.review_state for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "review_state_insert_own" on public.review_state;
create policy "review_state_insert_own"
  on public.review_state for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "review_state_update_own" on public.review_state;
create policy "review_state_update_own"
  on public.review_state for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "review_state_delete_own" on public.review_state;
create policy "review_state_delete_own"
  on public.review_state for delete
  to authenticated
  using (user_id = auth.uid());

-- 8.4 daily_activity
drop policy if exists "daily_activity_select_own" on public.daily_activity;
create policy "daily_activity_select_own"
  on public.daily_activity for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "daily_activity_insert_own" on public.daily_activity;
create policy "daily_activity_insert_own"
  on public.daily_activity for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "daily_activity_update_own" on public.daily_activity;
create policy "daily_activity_update_own"
  on public.daily_activity for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "daily_activity_delete_own" on public.daily_activity;
create policy "daily_activity_delete_own"
  on public.daily_activity for delete
  to authenticated
  using (user_id = auth.uid());

-- 8.5 content_feedback (INSERT only for authenticated users)
drop policy if exists "content_feedback_insert_own" on public.content_feedback;
create policy "content_feedback_insert_own"
  on public.content_feedback for insert
  to authenticated
  with check (user_id = auth.uid());

-- 8.6 healthcheck (read-only SELECT for anon and authenticated)
drop policy if exists "healthcheck_select_all" on public.healthcheck;
create policy "healthcheck_select_all"
  on public.healthcheck for select
  to anon, authenticated
  using (true);

-- =============================================================================
-- 9. Trigger: Automatically create a profile row on auth.users signup
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );

  if v_display_name is not null and char_length(v_display_name) > 80 then
    v_display_name := left(v_display_name, 80);
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, v_display_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 10. RPC: Self-service account deletion (delete_my_account)
-- =============================================================================
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
