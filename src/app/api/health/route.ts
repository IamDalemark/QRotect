import { loadCurrentSnapshot, databaseConfigured } from '@/lib/directory/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await loadCurrentSnapshot();
    return Response.json(
      { status: 'ok', database: databaseConfigured() ? 'connected' : 'not-configured' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { status: 'degraded' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
