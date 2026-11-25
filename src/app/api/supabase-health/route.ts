import { NextResponse } from 'next/server';
import { getSupabaseConfig, getSupabaseServerConfig } from '@/lib/supabase/config';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Read-only diagnostic endpoint that verifies:
 * 1. Public Supabase env vars are configured for the browser (`browserConfigured`),
 * 2. Supabase PostgREST is reachable (`reachable`),
 * 3. Migration `0001_initial_schema.sql` has been applied (`schemaReady`).
 *
 * Never returns URLs, API keys, or user data.
 */
export async function GET() {
  const browserConfig = getSupabaseConfig();
  const serverConfig = getSupabaseServerConfig();

  if (!serverConfig) {
    return NextResponse.json(
      {
        configured: false,
        browserConfigured: false,
        reachable: false,
        schemaReady: false,
        keySource: 'none',
        hint: 'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in Vercel / .env.local and redeploy.',
      },
      { status: 200 },
    );
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      {
        configured: false,
        browserConfigured: Boolean(browserConfig),
        reachable: false,
        schemaReady: false,
        keySource: serverConfig.keySource,
        hint: 'Supabase client could not be initialized.',
      },
      { status: 200 },
    );
  }

  try {
    const { data, error } = await supabase
      .from('healthcheck')
      .select('id, status')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      const missingTable =
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message.toLowerCase().includes('healthcheck');

      return NextResponse.json(
        {
          configured: true,
          browserConfigured: Boolean(browserConfig),
          reachable: true,
          schemaReady: false,
          keySource: serverConfig.keySource,
          hint: missingTable
            ? 'Supabase is connected, but SQL migration supabase/migrations/0001_initial_schema.sql has not been applied yet.'
            : `Supabase responded with error: ${error.code ?? 'unknown'}`,
        },
        { status: 200 },
      );
    }

    const schemaReady = data?.status === 'ok';
    return NextResponse.json(
      {
        configured: true,
        browserConfigured: Boolean(browserConfig),
        reachable: true,
        schemaReady,
        keySource: serverConfig.keySource,
        hint: !browserConfig
          ? 'Server has SUPABASE_URL, but NEXT_PUBLIC_SUPABASE_URL is missing for browser auth.'
          : schemaReady
            ? 'Supabase is connected and schema is ready.'
            : 'Table public.healthcheck exists, but seed row (id=1) is missing.',
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        configured: true,
        browserConfigured: Boolean(browserConfig),
        reachable: false,
        schemaReady: false,
        keySource: serverConfig.keySource,
        hint: 'Could not reach Supabase URL. Check NEXT_PUBLIC_SUPABASE_URL and project status.',
      },
      { status: 200 },
    );
  }
}
