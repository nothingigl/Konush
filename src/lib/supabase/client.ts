import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig, isSupabaseConfigured, type SupabasePublicConfig } from './config';

export { getSupabaseConfig, isSupabaseConfigured, type SupabasePublicConfig };

let browserClient: SupabaseClient | null = null;
let cachedConfigKey = '';

/**
 * Lazily loads `@supabase/ssr` and returns a singleton browser Supabase client using only
 * public credentials (`anon` / `publishable` key). Returns `null` without loading the SDK
 * when Supabase is not configured, keeping the guest JS bundle lean.
 */
export async function getSupabaseBrowserClient(): Promise<SupabaseClient | null> {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  const nextKey = `${config.url}|${config.key}`;
  if (!browserClient || cachedConfigKey !== nextKey) {
    const { createBrowserClient } = await import('@supabase/ssr');
    browserClient = createBrowserClient(config.url, config.key);
    cachedConfigKey = nextKey;
  }

  return browserClient;
}
