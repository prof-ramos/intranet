'use client';

import { useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { focusWithinClass } from '@/lib/ui/tokens';
import { TAG_SUGGESTIONS } from '@/lib/activities/constants';

export function TagInput({
  id,
  describedBy,
  value,
  onChange,
}: {
  id: string;
  describedBy?: string;
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const filtered = useMemo(
    () =>
      TAG_SUGGESTIONS.filter((tag) => !value.includes(tag) && tag.includes(draft.toLowerCase())).slice(0, 5),
    [draft, value],
  );

  function addTag(tag: string) {
    const normalized = tag
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');
    if (normalized && !value.includes(normalized)) onChange([...value, normalized]);
    setDraft('');
    inputRef.current?.focus();
  }

  return (
    <div
      className={[
        'relative flex min-h-11 flex-wrap items-center gap-1 rounded-[8px] border bg-white p-1.5',
        focusWithinClass,
      ].join(' ')}
      style={{ borderColor: '#c9d2df' }}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border py-1 pr-1 pl-2.5 text-xs font-semibold"
          style={{ color: '#0d1f3c', borderColor: '#dde3ec', background: '#f8fafc' }}
        >
          #{tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((item) => item !== tag))}
            className={[
              'grid h-6 w-6 place-items-center rounded-full lg:h-4 lg:w-4',
              focusWithinClass,
            ].join(' ')}
            style={{ color: '#59677a', background: 'rgba(13,31,60,0.08)' }}
            aria-label={`Remover tag ${tag}`}
          >
            <X size={10} aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        aria-describedby={describedBy}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ',') && draft.trim()) {
            event.preventDefault();
            addTag(draft);
          }
          if (event.key === 'Backspace' && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        placeholder={value.length ? '' : 'Adicione tags...'}
        className="min-w-28 flex-1 bg-transparent px-2 py-1.5 text-[13px] focus:outline-none"
        style={{ color: '#0d1f3c' }}
      />
      {draft && filtered.length > 0 && (
        <div
          className="absolute top-full right-0 left-0 z-20 mt-1 rounded-[8px] border bg-white p-1"
          style={{ borderColor: '#c9d2df', boxShadow: '0 8px 20px rgba(4,9,32,0.08)' }}
        >
          {filtered.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="block w-full rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-[#f8fafc]"
              style={{ color: '#0d1f3c' }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}