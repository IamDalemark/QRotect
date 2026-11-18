import 'server-only';
import { requireAdminForRender } from './auth';
import { snapshotSchema } from '@/lib/directory/schema';

const loadingError = 'Administrator data could not be loaded. Reconnect and reload.';

export type AdminEditorSection = 'contacts' | 'quick-calls' | 'guidance' | 'map';

export async function loadAdminOverview() {
  const { client } = await requireAdminForRender();
  const [contacts, publication] = await Promise.all([
    client.from('contacts').select('id', { count: 'exact', head: true }).eq('draft_id', true),
    client.from('publications').select('created_at').eq('current', true).maybeSingle(),
  ]);
  if (contacts.error || contacts.count === null || publication.error) throw new Error(loadingError);
  return { contactCount: contacts.count, publishedAt: publication.data?.created_at ?? null };
}

export async function loadAdminHistory() {
  const { client } = await requireAdminForRender();
  const [draft, publications, events] = await Promise.all([
    client.from('directory_drafts').select('revision').eq('id', true).single(),
    client
      .from('publications')
      .select('id,created_at,current')
      .order('created_at', { ascending: false })
      .limit(20),
    client
      .from('audit_events')
      .select('id,action,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);
  if (draft.error || !draft.data || publications.error || events.error)
    throw new Error(loadingError);
  return {
    revision: draft.data.revision,
    publications: publications.data,
    events: events.data,
  };
}

export async function loadAdminEditor(section: AdminEditorSection | 'preview') {
  const { client } = await requireAdminForRender();
  const [draft, published] = await Promise.all([
    client.rpc('get_directory_draft').single(),
    section === 'quick-calls'
      ? client.from('publications').select('snapshot').eq('current', true).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (draft.error || !draft.data || published.error) throw new Error(loadingError);
  return {
    initial: snapshotSchema.parse(draft.data.payload),
    initialRevision: draft.data.revision,
    publishedContacts: published.data ? snapshotSchema.parse(published.data.snapshot).contacts : [],
  };
}
