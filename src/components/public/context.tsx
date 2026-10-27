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
import { copy } from '@/lib/directory/labels';
import {
  fetchSnapshot,
  readSaved,
  saveSnapshot,
  type SavedDirectory,
} from '@/lib/directory/offline';
type OfflineState = {
  status: 'preparing' | 'ready' | 'offline' | 'failed' | 'unavailable';
  saved: SavedDirectory | null;
  update: ServiceWorkerRegistration | null;
};
const Context = createContext<{
  data: Snapshot | null;
  language: Language;
  t: typeof copy.en;
  setLanguage: (value: Language) => void;
  offline: OfflineState;
  refresh: () => void;
  hydrated: boolean;
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
}: {
  initial: Snapshot | null;
  children: ReactNode;
}) {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const language = useSyncExternalStore<Language>(subscribe, getLanguage, () => 'en');
  const [data, setData] = useState(initial);
  const [offline, setOffline] = useState<OfflineState>({
    status: 'preparing',
    saved: null,
    update: null,
  });
  const queued = useRef<Snapshot | null>(null);
  const refreshRef = useRef(() => {});
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    let active = true;
    let refreshing = false;
    const apply = (snapshot: Snapshot) => {
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
      try {
        const next = await fetchSnapshot();
        if (!active) return;
        apply(next);
        try {
          const saved = await saveSnapshot(next);
          if (!active) return;
          const shell = await caches.match('/offline', { ignoreSearch: true });
          setOffline((old) => ({
            ...old,
            saved,
            status: shell && navigator.serviceWorker.controller ? 'ready' : 'preparing',
          }));
        } catch {
          if (active) setOffline((old) => ({ ...old, status: 'unavailable' }));
        }
      } catch {
        if (active)
          setOffline((old) => ({ ...old, status: navigator.onLine ? 'failed' : 'offline' }));
      } finally {
        refreshing = false;
      }
    }
    refreshRef.current = () => {
      void refresh();
    };
    async function start() {
      try {
        const saved = await readSaved();
        if (!active) return;
        if (saved) {
          if (!initial) apply(saved.snapshot);
          setOffline((old) => ({
            ...old,
            saved,
            status: navigator.onLine ? 'preparing' : 'offline',
          }));
        }
      } catch {
        if (active) setOffline((old) => ({ ...old, status: 'unavailable' }));
      }
      if (active) void refresh();
      if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          if (registration.waiting && active)
            setOffline((old) => ({ ...old, update: registration }));
          registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            installing?.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller && active)
                setOffline((old) => ({ ...old, update: registration }));
            });
          });
          await navigator.serviceWorker.ready;
        } catch {
          if (active) setOffline((old) => ({ ...old, status: 'unavailable' }));
        }
      }
      if (active) void refresh();
    }
    void start();
    const disconnected = () => setOffline((old) => ({ ...old, status: 'offline' }));
    window.addEventListener('online', refreshRef.current);
    window.addEventListener('offline', disconnected);
    window.addEventListener('qrotect-dialog-closed', closed);
    navigator.serviceWorker?.addEventListener('controllerchange', refreshRef.current);
    return () => {
      active = false;
      window.removeEventListener('online', refreshRef.current);
      window.removeEventListener('offline', disconnected);
      window.removeEventListener('qrotect-dialog-closed', closed);
      navigator.serviceWorker?.removeEventListener('controllerchange', refreshRef.current);
    };
  }, [initial]);
  function setLanguage(value: Language) {
    memoryLanguage = value;
    try {
      localStorage.setItem('qrotect-language', value);
    } catch {
      /* storage is optional */
    }
    window.dispatchEvent(new Event('qrotect-language'));
  }
  return (
    <Context.Provider
      value={{
        data,
        hydrated,
        language,
        t: copy[language],
        setLanguage,
        offline,
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
