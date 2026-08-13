export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-display font-extrabold tracking-tight ${className}`}
    >
      <span aria-hidden className="text-coral">✿</span>
      <span className="text-ink">Shokakko</span>
      <span className="text-blue">Australia</span>
    </span>
  );
}
