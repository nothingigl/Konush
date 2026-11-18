import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Supabase Migration 0001_initial_schema.sql Security & RLS Verification', () => {
  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '0001_initial_schema.sql',
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const requiredTables = [
    'profiles',
    'unit_progress',
    'review_state',
    'daily_activity',
    'content_feedback',
    'healthcheck',
  ] as const;

  it('creates all 6 required tables', () => {
    for (const table of requiredTables) {
      expect(sql).toMatch(
        new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}`, 'i'),
      );
    }
  });

  it('enables Row Level Security (RLS) on every single table', () => {
    for (const table of requiredTables) {
      expect(sql).toMatch(
        new RegExp(
          `alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
          'i',
        ),
      );
    }
  });

  it('enforces auth.uid() ownership policies on user tables and forbids reading content_feedback', () => {
    expect(sql).toMatch(/id\s*=\s*auth\.uid\(\)/i);
    expect(sql).toMatch(/user_id\s*=\s*auth\.uid\(\)/i);

    // content_feedback must only have an INSERT policy, no SELECT/UPDATE/DELETE policies
    expect(sql).toMatch(/on\s+public\.content_feedback\s+for\s+insert/i);
    expect(sql).not.toMatch(/on\s+public\.content_feedback\s+for\s+(select|update|delete)/i);
  });

  it('creates indexes on user_id for all user-scoped tables', () => {
    expect(sql).toContain('idx_unit_progress_user_id');
    expect(sql).toContain('idx_review_state_user_id');
    expect(sql).toContain('idx_daily_activity_user_id');
    expect(sql).toContain('idx_content_feedback_user_id');
  });

  it('defines handle_new_user trigger function with security definer and explicit search_path', () => {
    expect(sql).toMatch(
      /function\s+public\.handle_new_user\(\)[\s\S]*?security\s+definer[\s\S]*?set\s+search_path\s*=\s*public/i,
    );
    expect(sql).toMatch(/create\s+trigger\s+on_auth_user_created/i);
  });

  it('defines delete_my_account() RPC with security definer, explicit search_path, and authenticated grant', () => {
    expect(sql).toMatch(
      /function\s+public\.delete_my_account\(\)[\s\S]*?security\s+definer[\s\S]*?set\s+search_path\s*=\s*public,\s*auth/i,
    );
    expect(sql).toMatch(/delete\s+from\s+auth\.users\s+where\s+id\s*=\s*v_uid/i);
    expect(sql).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.delete_my_account\(\)\s+to\s+authenticated/i,
    );
  });
});
