"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Upload, ImageIcon } from "lucide-react";
import type { AdminProduct, AdminProductMeta, ProductStatus } from "@/lib/admin/admin-catalog";

// ── Types ──────────────────────────────────────────────────────────────────────

type DrawerTab = "general" | "media" | "pricing" | "inventory" | "visibility" | "seo";

const TABS: { key: DrawerTab; label: string }[] = [
  { key: "general",    label: "General"    },
  { key: "media",      label: "Media"      },
  { key: "pricing",    label: "Pricing"    },
  { key: "inventory",  label: "Inventory"  },
  { key: "visibility", label: "Visibility" },
  { key: "seo",        label: "SEO"        },
];

interface ProductDrawerProps {
  product: AdminProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (slug: string, meta: Partial<AdminProductMeta>) => void;
  readOnly?: boolean;
}

// ── Form state shape ──────────────────────────────────────────────────────────

interface DrawerForm {
  activeTab: DrawerTab;
  saved: boolean;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  price250: number;
  price500: number;
  price1kg: number;
  stockQty: number;
  threshold: number;
  featured: boolean;
  hidden: boolean;
  bestSeller: boolean;
  slugVal: string;
  metaTitleEn: string;
  metaTitleAr: string;
  metaDescEn: string;
  metaDescAr: string;
}

const EMPTY_FORM: DrawerForm = {
  activeTab: "general", saved: false,
  nameEn: "", nameAr: "", descEn: "", descAr: "",
  price250: 0, price500: 0, price1kg: 0,
  stockQty: 0, threshold: 5,
  featured: false, hidden: false, bestSeller: false,
  slugVal: "", metaTitleEn: "", metaTitleAr: "", metaDescEn: "", metaDescAr: "",
};

function initForm(product: AdminProduct): DrawerForm {
  const s250 = product.sizes.find((s) => s.label === "250g")?.salePrice ?? 0;
  const s500 = product.sizes.find((s) => s.label === "500g")?.salePrice ?? 0;
  const noteEn = product.note?.en ?? "";
  const noteAr = product.note?.ar ?? "";
  return {
    activeTab: "general", saved: false,
    nameEn: product.name.en,
    nameAr: product.name.ar,
    descEn: noteEn,
    descAr: noteAr,
    price250: s250,
    price500: s500,
    price1kg: product.salePricePerKg,
    stockQty: product.stockQty,
    threshold: product.lowStockThreshold,
    featured: product.featured,
    hidden: product.hidden,
    bestSeller: product.bestSeller,
    slugVal: product.slug,
    metaTitleEn: product.metaTitle.en  || `${product.name.en} | Line Coffee`,
    metaTitleAr: product.metaTitle.ar  || `${product.name.ar} | لاين كوفي`,
    metaDescEn: product.metaDescription.en || noteEn.slice(0, 160),
    metaDescAr: product.metaDescription.ar || noteAr.slice(0, 160),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function computeStatus(stockQty: number, threshold: number): ProductStatus {
  if (stockQty === 0) return "Out of Stock";
  if (stockQty <= threshold) return "Low Stock";
  return "In Stock";
}

function marginPct(sale: number, cost: number): number {
  return Math.round(((sale - cost) / sale) * 100);
}

// ── Shared field label ─────────────────────────────────────────────────────────

function FL({ children }: { children: string }) {
  return (
    <label style={{
      display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase",
      letterSpacing: "0.06em", color: "var(--cream-dim)", opacity: 0.5, marginBottom: 6,
    }}>
      {children}
    </label>
  );
}

const INPUT: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.15)",
  color: "var(--cream)", outline: "none",
};

