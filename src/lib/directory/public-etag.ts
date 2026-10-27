import type { Snapshot } from './schema';

// Hash the complete payload, including copy normalized at the public boundary.
// Reused version identifiers or a code-only copy correction must not hide updates.
export async function snapshotETag(snapshot: Snapshot): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(snapshot)),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
  return `"${hex}"`;
}
