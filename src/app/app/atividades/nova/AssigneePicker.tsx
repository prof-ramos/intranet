'use client';

import type { BoardPerson } from '../AtividadesBoard';
import { initialsFromName } from '@/lib/utils/initials';
import { focusRingClass, navy } from '@/lib/ui/tokens';

export function AssigneePicker({
  people,
  currentUserId,
  value,
  onChange,
}: {
  people: BoardPerson[];
  currentUserId: number;
  value: number;
  onChange: (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {people.map((person) => {
        const selected = value === person.id;
        return (
          <button
            key={person.id}
            type="button"
            onClick={() => onChange(person.id)}
            className={[
              'flex min-h-11 items-center gap-3 rounded-[8px] border px-3 py-2.5 text-left transition hover:bg-[#f8fafc]',
              focusRingClass,
            ].join(' ')}
            style={{
              borderColor: selected ? navy : '#dde3ec',
              background: selected ? 'rgba(4,9,32,0.04)' : '#fff',
            }}
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
              style={{ background: '#040920' }}
            >
              {initialsFromName(person.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block truncate text-[13px] font-semibold"
                style={{ color: '#0d1f3c' }}
              >
                {person.name}{' '}
                {person.id === currentUserId && (
                  <span className="font-medium" style={{ color: '#59677a' }}>
                    (você)
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-[11px] capitalize" style={{ color: '#59677a' }}>
                {person.role}
              </span>
            </span>
            <span
              className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2"
              style={{ borderColor: selected ? navy : 'rgba(13,31,60,0.30)' }}
            >
              {selected && (
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#040920' }} />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
