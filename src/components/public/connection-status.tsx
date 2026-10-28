'use client';
import { RefreshCw, WifiOff } from 'lucide-react';
import { usePublic } from './context';
export function ConnectionStatus() {
  const { connection, t, refresh } = usePublic();
  if (connection === 'current') return null;
  return (
    <aside className="connection-status container" aria-label={t.connection}>
      <div role="status">
        <WifiOff size={16} aria-hidden="true" />
        <span>{connection === 'disconnected' ? t.disconnected : t.failed}</span>
        <button onClick={refresh} className="button secondary">
          <RefreshCw size={15} aria-hidden="true" />
          {t.retry}
        </button>
      </div>
    </aside>
  );
}
