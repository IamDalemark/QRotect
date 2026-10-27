import type { Snapshot } from './schema';
import { demoQuickCalls } from './quick-calls';

// Old fixture publications and saved v1 directories carry retired interface copy.
// Only these exact authored sample descriptions change; numbers and real records stay intact.
export function publicSnapshot(snapshot: Snapshot): Snapshot {
  if (!snapshot.fixture) return snapshot;
  return {
    ...snapshot,
    // Upgrade only the known authored demo IDs; never infer a real destination.
    quickCalls: snapshot.quickCalls ?? demoQuickCalls,
    contacts: snapshot.contacts.map((contact) => ({
      ...contact,
      description: {
        en:
          contact.description.en ===
          'Sample entry for navigation and simulated calling. Replace with an approved contact.'
            ? 'School and public contact directory.'
            : contact.description.en,
        hil:
          contact.description.hil ===
          'Halimbawa lamang para sa pagpraktis. Kinahanglan sang gin-aprobahan nga impormasyon.'
            ? 'Listahan sang mga kontak sa eskwelahan kag publiko.'
            : contact.description.hil,
      },
    })),
  };
}
