"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/shared/DeleteButton";
import {
  EMAIL_SECTION_TYPE_LABELS,
  heroBannerSectionDataSchema,
  richTextSectionDataSchema,
  imageSectionDataSchema,
  collectionCardsSectionDataSchema,
  productCardsSectionDataSchema,
  ctaButtonSectionDataSchema,
  PRODUCT_CARDS_SOURCE_LABELS,
  type EmailSectionType,
  type HeroBannerSectionData,
  type RichTextSectionData,
  type ImageSectionData,
  type CollectionCardsSectionData,
  type ProductCardsSectionData,
  type CTAButtonSectionData,
} from "@/lib/validations/email-template";
import {
  deleteSection,
  duplicateSection,
  toggleSectionShow,
  updateHeroBannerSection,
  updateRichTextSection,
  updateImageSection,
  updateCollectionCardsSection,
  updateProductCardsSection,
  updateCtaButtonSection,
} from "./actions";
import { HeroBannerSectionEditor } from "./HeroBannerSectionEditor";
import { RichTextSectionEditor } from "./RichTextSectionEditor";
import { ImageSectionEditor } from "./ImageSectionEditor";
import { CollectionCardsSectionEditor } from "./CollectionCardsSectionEditor";
import { ProductCardsSectionEditor } from "./ProductCardsSectionEditor";
import { CTAButtonSectionEditor } from "./CTAButtonSectionEditor";

const SECTION_ICONS: Record<EmailSectionType, string> = {
  hero_banner: "🖼️",
  greeting: "👋",
  rich_text: "📝",
  image: "🖼️",
  collection_cards: "🎀",
  product_cards: "🛍️",
  cta_button: "🔘",
  footer: "📮",
  countdown: "⏳",
};

export type EmailSectionRow = {
  id: string;
  type: EmailSectionType;
  show: boolean;
  data: unknown;
};

function getHeroBannerData(data: unknown): HeroBannerSectionData {
  const parsed = heroBannerSectionDataSchema.safeParse(data);
  return parsed.success ? parsed.data : { imageUrl: null, linkUrl: null };
}
function getRichTextData(data: unknown): RichTextSectionData {
  const parsed = richTextSectionDataSchema.safeParse(data);
  return parsed.success ? parsed.data : { html: null };
}
function getImageData(data: unknown): ImageSectionData {
  const parsed = imageSectionDataSchema.safeParse(data);
  return parsed.success ? parsed.data : { url: null, linkUrl: null };
}
function getCollectionCardsData(data: unknown): CollectionCardsSectionData {
  const parsed = collectionCardsSectionDataSchema.safeParse(data);
  return parsed.success ? parsed.data : { collectionIds: [] };
}
function getProductCardsData(data: unknown): ProductCardsSectionData {
  const parsed = productCardsSectionDataSchema.safeParse(data);
  return parsed.success ? parsed.data : { source: "manual", productIds: [] };
}
function getCtaButtonData(data: unknown): CTAButtonSectionData {
  const parsed = ctaButtonSectionDataSchema.safeParse(data);
  return parsed.success ? parsed.data : { text: "", url: "" };
}

function summarize(section: EmailSectionRow): string | null {
  switch (section.type) {
    case "hero_banner":
      return getHeroBannerData(section.data).imageUrl ? "1 image" : null;
    case "greeting":
      return null;
    case "rich_text":
      return getRichTextData(section.data).html ? "Written" : "Empty";
    case "image":
      return getImageData(section.data).caption || (getImageData(section.data).url ? "1 image" : null);
    case "collection_cards": {
      const count = getCollectionCardsData(section.data).collectionIds.length;
      return `${count} collection${count === 1 ? "" : "s"}`;
    }
    case "product_cards":
      return PRODUCT_CARDS_SOURCE_LABELS[getProductCardsData(section.data).source];
    case "cta_button":
      return getCtaButtonData(section.data).text || null;
    case "footer":
    case "countdown":
      return null;
  }
}

