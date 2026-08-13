import Link from "next/link";
import { db } from "@/lib/db";

export default async function AdminDashboardPage() {
  const [productCount, activeProductCount, preOrderCount, itemCount] =
    await Promise.all([
      db.product.count(),
      db.product.count({ where: { status: "active" } }),
      db.preOrder.count(),
      db.orderItem.aggregate({ _sum: { quantity: true } }),
    ]);

  const stats = [
    {
      label: "Products live",
      value: `${activeProductCount} / ${productCount}`,
      href: "/admin/products",
      tone: "bg-blue/15",
    },
    {
      label: "Pre-orders submitted",
      value: String(preOrderCount),
      href: "/admin/preorders",
      tone: "bg-coral/15",
    },
    {
      label: "Items pre-ordered",
      value: String(itemCount._sum.quantity ?? 0),
      href: "/admin/preorders",
      tone: "bg-mint",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`rounded-card p-5 shadow-sm shadow-ink/5 ${stat.tone}`}
          >
            <p className="text-sm font-semibold text-ink-soft">{stat.label}</p>
            <p className="font-display text-3xl font-extrabold">{stat.value}</p>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/products/new"
          className="rounded-card bg-white px-5 py-4 font-display font-bold shadow-sm shadow-ink/5 hover:bg-mint/30"
        >
          + Add a product
        </Link>
        <Link
          href="/admin/preorders"
          className="rounded-card bg-white px-5 py-4 font-display font-bold shadow-sm shadow-ink/5 hover:bg-mint/30"
        >
          View pre-orders
        </Link>
      </div>
    </div>
  );
}
