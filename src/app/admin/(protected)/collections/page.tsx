import Link from "next/link";
import { db } from "@/lib/db";
import { TagImageForm } from "./TagImageForm";

export default async function AdminCollectionsPage() {
  const tags = await db.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Collections</h1>
        <p className="text-sm text-ink-soft">
          Square images for each collection (product tag) — used by the
          Update Email&apos;s Collection Cards (Sprint 3) and the public{" "}
          <Link href="/collections" className="underline">
            collection pages
          </Link>
          . Tags themselves are still created from the product form.
        </p>
      </div>

      {tags.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
          No collections yet — add comma-separated tags on a product to
          create one.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-sm shadow-ink/5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="font-display font-bold">{tag.name}</span>
                <span className="text-sm text-ink-soft">
                  · {tag._count.products} product{tag._count.products === 1 ? "" : "s"}
                </span>
                <Link
                  href={`/collections/${tag.id}`}
                  className="text-sm font-semibold text-blue hover:underline"
                >
                  View page →
                </Link>
              </div>
              <TagImageForm tagId={tag.id} imageUrl={tag.imageUrl} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
