"use client";

import { useMemo, useState, useTransition } from "react";
import {
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
  type PurchaseStatus,
} from "@/lib/validations/purchase";
import { updatePurchaseStatus } from "./actions";
import { getOrderItemOptions } from "@/lib/order-item-options";

export type BuyingListRow = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  variantGroupName: string | null;
  brand: string;
  type: string | null;
  status: "active" | "draft" | "sold_out";
  collections: string[];
  imageUrl: string | null;
  requestedQuantity: number;
  customerCount: number;
  purchaseStatus: PurchaseStatus;
};

type SortKey = "quantity" | "brand" | "collection" | "name";

const PRODUCT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  sold_out: "Sold Out",
  draft: "Draft",
};

function rowKey(row: Pick<BuyingListRow, "productId" | "variantId">): string {
  return `${row.productId}::${row.variantId ?? ""}`;
}

/** "{Group}: {Value}" instead of a bare variant name — never a hardcoded
 * label. Joined with ", " on the rare chance getOrderItemOptions() ever
 * returns more than one option. */
function variantLabel(row: Pick<BuyingListRow, "variantName" | "variantGroupName">): string {
  return getOrderItemOptions(row)
    .map((o) => `${o.label}: ${o.value}`)
    .join(", ");
}

function toCsv(rows: BuyingListRow[]): string {
  const header = [
    "Product",
    "Variant",
    "Brand",
    "Type",
    "Status",
    "Collections",
    "Requested Qty",
    "Customers",
    "Purchase Status",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.productName,
      variantLabel(r),
      r.brand,
      r.type ?? "",
      PRODUCT_STATUS_LABELS[r.status] ?? r.status,
      r.collections.join("; "),
      String(r.requestedQuantity),
      String(r.customerCount),
      PURCHASE_STATUS_LABELS[r.purchaseStatus],
    ]
      .map(escape)
      .join(","),
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}

