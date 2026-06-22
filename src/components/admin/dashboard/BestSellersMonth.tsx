import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BEST_SELLERS_MONTH } from "@/lib/mock-data/admin/dashboard-mock";

const RANK_COLORS = ["#d6a373", "#9ca3af", "#b87333", "#6b7280", "#6b7280"];

export default function BestSellersMonth() {
  return (
    <div className="admin-surface">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}
      >
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
          >
            Best Sellers — This Month
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
            Ranked by units sold in June 2026
          </p>
        </div>
        <Link
          href="/admin/products"
          className="flex items-center gap-1 text-[12px] font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--gold)" }}
        >
          View all
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(182,136,94,0.06)" }}>
              {["#", "", "Product", "Category", "Units Sold", "Revenue"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-2.5 text-left font-medium uppercase tracking-wider text-[10px]"
                  style={{ color: "var(--cream-dim)", opacity: 0.5 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BEST_SELLERS_MONTH.map((product, i) => {
              const isLast = i === BEST_SELLERS_MONTH.length - 1;
              return (
                <tr
                  key={product.rank}
                  className="transition-colors hover:bg-white/[0.02]"
                  style={!isLast ? { borderBottom: "1px solid rgba(182,136,94,0.05)" } : undefined}
                >
                  {/* Rank */}
                  <td className="px-5 py-3 w-10">
                    <span
                      className="text-[13px] font-bold tabular-nums"
                      style={{ color: RANK_COLORS[i] ?? "var(--cream-dim)" }}
                    >
                      {product.rank}
                    </span>
                  </td>

                  {/* Image */}
                  <td className="pl-3 py-3 w-12">
                    <div
                      className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative"
                      style={{ background: "rgba(182,136,94,0.06)", border: "1px solid rgba(182,136,94,0.10)" }}
                    >
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <p className="font-semibold" style={{ color: "var(--cream)" }}>
                      {product.name}
                    </p>
                  </td>

                  {/* Category */}
                  <td className="px-5 py-3" style={{ color: "var(--cream-dim)" }}>
                    {product.category}
                  </td>

                  {/* Units Sold */}
                  <td className="px-5 py-3 tabular-nums" style={{ color: "var(--cream)" }}>
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: "rgba(182,136,94,0.10)", color: "var(--gold)" }}
                    >
                      {product.unitsSold} kg
                    </span>
                  </td>

                  {/* Revenue */}
                  <td className="px-5 py-3 tabular-nums font-semibold" style={{ color: "var(--cream)" }}>
                    {product.revenue.toLocaleString("en-EG")} EGP
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
