'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Phone, X } from 'lucide-react';
import { telephoneHref } from '@/lib/directory/calling';
import { localized, type Contact } from '@/lib/directory/schema';
import { usePublic } from './context';

type CallTarget = { agency: string; branch?: string; number: Contact['numbers'][number] };
type Drag = { id: number; x: number; y: number; distance: number };

function CallDetails({ target }: { target: CallTarget }) {
  const { t, language } = usePublic();
  // Freeze the exact recipient until this card closes, including during a directory refresh.
  const [selected] = useState(target);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [handedOff, setHandedOff] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const phoneLink = useRef<HTMLAnchorElement>(null);
  const drag = useRef<Drag | null>(null);
  const launched = useRef(false);
  const href = telephoneHref(selected.number);

  function reset() {
    drag.current = null;
    setOffset(0);
    setDragging(false);
  }
  useEffect(() => {
    const cancel = () => {
      drag.current = null;
      setOffset(0);
      setDragging(false);
    };
    window.addEventListener('blur', cancel);
    window.addEventListener('resize', cancel);
    document.addEventListener('visibilitychange', cancel);
    return () => {
      window.removeEventListener('blur', cancel);
      window.removeEventListener('resize', cancel);
      document.removeEventListener('visibilitychange', cancel);
    };
  }, []);

  function begin(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || launched.current || drag.current) return;
    const distance = (track.current?.clientWidth ?? 0) - 64;
    if (distance <= 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, distance };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    if (Math.abs(event.clientY - current.y) > 48) return reset();
    setOffset(Math.max(0, Math.min(current.distance, event.clientX - current.x)));
  }
  function finish(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const completed =
      event.clientX - current.x >= current.distance * 0.9 &&
      Math.abs(event.clientY - current.y) <= 48;
    reset();
    // Stay within the user's pointer-up event; no network, timer, or fake call state.
    if (completed) phoneLink.current?.click();
  }

  return (
    <>
      <Dialog.Title>{t.confirmCall}</Dialog.Title>
      <Dialog.Description className="call-description">{t.confirmDescription}</Dialog.Description>
      <div className="call-recipient">
        <h3>{selected.agency}</h3>
        {selected.branch && <p>{selected.branch}</p>}
        <p className="number-label">{localized(selected.number.label, language)}</p>
        <p className="phone-number">{selected.number.display}</p>
        {selected.number.extension && (
          <p>
            {t.extension} {selected.number.extension}
          </p>
        )}
      </div>
      {handedOff ? (
        <p className="call-handoff" role="status">
          {t.handoff}
        </p>
      ) : (
        <>
          <div
            className={`swipe-track${dragging ? ' is-dragging' : ''}`}
            ref={track}
            aria-hidden="true"
          >
            <span className="swipe-label" style={{ opacity: offset > 24 ? 0 : 1 }}>
              {t.swipe}
              <ArrowRight size={18} />
            </span>
            <div
              className="swipe-handle"
              style={{ transform: `translateX(${offset}px)` }}
              onPointerDown={begin}
              onPointerMove={move}
              onPointerUp={finish}
              onPointerCancel={reset}
              onLostPointerCapture={reset}
            >
              <Phone size={22} />
            </div>
          </div>
          <p className="call-hint">{t.phoneHint}</p>
        </>
      )}
      <div className="call-actions">
        {!handedOff && href && (
          <a
            className="button secondary"
            href={href}
            ref={phoneLink}
            onClick={(event) => {
              if (launched.current) return event.preventDefault();
              launched.current = true;
              setHandedOff(true);
            }}
          >
            <Phone size={17} aria-hidden="true" />
            {t.alternativeCall}
          </a>
        )}
        <Dialog.Close className="button call-cancel">{handedOff ? t.close : t.cancel}</Dialog.Close>
      </div>
      <Dialog.Close className="icon-button dialog-x" aria-label={t.close}>
        <X aria-hidden="true" size={20} />
      </Dialog.Close>
    </>
  );
}

export function CallConfirmation({ trigger, ...target }: CallTarget & { trigger?: ReactNode }) {
  const { t } = usePublic();
  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) queueMicrotask(() => window.dispatchEvent(new Event('qrotect-dialog-closed')));
      }}
    >
      <Dialog.Trigger asChild>
        {trigger ?? (
          <button className="button primary" disabled={!telephoneHref(target.number)}>
            <Phone size={17} aria-hidden="true" />
            {t.call}
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-shade" />
        <Dialog.Content className="dialog-panel call-panel">
          <CallDetails target={target} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
