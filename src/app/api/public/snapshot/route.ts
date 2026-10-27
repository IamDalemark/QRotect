import { currentSnapshot } from '@/lib/directory/server';
import { snapshotETag } from '@/lib/directory/public-etag';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const snapshot = await currentSnapshot();
    const etag = await snapshotETag(snapshot);
    const headers = { 'Cache-Control': 'no-store', ETag: etag };
    if (request.headers.get('If-None-Match') === etag)
      return new Response(null, { status: 304, headers });
    return Response.json(snapshot, { headers });
  } catch {
    return Response.json(
      { error: 'Directory unavailable. Try reconnecting.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
