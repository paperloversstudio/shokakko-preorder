"use client";

import { useEffect, useState } from "react";

export type HeroBannerData = {
  id: string;
  headline: string;
  description: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  desktopImageUrl: string;
  tabletImageUrl: string;
  mobileImageUrl: string;
};

const ROTATE_MS = 6000;

export function HeroCarousel({ banners }: { banners: HeroBannerData[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % banners.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const banner = banners[index];

  return (
    <section className="relative overflow-hidden">
      <picture>
        <source media="(max-width: 767px)" srcSet={banner.mobileImageUrl} />
        <source media="(max-width: 1279px)" srcSet={banner.tabletImageUrl} />
        <img
          src={banner.desktopImageUrl}
          alt={banner.headline}
          className="h-[220px] w-full object-cover sm:h-[320px] lg:h-[420px]"
        />
      </picture>
      <div className="absolute inset-0 flex flex-col items-start justify-end gap-2 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent p-5 text-white sm:p-8">
        <h2 className="font-display text-2xl font-extrabold drop-shadow sm:text-3xl">
          {banner.headline}
        </h2>
        {banner.description && (
          <p className="max-w-md text-sm text-white/90 sm:text-base">{banner.description}</p>
        )}
        {banner.buttonText && banner.buttonUrl && (
          <a
            href={banner.buttonUrl}
            className="mt-1 rounded-pill bg-white px-5 py-2 font-display font-bold text-ink shadow-sm transition hover:brightness-95"
          >
            {banner.buttonText}
          </a>
        )}
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Show banner ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-pill transition ${
                i === index ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
