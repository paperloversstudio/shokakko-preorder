import { db } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, no timezone.
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export default async function AdminSettingsPage() {
  const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Site Settings</h1>
        <p className="text-sm text-ink-soft">
          Homepage logo and exhibition event info.
        </p>
      </div>
      <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
        <SettingsForm
          defaults={{
            logoUrl: settings?.logoUrl ?? null,
            eventName: settings?.eventName ?? "",
            eventLocation: settings?.eventLocation ?? "",
            eventInfo: settings?.eventInfo ?? "",
            countdownTargetAt: settings?.countdownTargetAt
              ? toDatetimeLocalValue(settings.countdownTargetAt)
              : "",
            preorderInfoHtml: settings?.preorderInfoHtml ?? "",
            emailHeroImageUrl: settings?.emailHeroImageUrl ?? null,
            emailHeroLinkUrl: settings?.emailHeroLinkUrl ?? "",
            emailContactUrl: settings?.emailContactUrl ?? "",
            emailShippingPolicyUrl: settings?.emailShippingPolicyUrl ?? "",
            emailWebsiteUrl: settings?.emailWebsiteUrl ?? "",
            emailInstagramUrl: settings?.emailInstagramUrl ?? "",
          }}
        />
      </div>
    </div>
  );
}
