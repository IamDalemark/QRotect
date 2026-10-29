'use client';
import { useState } from 'react';
import { Map, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { localized } from '@/lib/directory/schema';
import { usePublic } from './context';
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
