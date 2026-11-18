'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { restorePublication } from '@/app/admin/content-actions';

const RestoreContext = createContext<{ pending: boolean; restore: (id: string) => void } | null>(
  null,
);

export function PublicationRestore({
  revision,
  children,
}: {
  revision: number;
  children: ReactNode;
}) {
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const feedbackRegion = useRef<HTMLElement>(null);
  useEffect(() => {
    if (feedback?.ok) feedbackRegion.current?.focus();
  }, [feedback]);

  function restore(id: string) {
    if (
      !window.confirm(
        'Restore this entire directory version, including contacts, assignments, guidance and map?',
      )
    )
      return;
    start(async () => {
      try {
        setFeedback(await restorePublication(id, revision));
      } catch {
        setFeedback({
          ok: false,
          message: 'Restore could not be confirmed. Reload and check the public directory.',
        });
      }
    });
  }

  return (
    <RestoreContext.Provider value={{ pending, restore }}>
      <div className="admin-title">
        <div>
          <h1>Publication history</h1>
          {feedback && (
            <section
              className="admin-status admin-feedback"
              role="status"
              aria-live="polite"
              tabIndex={-1}
              ref={feedbackRegion}
            >
              <h2>{feedback.ok ? 'Version restored' : 'Check this update'}</h2>
              <p>{feedback.message}</p>
            </section>
          )}
        </div>
      </div>
      {children}
    </RestoreContext.Provider>
  );
}

export function RestorePublicationButton({ id, current }: { id: string; current: boolean }) {
  const context = useContext(RestoreContext);
  if (!context) throw new Error('RestorePublicationButton requires PublicationRestore.');
  return (
    <button
      type="button"
      className="button secondary"
      disabled={context.pending || current}
      onClick={() => context.restore(id)}
    >
      Restore as new publication
    </button>
  );
}
