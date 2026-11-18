'use client';

import { ArrowRight } from 'lucide-react';
import { formatPhilippineDate } from '@/lib/directory/date';
import { categories } from '@/lib/directory/labels';
import {
  categoryIds,
  demoGuidanceAuthorization,
  localized,
  type Category,
} from '@/lib/directory/schema';
import { usePublic } from './context';

export function GuidanceScreen({ category }: { category?: Category }) {
  const { data, t, language } = usePublic();
  const guides = data?.guidance.filter((guide) => guide.approved) ?? [];
  const visibleCategories = category
    ? [category]
    : categoryIds.filter((id) => guides.some((guide) => guide.category === id));
  const map = data?.map?.approved && (!category || category === 'school') ? data.map : null;

  return (
    <article className="reading-page guide-page">
      <div className="page-heading">
        <h1>{t.guide}</h1>
        {category && (
          <a className="guide-topics-link" href="/guidance">
            {t.allTopics}
          </a>
        )}
      </div>
      {visibleCategories.length === 0 && <p>{t.noGuidance}</p>}
      {visibleCategories.map((id) => {
        const title = id === 'school' ? t.campusEmergency : localized(categories[id], language);
        const topics = guides.filter((guide) => guide.category === id);

        return (
          <section className="guide-category" key={id} aria-labelledby={`guide-category-${id}`}>
            <h2 id={`guide-category-${id}`}>{title}</h2>
            {topics.length === 0 && <p>{t.noGuidance}</p>}
            {topics.map((topic) => (
              <div className="guide" key={topic.id}>
                <h3>{localized(topic.title, language)}</h3>
                <ol>
                  {topic.steps.map((step, index) => (
                    <li key={index}>{localized(step, language)}</li>
                  ))}
                </ol>
                {topic.reviewer !== demoGuidanceAuthorization && (
                  <p>
                    <time dateTime={topic.reviewedAt}>
                      {formatPhilippineDate(topic.reviewedAt)}
                    </time>
                    {' · '}
                    {topic.reviewer}
                  </p>
                )}
                <a
                  className="guide-source"
                  href={topic.source}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${t.source}: ${localized(topic.title, language)}`}
                >
                  {t.source}
                </a>
              </div>
            ))}
            <a
              className="button secondary"
              href={`/directory?category=${id}`}
              aria-label={`${t.viewContacts}: ${title}`}
            >
              {t.viewContacts}
            </a>
          </section>
        );
      })}
      {map && (
        <section aria-labelledby="guide-map">
          <h2 id="guide-map">{t.map}</h2>
          <p>{localized(map.description, language)}</p>
          <a className="button secondary" href="/campus-map">
            {t.viewMap}
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </section>
      )}
    </article>
  );
}
