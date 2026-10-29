'use client';
import { usePathname } from 'next/navigation';

function Lines({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-field">
          <span className="skeleton-label" />
          <span className="skeleton-input" />
        </div>
      ))}
    </>
  );
}
export function AdminLoading() {
  const section = usePathname().split('/')[2] || 'overview';
  const editor = ['contacts', 'guidance', 'quick-calls'].includes(section);
  return (
    <section
      role="status"
      aria-label="Loading administrator content"
      aria-busy="true"
      className="admin-loading"
    >
      <span className="sr-only">Loading administrator content…</span>
      <div aria-hidden="true">
        <div className="admin-title">
          <span className="skeleton-heading" />
        </div>
        {section === 'overview' ? (
          <div className="overview-list">
            <Lines count={4} />
          </div>
        ) : section === 'history' ? (
          <div className="editor-fields">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-panel">
                <Lines count={2} />
              </div>
            ))}
          </div>
        ) : (
          <div className={editor ? 'contact-editor-layout' : ''}>
            {editor && (
              <aside className="draft-list">
                <span className="skeleton-input" />
                <Lines count={4} />
              </aside>
            )}
            <div className="editor-fields">
              {section === 'map' && <div className="skeleton-map" />}
              <Lines count={section === 'password' ? 2 : 3} />
              {section !== 'password' && (
                <div className="skeleton-panel">
                  <Lines count={2} />
                </div>
              )}
              <span className="skeleton-button" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
