"use client";

export function QuantitySelector({
  value,
  onChange,
  max = 10,
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  size?: "sm" | "md";
}) {
  const buttonSize = size === "sm" ? "h-7 w-7 text-sm" : "h-9 w-9 text-lg";

  return (
    <div className="inline-flex items-center gap-1 rounded-pill bg-mint/60 p-1">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        className={`flex items-center justify-center rounded-pill bg-white font-display font-bold text-ink shadow-sm shadow-ink/10 transition active:scale-95 disabled:opacity-40 ${buttonSize}`}
      >
        −
      </button>
      <span
        className="w-5 text-center font-display text-sm font-bold tabular-nums"
        aria-live="polite"
        aria-label={`Quantity: ${value}`}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={`flex items-center justify-center rounded-pill bg-white font-display font-bold text-ink shadow-sm shadow-ink/10 transition active:scale-95 disabled:opacity-40 ${buttonSize}`}
      >
        +
      </button>
    </div>
  );
}
