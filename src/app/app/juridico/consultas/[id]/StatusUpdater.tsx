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
      className="select select-bordered select-sm"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {children}
    </select>
  );
}
