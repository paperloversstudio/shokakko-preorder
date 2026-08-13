import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { deleteBanner, updateBanner } from "../actions";
import { BannerForm } from "../BannerForm";

export default async function EditBannerPage({
  params,
}: PageProps<"/admin/banners/[id]">) {
  const { id } = await params;
  const banner = await db.heroBanner.findUnique({ where: { id } });
  if (!banner) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/banners"
            className="text-sm font-semibold text-ink-soft hover:text-ink"
          >
            ← Back to banners
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold">Edit banner</h1>
        </div>
        <DeleteButton
          action={deleteBanner.bind(null, banner.id)}
          redirectTo="/admin/banners"
          confirmMessage={`Delete the "${banner.headline}" banner? This can't be undone.`}
        >
          Delete banner
        </DeleteButton>
      </div>
      <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
        <BannerForm
          action={updateBanner.bind(null, banner.id)}
          submitLabel="Save changes"
          defaults={{
            headline: banner.headline,
            description: banner.description ?? "",
            buttonText: banner.buttonText ?? "",
            buttonUrl: banner.buttonUrl ?? "",
            isActive: banner.isActive,
            desktopImageUrl: banner.desktopImageUrl,
            tabletImageUrl: banner.tabletImageUrl,
            mobileImageUrl: banner.mobileImageUrl,
          }}
        />
      </div>
    </div>
  );
}
