import type { SupabaseClient } from '@supabase/supabase-js';

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

/**
 * Reads public Supabase credentials using static `process.env.NEXT_PUBLIC_*` references
 * so Next.js inlines them into browser bundles at build time.
 * Supports both `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
 * (the default variable injected by the Vercel Supabase Marketplace integration).
 */
export function getSupabaseConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    '';

  if (!url || !anonKey || !/^https?:\/\//i.test(url)) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

let browserClient: SupabaseClient | null = null;

/**
 * Lazily loads `@supabase/ssr` and returns the singleton browser Supabase client using only
 * the public `anon` / `publishable` key. Returns `null` without loading the SDK in guest /
 * unconfigured mode, keeping initial JS bundle lean on weak mobile devices.
 */
export async function getSupabaseBrowserClient(): Promise<SupabaseClient | null> {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }
  if (!browserClient) {
    const { createBrowserClient } = await import('@supabase/ssr');
    browserClient = createBrowserClient(config.url, config.anonKey);
  }
  return browserClient;
}
