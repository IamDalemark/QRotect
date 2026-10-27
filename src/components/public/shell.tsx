/* eslint-disable @next/next/no-html-link-for-pages -- full document navigation keeps offline routes independent of RSC requests */
'use client';
import { QrCode, ArrowUpRight } from 'lucide-react';
import { usePublic } from './context';
import { OfflineStatus } from './offline-status';
export function PublicShell({ children }: { children: React.ReactNode }) {
  const { data, language, setLanguage, t, hydrated } = usePublic();
  return (
    <>
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
      <nav className="public-nav container" aria-label={t.navigation}>
        <a href="/">{t.home}</a>
        <a href="/directory">{t.directory}</a>
        {Boolean(data?.guidance.length) && <a href="/guidance">{t.guidance}</a>}
        {data?.map && <a href="/campus-map">{t.map}</a>}
        <a href="/about">{t.about}</a>
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
      <OfflineStatus />
      <footer className="site-footer">
        <div className="container footer-inner">
          <p>
            <strong>QROTECT</strong>
          </p>
          <div>
            <a href="/admin">
              {t.adminSignIn}
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
