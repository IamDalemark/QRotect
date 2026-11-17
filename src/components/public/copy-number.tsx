'use client';
import { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { usePublic } from './context';

export function CopyNumber({
  value,
  name,
  compact = false,
}: {
  value: string;
  name: string;
  compact?: boolean;
}) {
  const { t } = usePublic();
  const [feedback, setFeedback] = useState<'copied' | 'manual' | ''>('');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempt = useRef(0);
  useEffect(
    () => () => {
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
      attempt.current += 1;
    },
    [],
  );
  async function copyNumber() {
    const currentAttempt = ++attempt.current;
    if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    setFeedback('');
    try {
      await navigator.clipboard.writeText(value);
      if (currentAttempt !== attempt.current) return;
      setFeedback('copied');
      resetTimer.current = setTimeout(() => {
        setFeedback('');
        resetTimer.current = null;
      }, 3000);
    } catch {
      if (currentAttempt === attempt.current) setFeedback('manual');
    }
  }
  return (
    <div className="copy-control">
      <button
        type="button"
        className={compact ? 'icon-button copy-number-button' : 'button secondary'}
        onClick={copyNumber}
        aria-label={`${t.copy}: ${name}`}
        title={t.copy}
      >
        {feedback === 'copied' ? (
          <Check size={18} aria-hidden="true" />
        ) : (
          <Copy size={18} aria-hidden="true" />
        )}
        {!compact && (feedback === 'copied' ? t.copied : t.copy)}
      </button>
      <span
        className={`copy-feedback${feedback === 'manual' ? ' copy-error' : ' sr-only'}`}
        role="status"
      >
        {feedback && t[feedback]}
      </span>
    </div>
  );
}
