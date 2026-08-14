"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { centsToDollars } from "@/lib/validations/product";
import type { ProductFormState } from "./actions";
import { ProductImageManager } from "./ProductImageManager";
import { ProductVariantManager } from "./ProductVariantManager";

type ProductDefaults = {
  brand: string;
  name: string;
  sku: string;
  description: string;
  estimatedArrival: string;
  priceCents: number | null;
  type: string;
  status: "active" | "draft" | "sold_out";
  sortOrder: number;
  tags: string[];
  images: { id: string; url: string }[];
  isNew: boolean;
  variantGroupName: string;
  variants: { id: string; name: string; sku: string | null; priceCents: number | null; imageUrl: string | null }[];
};

const emptyDefaults: ProductDefaults = {
  brand: "",
  name: "",
  sku: "",
  description: "",
  estimatedArrival: "",
  priceCents: null,
  type: "",
  status: "active",
  sortOrder: 0,
  tags: [],
  images: [],
  isNew: false,
  variantGroupName: "",
  variants: [],
};

const initialState: ProductFormState = {};

export function ProductForm({
  action,
  defaults = emptyDefaults,
  submitLabel = "Save product",
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  defaults?: ProductDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p
          role="alert"
          className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral"
        >
          {state.error}
        </p>
      )}

      <Field
        label="Product photos"
        htmlFor="photo-add"
        hint="JPG, PNG, WEBP or GIF, up to 8MB each. Drag to reorder — optional, you can add these later."
      >
        <ProductImageManager initialImages={defaults.images} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Brand" htmlFor="brand" error={errors.brand}>
          <input
            id="brand"
            name="brand"
            defaultValue={defaults.brand}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Product name" htmlFor="name" error={errors.name}>
          <input
            id="name"
            name="name"
            defaultValue={defaults.name}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="SKU" htmlFor="sku" error={errors.sku}>
          <input
            id="sku"
            name="sku"
            defaultValue={defaults.sku}
            required
            className={inputClass}
          />
        </Field>
        <Field
          label="Price (AUD)"
          htmlFor="price"
          error={errors.price}
          hint='Leave blank to show "Price Coming Soon" instead of a price.'
        >
          <input
            id="price"
            name="price"
            inputMode="decimal"
            placeholder="e.g. 12.50"
            defaultValue={centsToDollars(defaults.priceCents)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Short description" htmlFor="description" error={errors.description}>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaults.description}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Estimated arrival"
          htmlFor="estimatedArrival"
          error={errors.estimatedArrival}
          hint='Optional — free text, e.g. "Late September 2026".'
        >
          <input
            id="estimatedArrival"
            name="estimatedArrival"
            defaultValue={defaults.estimatedArrival}
            className={inputClass}
          />
        </Field>
        <Field
          label="Collection tags"
          htmlFor="tags"
          error={errors.tags}
          hint="Comma-separated, e.g. Washi Tape, Autumn Collection"
        >
          <input
            id="tags"
            name="tags"
            defaultValue={defaults.tags.join(", ")}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Product type"
          htmlFor="type"
          error={errors.type}
          hint="Free text, e.g. Notebook, Washi Tape, Sticker."
        >
          <input id="type" name="type" defaultValue={defaults.type} className={inputClass} />
        </Field>
        <Field label="Status" htmlFor="status" error={errors.status}>
          <select
            id="status"
            name="status"
            defaultValue={defaults.status}
            className={inputClass}
          >
            <option value="active">Active — visible to customers</option>
            <option value="sold_out">Sold Out — visible, not orderable</option>
            <option value="draft">Draft — hidden from customers</option>
          </select>
        </Field>
      </div>

      <Field
        label="Sort order"
        htmlFor="sortOrder"
        error={errors.sortOrder}
        hint="Lower numbers show first. New products default to 0."
      >
        <input
          id="sortOrder"
          name="sortOrder"
          inputMode="numeric"
          defaultValue={String(defaults.sortOrder)}
          className={`${inputClass} sm:max-w-[12rem]`}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <input
          type="checkbox"
          name="isNew"
          defaultChecked={defaults.isNew}
          className="h-4 w-4"
        />
        🆕 Mark as New — features this product in the Update Email&apos;s
        &quot;New Products&quot; section
      </label>

      <Field
        label="Variants"
        htmlFor="variantGroupName"
        hint='Optional. Customers pick one as pills (e.g. "Design: Cat / Bear / Rabbit"), not a dropdown.'
      >
        <ProductVariantManager
          initialGroupName={defaults.variantGroupName}
          initialVariants={defaults.variants.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            priceDollars: centsToDollars(v.priceCents),
            imageUrl: v.imageUrl,
          }))}
        />
      </Field>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