export function EmailSectionCard({
  section,
  dragHandleProps,
  collectionOptions,
  productOptions,
  showEditUrlHint,
}: {
  section: EmailSectionRow;
  dragHandleProps: {
    draggable: boolean;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: () => void;
  };
  collectionOptions: { id: string; name: string }[];
  productOptions: { id: string; name: string; brand: string }[];
  showEditUrlHint: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  const summary = summarize(section);

  return (
    <div className={`rounded-card bg-white shadow-sm shadow-ink/5 ${!section.show ? "opacity-60" : ""}`}>
      <div
        {...dragHandleProps}
        className="flex cursor-grab items-center gap-2 p-4 active:cursor-grabbing"
      >
        <span aria-hidden className="shrink-0 text-ink-soft">
          ⠿
        </span>
        <span aria-hidden className="shrink-0 text-lg">
          {SECTION_ICONS[section.type]}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 truncate text-left"
        >
          <span className="font-display font-bold">{EMAIL_SECTION_TYPE_LABELS[section.type]}</span>
          {summary && <span className="truncate text-sm text-ink-soft">— {summary}</span>}
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => void toggleSectionShow(section.id))}
          className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${
            section.show ? "bg-mint text-[#3f6b57]" : "bg-ink/10 text-ink-soft"
          }`}
        >
          {section.show ? "☑ Show" : "☐ Hide"}
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => void duplicateSection(section.id))}
          className="shrink-0 rounded-pill px-2 py-1 text-xs font-semibold text-ink-soft hover:bg-mint/30"
        >
          Duplicate
        </button>
        <DeleteButton
          action={() => deleteSection(section.id)}
          confirmMessage="Delete this section? This can't be undone."
          className="shrink-0 text-xs"
        >
          Delete
        </DeleteButton>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse section" : "Expand section"}
          className="shrink-0 text-ink-soft"
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-line p-4">
          {section.type === "hero_banner" && (
            <HeroBannerSectionEditor
              action={updateHeroBannerSection.bind(null, section.id)}
              data={getHeroBannerData(section.data)}
            />
          )}
          {section.type === "greeting" && (
            <p className="text-sm text-ink-soft">
              &quot;Hi {"{first name}"},&quot; — always uses the recipient&apos;s real name. Nothing to configure.
            </p>
          )}
          {section.type === "rich_text" && (
            <RichTextSectionEditor
              action={updateRichTextSection.bind(null, section.id)}
              data={getRichTextData(section.data)}
            />
          )}
          {section.type === "image" && (
            <ImageSectionEditor
              action={updateImageSection.bind(null, section.id)}
              data={getImageData(section.data)}
            />
          )}
          {section.type === "collection_cards" && (
            <CollectionCardsSectionEditor
              action={updateCollectionCardsSection.bind(null, section.id)}
              data={getCollectionCardsData(section.data)}
              collectionOptions={collectionOptions}
            />
          )}
          {section.type === "product_cards" && (
            <ProductCardsSectionEditor
              action={updateProductCardsSection.bind(null, section.id)}
              data={getProductCardsData(section.data)}
              productOptions={productOptions}
            />
          )}
          {section.type === "cta_button" && (
            <CTAButtonSectionEditor
              action={updateCtaButtonSection.bind(null, section.id)}
              data={getCtaButtonData(section.data)}
              showEditUrlHint={showEditUrlHint}
            />
          )}
          {section.type === "footer" && (
            <p className="text-sm text-ink-soft">
              Contact Us / Shipping Policy / Website / Instagram links + Unsubscribe — edit these in{" "}
              <Link href="/admin/settings" className="underline hover:text-ink">
                Site Settings
              </Link>
              . Nothing to configure here.
            </p>
          )}
          {section.type === "countdown" && (
            <p className="text-sm text-ink-soft">
              Time remaining until the event countdown target set in{" "}
              <Link href="/admin/settings" className="underline hover:text-ink">
                Site Settings
              </Link>
              . Nothing to configure here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
