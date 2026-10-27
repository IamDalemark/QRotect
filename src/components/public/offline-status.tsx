'use client';
import { useState } from 'react';
import { WifiOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { snapshotIsOld } from '@/lib/directory/offline';
import { usePublic } from './context';
export function OfflineStatus() {
  const { offline, t, refresh, language } = usePublic();
  const [now] = useState(() => Date.now());
  const label =
    offline.status === 'ready'
      ? t.ready
      : offline.status === 'offline'
        ? t.offline
        : offline.status === 'failed'
          ? t.failed
          : offline.status === 'unavailable'
            ? t.notSaved
            : process.env.NODE_ENV === 'production'
              ? t.saving
              : language === 'en'
                ? 'Offline access is enabled in production builds.'
                : 'Ang offline nga paggamit para sa production build.';
  return (
    <aside className="offline-status container" aria-label={t.connection}>
      <div>
        {offline.status === 'ready' ? (
          <CheckCircle2 size={16} aria-hidden="true" />
        ) : (
          <WifiOff size={16} aria-hidden="true" />
        )}
        <span>{label}</span>
        {['failed', 'offline'].includes(offline.status) && (
          <button onClick={refresh} className="button secondary">
            <RefreshCw size={15} aria-hidden="true" />
            {t.retry}
          </button>
        )}
      </div>
      {offline.saved && (
        <p>
          {t.saved}:{' '}
          {new Date(offline.saved.savedAt).toLocaleString(language === 'en' ? 'en-PH' : 'hil-PH')}
          <br />
          {offline.saved.snapshot.publishedAt
            ? `${t.published}: ${new Date(offline.saved.snapshot.publishedAt).toLocaleDateString('en-PH')}`
            : t.never}
          {offline.saved.snapshot.map && (
            <>
              <br />
              {offline.saved.mapSaved ? t.mapReady : t.mapMissing}
            </>
          )}
          {snapshotIsOld(offline.saved.savedAt, now) && (
            <>
              <br />
              <strong>{t.outdated}</strong>
            </>
          )}
        </p>
      )}
      {offline.update?.waiting && (
        <button
          className="button secondary"
          onClick={() => {
            navigator.serviceWorker.addEventListener(
              'controllerchange',
              () => window.location.reload(),
              { once: true },
            );
            offline.update?.waiting?.postMessage({ type: 'SKIP_WAITING' });
          }}
        >
          {language === 'en' ? 'Update website when ready' : 'I-update ang website'}
        </button>
      )}
    </aside>
  );
}
