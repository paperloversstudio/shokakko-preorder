"use client";

import { useEffect } from "react";

/**
 * Shared right-side slide-in drawer used by Cart, Wishlist, and the mobile
 * Filter drawer. Always rendered in the DOM (even closed) so the slide
 * transition can play — invisible/non-interactive via opacity + translate
 * when `open` is false. No animation library — plain Tailwind transitions.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  widthClassName = "w-full sm:w-[420px] lg:w-[30vw] lg:min-w-[380px] lg:max-w-[480px]",
  mobileVariant = "side",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  widthClassName?: string;
  /**
   * "side" (default): unchanged — full-height right-side slide-in at every
   * breakpoint, exactly today's Cart/Filter drawer behavior.
   * "bottom-sheet": full-width, slides up from the bottom, rounded top
   * corners, capped height — mobile only. Reverts to the normal side panel
   * from `sm` up (same as "side" there). Used by the Wishlist drawer.
   */
  mobileVariant?: "side" | "bottom-sheet";
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const isBottomSheet = mobileVariant === "bottom-sheet";

  const wrapperClassName = isBottomSheet
    ? "items-end justify-center sm:items-stretch sm:justify-end"
    : "justify-end";

  const panelSizeClassName = isBottomSheet
    ? "max-h-[85vh] rounded-t-3xl sm:h-full sm:max-h-none sm:rounded-t-none"
    : "h-full";

  const panelTransformClassName = isBottomSheet
    ? open
      ? "translate-y-0 sm:translate-x-0"
      : "translate-y-full sm:translate-y-0 sm:translate-x-full"
    : open
      ? "translate-x-0"
      : "translate-x-full";

  return (
    <div
      className={`fixed inset-0 z-50 flex transition-opacity duration-300 ${wrapperClassName} ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/30"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex flex-col bg-cream shadow-xl transition-transform duration-300 ${panelSizeClassName} ${panelTransformClassName} ${widthClassName}`}
      >
        <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-pill text-lg text-ink-soft hover:bg-mint/40"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
