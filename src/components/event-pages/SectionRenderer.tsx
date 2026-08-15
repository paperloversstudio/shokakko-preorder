import Link from "next/link";
import {
  textSectionDataSchema,
  imageSectionDataSchema,
  gallerySectionDataSchema,
  buttonSectionDataSchema,
  type SectionType,
} from "@/lib/validations/event-page";

export type RenderableSection = {
  id: string;
  type: SectionType;
  data: unknown;
};

// Column count per your spec: 1 → full width, 2 → 2 cols, 3 → 3 cols,
// 4 → 2×2, 5+ → a responsive wrap. Every cell (2+) is aspect-square
// object-cover — the same crop-to-fill convention ProductCard's photo
// and every admin thumbnail grid in this app already use, so a gallery
// reads as consistent with the rest of the site.
function galleryGridClass(count: number): string {
  if (count <= 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-3";
  if (count === 4) return "grid-cols-2";
  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
}

function TextSection({ data }: { data: unknown }) {
  const parsed = textSectionDataSchema.safeParse(data);
  if (!parsed.success) return null;
  return (
    <div>
      {parsed.data.title && (
        <h2 className="mb-3 font-display text-xl font-bold">{parsed.data.title}</h2>
      )}
      {/* This HTML only ever comes from EventSectionRichTextEditor.tsx,
          whose Tiptap schema is the actual sanitizer — see that
          component's doc comment. */}
      <div className="rich-text" dangerouslySetInnerHTML={{ __html: parsed.data.html }} />
    </div>
  );
}

function ImageSection({ data }: { data: unknown }) {
  const parsed = imageSectionDataSchema.safeParse(data);
  if (!parsed.success || !parsed.data.url) return null;
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded storage URL, same pattern as every other image in this app */}
      <img
        src={parsed.data.url}
        alt={parsed.data.caption ?? ""}
        className="w-full rounded-card object-cover"
      />
      {parsed.data.caption && (
        <figcaption className="mt-2 text-center text-sm text-ink-soft">
          {parsed.data.caption}
        </figcaption>
      )}
    </figure>
  );
}

function GallerySection({ data }: { data: unknown }) {
  const parsed = gallerySectionDataSchema.safeParse(data);
  if (!parsed.success || parsed.data.images.length === 0) return null;
  const { images } = parsed.data;

  if (images.length === 1) {
    const img = images[0];
    return (
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.caption ?? ""} className="w-full rounded-card object-cover" />
        {img.caption && (
          <figcaption className="mt-2 text-center text-sm text-ink-soft">{img.caption}</figcaption>
        )}
      </figure>
    );
  }

  return (
    <div className={`grid gap-3 ${galleryGridClass(images.length)}`}>
      {images.map((img, i) => (
        <figure key={img.url + i}>
          <div className="aspect-square overflow-hidden rounded-card bg-mint/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.caption ?? ""} className="h-full w-full object-cover" />
          </div>
          {img.caption && (
            <figcaption className="mt-1.5 text-center text-xs text-ink-soft">
              {img.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

function ButtonSection({ data }: { data: unknown }) {
  const parsed = buttonSectionDataSchema.safeParse(data);
  if (!parsed.success || !parsed.data.text || !parsed.data.url) return null;
  const { text, url, openInNewTab } = parsed.data;
  return (
    <div className="flex justify-center">
      <Link
        href={url}
        target={openInNewTab ? "_blank" : undefined}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        className="rounded-pill bg-blue px-6 py-3 font-display font-bold text-white shadow-sm shadow-blue/30 transition hover:brightness-105"
      >
        {text}
      </Link>
    </div>
  );
}

function DividerSection() {
  return <hr className="border-t border-line" />;
}

export function SectionRenderer({ section }: { section: RenderableSection }) {
  switch (section.type) {
    case "text":
      return <TextSection data={section.data} />;
    case "image":
      return <ImageSection data={section.data} />;
    case "gallery":
      return <GallerySection data={section.data} />;
    case "button":
      return <ButtonSection data={section.data} />;
    case "divider":
      return <DividerSection />;
    default:
      return null;
  }
}
