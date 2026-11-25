import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseServerConfig } from './config';

/**
 * Creates a request-scoped server Supabase client for Route Handlers
 * (such as `/auth/callback` and `/api/supabase-health`).
 * Returns `null` if public Supabase environment variables are not set.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  const config = getSupabaseServerConfig();
  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Ignore cookie writes during read-only Server Component renders
        }
      },
    },
  });
}
