'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { type Language, type Snapshot } from '@/lib/directory/schema';
import { copy } from '@/lib/directory/labels';
const Context = createContext<{
  data: Snapshot | null;
  language: Language;
  t: typeof copy.en;
  setLanguage: (value: Language) => void;
}>(null!);
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('qrotect-language', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('qrotect-language', callback);
  };
}
function getLanguage(): Language {
  try {
    return localStorage.getItem('qrotect-language') === 'hil' ? 'hil' : 'en';
  } catch {
    return 'en';
  }
}
export function PublicProvider({
  initial,
  children,
}: {
  initial: Snapshot | null;
  children: ReactNode;
}) {
  const language = useSyncExternalStore<Language>(subscribe, getLanguage, () => 'en');
  const [data] = useState(initial);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  function setLanguage(value: Language) {
    try {
      localStorage.setItem('qrotect-language', value);
    } catch {
      /* device storage is optional */
    }
    window.dispatchEvent(new Event('qrotect-language'));
  }
  return (
    <Context.Provider value={{ data, language, t: copy[language], setLanguage }}>
      {children}
    </Context.Provider>
  );
}
export function usePublic() {
  return useContext(Context);
}
