"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Upload, ImageIcon, Loader2, AlertTriangle, Boxes, ExternalLink, Archive, RotateCcw } from "lucide-react";
import {
  archiveAdminProduct,
  restoreAdminProduct,
  updateAdminProduct,
  updateAdminProductVariantPrices,
  type AdminProduct,
  type AdminProductLifecycleStatus,
  type AdminVariantPriceInput,
} from "@/lib/admin/admin-catalog";

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

const MEDIA_NOTICE = "Media upload will be implemented in the Media/Storage layer.";
const INVENTORY_NOTICE = "Inventory is managed through the Inventory module using stock movements.";

interface ProductDrawerProps {
  product: AdminProduct | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful Supabase save. Passes the new slug when it changed so the parent can re-target the drawer. */
  onSaved: (newSlug?: string) => void | Promise<void>;
}

// ── Form state shape ──────────────────────────────────────────────────────────

interface DrawerForm {
  activeTab: DrawerTab;
  saved: boolean;
  dirty: boolean;
  saving: boolean;
  errorMsg: string | null;
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
  isNew: boolean;
  slugVal: string;
  metaTitleEn: string;
  metaTitleAr: string;
  metaDescEn: string;
  metaDescAr: string;
}

const EMPTY_FORM: DrawerForm = {
  activeTab: "general", saved: false, dirty: false, saving: false, errorMsg: null,
  nameEn: "", nameAr: "", descEn: "", descAr: "",
  price250: 0, price500: 0, price1kg: 0,
  stockQty: 0, threshold: 5,
  featured: false, hidden: false, bestSeller: false, isNew: false,
  slugVal: "", metaTitleEn: "", metaTitleAr: "", metaDescEn: "", metaDescAr: "",
};

