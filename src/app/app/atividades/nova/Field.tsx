'use client';

export function Field({
  controlId,
  label,
  required,
  hint,
  error,
  children,
}: {
  controlId?: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const hintId = controlId ? `${controlId}-hint` : undefined;
  const errorId = controlId ? `${controlId}-error` : undefined;
  const labelContent = (
    <>
      {label}
      {required && <span className="ml-1 text-[#b91c1c]">*</span>}
    </>
  );

  return (
    <div className="flex flex-col gap-2">
      {controlId ? (
        <label
          htmlFor={controlId}
          className="text-[11px] font-bold tracking-[0.10em] uppercase"
          style={{ color: '#59677a' }}
        >
          {labelContent}
        </label>
      ) : (
        <span className="text-[11px] font-bold tracking-[0.10em] uppercase" style={{ color: '#59677a' }}>
          {labelContent}
        </span>
      )}
      {children}
      {error ? (
        <span id={errorId} className="text-xs font-medium" style={{ color: '#b91c1c' }}>
          {error}
        </span>
      ) : (
        hint && (
          <span id={hintId} className="text-xs leading-relaxed" style={{ color: '#59677a' }}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}