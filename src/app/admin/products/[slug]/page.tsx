"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, Edit2, Loader2, Package, X } from "lucide-react";
import {
  getAdminProductBySlug,
  updateAdminProduct,
  updateAdminProductVariantPrices,
  type AdminProduct,
  type AdminVariantPriceInput,
} from "@/lib/admin/admin-catalog";

function margin(salePricePerKg: number, costPerKg: number) {
  if (salePricePerKg <= 0) return 0;
  return Math.round(((salePricePerKg - costPerKg) / salePricePerKg) * 100);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = params.slug;
  const slug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) ?? "";

  const [editing, setEditing]   = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [product, setProduct]   = useState<AdminProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const [prices, setPrices]     = useState<Record<string, number>>({});

  // Re-reads the product from Supabase without toggling the full-page loader —
  // used after a price save so the view refreshes in place.
  const loadProduct = useCallback(async () => {
    if (!slug) return;
    setReadError(null);
    try {
      const nextProduct = await getAdminProductBySlug(slug);
      setProduct(nextProduct);
      setPrices(Object.fromEntries((nextProduct?.sizes ?? []).map((s) => [s.label, s.salePrice])));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to read admin product.";
      setReadError(message);
    }
  }, [slug]);

  useEffect(() => {
    let mounted = true;
    async function initialLoad() {
      setIsLoading(true);
      await loadProduct();
      if (mounted) setIsLoading(false);
    }
    void initialLoad();
    return () => {
      mounted = false;
    };
  }, [loadProduct]);

  if (isLoading) {
    return (
      <div className="admin-surface flex items-center gap-3" style={{ padding: "18px 20px" }}>
        <Package size={18} style={{ color: "var(--gold)" }} />
        <div>
          <p style={{ color: "var(--cream)", fontSize: 14, fontWeight: 700 }}>Loading product</p>
          <p style={{ color: "var(--cream-dim)", opacity: 0.52, fontSize: 12 }}>
            Reading product and variants from Supabase.
          </p>
        </div>
      </div>
    );
  }

  if (readError) {
    return (
      <div className="admin-surface flex items-start gap-3" style={{ padding: "18px 20px", borderColor: "rgba(239,68,68,0.22)" }}>
        <AlertTriangle size={18} style={{ color: "#f87171", marginTop: 2 }} />
        <div>
          <p style={{ color: "var(--cream)", fontSize: 14, fontWeight: 700 }}>Admin product read failed</p>
          <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 4 }}>{readError}</p>
          <Link href="/admin/products" className="text-sm" style={{ color: "var(--gold)", display: "inline-block", marginTop: 12 }}>
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-lg font-semibold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
          Product not found
        </p>
        <Link href="/admin/products" className="text-sm" style={{ color: "var(--gold)" }}>
          ← Back to Products
        </Link>
      </div>
    );
  }

  const mgn = margin(product.salePricePerKg, product.purchaseCostPerKg);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const variantPrices: AdminVariantPriceInput[] = product.sizes.map((s) => ({
        size: s.label,
        price: prices[s.label] ?? s.salePrice,
      }));
      const oneKg = prices["1kg"];
      await updateAdminProduct(product.id, {
        salePricePerKg: typeof oneKg === "number" ? oneKg : product.salePricePerKg,
      });
      if (variantPrices.length > 0) {
        await updateAdminProductVariantPrices(product.id, variantPrices);
      }
      await loadProduct();
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setEditing(false);
    setSaveError(null);
    setPrices(Object.fromEntries(product.sizes.map((s) => [s.label, s.salePrice])));
  };

  return (
    <div className="space-y-5">

      {/* Breadcrumb + title */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "var(--cream-dim)" }}
        >
          <ArrowLeft size={16} />
        </button>
        <nav className="flex items-center gap-2 text-[13px]" style={{ color: "var(--cream-dim)" }}>
          <Link href="/admin/products" className="hover:opacity-75 transition-opacity" style={{ color: "var(--gold)" }}>
            Products
          </Link>
          <span style={{ opacity: 0.35 }}>/</span>
          <span style={{ color: "var(--cream)" }}>{product.name.en}</span>
        </nav>
      </div>

      {/* Product header card */}
      <div className="admin-surface flex flex-col sm:flex-row gap-5 p-5">
        <div className="relative w-full sm:w-32 h-32 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "rgba(182,136,94,0.06)" }}>
          <Image src={product.image} alt={product.name.en} fill sizes="(max-width: 640px) 100vw, 128px" className="object-cover" />
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
                {product.name.en}
              </h1>
              <p className="text-[15px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
                {product.name.ar}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-[12px] flex items-center gap-1" style={{ color: "#4ade80" }}>
                  <Check size={12} /> Saved
                </span>
              )}
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors hover:bg-white/5"
                    style={{ color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.12)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.4 : 1 }}
                  >
                    <X size={13} /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-colors"
                    style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)", cursor: saving ? "not-allowed" : "pointer" }}
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    {saving ? "Saving…" : "Save"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { setEditing(true); setSaveError(null); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors hover:bg-white/5"
                  style={{ color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.15)" }}
                >
                  <Edit2 size={13} /> Edit Prices
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: "rgba(182,136,94,0.1)", color: "var(--gold)" }}
            >
              {product.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.10)", color: product.isActive ? "#4ade80" : "#fbbf24" }}>
              {product.catalogStatus}
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "var(--cream-dim)" }}>
              {product.showOnWebsite ? "On website" : "Hidden from website"}
            </span>
            <span className="text-[11px] font-mono" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>
              {product.slug}
            </span>
          </div>
          {saveError && (
            <p className="text-[12px] flex items-center gap-1.5" style={{ color: "#fca5a5" }}>
              <AlertTriangle size={12} /> {saveError}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — description + pricing */}
        <div className="lg:col-span-2 space-y-5">

          {/* Description */}
          <div className="admin-surface px-5 py-4 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>Description</p>
            <Field label="English">
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--cream-dim)" }}>{product.note.en}</p>
            </Field>
            <Field label="Arabic">
              <p className="text-[13px] leading-relaxed text-right" dir="rtl" style={{ color: "var(--cream-dim)" }}>{product.note.ar}</p>
            </Field>
          </div>

          {/* Pricing */}
          <div className="admin-surface overflow-hidden">
            <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>Pricing</p>
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(182,136,94,0.06)" }}>
              {product.sizes.map((size) => (
                <div key={size.label} className="grid items-center gap-4 px-5 py-4" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
                  <span className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{size.label}</span>
                  <div>
                    <p className="text-[10.5px] mb-1" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>Sale Price</p>
                    {editing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={prices[size.label] ?? size.salePrice}
                          onChange={(e) => setPrices((prev) => ({ ...prev, [size.label]: Number(e.target.value) }))}
                          className="w-20 px-2 py-1 rounded-lg text-[13px] outline-none"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(182,136,94,0.2)", color: "var(--cream)" }}
                        />
                        <span className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>EGP</span>
                      </div>
                    ) : (
                      <span className="text-[13px] font-medium" style={{ color: "var(--cream)" }}>
                        {prices[size.label] ?? size.salePrice} EGP
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10.5px] mb-1" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>Cost/kg</p>
                    <span className="text-[13px]" style={{ color: "var(--cream-dim)" }}>
                      {product.purchaseCostPerKg} EGP
                    </span>
                  </div>
                  <div>
                    <p className="text-[10.5px] mb-1" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>Margin</p>
                    <span className="text-[13px] font-semibold" style={{ color: mgn >= 40 ? "#4ade80" : mgn >= 30 ? "var(--gold)" : "#ef4444" }}>
                      {mgn}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — blend */}
        <div className="space-y-4">
          {product.blend && product.blend.length > 0 && (
            <div className="admin-surface overflow-hidden">
              <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
                  Blend Composition
                </p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {product.blend.map((component, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-[12.5px] font-medium" style={{ color: "var(--cream)" }}>
                          {component.origin.en}
                        </span>
                        <span
                          className="ml-1.5 text-[9.5px] font-bold px-1 py-px rounded"
                          style={{
                            background: component.beanType === "arabica" ? "rgba(182,136,94,0.12)" : "rgba(156,163,175,0.12)",
                            color:      component.beanType === "arabica" ? "var(--gold)"           : "#9ca3af",
                          }}
                        >
                          {component.beanType === "arabica" ? "A" : "R"}
                        </span>
                      </div>
                      <span className="text-[12px] font-bold tabular-nums" style={{ color: "var(--gold)" }}>
                        {component.pct}%
                      </span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${component.pct}%`,
                          background: component.beanType === "arabica" ? "var(--gold)" : "rgba(156,163,175,0.6)",
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="admin-surface px-5 py-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
              Quick Stats
            </p>
            {[
              { label: "Sale price/kg", value: `${product.salePricePerKg} EGP` },
              { label: "Cost/kg",       value: `${product.purchaseCostPerKg} EGP` },
              { label: "Gross margin",  value: `${mgn}%` },
              { label: "Pricing model", value: "Packaged by weight" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>{label}</span>
                <span className="text-[12.5px] font-semibold" style={{ color: "var(--cream)" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
