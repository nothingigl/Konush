import type { SupabaseClient } from '@supabase/supabase-js';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith('http'));
}

let browserClient: SupabaseClient | null = null;

/**
 * Lazily loads `@supabase/ssr` and returns the singleton browser Supabase client using only
 * the public `anon` key. Returns `null` without loading the SDK in guest / unconfigured mode,
 * keeping initial JS bundle lean on weak mobile devices.
 */
export async function getSupabaseBrowserClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!browserClient) {
    const { createBrowserClient } = await import('@supabase/ssr');
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
