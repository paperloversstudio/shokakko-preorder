export const inputClass =
  "rounded-2xl border border-line bg-white px-4 py-2.5 text-base outline-none focus:border-blue focus:ring-2 focus:ring-blue/30";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink-soft">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-soft">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-coral">
          {error}
        </p>
      )}
    </div>
  );
}
