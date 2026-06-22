"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Search, LayoutGrid, List, Package, TrendingDown, Star, Eye, AlertTriangle } from "lucide-react";
import {
  adminProducts as BASE_PRODUCTS,
  type AdminProduct,
  type AdminProductMeta,
  type ProductStatus,
} from "@/lib/mock-data/admin/products-admin-mock";
import {
  catalogCategories,
  type CatalogCategorySlug,
} from "@/lib/mock-data/product-catalog";
import ProductDrawer from "@/components/admin/products/ProductDrawer";

// ── Constants ─────────────────────────────────────────────────────────────────

const CAT_LABEL: Record<CatalogCategorySlug, string> = {
  "turkish-blends":  "Turkish",
  "espresso-blends": "Espresso",
  "easy-coffee":     "Easy Coffee",
  "coffee-mix":      "Coffee Mix",
  "cappuccino":      "Cappuccino",
  "hot-chocolate":   "Hot Chocolate",
  "flavor-coffee":   "Flavor Coffee",
};

const STATUS_STYLE: Record<ProductStatus, { bg: string; color: string }> = {
  "In Stock":     { bg: "rgba(74,222,128,0.12)",  color: "#4ade80" },
  "Low Stock":    { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
  "Out of Stock": { bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
};

// ── AdminProductCard ──────────────────────────────────────────────────────────

function AdminProductCard({
  product,
  onClick,
}: {
  product: AdminProduct;
  onClick: () => void;
}) {
  const ss = STATUS_STYLE[product.status];
  const s250 = product.sizes.find((sz) => sz.label === "250g");
  const s500 = product.sizes.find((sz) => sz.label === "500g");

  return (
    <button
      type="button"
      onClick={onClick}
      className="admin-surface text-left group"
      style={{
        display: "flex", flexDirection: "column",
        padding: 0, overflow: "hidden",
        border: "1px solid rgba(182,136,94,0.10)",
        transition: "border-color 0.2s",
      }}
    >
      {/* Image */}
      <div style={{
        position: "relative", width: "100%", aspectRatio: "1",
        background: "rgba(182,136,94,0.04)", flexShrink: 0, overflow: "hidden",
      }}>
        <Image
          src={product.image}
          alt={product.name.en}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {/* Status badge — top-left */}
        <span style={{
          position: "absolute", top: 8, left: 8,
          fontSize: 8.5, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
          background: ss.bg, color: ss.color, letterSpacing: "0.03em",
        }}>
          {product.status}
        </span>
        {/* Badges — top-right */}
        <div style={{ position: "absolute", top: 7, right: 7, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          {product.bestSeller && (
            <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 99, background: "rgba(182,136,94,0.88)", color: "#0b0806" }}>BEST</span>
          )}
          {product.featured && (
            <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 99, background: "rgba(96,165,250,0.88)", color: "#0b0806" }}>FEAT</span>
          )}
          {product.hidden && (
            <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 99, background: "rgba(156,163,175,0.7)", color: "#0b0806" }}>HIDDEN</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "10px 11px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <p className="truncate" style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-playfair)", color: "var(--cream)", lineHeight: 1.25 }}>
          {product.name.en}
        </p>
        <p className="truncate" style={{ fontSize: 10.5, direction: "rtl", textAlign: "right", color: "var(--cream-dim)", opacity: 0.38 }}>
          {product.name.ar}
        </p>
        {/* Price chips */}
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 5 }}>
          {s250 && (
            <span style={{ fontSize: 9.5, padding: "1.5px 6px", borderRadius: 5, background: "rgba(182,136,94,0.09)", color: "var(--gold-light)" }}>
              {s250.salePrice}
            </span>
          )}
          {s500 && (
            <span style={{ fontSize: 9.5, padding: "1.5px 6px", borderRadius: 5, background: "rgba(182,136,94,0.09)", color: "var(--gold-light)" }}>
              {s500.salePrice}
            </span>
          )}
          <span style={{ fontSize: 9.5, padding: "1.5px 6px", borderRadius: 5, background: "rgba(182,136,94,0.05)", color: "var(--cream-dim)" }}>
            {product.salePricePerKg}/kg
          </span>
        </div>
        <p style={{ fontSize: 9.5, color: "var(--cream-dim)", opacity: 0.35, marginTop: 3 }}>
          {product.stockQty} in stock · {product.sku}
        </p>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [view,          setView]          = useState<"cards" | "table">("cards");
  const [search,        setSearch]        = useState("");
  const [category,      setCategory]      = useState<CatalogCategorySlug | "all">("all");
  const [drawerSlug,    setDrawerSlug]    = useState<string | null>(null);
  const [metaOverrides, setMetaOverrides] = useState<Record<string, Partial<AdminProductMeta>>>({});

  // Merge base products with drawer-saved overrides
  const allProducts = useMemo<AdminProduct[]>(
    () => BASE_PRODUCTS.map((p) => ({ ...p, ...(metaOverrides[p.slug] ?? {}) })),
    [metaOverrides]
  );

  // KPI counts
  const kpis = useMemo(() => ({
    total:      allProducts.length,
    active:     allProducts.filter((p) => !p.hidden).length,
    lowStock:   allProducts.filter((p) => p.status === "Low Stock").length,
    outOfStock: allProducts.filter((p) => p.status === "Out of Stock").length,
    bestSellers: allProducts.filter((p) => p.bestSeller).length,
  }), [allProducts]);

  // Per-category counts
  const counts = useMemo(() => {
    const m: Record<string, number> = { all: allProducts.length };
    for (const p of allProducts) m[p.category] = (m[p.category] ?? 0) + 1;
    return m;
  }, [allProducts]);

  // Filtered list
  const filtered = useMemo(
    () => allProducts.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      const q = search.toLowerCase();
      return !q
        || p.name.en.toLowerCase().includes(q)
        || p.name.ar.includes(q)
        || p.slug.includes(q)
        || p.sku.toLowerCase().includes(q);
    }),
    [allProducts, category, search]
  );

  const drawerProduct = drawerSlug
    ? allProducts.find((p) => p.slug === drawerSlug) ?? null
    : null;

  const handleSave = (slug: string, meta: Partial<AdminProductMeta>) =>
    setMetaOverrides((prev) => ({ ...prev, [slug]: { ...(prev[slug] ?? {}), ...meta } }));

  const calcMargin = (sale: number, cost: number) =>
    Math.round(((sale - cost) / sale) * 100);

  return (
    <>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
              Products
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
              {allProducts.length} products across {catalogCategories.length} categories
            </p>
          </div>
          <button
            type="button"
            style={{
              padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: "rgba(182,136,94,0.14)", color: "var(--gold)",
              border: "1px solid rgba(182,136,94,0.28)",
            }}
          >
            + Add Product
          </button>
        </div>

        {/* KPI pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(
            [
              { label: "Total Products",  value: kpis.total,       Icon: Package,        color: "var(--gold)"  },
              { label: "Active",          value: kpis.active,      Icon: Eye,            color: "#4ade80"      },
              { label: "Low Stock",       value: kpis.lowStock,    Icon: AlertTriangle,  color: "#fbbf24"      },
              { label: "Out of Stock",    value: kpis.outOfStock,  Icon: TrendingDown,   color: "#ef4444"      },
              { label: "Best Sellers",    value: kpis.bestSellers, Icon: Star,           color: "#60a5fa"      },
            ] as const
          ).map(({ label, value, Icon, color }) => (
            <div key={label} className="admin-surface flex items-center gap-3" style={{ padding: "12px 14px" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: `${color}1a`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, color,
              }}>
                <Icon size={14} />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, color: "var(--cream)", lineHeight: 1.1 }}>{value}</p>
                <p style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.5, marginTop: 1 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar: search + view toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--cream-dim)", opacity: 0.35 }} />
            <input
              type="text"
              placeholder="Search by name, SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[12.5px] outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)", color: "var(--cream)" }}
            />
          </div>
          <div className="flex items-center gap-px p-[3px] rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(182,136,94,0.1)", flexShrink: 0 }}>
            {([
              { key: "cards" as const, Icon: LayoutGrid, title: "Cards" },
              { key: "table" as const, Icon: List,       title: "Table" },
            ]).map(({ key, Icon, title }) => (
              <button
                key={key}
                type="button"
                title={title}
                onClick={() => setView(key)}
                style={{
                  width: 30, height: 26, borderRadius: 6,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: view === key ? "rgba(182,136,94,0.2)" : "transparent",
                  color: view === key ? "var(--gold)" : "var(--cream-dim)",
                  opacity: view === key ? 1 : 0.5,
                  transition: "all 0.15s",
                }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className="px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-all flex items-center gap-1.5"
            style={{
              background: category === "all" ? "rgba(182,136,94,0.15)" : "rgba(255,255,255,0.03)",
              color:      category === "all" ? "var(--gold)"           : "var(--cream-dim)",
              border:     category === "all" ? "1px solid rgba(182,136,94,0.25)" : "1px solid rgba(182,136,94,0.08)",
            }}
          >
            All
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 99, background: "rgba(182,136,94,0.15)", color: "var(--gold)" }}>
              {counts.all}
            </span>
          </button>

          {catalogCategories.map((cat) => {
            const active = category === cat.slug;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setCategory(cat.slug)}
                className="px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-all flex items-center gap-1.5"
                style={{
                  background: active ? "rgba(182,136,94,0.15)" : "rgba(255,255,255,0.03)",
                  color:      active ? "var(--gold)"           : "var(--cream-dim)",
                  border:     active ? "1px solid rgba(182,136,94,0.25)" : "1px solid rgba(182,136,94,0.08)",
                }}
              >
                {CAT_LABEL[cat.slug]}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 99,
                  background: active ? "rgba(182,136,94,0.15)" : "rgba(255,255,255,0.06)",
                  color: active ? "var(--gold)" : "var(--cream-dim)",
                }}>
                  {counts[cat.slug] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results note */}
        {search && (
          <p style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.4 }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </p>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="py-20 text-center" style={{ color: "var(--cream-dim)", opacity: 0.3 }}>
            <Package size={32} style={{ margin: "0 auto 12px" }} />
            <p className="text-sm font-medium">No products found</p>
          </div>
        )}

        {/* ── CARDS VIEW ── */}
        {view === "cards" && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((product) => (
              <AdminProductCard
                key={product.slug}
                product={product}
                onClick={() => setDrawerSlug(product.slug)}
              />
            ))}
          </div>
        )}

        {/* ── TABLE VIEW ── */}
        {view === "table" && filtered.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(182,136,94,0.10)" }}>
            {/* Table header */}
            <div
              className="hidden md:grid items-center gap-3 px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider"
              style={{
                gridTemplateColumns: "2fr 1fr 0.65fr 0.65fr 0.65fr 0.65fr 0.6fr 0.55fr 1fr auto",
                background: "rgba(182,136,94,0.05)",
                color: "var(--cream-dim)", opacity: 0.7,
                borderBottom: "1px solid rgba(182,136,94,0.08)",
              }}
            >
              <span>Product</span><span>Category</span>
              <span>250g</span><span>500g</span><span>1kg</span>
              <span>Cost</span><span>Margin</span><span>Stock</span>
              <span>Status</span><span />
            </div>

            {filtered.map((p, i) => {
              const s250   = p.sizes.find((sz) => sz.label === "250g");
              const s500   = p.sizes.find((sz) => sz.label === "500g");
              const mgn    = calcMargin(p.salePricePerKg, p.purchaseCostPerKg);
              const ss     = STATUS_STYLE[p.status];
              const isLast = i === filtered.length - 1;

              return (
                <div key={p.slug} style={!isLast ? { borderBottom: "1px solid rgba(182,136,94,0.06)" } : undefined}>
                  {/* Desktop row */}
                  <button
                    type="button"
                    onClick={() => setDrawerSlug(p.slug)}
                    className="w-full hidden md:grid items-center gap-3 px-4 py-3 hover:bg-white/[0.025] transition-colors text-left group"
                    style={{ gridTemplateColumns: "2fr 1fr 0.65fr 0.65fr 0.65fr 0.65fr 0.6fr 0.55fr 1fr auto" }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "rgba(182,136,94,0.07)" }}>
                        <Image src={p.image} alt={p.name.en} fill sizes="32px" className="object-contain p-1" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium" style={{ color: "var(--cream)" }}>{p.name.en}</p>
                        <p className="truncate text-[10px]" style={{ color: "var(--cream-dim)", opacity: 0.35, direction: "rtl", textAlign: "left" }}>{p.name.ar}</p>
                      </div>
                    </div>

                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: "rgba(182,136,94,0.08)", color: "var(--gold)", width: "fit-content" }}>
                      {CAT_LABEL[p.category]}
                    </span>

                    <span className="text-[12px] tabular-nums" style={{ color: "var(--cream-dim)" }}>{s250?.salePrice ?? "—"}</span>
                    <span className="text-[12px] tabular-nums" style={{ color: "var(--cream-dim)" }}>{s500?.salePrice ?? "—"}</span>
                    <span className="text-[12px] tabular-nums" style={{ color: "var(--cream-dim)" }}>{p.salePricePerKg}</span>
                    <span className="text-[12px] tabular-nums" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>{p.purchaseCostPerKg}</span>

                    <span className="text-[12px] font-semibold tabular-nums" style={{ color: mgn >= 40 ? "#4ade80" : mgn >= 30 ? "var(--gold)" : "#ef4444" }}>
                      {mgn}%
                    </span>

                    <span className="text-[12px] tabular-nums" style={{ color: p.stockQty === 0 ? "#ef4444" : p.stockQty <= p.lowStockThreshold ? "#fbbf24" : "var(--cream-dim)" }}>
                      {p.stockQty}
                    </span>

                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: ss.bg, color: ss.color, width: "fit-content" }}>
                      {p.status}
                    </span>

                    <span className="w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[12px]" style={{ color: "var(--gold)" }}>
                      →
                    </span>
                  </button>

                  {/* Mobile row */}
                  <button
                    type="button"
                    onClick={() => setDrawerSlug(p.slug)}
                    className="md:hidden w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "rgba(182,136,94,0.07)" }}>
                      <Image src={p.image} alt={p.name.en} fill sizes="40px" className="object-contain p-1.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[13px] font-medium" style={{ color: "var(--cream)" }}>{p.name.en}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
                        {s250?.salePrice} / {s500?.salePrice} EGP · margin {mgn}%
                      </p>
                    </div>
                    <span style={{ color: "var(--gold)", opacity: 0.6, fontSize: 16 }}>›</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer */}
      <ProductDrawer
        product={drawerProduct}
        isOpen={!!drawerSlug}
        onClose={() => setDrawerSlug(null)}
        onSave={handleSave}
      />
    </>
  );
}
