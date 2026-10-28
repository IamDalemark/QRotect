'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { type Language, type Snapshot } from '@/lib/directory/schema';
import { preferNewerPublication } from '@/lib/directory/publication-order';
import { copy } from '@/lib/directory/labels';
import { fetchSnapshot } from '@/lib/directory/network';
import { retireOfflineAccess } from '@/lib/directory/legacy-offline';
export type ConnectionState = 'current' | 'failed' | 'disconnected';
const Context = createContext<{
  data: Snapshot | null;
  language: Language;
  t: typeof copy.en;
  setLanguage: (value: Language) => void;
  connection: ConnectionState;
  refresh: () => void;
  hydrated: boolean;
  preview: boolean;
}>(null!);
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('qrotect-language', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('qrotect-language', callback);
  };
}
let memoryLanguage: Language = 'en';
function getLanguage(): Language {
  try {
    const stored = localStorage.getItem('qrotect-language');
    return stored === 'hil' ? 'hil' : stored === 'en' ? 'en' : memoryLanguage;
  } catch {
    return memoryLanguage;
  }
}
export function PublicProvider({
  initial,
  children,
  preview = false,
}: {
  initial: Snapshot | null;
  children: ReactNode;
  preview?: boolean;
}) {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const language = useSyncExternalStore<Language>(subscribe, getLanguage, () => 'en');
  const [data, setData] = useState(initial);
  const [connection, setConnection] = useState<ConnectionState>('current');
  const queued = useRef<Snapshot | null>(null);
  const refreshRef = useRef(() => {});
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    // A private preview never refreshes or replaces the saved draft with public data.
    if (preview) return;
    void retireOfflineAccess();
    let active = true;
    let refreshing = false;
    let lastRefresh = 0;
    let displayed = initial;
    const apply = (snapshot: Snapshot) => {
      if (JSON.stringify(snapshot) === JSON.stringify(displayed)) return;
      displayed = snapshot;
      if (document.querySelector('[role="dialog"]')) queued.current = snapshot;
      else setData(snapshot);
    };
    const closed = () => {
      if (queued.current) {
        setData(queued.current);
        queued.current = null;
      }
    };
    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      lastRefresh = Date.now();
      try {
        const next = preferNewerPublication(displayed, await fetchSnapshot(displayed));
        if (!active) return;
        apply(next);
        setConnection('current');
      } catch {
        if (active) setConnection(navigator.onLine ? 'failed' : 'disconnected');
      } finally {
        refreshing = false;
      }
    }
    const refreshNow = () => {
      void refresh();
    };
    refreshRef.current = refreshNow;
    if (navigator.onLine) refreshNow();
    const disconnected = () => setConnection('disconnected');
    const visibleRefresh = () => {
      if (
        document.visibilityState === 'visible' &&
        navigator.onLine &&
        Date.now() - lastRefresh >= 60_000
      )
        refreshNow();
    };
    const interval = window.setInterval(visibleRefresh, 60_000);
    document.addEventListener('visibilitychange', visibleRefresh);
    window.addEventListener('online', refreshNow);
    window.addEventListener('offline', disconnected);
    window.addEventListener('qrotect-dialog-closed', closed);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', visibleRefresh);
      window.removeEventListener('online', refreshNow);
      window.removeEventListener('offline', disconnected);
      window.removeEventListener('qrotect-dialog-closed', closed);
    };
  }, [initial, preview]);
  function setLanguage(value: Language) {
    memoryLanguage = value;
    try {
      localStorage.setItem('qrotect-language', value);
    } catch {
      /* preference storage is optional */
    }
    window.dispatchEvent(new Event('qrotect-language'));
  }
  return (
    <Context.Provider
      value={{
        data,
        hydrated,
        preview,
        language,
        t: copy[language],
        setLanguage,
        connection,
        refresh: () => refreshRef.current(),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePublic() {
  return useContext(Context);
}
