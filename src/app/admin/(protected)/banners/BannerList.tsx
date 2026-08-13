"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { deleteBanner, reorderBanners, toggleBannerActive } from "./actions";

type BannerRow = {
  id: string;
  headline: string;
  isActive: boolean;
  desktopImageUrl: string;
};

export function BannerList({ banners: initialBanners }: { banners: BannerRow[] }) {
  const [banners, setBanners] = useState(initialBanners);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  function moveBanner(from: number, to: number) {
    setBanners((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      startTransition(() => {
        void reorderBanners(next.map((b) => b.id));
      });
      return next;
    });
  }

  return (
    <ul className="flex flex-col gap-3">
      {banners.map((banner, index) => (
        <li
          key={banner.id}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex !== null && dragIndex !== index) moveBanner(dragIndex, index);
            setDragIndex(null);
          }}
          className="flex cursor-grab items-center gap-4 rounded-card bg-white p-4 shadow-sm shadow-ink/5 active:cursor-grabbing"
        >
          <span className="text-ink-soft" aria-hidden>
            ⠿
          </span>
          <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mint/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner.desktopImageUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/banners/${banner.id}`}
                className="font-display font-bold hover:underline"
              >
                {banner.headline}
              </Link>
              {!banner.isActive && <Badge tone="neutral">Disabled</Badge>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                const nextActive = !banner.isActive;
                setBanners((prev) =>
                  prev.map((b) => (b.id === banner.id ? { ...b, isActive: nextActive } : b)),
                );
                startTransition(() => {
                  void toggleBannerActive(banner.id, nextActive);
                });
              }}
              className="font-semibold text-blue hover:underline"
            >
              {banner.isActive ? "Disable" : "Enable"}
            </button>
            <Link
              href={`/admin/banners/${banner.id}`}
              className="font-semibold text-blue hover:underline"
            >
              Edit
            </Link>
            <DeleteButton
              action={deleteBanner.bind(null, banner.id)}
              confirmMessage={`Delete the "${banner.headline}" banner? This can't be undone.`}
            >
              Delete
            </DeleteButton>
          </div>
        </li>
      ))}
    </ul>
  );
}
