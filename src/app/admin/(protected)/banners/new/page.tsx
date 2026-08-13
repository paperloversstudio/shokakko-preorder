import Link from "next/link";
import { createBanner } from "../actions";
import { BannerForm } from "../BannerForm";

export default function NewBannerPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/banners"
          className="text-sm font-semibold text-ink-soft hover:text-ink"
        >
          ← Back to banners
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold">Add a hero banner</h1>
      </div>
      <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
        <BannerForm action={createBanner} submitLabel="Add banner" requireImages />
      </div>
    </div>
  );
}
