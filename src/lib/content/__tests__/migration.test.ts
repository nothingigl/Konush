import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '0001_initial_schema.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

describe('Supabase migration 0001_initial_schema.sql', () => {
  it('defines all 6 required user & healthcheck tables', () => {
    for (const table of [
      'public.profiles',
      'public.unit_progress',
      'public.review_state',
      'public.daily_activity',
      'public.content_feedback',
      'public.healthcheck',
    ]) {
      expect(sql).toContain(`create table if not exists ${table}`);
    }
  });

  it('enables Row Level Security (RLS) on every table', () => {
    for (const table of [
      'public.profiles',
      'public.unit_progress',
      'public.review_state',
      'public.daily_activity',
      'public.content_feedback',
      'public.healthcheck',
    ]) {
      expect(sql).toContain(`alter table ${table} enable row level security;`);
    }
  });

  it('allows content_feedback.user_id to be NULL so ON DELETE SET NULL succeeds on account deletion', () => {
    expect(sql).toContain('user_id uuid references auth.users(id) on delete set null');
    expect(sql).not.toContain('user_id uuid not null references auth.users(id) on delete set null');
  });

  it('restricts content_feedback to INSERT only for authenticated owners', () => {
    expect(sql).toContain('on public.content_feedback for insert');
    expect(sql).not.toContain('on public.content_feedback for select');
    expect(sql).not.toContain('on public.content_feedback for update');
    expect(sql).not.toContain('on public.content_feedback for delete');
  });

  it('defines handle_new_user signup trigger and delete_my_account security definer RPC', () => {
    expect(sql).toContain('create or replace function public.handle_new_user()');
    expect(sql).toContain('create trigger on_auth_user_created');
    expect(sql).toContain('create or replace function public.delete_my_account()');
    expect(sql).toContain('grant execute on function public.delete_my_account() to authenticated;');
  });

  it('seeds the single healthcheck row for connectivity and keepalive checks', () => {
    expect(sql).toContain('insert into public.healthcheck (id, status, checked_at)');
    expect(sql).toContain('on public.healthcheck for select');
  });
});
