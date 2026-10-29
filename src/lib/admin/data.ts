import 'server-only';
import { requireAdmin } from './auth';
import { snapshotSchema } from '@/lib/directory/schema';

type History = { id: string; created_at: string; current: boolean };
type AuditEvent = { id: number; action: string; revision: number | null; created_at: string };

export async function dashboard(section = 'overview') {
  const { client } = await requireAdmin();
  // Editing and private previews only need the draft. Overview needs the actual
  // current publication, even if it is older than the history page's 20 rows.
  const historyRequest =
    section === 'history'
      ? client
          .from('publications')
          .select('id,created_at,current')
          .order('created_at', { ascending: false })
          .limit(20)
      : section === 'overview'
        ? client.from('publications').select('id,created_at,current').eq('current', true).limit(1)
        : Promise.resolve({ data: [] as History[], error: null });
  const eventsRequest =
    section === 'history'
      ? client
          .from('audit_events')
          .select('id,action,revision:draft_revision,created_at')
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as AuditEvent[], error: null });
  const [draft, history, events] = await Promise.all([
    client.rpc('get_directory_draft').single(),
    historyRequest,
    eventsRequest,
  ]);
  if (draft.error || !draft.data || history.error || events.error)
    throw new Error('Administrator data could not be loaded. Reconnect and reload.');
  return {
    initial: snapshotSchema.parse(draft.data.payload),
    initialRevision: draft.data.revision,
    history: history.data ?? [],
    events: events.data ?? [],
  };
}
