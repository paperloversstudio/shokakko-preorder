"use client";

import { useState, useTransition } from "react";
import { updateNotificationPreference } from "./actions";

const OPTIONS = [
  { field: "notifyNewProducts" as const, label: "Notify me when new products are added" },
  { field: "notifyPriceUpdates" as const, label: "Notify me when product prices are updated" },
  { field: "notifyReminderBeforeClose" as const, label: "Remind me 24 hours before preorder closes" },
];

/** Part 5 — "changes should save immediately," so each checkbox fires its
 * own Server Action the instant it's toggled, no separate Save button. */
export function NotificationPreferences({
  token,
  defaults,
}: {
  token: string;
  defaults: {
    notifyNewProducts: boolean;
    notifyPriceUpdates: boolean;
    notifyReminderBeforeClose: boolean;
  };
}) {
  const [values, setValues] = useState(defaults);
  const [, startTransition] = useTransition();

  return (
    <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
      <h2 className="font-display font-bold">Notification Preferences</h2>
      <div className="mt-3 flex flex-col gap-3">
        {OPTIONS.map(({ field, label }) => (
          <label key={field} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={values[field]}
              onChange={(e) => {
                const next = e.target.checked;
                setValues((prev) => ({ ...prev, [field]: next }));
                startTransition(() => {
                  void updateNotificationPreference(token, field, next);
                });
              }}
              className="h-4 w-4"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
