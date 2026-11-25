import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getSupabaseConfig, getSupabaseServerConfig, isSupabaseConfigured } from '../config';
import { formatSupabaseAuthError } from '../errors';

describe('Supabase public configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    delete process.env.SUPABASE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns null when required variables are missing', () => {
    expect(getSupabaseConfig()).toBeNull();
    expect(getSupabaseServerConfig()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('reads NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY and trims trailing slash', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '  https://demo.supabase.co/  ';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '  eyJ-anon-token  ';

    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabaseConfig()).toEqual({
      url: 'https://demo.supabase.co',
      key: 'eyJ-anon-token',
      keySource: 'anon',
    });
  });

  it('supports NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY injected by Vercel integration', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vercel_key';

    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabaseConfig()).toEqual({
      url: 'https://demo.supabase.co',
      key: 'sb_publishable_vercel_key',
      keySource: 'publishable',
    });
  });

  it('supports NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY fallback', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'sb_publishable_default_key';

    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabaseConfig()).toEqual({
      url: 'https://demo.supabase.co',
      key: 'sb_publishable_default_key',
      keySource: 'publishable_default',
    });
  });

  it('allows server-side SUPABASE_URL fallback while keeping browser config false', () => {
    process.env.SUPABASE_URL = 'https://demo.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_123';

    expect(getSupabaseConfig()).toBeNull();
    expect(getSupabaseServerConfig()).toEqual({
      url: 'https://demo.supabase.co',
      key: 'sb_publishable_123',
      keySource: 'publishable',
    });
  });

  it('rejects URLs without http(s) protocol or whitespace-only keys', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'demo.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJ-anon';
    expect(isSupabaseConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '   ';
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('translates common Supabase auth errors to clear Russian messages', () => {
    expect(formatSupabaseAuthError('Invalid login credentials')).toContain('Неверный email');
    expect(formatSupabaseAuthError('Email not confirmed')).toContain('не подтверждена');
    expect(formatSupabaseAuthError('User already registered')).toContain('уже зарегистрирован');
  });
});
