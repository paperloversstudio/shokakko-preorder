"use client";

import { useState, useTransition } from "react";
import { DeleteButton } from "@/components/shared/DeleteButton";
import {
  SECTION_TYPE_LABELS,
  textSectionDataSchema,
  imageSectionDataSchema,
  gallerySectionDataSchema,
  buttonSectionDataSchema,
  type SectionType,
  type TextSectionData,
  type ImageSectionData,
  type GallerySectionData,
  type ButtonSectionData,
} from "@/lib/validations/event-page";
import {
  deleteSection,
  duplicateSection,
  updateTextSection,
  updateImageSection,
  updateGallerySection,
  updateButtonSection,
} from "./actions";
import { TextSectionEditor } from "./TextSectionEditor";
import { ImageSectionEditor } from "./ImageSectionEditor";
import { GallerySectionEditor } from "./GallerySectionEditor";
import { ButtonSectionEditor } from "./ButtonSectionEditor";

const SECTION_ICONS: Record<SectionType, string> = {
  text: "📝",
  image: "🖼️",
  gallery: "🖼️",
  button: "🔘",
  divider: "➖",
};

export type SectionRow = {
  id: string;
  type: SectionType;
  data: unknown;
};

// Every read falls back to a schema-valid empty shape rather than
// throwing — `section.data` should always already match its type's
// schema (every write path validates first), but a fallback keeps a
// stray/corrupt row from ever breaking the whole builder page.
function getTextData(data: unknown): TextSectionData {
  const parsed = textSectionDataSchema.safeParse(data);
  return parsed.success ? parsed.data : { html: "" };
}
function getImageData(data: unknown): ImageSectionData {
  const parsed = imageSectionDataSchema.safeParse(data);
  return parsed.success ? parsed.data : { url: "" };
}
function getGalleryData(data: unknown): GallerySectionData {
  const parsed = gallerySectionDataSchema.safeParse(data);
  return parsed.success ? parsed.data : { images: [] };
}
function getButtonData(data: unknown): ButtonSectionData {
  const parsed = buttonSectionDataSchema.safeParse(data);
  return parsed.success ? parsed.data : { text: "", url: "", openInNewTab: false };
}

function summarize(section: SectionRow): string | null {
  switch (section.type) {
    case "text":
      return getTextData(section.data).title || null;
    case "image": {
      const d = getImageData(section.data);
      return d.caption || (d.url ? "1 photo" : null);
    }
    case "gallery": {
      const count = getGalleryData(section.data).images.length;
      return `${count} photo${count === 1 ? "" : "s"}`;
    }
    case "button":
      return getButtonData(section.data).text || null;
    case "divider":
      return null;
  }
}

export function SectionCard({
  section,
  dragHandleProps,
}: {
  section: SectionRow;
  dragHandleProps: {
    draggable: boolean;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: () => void;
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  const summary = summarize(section);

  return (
    <div className="rounded-card bg-white shadow-sm shadow-ink/5">
      {/* Only the header row is draggable, not the whole card — keeps
          native drag from ever interfering with text selection inside
          an expanded Text section's rich text editor. */}
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
          <span className="font-display font-bold">{SECTION_TYPE_LABELS[section.type]}</span>
          {summary && <span className="truncate text-sm text-ink-soft">— {summary}</span>}
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
          {section.type === "text" && (
            <TextSectionEditor
              action={updateTextSection.bind(null, section.id)}
              data={getTextData(section.data)}
            />
          )}
          {section.type === "image" && (
            <ImageSectionEditor
              action={updateImageSection.bind(null, section.id)}
              data={getImageData(section.data)}
            />
          )}
          {section.type === "gallery" && (
            <GallerySectionEditor
              action={updateGallerySection.bind(null, section.id)}
              data={getGalleryData(section.data)}
            />
          )}
          {section.type === "button" && (
            <ButtonSectionEditor
              action={updateButtonSection.bind(null, section.id)}
              data={getButtonData(section.data)}
            />
          )}
          {section.type === "divider" && (
            <p className="text-sm text-ink-soft">
              A plain visual line between sections — nothing to configure.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
