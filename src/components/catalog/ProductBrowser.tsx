"use client";

import { useMemo, useState } from "react";
import type { CatalogProduct } from "./types";
import { ProductToolbar, type SortOption } from "./ProductToolbar";
import { FilterSidebar } from "./FilterSidebar";
import { FilterDrawer } from "./FilterDrawer";
import { ProductCard } from "./ProductCard";
import { emptyFilters, type CatalogFilters } from "./FilterGroups";
import { useWishlist } from "@/components/wishlist/WishlistContext";

function toggledSet(
  filters: CatalogFilters,
  key: "brands" | "collections" | "types",
  value: string,
): CatalogFilters {
  const next = new Set(filters[key]);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return { ...filters, [key]: next };
}

export function ProductBrowser({ products }: { products: CatalogProduct[] }) {
  const wishlist = useWishlist();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [filters, setFilters] = useState<CatalogFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).sort(),
    [products],
  );
  const collections = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.tags))).sort(),
    [products],
  );
  const types = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.type).filter((t): t is string => !!t))).sort(),
    [products],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const min = filters.minPrice ? Math.round(parseFloat(filters.minPrice) * 100) : null;
    const max = filters.maxPrice ? Math.round(parseFloat(filters.maxPrice) * 100) : null;

    const filtered = products.filter((p) => {
      if (!filters.showSoldOut && p.status === "sold_out") return false;
      if (filters.brands.size > 0 && !filters.brands.has(p.brand)) return false;
      if (filters.types.size > 0 && (!p.type || !filters.types.has(p.type))) return false;
      if (filters.collections.size > 0 && !p.tags.some((tag) => filters.collections.has(tag)))
        return false;
      if (min !== null && (p.priceCents === null || p.priceCents < min)) return false;
      if (max !== null && (p.priceCents === null || p.priceCents > max)) return false;
      if (filters.wishlistOnly && !wishlist.has(p.id)) return false;
      if (term && !`${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(term)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "price-asc":
          return (a.priceCents ?? Infinity) - (b.priceCents ?? Infinity);
        case "price-desc":
          return (b.priceCents ?? -Infinity) - (a.priceCents ?? -Infinity);
        case "newest":
        default:
          return 0; // keep the server's sortOrder/createdAt order
      }
    });
  }, [products, search, sort, filters, wishlist]);

  const filterGroupProps = {
    brands,
    collections,
    types,
    filters,
    onToggleBrand: (v: string) => setFilters((f) => toggledSet(f, "brands", v)),
    onToggleCollection: (v: string) => setFilters((f) => toggledSet(f, "collections", v)),
    onToggleType: (v: string) => setFilters((f) => toggledSet(f, "types", v)),
    onToggleSoldOut: () => setFilters((f) => ({ ...f, showSoldOut: !f.showSoldOut })),
    onToggleWishlistOnly: () => setFilters((f) => ({ ...f, wishlistOnly: !f.wishlistOnly })),
    onPriceChange: (field: "minPrice" | "maxPrice", value: string) =>
      setFilters((f) => ({ ...f, [field]: value })),
    onClear: () => setFilters(emptyFilters),
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
      <FilterSidebar {...filterGroupProps} />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <ProductToolbar
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          onOpenFilters={() => setFiltersOpen(true)}
        />
        {visible.length === 0 ? (
          <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
            {products.length === 0
              ? "New stationery is being added live right now — check back shortly! ✨"
              : "No products match your filters."}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        )}
      </div>
      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} {...filterGroupProps} />
    </div>
  );
}
