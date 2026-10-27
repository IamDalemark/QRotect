/* eslint-disable @next/next/no-html-link-for-pages -- full document navigation keeps offline routes independent of RSC requests */
'use client';
import { useState, useSyncExternalStore } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Shield,
  Flame,
  HeartPulse,
  Hospital,
  CloudLightning,
  School,
  Search,
  Map,
  ZoomIn,
  ZoomOut,
  Download,
} from 'lucide-react';
import { categoryIds, localized, searchContacts, type Category } from '@/lib/directory/schema';
import { categories, areas } from '@/lib/directory/labels';
import { usePublic } from './context';
import { ContactRow } from './contact';
import { CallConfirmation } from './call-confirmation';
const icons = {
  police: Shield,
  fire: Flame,
  medical: HeartPulse,
  hospital: Hospital,
  disaster: CloudLightning,
  school: School,
};
export function HomeScreen() {
  const { data, t, language } = usePublic();
  if (!data) return null;
  return (
    <>
      <div className="page-heading">
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </div>
      <section className="emergency-line" aria-label={t.nationalEmergency}>
        <div className="emergency-number">911</div>
        <div className="emergency-copy">
          <h2>
            {language === 'en' ? 'National emergency line' : 'Nasyonal nga linya sa emerhensya'}
          </h2>
          <p>{t.phoneHint}</p>
        </div>
        <CallConfirmation
          agency={t.nationalEmergency}
          number={{
            id: 'national-emergency',
            label: { en: 'Voice line', hil: 'Linya sa pagtawag' },
            display: '911',
            dial: '911',
            extension: '',
            channel: 'voice',
          }}
        />
      </section>
      <section className="category-section">
        <h2>{t.category}</h2>
        <div className="category-grid">
          {categoryIds.map((id) => {
            const Icon = icons[id];
            return (
              <a className="category-link" href={`/directory?category=${id}`} key={id}>
                <Icon size={25} aria-hidden="true" />
                <span>{localized(categories[id], language)}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            );
          })}
        </div>
      </section>
      <section className="directory-search">
        <h2>{t.search}</h2>
        <form action="/directory" className="search-form">
          <label htmlFor="home-search" className="sr-only">
            {t.search}
          </label>
          <Search aria-hidden="true" size={20} />
          <input id="home-search" name="q" placeholder={t.searchHint} />
          <button className="button primary" type="submit">
            {t.search}
          </button>
        </form>
      </section>
      <section>
        <div className="section-heading">
          <h2>{t.priority}</h2>
          <a href="/directory">
            {t.directory}
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
        {data.contacts
          .filter((c) => c.active && c.priority)
          .slice(0, 3)
          .map((c) => (
            <ContactRow key={c.id} contact={c} />
          ))}
        {!data.contacts.some((c) => c.active && c.priority) && (
          <p className="empty-state">{t.empty}</p>
        )}
      </section>
    </>
  );
}
function subscribeQuery(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener('qrotect-query', callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('qrotect-query', callback);
  };
}
export function DirectoryScreen({ initialSearch }: { initialSearch: string }) {
  const { data, t, language } = usePublic();
  const query = useSyncExternalStore(
    subscribeQuery,
    () => window.location.search,
    () => initialSearch,
  );
  const params = new URLSearchParams(query);
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const area = params.get('area') || '';
  function update(key: string, value: string, replace = false) {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    window.history[replace ? 'replaceState' : 'pushState'](
      null,
      '',
      `/directory${next.size ? `?${next}` : ''}`,
    );
    window.dispatchEvent(new Event('qrotect-query'));
  }
  const results = searchContacts(data?.contacts || [], q, category, area);
  return (
    <>
      <div className="page-heading">
        <a className="back-link" href="/">
          <ArrowLeft size={16} aria-hidden="true" /> {t.home}
        </a>
        <h1>
          {categoryIds.includes(category as Category)
            ? localized(categories[category as Category], language)
            : t.directory}
        </h1>
        <p>{t.intro}</p>
      </div>
      <div className="directory-layout">
        <aside className="filters" aria-label={t.filters}>
          <label>
            {t.search}
            <input
              value={q}
              placeholder={t.searchHint}
              onChange={(e) => update('q', e.target.value, true)}
            />
          </label>
          <label>
            {t.category}
            <select value={category} onChange={(e) => update('category', e.target.value)}>
              <option value="">{t.allCategories}</option>
              {categoryIds.map((id) => (
                <option key={id} value={id}>
                  {localized(categories[id], language)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.area}
            <select value={area} onChange={(e) => update('area', e.target.value)}>
              <option value="">{t.allAreas}</option>
              {Object.entries(areas).map(([id, name]) => (
                <option key={id} value={id}>
                  {localized(name, language)}
                </option>
              ))}
            </select>
          </label>
          <a href="/directory">{t.reset}</a>
        </aside>
        <section aria-live="polite" aria-label={t.contactResults}>
          <p className="result-count">
            {results.length} {t.results}
          </p>
          {results.map((c) => (
            <ContactRow key={c.id} contact={c} />
          ))}
          {!results.length && (
            <div className="empty-state">
              <h2>{t.empty}</h2>
              <a href="/directory">{t.reset}</a>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
export function GuidanceScreen() {
  const { data, t, language } = usePublic();
  return (
    <>
      <div className="page-heading">
        <h1>{t.guidance}</h1>
      </div>
      {!data?.guidance.length && <Empty text={t.noGuidance} />}
      {data?.guidance.map((g) => (
        <article className="guide" key={g.id}>
          <h2>{localized(g.title, language)}</h2>
          <ol>
            {g.steps.map((s, i) => (
              <li key={i}>{localized(s, language)}</li>
            ))}
          </ol>
          <p>
            {g.reviewedAt} · {g.reviewer}
          </p>
          <a href={g.source} target="_blank" rel="noreferrer">
            {t.source}
          </a>
          <a className="button secondary" href={`/directory?category=${g.category}`}>
            {t.directory}
          </a>
        </article>
      ))}
    </>
  );
}
export function MapScreen() {
  const { data, t, language } = usePublic();
  const [zoom, setZoom] = useState(1);
  const map = data?.map;
  return (
    <>
      <div className="page-heading">
        <h1>{t.map}</h1>
      </div>
      {!map ? (
        <Empty text={t.noMap} />
      ) : (
        <>
          <p>{localized(map.description, language)}</p>
          <div className="map-controls">
            <button
              className="button secondary"
              disabled={zoom >= 3}
              onClick={() => setZoom(Math.min(3, zoom + 0.5))}
            >
              <ZoomIn size={18} aria-hidden="true" />
              {t.zoomIn}
            </button>
            <button
              className="button secondary"
              disabled={zoom <= 1}
              onClick={() => setZoom(Math.max(1, zoom - 0.5))}
            >
              <ZoomOut size={18} aria-hidden="true" />
              {t.zoomOut}
            </button>
            <button className="button secondary" onClick={() => setZoom(1)}>
              {t.actualSize}
            </button>
            <a className="button secondary" download href={`/api/public/maps/${map.id}`}>
              <Download size={18} aria-hidden="true" />
              {t.download}
            </a>
          </div>
          <div className="map-viewport" tabIndex={0} aria-label={t.map}>
            {/* eslint-disable-next-line @next/next/no-img-element -- versioned approved asset supports offline downloads */}
            <img
              src={`/api/public/maps/${map.id}`}
              alt={localized(map.description, language)}
              style={{ width: `${zoom * 100}%`, maxWidth: 'none' }}
            />
          </div>
          <h2>{t.guidance}</h2>
          <ol className="guide-steps">
            {map.instructions.map((s, i) => (
              <li key={i}>{localized(s, language)}</li>
            ))}
          </ol>
          <p>
            {t.updated}: {map.reviewedAt} · {map.reviewer}
          </p>
        </>
      )}
    </>
  );
}
function Empty({ text }: { text: string }) {
  const { t } = usePublic();
  return (
    <div className="empty-state">
      <Map size={30} aria-hidden="true" />
      <h2>{text}</h2>
      <a href="/directory">{t.back}</a>
    </div>
  );
}
export function AboutScreen() {
  const { t, language } = usePublic();
  return (
    <article className="reading-page">
      <div className="page-heading">
        <h1>{t.about}</h1>
      </div>
      <h2>{language === 'en' ? 'A school research prototype' : 'Prototipo para sa panaliksik'}</h2>
      <p>
        {language === 'en'
          ? 'QROTECT helps CPU Senior High School learners find school and public emergency contacts. It is a school research project, not an official dispatch service. Confirm a contact and swipe to open the selected number in your phone app. Your device handles the call.'
          : 'Ang QROTECT nagabulig sa mga estudyante sang CPU sa pagpangita sang mga kontak. Proyekto ini sa panaliksik. Kumpirmaha ang kontak kag i-swipe para buksan ang napilian nga numero sa telepono.'}
      </p>
      <h2>
        {language === 'en'
          ? 'Saved information and privacy'
          : 'Na-save nga impormasyon kag pribasiya'}
      </h2>
      <p>
        {language === 'en'
          ? 'After a successful online visit, the public directory can be saved on this device. A first visit needs internet. Saved records can become out of date; check their dates and reconnect to refresh. No student accounts, location tracking, or call histories are collected.'
          : 'Kinahanglan internet sa una nga pagbisita. Mahimo ma-save ang listahan para magamit bisan wala internet. Tan-awa ang petsa kag magkonekta para ma-update. Wala ginakolekta nga student account, lokasyon, ukon listahan sang mga tawag.'}
      </p>
      <p className="sample-notice">{t.translation}</p>
      <a className="button secondary" href="/directory">
        {t.back}
      </a>
    </article>
  );
}
