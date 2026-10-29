'use client';
import {
  ArrowRight,
  Shield,
  Flame,
  HeartPulse,
  Hospital,
  CloudLightning,
  School,
  Search,
  Phone,
} from 'lucide-react';
import { categoryIds, localized } from '@/lib/directory/schema';
import { categories, quickCallLabels } from '@/lib/directory/labels';
import { quickCallTarget } from '@/lib/directory/quick-calls';
import { CallConfirmation } from './call-confirmation';
import { usePublic } from './context';
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
