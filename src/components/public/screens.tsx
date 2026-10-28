/* eslint-disable @next/next/no-html-link-for-pages -- public pages use native document navigation */
'use client';
import { useId, useState, useSyncExternalStore } from 'react';
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
  SlidersHorizontal,
  Phone,
  Map,
  ZoomIn,
  ZoomOut,
  Download,
} from 'lucide-react';
import { categoryIds, localized, searchContacts, type Category } from '@/lib/directory/schema';
import { categories, areas, quickCallLabels } from '@/lib/directory/labels';
import { usePublic } from './context';
import { quickCallTarget } from '@/lib/directory/quick-calls';
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
      <section className="quick-call-section" aria-labelledby="quick-call-heading">
        <h2 id="quick-call-heading">{t.emergencyContacts}</h2>
        <div className="quick-call-grid">
          {categoryIds.map((id) => {
            const Icon = icons[id];
            const target = quickCallTarget(data, id);
            const category =
              id === 'school' ? t.campusEmergency : localized(categories[id], language);
            return (
              <article className="home-category" key={id} aria-labelledby={`home-category-${id}`}>
                <div className="home-category-title">
                  <Icon size={23} aria-hidden="true" />
                  <h3 id={`home-category-${id}`}>{category}</h3>
                </div>
                <div className="home-category-recipient">
                  {target ? (
                    <>
                      <p>{target.agency}</p>
                      {target.branch && <p>{target.branch}</p>}
                    </>
                  ) : (
                    <p>{t.quickCallUnavailable}</p>
                  )}
                </div>
                <div className="home-category-actions">
                  {target && (
                    <CallConfirmation
                      {...target}
                      trigger={
                        <button
                          className="button primary quick-call-button"
                          type="button"
                          aria-label={`${localized(quickCallLabels[id], language)}: ${target.agency}`}
                        >
                          <Phone size={17} aria-hidden="true" />
                          {t.call}
                        </button>
                      }
                    />
                  )}
                  <a
                    href={`/directory?category=${id}`}
                    aria-label={`${t.viewContacts}: ${category}`}
                  >
                    {t.viewContacts}
                    <ArrowRight size={15} aria-hidden="true" />
                  </a>
                </div>
              </article>
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const panelId = useId();
  const searchId = useId();
  const params = new URLSearchParams(query);
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const area = params.get('area') || '';
  const filterCount = Number(Boolean(category)) + Number(Boolean(area));
  function update(changes: Record<string, string>, replace = false) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
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
      <div className="directory-tools">
        <label className="directory-search-label" htmlFor={searchId}>
          {t.search}
        </label>
        <div className="directory-toolbar">
          <input
            id={searchId}
            type="search"
            value={q}
            placeholder={t.searchHint}
            onChange={(e) => update({ q: e.target.value }, true)}
          />
          <button
            type="button"
            className="button secondary filter-toggle"
            aria-expanded={filtersOpen}
            aria-controls={panelId}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span>
              {t.filterButton}
              {filterCount > 0 && ` (${filterCount})`}
            </span>
          </button>
        </div>
        <section className="filter-panel" id={panelId} aria-label={t.filters} hidden={!filtersOpen}>
          <label>
            {t.category}
            <select value={category} onChange={(e) => update({ category: e.target.value })}>
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
            <select value={area} onChange={(e) => update({ area: e.target.value })}>
              <option value="">{t.allAreas}</option>
              {Object.entries(areas).map(([id, name]) => (
                <option key={id} value={id}>
                  {localized(name, language)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button secondary"
            onClick={() => update({ category: '', area: '' })}
          >
            {t.reset}
          </button>
        </section>
      </div>
      <section aria-label={t.contactResults}>
        <p className="result-count" role="status" aria-live="polite" aria-atomic="true">
          {results.length} {t.results}
        </p>
        {results.map((c) => (
          <ContactRow key={c.id} contact={c} />
        ))}
        {!results.length && (
          <div className="empty-state">
            <h2>{t.empty}</h2>
            <button
              type="button"
              className="button secondary"
              onClick={() => update({ q: '', category: '', area: '' })}
            >
              {t.reset}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
export function GuidanceScreen() {
  const { data, t, language } = usePublic();
  const guides = data?.guidance.filter((guide) => guide.approved) ?? [];
  return (
    <article className="reading-page guide-page">
      <div className="page-heading">
        <h1>{t.guide}</h1>
        <p>{t.guideIntro}</p>
      </div>
      <section aria-labelledby="guide-calling">
        <h2 id="guide-calling">{t.guideCalling}</h2>
        <ol className="guide-steps">
          <li>{t.guideChoose}</li>
          <li>{t.guideConfirm}</li>
          <li>{t.guidePhone}</li>
        </ol>
        <a className="button secondary" href="/directory">
          {t.directory}
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </section>
      <section aria-labelledby="guide-access">
        <h2 id="guide-access">{t.guideAccess}</h2>
        <p>{t.guideConnection}</p>
      </section>
      {Boolean(guides.length) && (
        <section aria-labelledby="guide-safety">
          <h2 id="guide-safety">{t.guidance}</h2>
          {guides.map((g) => (
            <section className="guide" key={g.id}>
              <h3>{localized(g.title, language)}</h3>
              <ol>
                {g.steps.map((step, i) => (
                  <li key={i}>{localized(step, language)}</li>
                ))}
              </ol>
              <p>
                {g.reviewedAt} · {g.reviewer}
              </p>
              <a href={g.source} target="_blank" rel="noreferrer">
                {t.source}
              </a>
              <a className="button secondary" href={`/directory?category=${g.category}`}>
                {t.viewContacts}
              </a>
            </section>
          ))}
        </section>
      )}
      {data?.map?.approved && (
        <section aria-labelledby="guide-map">
          <h2 id="guide-map">{t.map}</h2>
          <p>{localized(data.map.description, language)}</p>
          <a className="button secondary" href="/campus-map">
            {t.viewMap}
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </section>
      )}
    </article>
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
            {/* eslint-disable-next-line @next/next/no-img-element -- approved map is rendered at its selectable zoom level */}
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
      <h2>
        {language === 'en' ? 'Campus emergency contacts' : 'Mga kontak sa emerhensya sa kampus'}
      </h2>
      <p>
        {language === 'en'
          ? 'QROTECT helps learners, teachers, and staff find campus and public emergency contacts. Confirm a contact and swipe to open the selected number in your phone app. Your device handles the call.'
          : 'Ang QROTECT nagabulig sa mga estudyante, manunudlo, kag kawani sa pagpangita sang mga kontak sa emerhensya sa kampus kag publiko. Kumpirmaha ang kontak kag i-swipe para buksan ang napilian nga numero sa telepono.'}
      </p>
      <h2>{language === 'en' ? 'Internet access and privacy' : 'Internet kag pribasiya'}</h2>
      <p>
        {language === 'en'
          ? 'An internet connection is needed to open QROTECT and load current contacts. Check each contact’s verification date. No student accounts, location tracking, or call histories are collected.'
          : 'Kinahanglan internet para mabuksan ang QROTECT kag makita ang mga kontak. Tan-awa ang petsa sang pagkumpirma sang kontak. Wala ginakolekta nga student account, lokasyon, ukon listahan sang mga tawag.'}
      </p>
      <a className="button secondary" href="/directory">
        {t.back}
      </a>
    </article>
  );
}
