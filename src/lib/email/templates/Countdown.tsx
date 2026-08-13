import { emailBrand, emailFontFamily } from "../components/brand";

/** Same "Xd Xh Xm" formatting as EventInfoStrip.tsx's client-side countdown
 * — duplicated here (a small pure function) rather than imported, since
 * that component is "use client" and this renders server-side into static
 * email HTML. A snapshot at render time, not live-updating — email can't
 * run JS, so this is the countdown's value the moment the email was
 * generated/sent, a standard limitation for reminder emails. */
function formatRemaining(ms: number): string {
  if (ms <= 0) return "0d 0h 0m";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return `${days}d ${hours}h ${minutes}m`;
}

/**
 * Reminder Email only — not part of the shared Design System. Static
 * countdown to `SiteSettings.countdownTargetAt`. Purely presentational —
 * `remainingMs` is computed once in data/reminder.ts (business logic),
 * not here, so this component stays a pure function of its props.
 */
export function Countdown({ remainingMs }: { remainingMs: number | null }) {
  if (remainingMs === null) return null;
  const remaining = formatRemaining(remainingMs);

  return (
    <tr>
      <td style={{ padding: "16px 32px 0", textAlign: "center" }}>
        <div
          style={{
            fontFamily: emailFontFamily,
            fontSize: 13,
            color: emailBrand.inkSoft,
          }}
        >
          Pre-orders close in
        </div>
        <div
          style={{
            fontFamily: emailFontFamily,
            fontSize: 28,
            fontWeight: 700,
            color: emailBrand.coral,
            marginTop: 4,
          }}
        >
          {remaining}
        </div>
      </td>
    </tr>
  );
}
