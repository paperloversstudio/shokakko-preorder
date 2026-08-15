import Link from "next/link";
import { EventPageForm } from "../EventPageForm";
import { createEventPage } from "../actions";

export default function NewEventPagePage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/event-pages" className="text-sm font-semibold text-ink-soft hover:text-ink">
        ← Back to Event Pages
      </Link>
      <h1 className="font-display text-2xl font-bold">Add a page</h1>
      <div className="max-w-lg rounded-card bg-white p-6 shadow-sm shadow-ink/5">
        <EventPageForm action={createEventPage} submitLabel="Add Page" />
      </div>
    </div>
  );
}
