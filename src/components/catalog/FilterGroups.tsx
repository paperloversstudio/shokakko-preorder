"use client";

export type CatalogFilters = {
  brands: Set<string>;
  collections: Set<string>;
  types: Set<string>;
  showSoldOut: boolean;
  wishlistOnly: boolean;
  minPrice: string;
  maxPrice: string;
};

export const emptyFilters: CatalogFilters = {
  brands: new Set(),
  collections: new Set(),
  types: new Set(),
  showSoldOut: true,
  wishlistOnly: false,
  minPrice: "",
  maxPrice: "",
};

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-bold text-ink">{label}</legend>
      {options.map((option) => (
        <label key={option} className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={selected.has(option)}
            onChange={() => onToggle(option)}
            className="h-4 w-4"
          />
          {option}
        </label>
      ))}
    </fieldset>
  );
}

export function FilterGroups({
  brands,
  collections,
  types,
  filters,
  onToggleBrand,
  onToggleCollection,
  onToggleType,
  onToggleSoldOut,
  onToggleWishlistOnly,
  onPriceChange,
  onClear,
}: {
  brands: string[];
  collections: string[];
  types: string[];
  filters: CatalogFilters;
  onToggleBrand: (v: string) => void;
  onToggleCollection: (v: string) => void;
  onToggleType: (v: string) => void;
  onToggleSoldOut: () => void;
  onToggleWishlistOnly: () => void;
  onPriceChange: (field: "minPrice" | "maxPrice", value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onClear}
        className="self-start text-sm font-semibold text-blue hover:underline"
      >
        Clear all filters
      </button>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <input
          type="checkbox"
          checked={filters.wishlistOnly}
          onChange={onToggleWishlistOnly}
          className="h-4 w-4"
        />
        ♡ Wishlist
      </label>
      <CheckboxGroup
        label="Brand"
        options={brands}
        selected={filters.brands}
        onToggle={onToggleBrand}
      />
      <CheckboxGroup
        label="Product Collection"
        options={collections}
        selected={filters.collections}
        onToggle={onToggleCollection}
      />
      <CheckboxGroup
        label="Product Type"
        options={types}
        selected={filters.types}
        onToggle={onToggleType}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-bold text-ink">Price (AUD)</legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => onPriceChange("minPrice", e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-1.5 text-sm outline-none focus:border-blue"
          />
          <span className="text-ink-soft">–</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => onPriceChange("maxPrice", e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-1.5 text-sm outline-none focus:border-blue"
          />
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <input
          type="checkbox"
          checked={filters.showSoldOut}
          onChange={onToggleSoldOut}
          className="h-4 w-4"
        />
        Show sold out items
      </label>
    </div>
  );
}
