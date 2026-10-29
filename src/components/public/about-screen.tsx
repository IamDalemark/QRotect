'use client';
import { usePublic } from './context';
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
