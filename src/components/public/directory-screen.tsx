/* eslint-disable @next/next/no-html-link-for-pages -- public pages use native document navigation */
'use client';
import { useId, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { categoryIds, localized, searchContacts, type Category } from '@/lib/directory/schema';
import { categories, areas } from '@/lib/directory/labels';
import { ContactRow } from './contact';
import { usePublic } from './context';
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
