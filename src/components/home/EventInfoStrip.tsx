"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0d 0h 0m";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return `${days}d ${hours}h ${minutes}m`;
}

export function EventInfoStrip({
  eventName,
  eventLocation,
  eventInfo,
  countdownTargetAt,
}: {
  eventName: string | null;
  eventLocation: string | null;
  eventInfo: string | null;
  countdownTargetAt: string | null; // ISO string
}) {
  const [now, setNow] = useState<number | null>(() => (countdownTargetAt ? Date.now() : null));

  useEffect(() => {
    if (!countdownTargetAt) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [countdownTargetAt]);

  if (!eventName && !eventLocation && !eventInfo && !countdownTargetAt) return null;

  const remaining =
    countdownTargetAt && now !== null
      ? formatRemaining(new Date(countdownTargetAt).getTime() - now)
      : null;

  return (
    <div className="border-b border-line bg-lavender/30 px-4 py-2 text-center text-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {eventName && <span className="font-semibold">{eventName}</span>}
        {eventLocation && <span className="text-ink-soft">· {eventLocation}</span>}
        {eventInfo && <span className="text-ink-soft">· {eventInfo}</span>}
        {remaining && (
          <span className="font-semibold text-coral">
            · Pre-orders close in {remaining}
          </span>
        )}
      </div>
    </div>
  );
}
