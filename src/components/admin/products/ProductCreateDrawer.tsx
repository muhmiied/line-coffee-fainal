"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import type {
  AdminProductCategory,
  AdminProductCreateInput,
} from "@/lib/admin/admin-catalog";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// One state object (form fields + UI flags) so the open-reset effect is a single
// setState — matches the ProductDrawer pattern and the set-state-in-effect rule.
type CreateState = {
  categoryId: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  slugTouched: boolean;
  descEn: string;
  descAr: string;
  price250: string;
  price500: string;
  price1kg: string;
  costPerKg: string;
  featured: boolean;
  bestSeller: boolean;
  isNew: boolean;
  showOnWebsite: boolean;
  saving: boolean;
  saved: boolean;
  errorMsg: string | null;
};

function initialState(categoryId: string): CreateState {
  return {
    categoryId,
    nameEn: "",
    nameAr: "",
    slug: "",
    slugTouched: false,
    descEn: "",
    descAr: "",
    price250: "",
    price500: "",
    price1kg: "",
    costPerKg: "",
    featured: false,
    bestSeller: false,
    isNew: true,
    showOnWebsite: false,
    saving: false,
    saved: false,
    errorMsg: null,
  };
}

interface ProductCreateDrawerProps {
  isOpen: boolean;
  categories: AdminProductCategory[];
  existingSlugs: string[];
  onClose: () => void;
  /** Throws on failure so the drawer can show the exact error and stay open. */
  onCreate: (input: AdminProductCreateInput) => Promise<void>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="admin-label !text-[11px]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label, hint, value, onChange,
}: {
  label: string; hint: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value ? "true" : "false"}
      className="admin-btn w-full flex items-center justify-between gap-3 text-left !rounded-xl !px-3 !py-2.5"
    >
      <span>
        <span className="block text-[12.5px] font-semibold admin-text">{label}</span>
        <span className="block text-[11px] admin-faint">{hint}</span>
      </span>
      <span style={{ color: value ? "#8fcf9a" : "var(--admin-faint)", flexShrink: 0 }}>
        {value ? <Eye size={16} /> : <EyeOff size={16} />}
      </span>
    </button>
  );
}

