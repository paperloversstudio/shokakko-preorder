"use client";

import { useState, useTransition } from "react";
import {
  SECTION_TYPES,
  SECTION_TYPE_LABELS,
  SECTION_TYPE_DESCRIPTIONS,
  type SectionType,
} from "@/lib/validations/event-page";
import { addSection, reorderSections } from "./actions";
import { SectionCard, type SectionRow } from "./SectionCard";

/**
 * Same local-state-mirrors-server + native-drag-and-drop pattern as
 * ../banners/BannerList.tsx. One addition BannerList never needed: this
 * list resyncs local state whenever the `initialSections` prop changes —
 * BannerList's own "+ Add" flow is a full page navigation, but "+ Add
 * Section" here is inline (no navigation), so a fresh section appearing
 * after `addSection`'s revalidatePath-triggered refresh only shows up if
 * local state re-syncs from the new prop. Done via React's documented
 * "adjust state during render" pattern (comparing against the previous
 * prop, calling setState mid-render) rather than a useEffect — the
 * effect version causes an extra, unnecessary re-render every time and
 * this project's lint config flags it (react-hooks/set-state-in-effect).
 */
export function PageSectionList({
  pageId,
  initialSections,
}: {
  pageId: string;
  initialSections: SectionRow[];
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
          pageId,
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
              <SectionCard
                section={section}
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
            {SECTION_TYPES.map((type: SectionType) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  startTransition(() => {
                    void addSection(pageId, type);
                  });
                }}
                className="flex flex-col rounded-xl px-3 py-2 text-left hover:bg-mint/30"
              >
                <span className="font-semibold">{SECTION_TYPE_LABELS[type]}</span>
                <span className="text-xs text-ink-soft">{SECTION_TYPE_DESCRIPTIONS[type]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
