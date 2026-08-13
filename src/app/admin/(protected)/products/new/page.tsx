import Link from "next/link";
import { createProduct } from "../actions";
import { ProductForm } from "../ProductForm";

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/products"
          className="text-sm font-semibold text-ink-soft hover:text-ink"
        >
          ← Back to products
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold">Add a product</h1>
      </div>
      <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
        <ProductForm action={createProduct} submitLabel="Add product" />
      </div>
    </div>
  );
}
