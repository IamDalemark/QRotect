'use client';
import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { formatPhilippineDate } from '@/lib/directory/date';
import { CopyNumber } from './copy-number';
import { localized, type Contact } from '@/lib/directory/schema';
import { usePublic } from './context';
import { CallConfirmation } from './call-confirmation';
export function ContactRow({ contact }: { contact: Contact }) {
  const { t, language } = usePublic();
  const [now] = useState(() => Date.now());
  const due = contact.verifiedAt && now - Date.parse(contact.verifiedAt) > 30 * 86400000;
  return (
    <article className="contact-row">
      <div className="contact-identity">
        <h3>{contact.agency}</h3>
        <p>{contact.branch}</p>
        <p className="description">{localized(contact.description, language)}</p>
      </div>
      <div className="number-list">
        {contact.numbers.map((n) => (
          <div className="number-line" key={n.id}>
            <div>
              <span className="number-label">
                {localized(n.label, language)}
                {n.channel === 'text' && ` · ${t.text}`}
              </span>
              <p className="phone-number">{n.display}</p>
              {n.extension && (
                <p>
                  {t.extension} {n.extension}
                </p>
              )}
            </div>
            <div className="number-actions">
              {n.channel === 'voice' && (
                <CallConfirmation agency={contact.agency} branch={contact.branch} number={n} />
              )}
              <CopyNumber value={n.display} name={contact.agency} />
            </div>
          </div>
        ))}
      </div>
      <div className="verification">
        {contact.verifiedAt
          ? `${t.verified}: ${formatPhilippineDate(contact.verifiedAt)}`
          : t.unverified}
        {due && <span className="warning-text"> · {t.review}</span>}
        {contact.source && (
          <a href={contact.source} target="_blank" rel="noreferrer">
            {t.source}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}
