import { currentSnapshot } from '@/lib/directory/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return Response.json(await currentSnapshot(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json(
      { error: 'Directory unavailable. Try reconnecting.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
