export type SupabaseKeySource = 'anon' | 'publishable' | 'publishable_default';

export interface SupabasePublicConfig {
  url: string;
  key: string;
  keySource: SupabaseKeySource;
}

function normalizeUrl(raw: string | undefined): string {
  const value = raw?.trim() ?? '';
  if (!value || !/^https?:\/\//i.test(value)) {
    return '';
  }
  return value.replace(/\/+$/, '');
}

function resolvePublicKey(): { key: string; keySource: SupabaseKeySource } | null {
  // Static `process.env.NEXT_PUBLIC_*` reads are required so Next.js inlines them
  // into client bundles at build time.
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  if (anonKey) {
    return { key: anonKey, keySource: 'anon' };
  }

  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  if (publishableKey) {
    return { key: publishableKey, keySource: 'publishable' };
  }

  const publishableDefaultKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ?? '';
  if (publishableDefaultKey) {
    return { key: publishableDefaultKey, keySource: 'publishable_default' };
  }

  return null;
}

/**
 * Reads public Supabase credentials safe for browser bundles.
 * Automatically supports both legacy `anon` keys and new `publishable` keys injected
 * by the Vercel <-> Supabase Marketplace integration.
 */
export function getSupabaseConfig(): SupabasePublicConfig | null {
  const url = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const resolvedKey = resolvePublicKey();

  if (!url || !resolvedKey) {
    return null;
  }

  return {
    url,
    key: resolvedKey.key,
    keySource: resolvedKey.keySource,
  };
}

/**
 * Server-side variant that falls back to `SUPABASE_URL` if only the non-prefixed URL
 * is present on the server, while still using strictly public keys (never service_role).
 */
export function getSupabaseServerConfig(): SupabasePublicConfig | null {
  const publicConfig = getSupabaseConfig();
  if (publicConfig) {
    return publicConfig;
  }

  const serverUrl = normalizeUrl(process.env.SUPABASE_URL);
  const resolvedKey = resolvePublicKey();
  if (!serverUrl || !resolvedKey) {
    return null;
  }

  return {
    url: serverUrl,
    key: resolvedKey.key,
    keySource: resolvedKey.keySource,
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}
