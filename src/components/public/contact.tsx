'use client';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Phone, Copy, X, Check, ExternalLink } from 'lucide-react';
import { localized, type Contact } from '@/lib/directory/schema';
import { usePublic } from './context';
export function PracticeCall({
  agency,
  branch = '',
  number,
}: {
  agency: string;
  branch?: string;
  number: string;
}) {
  const { t } = usePublic();
  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) window.dispatchEvent(new Event('qrotect-dialog-closed'));
      }}
    >
      <Dialog.Trigger asChild>
        <button className="button primary">
          <Phone size={17} aria-hidden="true" />
          {t.practice}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-shade" />
        <Dialog.Content className="dialog-panel">
          <Dialog.Title>{t.simulation}</Dialog.Title>
          <Dialog.Description>{t.noCall}</Dialog.Description>
          <p className="dialog-agency">{agency}</p>
          {branch && <p>{branch}</p>}
          <p className="phone-number">{number}</p>
          <Dialog.Close className="button primary">{t.close}</Dialog.Close>
          <Dialog.Close className="icon-button dialog-x" aria-label={t.close}>
            <X aria-hidden="true" size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ContactRow({ contact }: { contact: Contact }) {
  const { t, language } = usePublic();
  const [feedback, setFeedback] = useState('');
  const [now] = useState(() => Date.now());
  const due = contact.verifiedAt && now - Date.parse(contact.verifiedAt) > 30 * 86400000;
  async function copyNumber(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(t.copied);
    } catch {
      setFeedback(t.manual);
    }
  }
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
                <PracticeCall agency={contact.agency} branch={contact.branch} number={n.display} />
              )}
              <button
                className="button secondary"
                onClick={() => copyNumber(n.display)}
                aria-label={`${t.copy}: ${contact.agency}`}
              >
                <Copy size={16} aria-hidden="true" />
                {t.copy}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="verification">
        {contact.verifiedAt ? `${t.verified}: ${contact.verifiedAt}` : t.unverified}
        {due && <span className="warning-text"> · {t.review}</span>}
        {contact.source && (
          <a href={contact.source} target="_blank" rel="noreferrer">
            {t.source}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        )}
      </div>
      <p className="feedback" role="status">
        {feedback && (
          <>
            <Check size={15} aria-hidden="true" />
            {feedback}
          </>
        )}
      </p>
    </article>
  );
}
