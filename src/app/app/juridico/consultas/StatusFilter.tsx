'use client';

import { focusRingClass } from '@/lib/ui/tokens';

export function StatusFilter({
  children,
  defaultValue,
}: {
  children: React.ReactNode;
  defaultValue: string;
}) {
  return (
    <select
      name="status"
      defaultValue={defaultValue}
      className={`h-10 rounded-[8px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#0d1f3c] ${focusRingClass}`}
      onChange={(e) => e.currentTarget.form?.submit()}
    >
      {children}
    </select>
  );
}
