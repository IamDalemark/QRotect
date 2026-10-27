/* eslint-disable @next/next/no-html-link-for-pages -- full document navigation keeps offline routes independent of RSC requests */
'use client';
import { QrCode, ArrowUpRight, House, List, BookOpen } from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { usePublic } from './context';
import { OfflineStatus } from './offline-status';
function subscribePath(callback: () => void) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}
export function PublicShell({ children }: { children: React.ReactNode }) {
  const { data, language, setLanguage, t, hydrated, preview } = usePublic();
  // A deterministic empty server value also hydrates the shared saved shell correctly.
  // Its real address can differ from the /offline route used to render that HTML.
  const path = useSyncExternalStore(
    subscribePath,
    () => window.location.pathname,
    () => '',
  );
  const site = useRef<HTMLDivElement>(null);
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = navigation.current;
    if (!element) return;
    const measure = () =>
      site.current?.style.setProperty(
        '--public-navigation-height',
        `${element.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const items = [
    { href: '/', label: t.home, Icon: House, active: path === '/' || path === '/offline' },
    { href: '/directory', label: t.directory, Icon: List, active: path === '/directory' },
    {
      href: '/guidance',
      label: t.guide,
      Icon: BookOpen,
      active: path === '/guidance' || path === '/campus-map',
    },
  ];
  return (
    <div className="public-site" ref={site}>
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <header className="masthead">
        <div className="header-inner">
          <a className="brand" href="/">
            <QrCode size={27} aria-hidden="true" />
            <span>
              QROTECT<small>Emergency Hotline System</small>
            </span>
          </a>
          <label className="language-label">
            {t.language}
            <select
              aria-label={t.language}
              disabled={!hydrated}
              value={language}
              onChange={(e) => setLanguage(e.target.value === 'hil' ? 'hil' : 'en')}
            >
              <option value="en">English</option>
              <option value="hil">Hiligaynon</option>
            </select>
          </label>
        </div>
      </header>
      <nav className="public-nav container" aria-label={t.navigation} ref={navigation}>
        {items.map(({ href, label, Icon, active }) => (
          <a href={href} key={href} aria-current={active ? 'page' : undefined}>
            <Icon className="nav-icon" size={20} aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <main id="main" className="container page-content">
        {!data ? (
          <div className="empty-state">
            <h1>{t.unavailable}</h1>
            <a className="button primary" href="/">
              {t.retry}
            </a>
          </div>
        ) : (
          children
        )}
      </main>
      {!preview && <OfflineStatus />}
      <footer className="site-footer">
        <div className="container footer-inner">
          <p>
            <strong>QROTECT</strong>
          </p>
          <div>
            <a href="/about">{t.about}</a>
            <a href="/admin">
              {t.adminSignIn}
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
