'use client';

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
      className="select select-bordered"
      onChange={(e) => e.currentTarget.form?.submit()}
    >
      {children}
    </select>
  );
}
