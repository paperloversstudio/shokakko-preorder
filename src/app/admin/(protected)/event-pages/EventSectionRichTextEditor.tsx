"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";

/**
 * Sprint 4 — the Event Pages CMS's Text section editor. Deliberately a
 * SEPARATE component from `../settings/PreorderInfoEditor.tsx`, not a
 * wider-configured variant of it: that editor's narrow schema
 * (paragraph/bold/italic/lists/link only) is documented there as a
 * trust boundary for `preorderInfoHtml`/`karenNotesHtml`, and loosening
 * it would weaken that guarantee for two unrelated features. This editor
 * gets its own, independently-documented, wider schema instead — same
 * "the editor's own registered schema is the sanitizer" reasoning, just a
 * bigger allow-list: headings (2–3), paragraphs, bold, italic, both list
 * types, links, tables, horizontal rules, text colour, and text
 * alignment. Blockquote/code/codeBlock/strike/underline stay disabled —
 * not asked for by the Sprint 4 brief, so not included, same discipline
 * as the narrow editor.
 *
 * "Copy & paste from Microsoft Word" needs no special handling — Tiptap/
 * ProseMirror already filters pasted HTML down to whatever this editor's
 * schema allows, so Word's own fonts/margins/track-changes markup get
 * stripped automatically while headings/bold/italic/lists/tables/links
 * survive.
 */

const TEXT_COLORS: { label: string; value: string | null }[] = [
  { label: "Default", value: null },
  { label: "Ink", value: "#4a3f42" },
  { label: "Blue", value: "#97b4d6" },
  { label: "Coral", value: "#e89898" },
  { label: "Lavender", value: "#e0c9e8" },
  { label: "Mint", value: "#3f6b57" },
  { label: "Gray", value: "#8a7b7e" },
];

// A small curated set, not a full emoji-picker library — this app already
// leans on emoji as its icon language site-wide, so a handful of rows
// covering brand marks + everyday reactions covers realistic CMS content
// without a new dependency.
const EMOJI_ROWS: string[][] = [
  ["🎀", "✿", "🌸", "📦", "🧾", "🛍️", "🔐", "✨"],
  ["😀", "😊", "🥰", "🎉", "👍", "🙏", "💡", "🔥"],
  ["📝", "📌", "⭐", "☕", "🌟", "🎁", "💌", "❤️"],
];

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // Clicking a plain <button> shifts DOM focus to it by default,
      // which can clear the editor's active text selection before the
      // click handler ever runs a command against it — the standard
      // Tiptap toolbar fix is to prevent that on mousedown, before focus
      // moves, so the selection survives until `.chain().focus()` inside
      // each handler explicitly restores editor focus.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-sm font-semibold transition ${
        active ? "bg-blue text-white" : "bg-mint/30 text-ink hover:bg-mint/50"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span aria-hidden className="mx-0.5 h-6 w-px bg-line" />;
}

function EmojiButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <ToolbarButton label="Insert emoji" onClick={() => setOpen((v) => !v)}>
        🙂
      </ToolbarButton>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 flex flex-col gap-1 rounded-2xl border border-line bg-white p-2 shadow-sm shadow-ink/10">
          {EMOJI_ROWS.map((row, i) => (
            <div key={i} className="flex gap-1">
              {row.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().insertContent(emoji).run();
                    setOpen(false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-mint/30"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const blockType = editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
      ? "h3"
      : "paragraph";

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-line pb-2">
      <select
        aria-label="Block type"
        value={blockType}
        onChange={(e) => {
          const chain = editor.chain().focus();
          if (e.target.value === "h2") chain.setHeading({ level: 2 }).run();
          else if (e.target.value === "h3") chain.setHeading({ level: 3 }).run();
          else chain.setParagraph().run();
        }}
        className="h-8 rounded-lg border border-line bg-white px-2 text-xs font-semibold"
      >
        <option value="paragraph">Paragraph</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>

      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •≡
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.≡
      </ToolbarButton>
      <ToolbarButton
        label="Link"
        active={editor.isActive("link")}
        onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const url = window.prompt("Link URL");
          if (!url) return;
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        🔗
      </ToolbarButton>

      <ToolbarDivider />

      <div className="flex items-center gap-1">
        {TEXT_COLORS.map((c) => (
          <button
            key={c.label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            title={c.label}
            aria-label={`Text colour: ${c.label}`}
            onClick={() =>
              c.value
                ? editor.chain().focus().setColor(c.value).run()
                : editor.chain().focus().unsetColor().run()
            }
            className="h-6 w-6 shrink-0 rounded-full border border-line"
            style={{ backgroundColor: c.value ?? "#fdfbf8" }}
          />
        ))}
      </div>

      <ToolbarDivider />

      <ToolbarButton
        label="Align left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        ≡
      </ToolbarButton>
      <ToolbarButton
        label="Align centre"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        ⋮≡
      </ToolbarButton>
      <ToolbarButton
        label="Align right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        ≡⋮
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Insert table"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        ⊞
      </ToolbarButton>
      {editor.isActive("table") && (
        <>
          <ToolbarButton label="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>
            +row
          </ToolbarButton>
          <ToolbarButton label="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>
            +col
          </ToolbarButton>
          <ToolbarButton
            label="Delete table"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            ✕table
          </ToolbarButton>
        </>
      )}

      <ToolbarButton label="Horizontal line" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        ―
      </ToolbarButton>

      <EmojiButton editor={editor} />
    </div>
  );
}

export function EventSectionRichTextEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const [html, setHtml] = useState(defaultValue);

  const editor = useEditor({
    // Avoids a Tiptap/Next.js SSR hydration mismatch warning, same as
    // PreorderInfoEditor.tsx.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: defaultValue || "",
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "rich-text min-h-[200px] max-w-none outline-none",
      },
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <Toolbar editor={editor} />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white px-4 py-3 focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/30">
        <EditorContent editor={editor} />
      </div>
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