export default function ProductCreateDrawer({
  isOpen,
  categories,
  existingSlugs,
  onClose,
  onCreate,
}: ProductCreateDrawerProps) {
  const { language } = useAdminLanguage();
  const [state, setState] = useState<CreateState>(() => initialState(categories[0]?.id ?? ""));

  // Reset to a clean form each time the drawer opens.
  useEffect(() => {
    if (isOpen) setState(initialState(categories[0]?.id ?? ""));
  }, [isOpen, categories]);

  const patch = (next: Partial<CreateState>) =>
    setState((prev) => ({ ...prev, errorMsg: null, ...next }));

  const slugTaken = useMemo(() => {
    const normalized = state.slug.trim().toLowerCase();
    return normalized.length > 0 && existingSlugs.includes(normalized);
  }, [existingSlugs, state.slug]);

  const errors = useMemo(() => {
    const errs: string[] = [];
    const slug = state.slug.trim().toLowerCase();
    if (!state.categoryId) errs.push("Category is required.");
    if (!state.nameEn.trim()) errs.push("English name is required.");
    if (!state.nameAr.trim()) errs.push("Arabic name is required.");
    if (!slug) errs.push("Slug is required.");
    else if (!SLUG_PATTERN.test(slug)) errs.push("Slug must use lowercase letters, numbers, and hyphens only.");
    else if (slugTaken) errs.push(`Slug "${slug}" is already taken.`);
    for (const [label, raw] of [["250g", state.price250], ["500g", state.price500], ["1kg", state.price1kg]] as const) {
      if (raw.trim() === "") errs.push(`${label} price is required.`);
      else if (!Number.isFinite(Number(raw)) || Number(raw) < 0) errs.push(`${label} price must be a non-negative number.`);
    }
    if (state.costPerKg.trim() !== "" && (!Number.isFinite(Number(state.costPerKg)) || Number(state.costPerKg) < 0)) {
      errs.push("Cost per kg must be a non-negative number.");
    }
    return errs;
  }, [state, slugTaken]);

  const canSave = errors.length === 0 && !state.saving;

  const setNameEn = (value: string) => {
    setState((prev) => ({
      ...prev,
      errorMsg: null,
      nameEn: value,
      slug: prev.slugTouched ? prev.slug : slugify(value),
    }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setState((prev) => ({ ...prev, saving: true, errorMsg: null }));
    try {
      await onCreate({
        categoryId: state.categoryId,
        nameEn: state.nameEn,
        nameAr: state.nameAr,
        slug: state.slug,
        descriptionEn: state.descEn,
        descriptionAr: state.descAr,
        price250: Number(state.price250),
        price500: Number(state.price500),
        price1kg: Number(state.price1kg),
        purchaseCostPerKg: state.costPerKg.trim() === "" ? null : Number(state.costPerKg),
        featured: state.featured,
        bestSeller: state.bestSeller,
        isNew: state.isNew,
        showOnWebsite: state.showOnWebsite,
      });
      setState((prev) => ({ ...prev, saving: false, saved: true }));
      setTimeout(() => onClose(), 700);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        saving: false,
        errorMsg: error instanceof Error && error.message ? error.message : "Could not create product. Please try again.",
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-[103] flex justify-end" style={{ pointerEvents: isOpen ? "auto" : "none" }}>
      <button
        type="button"
        aria-label="Close create product drawer"
        onClick={onClose}
        className="admin-modal-overlay absolute inset-0"
        style={{ opacity: isOpen ? 1 : 0, transition: "opacity 0.28s" }}
      />
      <div
        className="admin-drawer-surface relative h-full overflow-y-auto"
        style={{ width: "clamp(320px,44vw,520px)", transform: isOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1)" }}
      >
        {/* Header */}
        <div className="admin-drawer-header sticky top-0 z-10 flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <p className="admin-label !text-[10.5px]" style={{ color: "var(--admin-hazelnut)" }}>New Product</p>
            <h3 className="mt-1 text-[18px] font-bold" style={{ color: "var(--admin-heading)", fontFamily: "var(--font-playfair)" }}>Add a product</h3>
          </div>
          <button type="button" aria-label="Close drawer" onClick={onClose} className="admin-btn admin-btn-sm !w-8 !h-8 !p-0 flex-shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4" style={{ padding: "20px 20px 120px" }}>
          {/* Category */}
          <Field label="Category *">
            <select
              value={state.categoryId}
              onChange={(e) => patch({ categoryId: e.target.value })}
              className="admin-select"
            >
              {categories.length === 0 && <option value="">No categories available</option>}
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {language === "ar" ? cat.nameAr || cat.nameEn : cat.nameEn || cat.nameAr}
                </option>
              ))}
            </select>
          </Field>

          {/* Names */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="English Name *">
              <input type="text" value={state.nameEn} onChange={(e) => setNameEn(e.target.value)} className="admin-input" />
            </Field>
            <Field label="Arabic Name *">
              <input type="text" value={state.nameAr} onChange={(e) => patch({ nameAr: e.target.value })} dir="rtl" className="admin-input" />
            </Field>
          </div>

          {/* Slug */}
          <Field label="Slug *">
            <input
              type="text"
              value={state.slug}
              onChange={(e) => patch({ slug: e.target.value.trim().toLowerCase(), slugTouched: true })}
              className="admin-input"
            />
          </Field>
          <p className="-mt-2 text-[11px] admin-faint">
            Auto-generated from the English name. Variant SKUs will be {state.slug || "{slug}"}-250g / -500g / -1kg.
          </p>

          {/* Descriptions */}
          <div className="grid grid-cols-1 gap-3">
            <Field label="English Description">
              <textarea value={state.descEn} onChange={(e) => patch({ descEn: e.target.value })} rows={2} className="admin-textarea" />
            </Field>
            <Field label="Arabic Description">
              <textarea value={state.descAr} onChange={(e) => patch({ descAr: e.target.value })} dir="rtl" rows={2} className="admin-textarea" />
            </Field>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="250g (EGP) *">
              <input type="number" min="0" value={state.price250} onChange={(e) => patch({ price250: e.target.value })} className="admin-input" placeholder="0" />
            </Field>
            <Field label="500g (EGP) *">
              <input type="number" min="0" value={state.price500} onChange={(e) => patch({ price500: e.target.value })} className="admin-input" placeholder="0" />
            </Field>
            <Field label="1kg (EGP) *">
              <input type="number" min="0" value={state.price1kg} onChange={(e) => patch({ price1kg: e.target.value })} className="admin-input" placeholder="0" />
            </Field>
          </div>

          {/* Cost */}
          <Field label="Purchase Cost / kg (EGP)">
            <input type="number" min="0" value={state.costPerKg} onChange={(e) => patch({ costPerKg: e.target.value })} className="admin-input" placeholder="optional" />
          </Field>

          {/* Toggles */}
          <div className="space-y-2.5">
            <Toggle label="New" hint="Adds the New badge for 40 days." value={state.isNew} onChange={(v) => patch({ isNew: v })} />
            <Toggle label="Featured" hint="Highlight this product." value={state.featured} onChange={(v) => patch({ featured: v })} />
            <Toggle label="Best Seller" hint="Show in Best Sellers." value={state.bestSeller} onChange={(v) => patch({ bestSeller: v })} />
            <Toggle label="Show on website" hint="Off by default — review before publishing." value={state.showOnWebsite} onChange={(v) => patch({ showOnWebsite: v })} />
          </div>

          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(227,154,140,0.08)", border: "1px solid rgba(227,154,140,0.24)" }}>
              {errors.map((err) => <p key={err} className="text-[11.5px] leading-relaxed" style={{ color: "#eeb4a8" }}>{err}</p>)}
            </div>
          )}

          {/* Save error */}
          {state.errorMsg && (
            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(227,154,140,0.10)", border: "1px solid rgba(227,154,140,0.28)" }}>
              <p className="text-[11.5px]" style={{ color: "#eeb4a8" }}>{state.errorMsg}</p>
            </div>
          )}

          {/* Info note */}
          <div className="admin-surface !shadow-none rounded-xl px-3 py-2.5">
            <p className="text-[11px] admin-muted">
              Creates the product plus its 250g / 500g / 1kg variants. The product stays hidden (draft) until you publish it from the product drawer. Image and inventory are added later.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="admin-drawer-footer sticky bottom-0 flex items-center justify-end gap-2 px-5 py-4">
          {state.saved && <span className="mr-auto text-[12px] font-semibold" style={{ color: "#8fcf9a" }}>✓ Created</span>}
          <button type="button" onClick={onClose} disabled={state.saving} className="admin-btn !px-4 !py-2 !text-[12.5px]">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={!canSave} className="admin-btn admin-btn-primary !px-4.5 !py-2 !text-[12.5px]">
            {state.saving ? "Creating…" : "Create product"}
          </button>
        </div>
      </div>
    </div>
  );
}
