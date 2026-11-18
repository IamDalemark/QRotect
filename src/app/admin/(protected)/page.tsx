import { AdminLink } from '@/components/admin/admin-shell';
import { loadAdminOverview } from '@/lib/admin/data';
import { formatPhilippineDate } from '@/lib/directory/date';

export default async function Page() {
  const { contactCount, publishedAt } = await loadAdminOverview();
  return (
    <>
      <div className="admin-title">
        <h1>Directory overview</h1>
      </div>
      <p>
        View your contact totals and latest publication, and access tools for managing contacts,
        Home quick calls, guidance, and the campus map.
      </p>
      <dl className="overview-list">
        <dt>Stored contacts</dt>
        <dd>{contactCount}</dd>
        <dt>Last publication</dt>
        <dd>{publishedAt ? formatPhilippineDate(publishedAt) : 'Not published'}</dd>
      </dl>
      <AdminLink href="/admin/contacts" className="button primary">
        Manage contacts
      </AdminLink>
    </>
  );
}
