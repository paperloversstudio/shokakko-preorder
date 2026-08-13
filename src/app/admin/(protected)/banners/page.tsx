import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { MAX_HERO_BANNERS } from "@/lib/validations/banner";
import { BannerList } from "./BannerList";

export default async function AdminBannersPage() {
  const banners = await db.heroBanner.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, headline: true, isActive: true, desktopImageUrl: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Hero Banners</h1>
          <p className="text-sm text-ink-soft">
            Up to {MAX_HERO_BANNERS} banners rotate on the homepage. Drag to reorder.
          </p>
        </div>
        {banners.length < MAX_HERO_BANNERS && (
          <Link href="/admin/banners/new">
            <Button>+ Add banner</Button>
          </Link>
        )}
      </div>

      {banners.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
          No hero banners yet — add one to start the homepage rotation.
        </p>
      ) : (
        <BannerList banners={banners} />
      )}
    </div>
  );
}
