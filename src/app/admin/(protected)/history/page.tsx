import {
  PublicationRestore,
  RestorePublicationButton,
} from '@/components/admin/publication-restore';
import { loadAdminHistory } from '@/lib/admin/data';
import { formatPhilippineDate } from '@/lib/directory/date';

export default async function Page() {
  const { revision, publications, events } = await loadAdminHistory();
  return (
    <PublicationRestore revision={revision}>
      <p>
        Each item update creates a complete version. Restoring a version replaces the whole public
        directory.
      </p>
      {publications.map((publication) => (
        <article key={publication.id} className="history-row">
          <h2>{publication.current ? 'Current publication' : 'Previous publication'}</h2>
          <p>{formatPhilippineDate(publication.created_at)}</p>
          <p>{publication.id}</p>
          <RestorePublicationButton id={publication.id} current={publication.current} />
        </article>
      ))}
      <h2>Activity</h2>
      {events.map((event) => (
        <p key={event.id}>
          {formatPhilippineDate(event.created_at)} · {event.action}
        </p>
      ))}
    </PublicationRestore>
  );
}
