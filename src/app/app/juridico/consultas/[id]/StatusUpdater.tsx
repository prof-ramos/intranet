'use client';

export function StatusUpdater({
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
      className="h-9 rounded-[8px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#0d1f3c] focus:border-[#76aeea] focus:outline-none"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {children}
    </select>
  );
}
