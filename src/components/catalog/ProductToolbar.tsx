"use client";

export type SortOption = "newest" | "name-asc" | "price-asc" | "price-desc";

export function ProductToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  onOpenFilters,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  onOpenFilters: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search products…"
        aria-label="Search products"
        className="min-w-0 flex-1 rounded-pill border border-line bg-white px-4 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/30"
      />
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        aria-label="Sort products"
        className="rounded-pill border border-line bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue"
      >
        <option value="newest">Newest</option>
        <option value="name-asc">Name A–Z</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
      </select>
      <button
        type="button"
        onClick={onOpenFilters}
        className="rounded-pill border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-mint/30 lg:hidden"
      >
        Filters
      </button>
    </div>
  );
}