const NUM_INPUT: React.CSSProperties = {
  ...INPUT, fontSize: 15, fontWeight: 600, color: "var(--gold)",
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProductDrawer({ product, isOpen, onClose, onSave, readOnly = false }: ProductDrawerProps) {
  const [form, setForm] = useState<DrawerForm>(EMPTY_FORM);

  const set = <K extends keyof DrawerForm>(key: K, val: DrawerForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // Reset form to product values when product changes (single setState call)
  useEffect(() => {
    if (!product) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(initForm(product));
  }, [product?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    if (!product) return;
    if (readOnly) return;
    const status = computeStatus(form.stockQty, form.threshold);
    onSave(product.slug, {
      stockQty: form.stockQty,
      lowStockThreshold: form.threshold,
      status,
      featured: form.featured,
      hidden: form.hidden,
      bestSeller: form.bestSeller,
      metaTitle: { en: form.metaTitleEn, ar: form.metaTitleAr },
      metaDescription: { en: form.metaDescEn, ar: form.metaDescAr },
    });
    setForm((prev) => ({ ...prev, saved: true }));
    setTimeout(() => setForm((prev) => ({ ...prev, saved: false })), 2200);
  };

  const computedStatus = computeStatus(form.stockQty, form.threshold);
  const margin = product ? marginPct(product.salePricePerKg, product.purchaseCostPerKg) : 0;

  const statusColor =
    computedStatus === "Out of Stock" ? "#ef4444" :
    computedStatus === "Low Stock"    ? "#fbbf24" : "#4ade80";

  const statusBg =
    computedStatus === "Out of Stock" ? "rgba(239,68,68,0.07)" :
    computedStatus === "Low Stock"    ? "rgba(251,191,36,0.07)" : "rgba(74,222,128,0.07)";

  const statusBorder =
    computedStatus === "Out of Stock" ? "rgba(239,68,68,0.2)" :
    computedStatus === "Low Stock"    ? "rgba(251,191,36,0.2)" : "rgba(74,222,128,0.2)";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.28s ease",
        }}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Product Editor"
        style={{
          position: "fixed", right: 0, top: 0,
          height: "100dvh",
          width: "clamp(340px, 42vw, 520px)",
          zIndex: 101,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1)",
          background: "var(--coffee-deep)",
          borderLeft: "1px solid rgba(182,136,94,0.15)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {product && (
          <>
            {/* Header */}
            <div style={{
              padding: "14px 18px",
              borderBottom: "1px solid rgba(182,136,94,0.10)",
              flexShrink: 0, display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                position: "relative", width: 44, height: 44,
                borderRadius: 8, overflow: "hidden", flexShrink: 0,
                background: "rgba(182,136,94,0.07)",
              }}>
                <Image src={product.image} alt={product.name.en} fill className="object-contain p-1" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="truncate" style={{
                  color: "var(--cream)", fontSize: 13.5, fontWeight: 700,
                  fontFamily: "var(--font-playfair)", lineHeight: 1.2,
                }}>
                  {product.name.en}
                </p>
                <p className="truncate" style={{
                  color: "var(--cream-dim)", fontSize: 11, opacity: 0.4,
                  direction: "rtl", textAlign: "left",
                }}>
                  {product.name.ar}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{
                  fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                  fontFamily: "monospace",
                  background: "rgba(182,136,94,0.1)", color: "var(--gold)",
                }}>
                  {product.sku}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="hover:opacity-100 transition-opacity"
                  style={{ color: "var(--cream-dim)", opacity: 0.4, lineHeight: 0 }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{
              display: "flex",
              borderBottom: "1px solid rgba(182,136,94,0.10)",
              flexShrink: 0, overflowX: "auto",
            }}>
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set("activeTab", key)}
                  style={{
                    padding: "9px 14px", fontSize: 11.5, whiteSpace: "nowrap",
                    fontWeight: form.activeTab === key ? 600 : 400,
                    color: form.activeTab === key ? "var(--gold)" : "var(--cream-dim)",
                    borderBottom: form.activeTab === key
                      ? "2px solid var(--gold)"
                      : "2px solid transparent",
                    opacity: form.activeTab === key ? 1 : 0.55,
                    transition: "all 0.15s", flexShrink: 0,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>

              {/* GENERAL */}
              {form.activeTab === "general" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div><FL>English Name</FL>
                    <input type="text" value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} style={INPUT} />
                  </div>
                  <div><FL>Arabic Name</FL>
                    <input type="text" value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} dir="rtl" style={INPUT} />
                  </div>
                  <div><FL>English Description</FL>
                    <textarea value={form.descEn} onChange={(e) => set("descEn", e.target.value)} rows={3} style={{ ...INPUT, resize: "vertical" }} />
                  </div>
                  <div><FL>Arabic Description</FL>
                    <textarea value={form.descAr} onChange={(e) => set("descAr", e.target.value)} dir="rtl" rows={3} style={{ ...INPUT, resize: "vertical" }} />
                  </div>
                </div>
              )}

              {/* MEDIA */}
              {form.activeTab === "media" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <FL>Main Image</FL>
                    <div style={{
                      position: "relative", width: 200, height: 200, borderRadius: 12, overflow: "hidden",
                      background: "rgba(182,136,94,0.06)", border: "1px solid rgba(182,136,94,0.14)",
                    }}>
                      <Image src={product.image} alt={product.name.en} fill className="object-contain p-6" />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button type="button" style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                        color: "var(--gold)", border: "1px solid rgba(182,136,94,0.25)",
                        background: "rgba(182,136,94,0.08)",
                      }}>
                        <Upload size={12} /> Upload New
                      </button>
                      <button type="button" style={{
                        padding: "6px 12px", borderRadius: 8, fontSize: 12,
                        color: "var(--cream-dim)", opacity: 0.5,
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <div>
                    <FL>Gallery Images</FL>
                    <div style={{
                      padding: "28px 16px", textAlign: "center",
                      border: "1px dashed rgba(182,136,94,0.2)", borderRadius: 10,
                    }}>
                      <ImageIcon size={22} style={{ color: "var(--gold)", opacity: 0.25, margin: "0 auto 8px" }} />
                      <p style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.35 }}>No gallery images yet</p>
                      <button type="button" style={{
                        marginTop: 10, padding: "5px 14px", borderRadius: 8,
                        fontSize: 12, background: "rgba(182,136,94,0.1)",
                        color: "var(--gold)", border: "1px solid rgba(182,136,94,0.2)",
                      }}>
                        Upload Images
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PRICING */}
              {form.activeTab === "pricing" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div><FL>250g Price (EGP)</FL>
                    <input type="number" value={form.price250} onChange={(e) => set("price250", Number(e.target.value))} style={NUM_INPUT} />
                  </div>
                  <div><FL>500g Price (EGP)</FL>
                    <input type="number" value={form.price500} onChange={(e) => set("price500", Number(e.target.value))} style={NUM_INPUT} />
                  </div>
                  <div><FL>1kg Price (EGP)</FL>
                    <input type="number" value={form.price1kg} onChange={(e) => set("price1kg", Number(e.target.value))} style={NUM_INPUT} />
                  </div>
                  <div style={{
                    marginTop: 4, padding: "12px 14px", borderRadius: 10,
                    background: "rgba(182,136,94,0.05)", border: "1px solid rgba(182,136,94,0.1)",
                    display: "flex", flexDirection: "column", gap: 8,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.55 }}>Purchase cost / kg</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--cream)" }}>{product.purchaseCostPerKg.toLocaleString("en-EG")} EGP</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.55 }}>Gross margin</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: margin >= 40 ? "#4ade80" : margin >= 30 ? "var(--gold)" : "#ef4444" }}>
                        {margin}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* INVENTORY */}
              {form.activeTab === "inventory" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div><FL>Current Stock (bags / units)</FL>
                    <input type="number" value={form.stockQty} onChange={(e) => set("stockQty", Number(e.target.value))} style={NUM_INPUT} />
                  </div>
                  <div><FL>Low Stock Threshold</FL>
                    <input type="number" value={form.threshold} onChange={(e) => set("threshold", Number(e.target.value))} style={NUM_INPUT} />
                  </div>
                  <div style={{
                    padding: "12px 14px", borderRadius: 10,
                    background: statusBg, border: `1px solid ${statusBorder}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.55 }}>Computed status</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>{computedStatus}</span>
                    </div>
                    <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.35, marginTop: 5 }}>
                      Updates automatically when you change stock or threshold.
                    </p>
                  </div>
                </div>
              )}

              {/* VISIBILITY */}
              {form.activeTab === "visibility" && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {([
                    { label: "Active",      sub: "Visible on the public website",           value: !form.hidden,     key: "hidden"     as const, invert: true  },
                    { label: "Hidden",      sub: "Hide from all public pages",              value: form.hidden,      key: "hidden"     as const, invert: false },
                    { label: "Featured",    sub: "Show in Featured sections",               value: form.featured,    key: "featured"   as const, invert: false },
                    { label: "Best Seller", sub: "Show in Best Sellers marquee",            value: form.bestSeller,  key: "bestSeller" as const, invert: false },
                  ]).map(({ label, sub, value, key, invert }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 0", borderBottom: "1px solid rgba(182,136,94,0.07)",
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--cream)" }}>{label}</p>
                        <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.42, marginTop: 2 }}>{sub}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => set(key, invert ? !form[key] : !form[key])}
                        aria-pressed={value ? "true" : "false"}
                        style={{
                          width: 40, height: 22, borderRadius: 11,
                          position: "relative", flexShrink: 0,
                          background: value ? "rgba(74,222,128,0.22)" : "rgba(255,255,255,0.07)",
                          border: `1px solid ${value ? "rgba(74,222,128,0.38)" : "rgba(255,255,255,0.1)"}`,
                          transition: "all 0.2s",
                        }}
                      >
                        <span style={{
                          position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%",
                          left: value ? "calc(100% - 18px)" : 2,
                          background: value ? "#4ade80" : "rgba(255,255,255,0.28)",
                          transition: "all 0.2s",
                        }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* SEO */}
              {form.activeTab === "seo" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <FL>URL Slug</FL>
                    <input type="text" value={form.slugVal} onChange={(e) => set("slugVal", e.target.value)}
                      style={{ ...INPUT, fontFamily: "monospace", fontSize: 12, color: "var(--gold)" }} />
                    <p style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.32, marginTop: 4 }}>
                      linecoffee.eg/products/{form.slugVal}
                    </p>
                  </div>
                  <div><FL>Meta Title (EN)</FL>
                    <input type="text" value={form.metaTitleEn} onChange={(e) => set("metaTitleEn", e.target.value)} style={INPUT} />
                  </div>
                  <div><FL>Meta Title (AR)</FL>
                    <input type="text" value={form.metaTitleAr} onChange={(e) => set("metaTitleAr", e.target.value)} dir="rtl" style={INPUT} />
                  </div>
                  <div><FL>Meta Description (EN)</FL>
                    <textarea value={form.metaDescEn} onChange={(e) => set("metaDescEn", e.target.value)} rows={3} style={{ ...INPUT, resize: "vertical" }} />
                  </div>
                  <div><FL>Meta Description (AR)</FL>
                    <textarea value={form.metaDescAr} onChange={(e) => set("metaDescAr", e.target.value)} dir="rtl" rows={3} style={{ ...INPUT, resize: "vertical" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "12px 18px",
              borderTop: "1px solid rgba(182,136,94,0.10)",
              display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
            }}>
              {readOnly ? (
                <span style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.55, marginRight: "auto" }}>
                  Read-only until write layer is implemented.
                </span>
              ) : form.saved ? (
                <span style={{ fontSize: 12, color: "#4ade80", marginRight: "auto" }}>✓ Saved</span>
              ) : (
                <span style={{ flex: 1 }} />
              )}
              <button
                type="button"
                onClick={onClose}
                className="hover:opacity-100 transition-opacity"
                style={{
                  padding: "9px 16px", borderRadius: 9, fontSize: 12.5,
                  color: "var(--cream-dim)", opacity: 0.55,
                  border: "1px solid rgba(182,136,94,0.12)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={readOnly}
                title={readOnly ? "Read-only until write layer is implemented" : undefined}
                style={{
                  padding: "9px 22px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
                  background: readOnly ? "rgba(182,136,94,0.06)" : "rgba(182,136,94,0.15)",
                  color: readOnly ? "rgba(245,232,209,0.30)" : "var(--gold)",
                  border: "1px solid rgba(182,136,94,0.30)",
                  cursor: readOnly ? "not-allowed" : "pointer",
                }}
              >
                Save Changes
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