function initForm(product: AdminProduct): DrawerForm {
  const s250 = product.sizes.find((s) => s.label === "250g")?.salePrice ?? 0;
  const s500 = product.sizes.find((s) => s.label === "500g")?.salePrice ?? 0;
  const noteEn = product.note?.en ?? "";
  const noteAr = product.note?.ar ?? "";
  return {
    activeTab: "general", saved: false, dirty: false, saving: false, errorMsg: null,
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
    isNew: product.isNew,
    slugVal: product.slug,
    metaTitleEn: product.metaTitle.en  || `${product.name.en} | Line Coffee`,
    metaTitleAr: product.metaTitle.ar  || `${product.name.ar} | لاين كوفي`,
    metaDescEn: product.metaDescription.en || noteEn.slice(0, 160),
    metaDescAr: product.metaDescription.ar || noteAr.slice(0, 160),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

export default function ProductDrawer({ product, isOpen, onClose, onSaved }: ProductDrawerProps) {
  const [form, setForm] = useState<DrawerForm>(EMPTY_FORM);

  // Archive / restore is a separate one-shot write (not part of the form Save /
  // dirty flow), so it gets its own state. confirmArchive gates the destructive
  // action behind a second click.
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const isArchived = product?.catalogStatus === "archived";

  // Editing a content field marks the form dirty (enables Save). Tab/flag changes don't.
  const set = <K extends keyof DrawerForm>(key: K, val: DrawerForm[K]) =>
    setForm((prev) => ({
      ...prev,
      [key]: val,
      dirty: key === "activeTab" ? prev.dirty : true,
      errorMsg: key === "activeTab" ? prev.errorMsg : null,
    }));

  // Reset form + lifecycle state to product values each time the drawer opens for a product.
  useEffect(() => {
    if (!isOpen || !product) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(initForm(product));
    setConfirmArchive(false);
    setLifecycleError(null);
  }, [product?.slug, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!product || form.saving) return;

    setForm((prev) => ({ ...prev, saving: true, errorMsg: null, saved: false }));
    try {
      const nextSlug = form.slugVal.trim().toLowerCase();
      // Only update variant prices for sizes the product actually has.
      // 1kg variant tracks the per-kg sale price (1kg pack == per-kg price).
      const variantPrices: AdminVariantPriceInput[] = product.sizes.map((size) => ({
        size: size.label,
        price:
          size.label === "250g" ? form.price250 :
          size.label === "500g" ? form.price500 : form.price1kg,
      }));

      // Compute new_until from the isNew toggle:
      //   on  → now + 40 days (refreshes the timer each save)
      //   off → null (clears the badge)
      const newUntil: string | null = form.isNew
        ? new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Lifecycle status driven by the Active/Hidden toggle:
      //   Showing (Active)  → publish: status='active'
      //   Hiding            → preserve the current lifecycle status (draft stays
      //                        draft, active stays active-but-off-site, archived
      //                        stays archived). Un-archiving is done via Restore,
      //                        not by hiding/showing.
      const nextStatus: AdminProductLifecycleStatus = form.hidden
        ? product.catalogStatus
        : "active";

      await updateAdminProduct(product.id, {
        name: { en: form.nameEn, ar: form.nameAr },
        note: { en: form.descEn, ar: form.descAr },
        slug: nextSlug,
        salePricePerKg: form.price1kg,
        showOnWebsite: !form.hidden,
        visibility: form.hidden ? "hidden" : "public",
        catalogStatus: nextStatus,
        featured: form.featured,
        bestSeller: form.bestSeller,
        newUntil,
        metaTitle: { en: form.metaTitleEn, ar: form.metaTitleAr },
        metaDescription: { en: form.metaDescEn, ar: form.metaDescAr },
      });

      if (variantPrices.length > 0) {
        await updateAdminProductVariantPrices(product.id, variantPrices);
      }

      const slugChanged = nextSlug !== product.slug;
      setForm((prev) => ({ ...prev, saving: false, saved: true, dirty: false }));
      await onSaved(slugChanged ? nextSlug : undefined);
      setTimeout(() => setForm((prev) => ({ ...prev, saved: false })), 2200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed. Please try again.";
      setForm((prev) => ({ ...prev, saving: false, errorMsg: message }));
    }
  };

  // Archive: hide from the public site, keep the row + variants + history.
  // Reloads the catalog so the card/status reflects the change; drawer stays open.
  const handleArchive = async () => {
    if (!product || lifecycleBusy) return;
    setLifecycleBusy(true);
    setLifecycleError(null);
    try {
      await archiveAdminProduct(product.id);
      setConfirmArchive(false);
      // Sync the form to the new hidden state so a later edit+Save can't
      // accidentally re-publish via a stale Active toggle. Not dirty by itself.
      setForm((prev) => ({ ...prev, hidden: true, dirty: false }));
      await onSaved();
    } catch (error) {
      setLifecycleError(error instanceof Error ? error.message : "Could not archive. Please try again.");
    } finally {
      setLifecycleBusy(false);
    }
  };

  // Restore: bring an archived product back as a safe draft (still off the site).
  const handleRestore = async () => {
    if (!product || lifecycleBusy) return;
    setLifecycleBusy(true);
    setLifecycleError(null);
    try {
      await restoreAdminProduct(product.id);
      // Restored product comes back as draft + hidden — reflect that in the form.
      setForm((prev) => ({ ...prev, hidden: true, dirty: false }));
      await onSaved();
    } catch (error) {
      setLifecycleError(error instanceof Error ? error.message : "Could not restore. Please try again.");
    } finally {
      setLifecycleBusy(false);
    }
  };

  const margin = product ? marginPct(product.salePricePerKg, product.purchaseCostPerKg) : 0;

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
                <Image src={product.image} alt={product.name.en} fill sizes="44px" className="object-contain p-1" />
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
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "10px 12px", borderRadius: 10,
                    background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)",
                  }}>
                    <AlertTriangle size={14} style={{ color: "#fbbf24", marginTop: 1, flexShrink: 0 }} />
                    <p style={{ fontSize: 11.5, color: "var(--cream-dim)", lineHeight: 1.5 }}>{MEDIA_NOTICE}</p>
                  </div>
                  <div>
                    <FL>Main Image</FL>
                    <div style={{
                      position: "relative", width: 200, height: 200, borderRadius: 12, overflow: "hidden",
                      background: "rgba(182,136,94,0.06)", border: "1px solid rgba(182,136,94,0.14)",
                    }}>
                      <Image src={product.image} alt={product.name.en} fill sizes="200px" className="object-contain p-6" />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button type="button" disabled title={MEDIA_NOTICE} style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                        color: "rgba(245,232,209,0.30)", border: "1px solid rgba(182,136,94,0.12)",
                        background: "rgba(182,136,94,0.04)", cursor: "not-allowed",
                      }}>
                        <Upload size={12} /> Upload New
                      </button>
                      <button type="button" disabled title={MEDIA_NOTICE} style={{
                        padding: "6px 12px", borderRadius: 8, fontSize: 12,
                        color: "rgba(245,232,209,0.30)", opacity: 0.6,
                        border: "1px solid rgba(255,255,255,0.06)", cursor: "not-allowed",
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
                      <button type="button" disabled title={MEDIA_NOTICE} style={{
                        marginTop: 10, padding: "5px 14px", borderRadius: 8,
                        fontSize: 12, background: "rgba(182,136,94,0.05)",
                        color: "rgba(245,232,209,0.30)", border: "1px solid rgba(182,136,94,0.12)",
                        cursor: "not-allowed",
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

              {/* INVENTORY (read-only summary — managed by the Inventory module) */}
              {form.activeTab === "inventory" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "10px 12px", borderRadius: 10,
                    background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)",
                  }}>
                    <AlertTriangle size={14} style={{ color: "#fbbf24", marginTop: 1, flexShrink: 0 }} />
                    <p style={{ fontSize: 11.5, color: "var(--cream-dim)", lineHeight: 1.5 }}>{INVENTORY_NOTICE}</p>
                  </div>

                  {/* Read-only stock snapshot — not editable here */}
                  <div style={{
                    borderRadius: 10, overflow: "hidden",
                    border: "1px solid rgba(182,136,94,0.12)",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 14px", borderBottom: "1px solid rgba(182,136,94,0.08)",
                    }}>
                      <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.6 }}>Current stock (bags / units)</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--cream)" }}>{form.stockQty}</span>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 14px",
                    }}>
                      <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.6 }}>Low stock threshold</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--cream)" }}>{form.threshold}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.45, lineHeight: 1.5 }}>
                    These values are read-only here. Stock changes are recorded as movements in the Inventory module.
                  </p>

                  <Link
                    href="/admin/inventory"
                    className="inline-flex items-center justify-center gap-2"
                    style={{
                      padding: "9px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
                      background: "rgba(182,136,94,0.15)", color: "var(--gold)",
                      border: "1px solid rgba(182,136,94,0.30)", width: "fit-content",
                    }}
                  >
                    <Boxes size={14} /> Open Inventory module
                    <ExternalLink size={12} style={{ opacity: 0.7 }} />
                  </Link>
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
                    { label: "New",         sub: "Show New badge on product cards",         value: form.isNew,       key: "isNew"      as const, invert: false },
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

                  {/* New badge helper */}
                  <div style={{ paddingTop: 12, paddingBottom: 4 }}>
                    <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.42, lineHeight: 1.55 }}>
                      New badge expires automatically after 40 days.{" "}
                      {form.isNew && product.isNew && product.newUntil
                        ? `Current expiry: ${new Date(product.newUntil).toLocaleDateString("en-EG", { month: "short", day: "numeric", year: "numeric" })}.`
                        : form.isNew && !product.isNew
                          ? "Will be active for 40 days after saving."
                          : ""}
                    </p>
                  </div>

                  {/* ── Lifecycle: Archive / Restore ─────────────────────────── */}
                  <div style={{
                    marginTop: 18, paddingTop: 16,
                    borderTop: "1px solid rgba(182,136,94,0.12)",
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--cream)" }}>
                      {isArchived ? "Archived product" : "Archive product"}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.5, marginTop: 3, lineHeight: 1.55 }}>
                      {isArchived
                        ? "This product is hidden from the entire public website but kept here with its prices and variants. Restore it to bring it back as a draft for review — it will not go public until you set it Active and save."
                        : "Archiving removes this product from the website (products page, category pages, best sellers, and its direct link) but keeps the row, variants, and order history. It stays here under the Archived filter and can be restored anytime. No data is deleted."}
                    </p>

                    {lifecycleError && (
                      <div style={{
                        display: "flex", alignItems: "flex-start", gap: 6, marginTop: 10,
                        padding: "9px 11px", borderRadius: 9,
                        background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.24)",
                      }}>
                        <AlertTriangle size={13} style={{ color: "#f87171", marginTop: 1, flexShrink: 0 }} />
                        <p style={{ fontSize: 11.5, color: "#fca5a5", lineHeight: 1.45 }}>{lifecycleError}</p>
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      {isArchived ? (
                        <button
                          type="button"
                          onClick={handleRestore}
                          disabled={lifecycleBusy}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 7,
                            padding: "9px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
                            background: lifecycleBusy ? "rgba(74,222,128,0.08)" : "rgba(74,222,128,0.14)",
                            color: lifecycleBusy ? "rgba(74,222,128,0.5)" : "#4ade80",
                            border: "1px solid rgba(74,222,128,0.30)",
                            cursor: lifecycleBusy ? "not-allowed" : "pointer",
                          }}
                        >
                          {lifecycleBusy
                            ? <><Loader2 size={13} className="animate-spin" /> Restoring…</>
                            : <><RotateCcw size={13} /> Restore as draft</>}
                        </button>
                      ) : confirmArchive ? (
                        <>
                          <button
                            type="button"
                            onClick={handleArchive}
                            disabled={lifecycleBusy}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 7,
                              padding: "9px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
                              background: lifecycleBusy ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.16)",
                              color: lifecycleBusy ? "rgba(248,113,113,0.5)" : "#f87171",
                              border: "1px solid rgba(239,68,68,0.32)",
                              cursor: lifecycleBusy ? "not-allowed" : "pointer",
                            }}
                          >
                            {lifecycleBusy
                              ? <><Loader2 size={13} className="animate-spin" /> Archiving…</>
                              : <><Archive size={13} /> Confirm archive</>}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmArchive(false)}
                            disabled={lifecycleBusy}
                            style={{
                              padding: "9px 14px", borderRadius: 9, fontSize: 12.5,
                              color: "var(--cream-dim)", opacity: lifecycleBusy ? 0.3 : 0.6,
                              border: "1px solid rgba(182,136,94,0.12)",
                              cursor: lifecycleBusy ? "not-allowed" : "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setLifecycleError(null); setConfirmArchive(true); }}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 7,
                            padding: "9px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
                            background: "rgba(239,68,68,0.10)", color: "#f87171",
                            border: "1px solid rgba(239,68,68,0.24)", cursor: "pointer",
                          }}
                        >
                          <Archive size={13} /> Archive product
                        </button>
                      )}
                    </div>
                  </div>
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
                    <p style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 10.5, color: "#fbbf24", opacity: 0.85, marginTop: 6, lineHeight: 1.4,
                    }}>
                      <AlertTriangle size={11} style={{ flexShrink: 0 }} />
                      Changing the slug changes the public product URL.
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
              {form.errorMsg ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#fca5a5", marginRight: "auto", lineHeight: 1.4 }}>
                  <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                  <span>{form.errorMsg}</span>
                </span>
              ) : form.saving ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--cream-dim)", marginRight: "auto" }}>
                  <Loader2 size={13} className="animate-spin" /> Saving…
                </span>
              ) : form.saved ? (
                <span style={{ fontSize: 12, color: "#4ade80", marginRight: "auto" }}>✓ Saved to Supabase</span>
              ) : (
                <span style={{ flex: 1 }} />
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={form.saving}
                className="hover:opacity-100 transition-opacity"
                style={{
                  padding: "9px 16px", borderRadius: 9, fontSize: 12.5,
                  color: "var(--cream-dim)", opacity: form.saving ? 0.3 : 0.55,
                  border: "1px solid rgba(182,136,94,0.12)",
                  cursor: form.saving ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!form.dirty || form.saving}
                title={!form.dirty ? "Edit a field to enable saving" : undefined}
                style={{
                  padding: "9px 22px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
                  background: !form.dirty || form.saving ? "rgba(182,136,94,0.06)" : "rgba(182,136,94,0.15)",
                  color: !form.dirty || form.saving ? "rgba(245,232,209,0.30)" : "var(--gold)",
                  border: "1px solid rgba(182,136,94,0.30)",
                  cursor: !form.dirty || form.saving ? "not-allowed" : "pointer",
                }}
              >
                {form.saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
