import type { Snapshot } from './schema';

// Restores receive a new publication timestamp. A slower cache node must not
// roll a device back after it has already received that newer publication.
export function preferNewerPublication(current: Snapshot | null, incoming: Snapshot): Snapshot {
  if (
    current?.publishedAt &&
    incoming.publishedAt &&
    Date.parse(current.publishedAt) > Date.parse(incoming.publishedAt)
  )
    return current;
  return incoming;
}
