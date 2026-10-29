'use client';
import { ArrowRight } from 'lucide-react';
import { localized } from '@/lib/directory/schema';
import { usePublic } from './context';
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
