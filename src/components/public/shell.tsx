/* eslint-disable @next/next/no-html-link-for-pages -- full document navigation keeps offline routes independent of RSC requests */
'use client';
import { QrCode, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { usePublic } from './context';
export function PublicShell({ children }: { children: React.ReactNode }) {
  const { data, language, setLanguage, t } = usePublic();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="masthead">
        <div className="header-inner">
          <a className="brand" href="/">
            <QrCode size={27} aria-hidden="true" />
            <span>
              QROTECT<small>CPU · ILOILO CITY</small>
            </span>
          </a>
          <label className="language-label">
            Language
            <select
              aria-label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value === 'hil' ? 'hil' : 'en')}
            >
              <option value="en">English</option>
              <option value="hil">Hiligaynon</option>
            </select>
          </label>
        </div>
      </header>
      <div className="research-strip">
        <div className="container">
          <ShieldCheck size={16} aria-hidden="true" />
          {t.research}
        </div>
      </div>
      <nav className="public-nav container" aria-label="Main navigation">
        <a href="/">{t.home}</a>
        <a href="/directory">{t.directory}</a>
        {Boolean(data?.guidance.length) && <a href="/guidance">{t.guidance}</a>}
        {data?.map && <a href="/campus-map">{t.map}</a>}
        <a href="/about">{t.about}</a>
      </nav>
      {data?.fixture && (
        <div className="sample-notice container" role="note">
          {t.samples}
        </div>
      )}
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
      <footer className="site-footer">
        <div className="container footer-inner">
          <p>
            <strong>QROTECT</strong>
            <br />
            {t.research}
          </p>
          <div>
            <a href="/practice">
              {t.practiceTitle}
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <a href="/admin">
              Admin sign in
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
