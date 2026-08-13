"use client";

import { useState } from "react";

export function CopyLinkButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard API unavailable/blocked — the URL is already shown
          // as selectable text right next to this button.
        }
      }}
      className="shrink-0 rounded-pill bg-blue px-4 py-2 text-sm font-display font-bold text-white shadow-sm shadow-blue/30 transition hover:brightness-105"
    >
      {copied ? "Copied!" : "Copy Link"}
    </button>
  );
}
