type Tone = "blue" | "lavender" | "coral" | "mint" | "neutral";

const toneClasses: Record<Tone, string> = {
  blue: "bg-blue/20 text-[#3f5a7a]",
  lavender: "bg-lavender/40 text-[#6b4b78]",
  coral: "bg-coral/20 text-[#8a3f3f]",
  mint: "bg-mint text-[#3f6b57]",
  neutral: "bg-ink/5 text-ink-soft",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-semibold tracking-wide ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
