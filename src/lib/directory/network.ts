import { snapshotETag } from './public-etag';
import { publicSnapshot } from './public-snapshot';
import { snapshotSchema, type Snapshot } from './schema';

export async function fetchSnapshot(current?: Snapshot | null): Promise<Snapshot> {
  const headers: HeadersInit = current ? { 'If-None-Match': await snapshotETag(current) } : {};
  const response = await fetch('/api/public/snapshot', {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(3000),
  });
  if (response.status === 304 && current) return current;
  if (!response.ok) throw new Error('Refresh unavailable');
  return publicSnapshot(snapshotSchema.parse(await response.json()));
}
