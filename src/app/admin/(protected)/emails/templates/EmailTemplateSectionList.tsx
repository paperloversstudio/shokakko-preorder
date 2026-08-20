"use client";

import { useState, useTransition } from "react";
import {
  EMAIL_SECTION_TYPES,
  EMAIL_SECTION_TYPE_LABELS,
  EMAIL_SECTION_TYPE_DESCRIPTIONS,
  type EmailSectionType,
} from "@/lib/validations/email-template";
import { addSection, reorderSections } from "./actions";
import { EmailSectionCard, type EmailSectionRow } from "./EmailSectionCard";

/** Same local-state-mirrors-server + native-drag-and-drop pattern as
 * event-pages/PageSectionList.tsx. */
export function EmailTemplateSectionList({
  templateId,
  initialSections,
  collectionOptions,
  productOptions,
  showEditUrlHint,
}: {
  templateId: string;
  initialSections: EmailSectionRow[];
  collectionOptions: { id: string; name: string }[];
  productOptions: { id: string; name: string; brand: string }[];
  showEditUrlHint: boolean;
}) {
  const [prevInitialSections, setPrevInitialSections] = useState(initialSections);
  const [sections, setSections] = useState(initialSections);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [, startTransition] = useTransition();

  if (initialSections !== prevInitialSections) {
    setPrevInitialSections(initialSections);
    setSections(initialSections);
  }

  function moveSection(from: number, to: number) {
    setSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      startTransition(() => {
        void reorderSections(
          templateId,
          next.map((s) => s.id),
        );
      });
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
          No sections yet — add your first one below.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sections.map((section, index) => (
            <li key={section.id}>
              <EmailSectionCard
                section={section}
                collectionOptions={collectionOptions}
                productOptions={productOptions}
                showEditUrlHint={showEditUrlHint}
                dragHandleProps={{
                  draggable: true,
                  onDragStart: () => setDragIndex(index),
                  onDragOver: (e) => e.preventDefault(),
                  onDrop: () => {
                    if (dragIndex !== null && dragIndex !== index) moveSection(dragIndex, index);
                    setDragIndex(null);
                  },
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="relative self-start">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="rounded-pill border border-dashed border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-mint/20"
        >
          + Add Section
        </button>
        {pickerOpen && (
          <div className="absolute left-0 top-full z-10 mt-1 flex w-72 flex-col gap-1 rounded-2xl border border-line bg-white p-2 shadow-sm shadow-ink/10">
            {EMAIL_SECTION_TYPES.map((type: EmailSectionType) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  startTransition(() => {
                    void addSection(templateId, type);
                  });
                }}
                className="flex flex-col rounded-xl px-3 py-2 text-left hover:bg-mint/30"
              >
                <span className="font-semibold">{EMAIL_SECTION_TYPE_LABELS[type]}</span>
                <span className="text-xs text-ink-soft">{EMAIL_SECTION_TYPE_DESCRIPTIONS[type]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