function downloadCsv(rows: BuyingListRow[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `purchase-buying-list-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function StatusRowSelect({ row }: { row: BuyingListRow }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<PurchaseStatus>(row.purchaseStatus);

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as PurchaseStatus;
        setStatus(next);
        startTransition(() => {
          void updatePurchaseStatus(row.productId, row.variantId, next);
        });
      }}
      className="rounded-pill border border-line bg-white px-2 py-1 text-xs font-semibold outline-none focus:border-blue disabled:opacity-50"
    >
      {PURCHASE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {PURCHASE_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

function FilterChips({
  label,
  options,
  selected,
  onToggle,
  labelFor,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  labelFor?: (value: string) => string;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`rounded-pill px-2 py-1 text-xs font-semibold transition ${
              selected.has(opt)
                ? "bg-blue text-white"
                : "border border-line bg-white text-ink-soft hover:bg-mint/30"
            }`}
          >
            {labelFor ? labelFor(opt) : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Sprint 3.5 — mobile-first (Karen mainly uses this on her phone while
 * shopping at the exhibition): a stacked card list below `md:`, an actual
 * `<table>` from `md:` up. Filters/sort/search are client-side state over
 * the already-fetched rows, same "fetch once, filter in the browser"
 * approach ProductBrowser already established for the customer catalog —
 * this list is bounded to the same 100–200-ish scale. */
export function PurchaseBuyingList({ rows }: { rows: BuyingListRow[] }) {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<Set<string>>(new Set());
  const [collectionFilter, setCollectionFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [purchaseFilter, setPurchaseFilter] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("quantity");

  const brands = useMemo(() => Array.from(new Set(rows.map((r) => r.brand))).sort(), [rows]);
  const collections = useMemo(
    () => Array.from(new Set(rows.flatMap((r) => r.collections))).sort(),
    [rows],
  );
  const types = useMemo(
    () => Array.from(new Set(rows.map((r) => r.type).filter((t): t is string => !!t))).sort(),
    [rows],
  );

  function toggle(setFn: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (brandFilter.size > 0 && !brandFilter.has(r.brand)) return false;
      if (collectionFilter.size > 0 && !r.collections.some((c) => collectionFilter.has(c)))
        return false;
      if (typeFilter.size > 0 && (!r.type || !typeFilter.has(r.type))) return false;
      if (statusFilter.size > 0 && !statusFilter.has(r.status)) return false;
      if (purchaseFilter.size > 0 && !purchaseFilter.has(r.purchaseStatus)) return false;
      if (
        term &&
        !`${r.productName} ${r.variantName ?? ""} ${r.brand}`.toLowerCase().includes(term)
      )
        return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "brand":
          return a.brand.localeCompare(b.brand);
        case "collection":
          return (a.collections[0] ?? "").localeCompare(b.collections[0] ?? "");
        case "name":
          return a.productName.localeCompare(b.productName);
        case "quantity":
        default:
          return b.requestedQuantity - a.requestedQuantity;
      }
    });
  }, [rows, search, brandFilter, collectionFilter, typeFilter, statusFilter, purchaseFilter, sortKey]);

  return (
    <div className="flex flex-col gap-4">
      <div className="print:hidden flex flex-col gap-3 rounded-card bg-white p-4 shadow-sm shadow-ink/5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="min-w-0 flex-1 rounded-2xl border border-line bg-white px-4 py-2 text-sm outline-none focus:border-blue"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-2xl border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="quantity">Sort: Quantity</option>
            <option value="brand">Sort: Brand</option>
            <option value="collection">Sort: Collection</option>
            <option value="name">Sort: Product Name</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-4">
          <FilterChips
            label="Brand"
            options={brands}
            selected={brandFilter}
            onToggle={(v) => toggle(setBrandFilter, v)}
          />
          <FilterChips
            label="Collection"
            options={collections}
            selected={collectionFilter}
            onToggle={(v) => toggle(setCollectionFilter, v)}
          />
          <FilterChips
            label="Product Type"
            options={types}
            selected={typeFilter}
            onToggle={(v) => toggle(setTypeFilter, v)}
          />
          <FilterChips
            label="Product Status"
            options={["active", "sold_out", "draft"]}
            selected={statusFilter}
            onToggle={(v) => toggle(setStatusFilter, v)}
            labelFor={(v) => PRODUCT_STATUS_LABELS[v] ?? v}
          />
          <FilterChips
            label="Purchased Status"
            options={[...PURCHASE_STATUSES]}
            selected={purchaseFilter}
            onToggle={(v) => toggle(setPurchaseFilter, v)}
            labelFor={(v) => PURCHASE_STATUS_LABELS[v as PurchaseStatus] ?? v}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadCsv(visible)}
            className="rounded-pill bg-blue px-4 py-1.5 text-xs font-bold text-white transition hover:brightness-105"
          >
            ⬇ Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-pill border border-line bg-white px-4 py-1.5 text-xs font-bold text-ink-soft hover:bg-mint/30"
          >
            🖨 Print
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
          No requested products match these filters.
        </p>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <ul className="flex flex-col gap-2 md:hidden print:hidden">
            {visible.map((row) => (
              <li
                key={rowKey(row)}
                className="flex items-center gap-3 rounded-card bg-white p-3 shadow-sm shadow-ink/5"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-mint/30">
                  {row.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">
                      🎀
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{row.productName}</p>
                  {row.variantName && (
                    <p className="text-xs text-ink-soft">{variantLabel(row)}</p>
                  )}
                  <p className="text-xs text-ink-soft">
                    Qty {row.requestedQuantity} · {row.customerCount} customer
                    {row.customerCount === 1 ? "" : "s"}
                  </p>
                </div>
                <StatusRowSelect row={row} />
              </li>
            ))}
          </ul>

          {/* Tablet/desktop (and print): table */}
          <div className="hidden overflow-x-auto rounded-card bg-white shadow-sm shadow-ink/5 md:block print:block print:overflow-visible print:shadow-none">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-ink-soft">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Variant</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3 text-right">Requested</th>
                  <th className="px-4 py-3 text-right">Customers</th>
                  <th className="px-4 py-3">Purchase Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((row) => (
                  <tr key={rowKey(row)}>
                    <td className="px-4 py-3 font-semibold">{row.productName}</td>
                    <td className="px-4 py-3 text-ink-soft">{row.variantName ? variantLabel(row) : "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{row.brand}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.requestedQuantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.customerCount}</td>
                    <td className="px-4 py-3">
                      <StatusRowSelect row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
