import Image from "next/image";
import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import type { DashboardBestSeller } from "@/lib/admin/admin-dashboard";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

const RANK_COLORS = ["#e3b673", "#c9b8a3", "#c69974", "#a8927e", "#a8927e"];

export default function BestSellersMonth({ products }: { products: DashboardBestSeller[] }) {
  const { dir, t, currency } = useAdminLanguage();

  return (
    <div className="admin-surface">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--admin-border)" }}
      >
        <div>
          <p className="admin-card-title font-serif">
            {t("Best Sellers")}
          </p>
          <p className="text-[11px] mt-0.5 admin-faint">
            {t("Ranked by units sold (excludes cancelled orders)")}
          </p>
        </div>
        <Link href="/admin/products" className="admin-link flex items-center gap-1 text-[12px]">
          {t("View all")}
          <ArrowRight size={12} className={dir === "rtl" ? "rotate-180" : undefined} />
        </Link>
      </div>

      {/* Table / empty state */}
      {products.length === 0 ? (
        <div className="admin-empty-state m-4">
          <span className="admin-empty-icon"><TrendingUp size={22} /></span>
          <p className="text-[12.5px] admin-muted">
            {t("No sales recorded yet")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                {["#", "", "Product", "Category", "Units Sold", "Revenue"].map((h) => (
                  <th key={h}>
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product, i) => (
                <tr key={product.slug ?? product.name}>
                  {/* Rank */}
                  <td className="w-10">
                    <span
                      className="text-[13px] font-bold tabular-nums"
                      style={{ color: RANK_COLORS[i] ?? "var(--admin-muted)" }}
                    >
                      {product.rank}
                    </span>
                  </td>

                  {/* Image */}
                  <td className="!pl-3 w-12">
                    <div
                      className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative"
                      style={{ background: "rgb(227 210 184 / 0.05)", border: "1px solid var(--admin-border)" }}
                    >
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="40px"
                        className="object-contain p-1"
                      />
                    </div>
                  </td>

                  {/* Name */}
                  <td className="admin-td-strong" data-admin-no-translate>
                    {product.name}
                  </td>

                  {/* Category */}
                  <td className="admin-muted" data-admin-no-translate>
                    {product.category}
                  </td>

                  {/* Units Sold */}
                  <td className="admin-table-numeric">
                    <span className="admin-badge admin-badge-gold">
                      {product.unitsSold}
                    </span>
                  </td>

                  {/* Revenue */}
                  <td dir="ltr" className="admin-table-numeric admin-td-strong">
                    {product.revenue.toLocaleString("en-EG")} {currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
