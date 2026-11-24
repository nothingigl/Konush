import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getSupabaseConfig, isSupabaseConfigured } from '../client';

describe('Supabase public configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns false when env vars are missing', () => {
    expect(getSupabaseConfig()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('accepts NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJ-anon-key';

    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabaseConfig()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'eyJ-anon-key',
    });
  });

  it('falls back to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from Vercel integration', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_12345';

    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabaseConfig()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'sb_publishable_12345',
    });
  });

  it('prefers ANON_KEY over PUBLISHABLE_KEY when both are provided', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-primary';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-fallback';

    expect(getSupabaseConfig()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-primary',
    });
  });

  it('trims whitespace around URL and key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '  https://example.supabase.co  ';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = '  sb_publishable_trimmed  ';

    expect(getSupabaseConfig()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'sb_publishable_trimmed',
    });
  });

  it('rejects whitespace-only values or URLs without http(s) protocol', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJ-anon-key';
    expect(isSupabaseConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '   ';
    expect(isSupabaseConfigured()).toBe(false);
  });
});
