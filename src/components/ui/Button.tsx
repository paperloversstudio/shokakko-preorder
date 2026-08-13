import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-blue text-white hover:brightness-105 active:brightness-95 shadow-sm shadow-blue/30",
  secondary:
    "bg-lavender text-ink hover:brightness-105 active:brightness-95 shadow-sm shadow-lavender/40",
  ghost:
    "bg-white text-ink border border-line hover:bg-mint/40 active:bg-mint/60",
  danger:
    "bg-coral text-white hover:brightness-105 active:brightness-95 shadow-sm shadow-coral/30",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5",
  md: "text-base px-4 py-2.5",
  lg: "text-lg px-6 py-3.5",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button(
  { className = "", variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-pill font-display font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
});
