import 'server-only';
import { requireAdmin } from './auth';
import { snapshotSchema } from '@/lib/directory/schema';
export async function dashboard() {
  const { client } = await requireAdmin();
  const [draft, history, events] = await Promise.all([
    client.rpc('get_directory_draft').single(),
    client
      .from('publications')
      .select('id,created_at,current')
      .order('created_at', { ascending: false })
      .limit(20),
    client
      .from('audit_events')
      .select('id,action,revision:draft_revision,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);
  if (draft.error || !draft.data || history.error || events.error)
    throw new Error('Administrator data could not be loaded. Reconnect and reload.');
  return {
    initial: snapshotSchema.parse(draft.data.payload),
    initialRevision: draft.data.revision,
    history: history.data,
    events: events.data,
  };
}
