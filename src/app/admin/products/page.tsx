"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Globe2,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  Tags,
  TrendingDown,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  archiveAdminCategory,
  getAdminCategories,
  getAdminProductsWithVariants,
  reorderAdminCategories,
  restoreAdminCategory,
  updateAdminCategory,
  type AdminCategoryStatus,
  type AdminCategoryUpdateInput,
  type AdminProduct,
  type AdminProductCategory,
  type ProductStatus,
} from "@/lib/admin/admin-catalog";
import ProductDrawer from "@/components/admin/products/ProductDrawer";

const PRODUCT_CREATE_NOTICE = "Product create flow is not implemented yet.";
const CATEGORY_CREATE_NOTICE = "Category create flow is not implemented yet — you can edit existing categories.";

function writeErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

const STATUS_STYLE: Record<ProductStatus, { bg: string; color: string }> = {
  "In Stock": { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
  "Low Stock": { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
  "Out of Stock": { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
};

const CATEGORY_STATUS_STYLE: Record<AdminCategoryStatus, { bg: string; color: string; label: string }> = {
  visible:  { bg: "rgba(74,222,128,0.12)",   color: "#4ade80",  label: "Visible"  },
  hidden:   { bg: "rgba(148,163,184,0.12)",  color: "#cbd5e1",  label: "Hidden"   },
  draft:    { bg: "rgba(251,191,36,0.12)",   color: "#fbbf24",  label: "Draft"    },
  archived: { bg: "rgba(239,68,68,0.12)",    color: "#f87171",  label: "Archived" },
};

type ProductAdminTab   = "products" | "categories";
type CategoryFilter    = "all" | "visible" | "hidden" | "draft" | "archived";
type CategoryDrawerState =
  | { mode: "add" }
  | { mode: "edit"; category: AdminProductCategory };

type CategoryFormState = {
  nameEn:        string;
  nameAr:        string;
  slug:          string;
  descriptionEn: string;
  descriptionAr: string;
  status:        AdminCategoryStatus;
  sortOrder:     string;
  showOnWebsite: boolean;
};

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: "all",      label: "All"      },
  { key: "visible",  label: "Visible"  },
  { key: "hidden",   label: "Hidden"   },
  { key: "draft",    label: "Draft"    },
  { key: "archived", label: "Archived" },
];

function slugifyCategoryName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isUrlSafeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function SummaryCard({
  label, value, Icon, color,
}: {
  label: string; value: number | string; Icon: LucideIcon; color: string;
}) {
  return (
    <div className="admin-surface flex items-center gap-3" style={{ padding: "12px 14px" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}1a`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color }}>
        <Icon size={14} />
      </div>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, color: "var(--cream)", lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.5, marginTop: 1 }}>{label}</p>
      </div>
    </div>
  );
}

function Badge({ children, bg, color, title }: { children: ReactNode; bg: string; color: string; title?: string }) {
  return (
    <span
      title={title}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, width: "fit-content", fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: bg, color, whiteSpace: "nowrap" }}
    >
      {children}
    </span>
  );
}

function IconAction({ title, children, onClick, disabled = false }: { title: string; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      style={{ width: 30, height: 30, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", background: disabled ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.10)", color: disabled ? "rgba(245,232,209,0.22)" : "var(--cream-dim)", cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s ease" }}
    >
      {children}
    </button>
  );
}

function SegmentedField<T extends string,>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--cream-dim)", opacity: 0.65, marginBottom: 8 }}>{label}</p>
      <div className="flex flex-wrap gap-1.5 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(182,136,94,0.10)" }}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => onChange(opt.value)}
              className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-all"
              style={{ background: active ? "rgba(182,136,94,0.18)" : "transparent", border: active ? "1px solid rgba(182,136,94,0.28)" : "1px solid transparent", color: opt.disabled ? "rgba(245,232,209,0.25)" : active ? "var(--gold)" : "var(--cream-dim)", cursor: opt.disabled ? "not-allowed" : "pointer" }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 7, fontSize: 11, fontWeight: 700, color: "var(--cream-dim)", opacity: 0.72 }}>
      {children}
    </label>
  );
}

function CategoryStatusBadge({ category }: { category: AdminProductCategory }) {
  const s = CATEGORY_STATUS_STYLE[category.status];
  return <Badge bg={s.bg} color={s.color}>{s.label}</Badge>;
}

// ─── AdminProductCard (Products tab) ─────────────────────────────────────────

function AdminProductCard({ product, onClick }: { product: AdminProduct; onClick: () => void }) {
  const ss  = STATUS_STYLE[product.status];
  const s250 = product.sizes.find((sz) => sz.label === "250g");
  const s500 = product.sizes.find((sz) => sz.label === "500g");
  const s1kg = product.sizes.find((sz) => sz.label === "1kg");

  return (
    <button
      type="button"
      onClick={onClick}
      className="admin-surface text-left group"
      style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", border: "1px solid rgba(182,136,94,0.10)", transition: "border-color 0.2s" }}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "1", background: "rgba(182,136,94,0.04)", flexShrink: 0, overflow: "hidden" }}>
        <Image src={product.image} alt={product.name.en} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw" className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]" />
        <span style={{ position: "absolute", top: 8, left: 8, fontSize: 8.5, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: ss.bg, color: ss.color, letterSpacing: "0.03em" }}>
          {product.status}
        </span>
        <div style={{ position: "absolute", top: 7, right: 7, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          {product.bestSeller && <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 99, background: "rgba(182,136,94,0.88)", color: "#0b0806" }}>BEST</span>}
          {product.featured   && <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 99, background: "rgba(96,165,250,0.88)",  color: "#0b0806" }}>FEAT</span>}
          {product.hidden     && <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 99, background: "rgba(156,163,175,0.7)",   color: "#0b0806" }}>HIDDEN</span>}
        </div>
      </div>
      <div style={{ padding: "10px 11px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <p className="truncate" style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-playfair)", color: "var(--cream)", lineHeight: 1.25 }}>{product.name.en}</p>
        <p className="truncate" style={{ fontSize: 10.5, direction: "rtl", textAlign: "right", color: "var(--cream-dim)", opacity: 0.38 }}>{product.name.ar}</p>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 5 }}>
          {s250 && <span style={{ fontSize: 9.5, padding: "1.5px 6px", borderRadius: 5, background: "rgba(182,136,94,0.09)", color: "var(--gold-light)" }}>250g {s250.salePrice}</span>}
          {s500 && <span style={{ fontSize: 9.5, padding: "1.5px 6px", borderRadius: 5, background: "rgba(182,136,94,0.09)", color: "var(--gold-light)" }}>500g {s500.salePrice}</span>}
          {s1kg && <span style={{ fontSize: 9.5, padding: "1.5px 6px", borderRadius: 5, background: "rgba(182,136,94,0.05)", color: "var(--cream-dim)" }}>1kg {s1kg.salePrice}</span>}
        </div>
        <p style={{ fontSize: 9.5, color: "var(--cream-dim)", opacity: 0.35, marginTop: 3 }}>
          {product.catalogStatus} - {product.showOnWebsite ? "on website" : "hidden"} - {product.sku}
        </p>
      </div>
    </button>
  );
}

// ─── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  sortedCategories,
  busy,
  onEdit,
  onArchive,
  onRestore,
  onMove,
  onToggleShowOnWebsite,
  onViewProducts,
}: {
  category: AdminProductCategory;
  sortedCategories: AdminProductCategory[];
  busy: boolean;
  onEdit: (c: AdminProductCategory) => void;
  onArchive: (c: AdminProductCategory) => void;
  onRestore: (c: AdminProductCategory) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onToggleShowOnWebsite: (c: AdminProductCategory) => void;
  onViewProducts: (slug: string) => void;
}) {
  const idx          = sortedCategories.findIndex((c) => c.id === category.id);
  const canMoveUp    = idx > 0 && !busy;
  const canMoveDown  = idx >= 0 && idx < sortedCategories.length - 1 && !busy;
  const isArchived   = category.status === "archived";
  const isDraft      = category.status === "draft";
  const canToggleWeb = !isArchived && !isDraft && !busy;
  const webActive    = category.showOnWebsite && !isArchived;

  return (
    <div
      className="admin-surface flex flex-col"
      style={{ border: "1px solid rgba(182,136,94,0.12)", overflow: "hidden" }}
    >
      {/* Top accent line — green when on website, muted gold otherwise */}
      <div
        style={{
          height: 3,
          background: webActive
            ? "linear-gradient(90deg, rgba(74,222,128,0.55), transparent)"
            : "linear-gradient(90deg, rgba(182,136,94,0.25), transparent)",
        }}
      />

      {/* Card body */}
      <div style={{ padding: "14px 16px", flex: 1 }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className="truncate"
              style={{ fontSize: 13.5, fontWeight: 700, color: "var(--cream)", fontFamily: "var(--font-playfair)", lineHeight: 1.3 }}
            >
              {category.nameEn}
            </p>
            <p
              className="truncate"
              style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.48, direction: "rtl", textAlign: "right", marginTop: 2 }}
            >
              {category.nameAr}
            </p>
          </div>
          <CategoryStatusBadge category={category} />
        </div>

        {/* Slug · product count · sort order */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <span style={{ fontSize: 10.5, color: "var(--gold-light)", fontFamily: "monospace" }}>
            {category.slug}
          </span>
          <span style={{ fontSize: 10, color: "var(--cream-dim)", opacity: 0.28 }}>·</span>
          <span style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.5 }}>
            {category.productCount} products
          </span>
          <span style={{ fontSize: 10, color: "var(--cream-dim)", opacity: 0.28 }}>·</span>
          <span style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.42 }}>
            Order #{category.sortOrder}
          </span>
        </div>

        {/* Website visibility indicator */}
        <div className="mt-3">
          {webActive ? (
            <span className="inline-flex items-center gap-1.5" style={{ fontSize: 10.5, fontWeight: 600, color: "#4ade80" }}>
              <Eye size={11} /> Visible on website
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5" style={{ fontSize: 10.5, fontWeight: 600, color: "var(--cream-dim)", opacity: 0.36 }}>
              <EyeOff size={11} />
              {isArchived ? "Archived — not on website" : "Hidden from website"}
            </span>
          )}
        </div>
      </div>

      {/* Action footer */}
      <div
        className="flex items-center gap-1.5 flex-wrap"
        style={{ padding: "10px 12px", borderTop: "1px solid rgba(182,136,94,0.08)", background: "rgba(0,0,0,0.12)" }}
      >
        {/* Edit */}
        <button
          type="button"
          onClick={() => onEdit(category)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
          style={{ background: "rgba(255,255,255,0.04)", color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.10)" }}
        >
          <Pencil size={10} /> Edit
        </button>

        {/* View Products */}
        <button
          type="button"
          onClick={() => onViewProducts(category.slug)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
          style={{ background: "rgba(255,255,255,0.04)", color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.10)" }}
        >
          <Package size={10} /> View Products
        </button>

        {/* Show / Hide on website */}
        <button
          type="button"
          onClick={() => { if (canToggleWeb) onToggleShowOnWebsite(category); }}
          disabled={!canToggleWeb}
          title={
            isArchived ? "Archived categories cannot show on website"
            : isDraft   ? "Publish draft first to show on website"
            : ""
          }
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
          style={{ background: "rgba(255,255,255,0.04)", color: canToggleWeb ? "var(--cream-dim)" : "rgba(245,232,209,0.22)", border: "1px solid rgba(182,136,94,0.10)", cursor: canToggleWeb ? "pointer" : "not-allowed" }}
        >
          {webActive ? <EyeOff size={10} /> : <Eye size={10} />}
          {webActive ? "Hide" : "Show"}
        </button>

        {/* Move up / down + archive / restore pushed to the right */}
        <div className="flex items-center gap-1 ml-auto">
          <IconAction title="Move up"   onClick={() => onMove(category.id, "up")}   disabled={!canMoveUp}>
            <ArrowUp size={12} />
          </IconAction>
          <IconAction title="Move down" onClick={() => onMove(category.id, "down")} disabled={!canMoveDown}>
            <ArrowDown size={12} />
          </IconAction>
          {isArchived ? (
            <IconAction title="Restore category" onClick={() => onRestore(category)} disabled={busy}>
              <RotateCcw size={12} />
            </IconAction>
          ) : (
            <IconAction title="Archive category" onClick={() => onArchive(category)} disabled={busy}>
              <Archive size={12} />
            </IconAction>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CategoryManagementTab ────────────────────────────────────────────────────

function CategoryManagementTab({
  sortedCategories,
  filteredCategories,
  search,
  filter,
  notice,
  error,
  busyId,
  onSearchChange,
  onFilterChange,
  onEdit,
  onArchive,
  onRestore,
  onMove,
  onToggleShowOnWebsite,
  onViewProducts,
}: {
  sortedCategories:   AdminProductCategory[];
  filteredCategories: AdminProductCategory[];
  search:             string;
  filter:             CategoryFilter;
  notice:             string | null;
  error:              string | null;
  busyId:             string | null;
  onSearchChange:     (v: string) => void;
  onFilterChange:     (v: CategoryFilter) => void;
  onEdit:             (c: AdminProductCategory) => void;
  onArchive:          (c: AdminProductCategory) => void;
  onRestore:          (c: AdminProductCategory) => void;
  onMove:             (id: string, dir: "up" | "down") => void;
  onToggleShowOnWebsite: (c: AdminProductCategory) => void;
  onViewProducts:     (slug: string) => void;
}) {
  const summary = useMemo(() => ({
    total:       sortedCategories.length,
    onWebsite:   sortedCategories.filter((c) => c.showOnWebsite && c.status !== "archived").length,
    hiddenDraft: sortedCategories.filter((c) => c.status === "hidden" || c.status === "draft").length,
    archived:    sortedCategories.filter((c) => c.status === "archived").length,
  }), [sortedCategories]);

  return (
    <div className="space-y-4">
      {/* Summary KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Categories" value={summary.total}       Icon={Tags}          color="var(--gold)" />
        <SummaryCard label="On Website"        value={summary.onWebsite}  Icon={Globe2}        color="#4ade80"     />
        <SummaryCard label="Hidden / Draft"    value={summary.hiddenDraft}Icon={AlertTriangle} color="#fbbf24"     />
        <SummaryCard label="Archived"          value={summary.archived}   Icon={Archive}       color="#f87171"     />
      </div>

      {/* Error flash */}
      {error && (
        <div className="admin-surface flex items-center gap-2" style={{ padding: "10px 12px", borderColor: "rgba(239,68,68,0.28)" }}>
          <AlertTriangle size={14} style={{ color: "#f87171" }} />
          <p style={{ fontSize: 12, color: "#fca5a5" }}>{error}</p>
        </div>
      )}

      {/* Notice flash */}
      {notice && !error && (
        <div className="admin-surface flex items-center gap-2" style={{ padding: "10px 12px", borderColor: "rgba(74,222,128,0.20)" }}>
          <Check size={14} style={{ color: "#4ade80" }} />
          <p style={{ fontSize: 12, color: "var(--cream-dim)" }}>{notice}</p>
        </div>
      )}

      {/* Search + filter pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[190px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--cream-dim)", opacity: 0.35 }} />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[12.5px] outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)", color: "var(--cream)" }}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORY_FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onFilterChange(item.key)}
                className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all"
                style={{ background: active ? "rgba(182,136,94,0.15)" : "rgba(255,255,255,0.03)", color: active ? "var(--gold)" : "var(--cream-dim)", border: active ? "1px solid rgba(182,136,94,0.25)" : "1px solid rgba(182,136,94,0.08)" }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {filteredCategories.length === 0 && (
        <div className="py-16 text-center" style={{ color: "var(--cream-dim)", opacity: 0.36 }}>
          <Tags size={32} style={{ margin: "0 auto 12px" }} />
          <p className="text-sm font-medium">No categories match this view</p>
        </div>
      )}

      {/* Category card grid */}
      {filteredCategories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              sortedCategories={sortedCategories}
              busy={busyId === cat.id}
              onEdit={onEdit}
              onArchive={onArchive}
              onRestore={onRestore}
              onMove={onMove}
              onToggleShowOnWebsite={onToggleShowOnWebsite}
              onViewProducts={onViewProducts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CategoryDrawer (simplified) ─────────────────────────────────────────────

function buildCategoryForm(category: AdminProductCategory | null, fallbackSortOrder: number): CategoryFormState {
  return {
    nameEn:        category?.nameEn        ?? "",
    nameAr:        category?.nameAr        ?? "",
    slug:          category?.slug          ?? "",
    descriptionEn: category?.descriptionEn ?? "",
    descriptionAr: category?.descriptionAr ?? "",
    status:        category?.status        ?? "draft",
    sortOrder:     String(category?.sortOrder ?? fallbackSortOrder),
    showOnWebsite: category?.showOnWebsite ?? false,
  };
}

function CategoryDrawer({
  state,
  categories,
  onClose,
  onSave,
}: {
  state:      CategoryDrawerState;
  categories: AdminProductCategory[];
  onClose:    () => void;
  onSave:     (id: string, payload: AdminCategoryUpdateInput) => Promise<void>;
}) {
  const editing          = state.mode === "edit";
  const existingCategory = editing ? state.category : null;
  const initialForm      = useMemo(
    () => buildCategoryForm(existingCategory, categories.length * 10 + 10),
    [existingCategory, categories.length],
  );
  const [slugTouched, setSlugTouched] = useState(editing);
  const [form, setForm]  = useState<CategoryFormState>(initialForm);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const normalizedSlug = form.slug.trim().toLowerCase();

  const errors = useMemo(() => {
    const errs: string[] = [];
    const sortNum = Number(form.sortOrder);
    if (!form.nameEn.trim())  errs.push("English name is required.");
    if (!form.nameAr.trim())  errs.push("Arabic name is required.");
    if (!normalizedSlug)      errs.push("Slug is required.");
    if (normalizedSlug && !isUrlSafeSlug(normalizedSlug))
      errs.push("Slug must use lowercase letters, numbers, and hyphens only.");
    if (normalizedSlug && categories.some((c) => c.id !== existingCategory?.id && c.slug === normalizedSlug))
      errs.push("Slug must be locally unique.");
    if (!Number.isFinite(sortNum) || sortNum < 0) errs.push("Sort order must be a non-negative number.");
    if (form.status === "archived" && form.showOnWebsite)
      errs.push("Archived categories cannot show on website.");
    return errs;
  }, [categories, existingCategory?.id, form, normalizedSlug]);

  // Only what actually changed vs. the loaded row — keeps the Save honest and
  // avoids firing the slug-sync trigger when the slug was not touched.
  const changedPayload = useMemo<AdminCategoryUpdateInput>(() => {
    const payload: AdminCategoryUpdateInput = {};
    if (form.nameEn.trim() !== initialForm.nameEn.trim()) payload.nameEn = form.nameEn;
    if (form.nameAr.trim() !== initialForm.nameAr.trim()) payload.nameAr = form.nameAr;
    if (normalizedSlug !== initialForm.slug.trim().toLowerCase()) payload.slug = normalizedSlug;
    if (form.descriptionEn.trim() !== initialForm.descriptionEn.trim()) payload.descriptionEn = form.descriptionEn;
    if (form.descriptionAr.trim() !== initialForm.descriptionAr.trim()) payload.descriptionAr = form.descriptionAr;
    if (form.status !== initialForm.status) payload.status = form.status;
    if (form.showOnWebsite !== initialForm.showOnWebsite) payload.showOnWebsite = form.showOnWebsite;
    if (Number(form.sortOrder) !== Number(initialForm.sortOrder)) payload.sortOrder = Number(form.sortOrder);
    return payload;
  }, [form, initialForm, normalizedSlug]);

  const dirty = Object.keys(changedPayload).length > 0;
  const canSave = editing && dirty && errors.length === 0 && !saving;

  const inputStyle = {
    background: "rgba(255,255,255,0.045)",
    border:     "1px solid rgba(182,136,94,0.14)",
    color:      "var(--cream)",
  };

  const setNameEn = (value: string) => {
    setErrorMsg(null);
    setForm((prev) => ({
      ...prev,
      nameEn: value,
      slug: !slugTouched && !editing ? slugifyCategoryName(value) : prev.slug,
    }));
  };

  const setStatus = (status: AdminCategoryStatus) => {
    setErrorMsg(null);
    setForm((prev) => ({
      ...prev,
      status,
      showOnWebsite: status === "archived" ? false : prev.showOnWebsite,
    }));
  };

  const saveCategory = async () => {
    if (!canSave || !existingCategory) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSave(existingCategory.id, changedPayload);
      setSaved(true);
      setTimeout(() => onClose(), 700);
    } catch (error) {
      setErrorMsg(writeErrorMessage(error, "Could not save category. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close category drawer"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(6,4,3,0.72)", backdropFilter: "blur(8px)" }}
      />
      <div
        className="relative h-full w-full max-w-md overflow-y-auto"
        style={{ background: "rgba(15,10,7,0.98)", borderLeft: "1px solid rgba(182,136,94,0.20)", boxShadow: "-24px 0 80px rgba(0,0,0,0.46)" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 py-4" style={{ background: "rgba(15,10,7,0.96)", borderBottom: "1px solid rgba(182,136,94,0.12)" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {editing ? "Edit Category" : "Add Category"}
            </p>
            <h3 style={{ marginTop: 4, fontSize: 19, fontWeight: 800, color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
              {editing ? existingCategory?.nameEn : "New product category"}
            </h3>
          </div>
          <button
            type="button"
            title="Close drawer"
            aria-label="Close drawer"
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.10)", color: "var(--cream-dim)" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Form body */}
        <div className="space-y-4 p-5">
          {/* Names */}
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldLabel>
              English name *
              <input
                type="text"
                value={form.nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="rounded-xl px-3 py-2.5 text-[12.5px] outline-none"
                style={inputStyle}
              />
            </FieldLabel>
            <FieldLabel>
              Arabic name *
              <input
                type="text"
                value={form.nameAr}
                onChange={(e) => setForm((prev) => ({ ...prev, nameAr: e.target.value }))}
                dir="rtl"
                className="rounded-xl px-3 py-2.5 text-[12.5px] outline-none"
                style={inputStyle}
              />
            </FieldLabel>
          </div>

          {/* Slug */}
          <FieldLabel>
            Slug *
            <input
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((prev) => ({ ...prev, slug: e.target.value.trim().toLowerCase() }));
              }}
              className="rounded-xl px-3 py-2.5 text-[12.5px] outline-none"
              style={inputStyle}
            />
          </FieldLabel>
          <p style={{ marginTop: -8, fontSize: 11, color: "var(--cream-dim)", opacity: 0.5 }}>
            Auto-generated from English name. Lowercase letters, numbers, and hyphens only.
          </p>

          {/* Status */}
          <SegmentedField
            label="Status"
            value={form.status}
            onChange={setStatus}
            options={[
              { value: "visible",  label: "Visible"  },
              { value: "hidden",   label: "Hidden"   },
              { value: "draft",    label: "Draft"    },
              { value: "archived", label: "Archived" },
            ]}
          />

          {/* Descriptions */}
          <FieldLabel>
            Description (English)
            <textarea
              value={form.descriptionEn}
              onChange={(e) => { setErrorMsg(null); setForm((prev) => ({ ...prev, descriptionEn: e.target.value })); }}
              rows={2}
              className="rounded-xl px-3 py-2.5 text-[12.5px] outline-none resize-y"
              style={inputStyle}
            />
          </FieldLabel>
          <FieldLabel>
            Description (Arabic)
            <textarea
              value={form.descriptionAr}
              onChange={(e) => { setErrorMsg(null); setForm((prev) => ({ ...prev, descriptionAr: e.target.value })); }}
              dir="rtl"
              rows={2}
              className="rounded-xl px-3 py-2.5 text-[12.5px] outline-none resize-y"
              style={inputStyle}
            />
          </FieldLabel>

          {/* Sort order */}
          <FieldLabel>
            Sort order
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => { setErrorMsg(null); setForm((prev) => ({ ...prev, sortOrder: e.target.value })); }}
              className="rounded-xl px-3 py-2.5 text-[12.5px] outline-none"
              style={inputStyle}
            />
          </FieldLabel>

          {/* Visible on website toggle */}
          <button
            type="button"
            onClick={() => {
              if (form.status !== "archived") {
                setForm((prev) => ({ ...prev, showOnWebsite: !prev.showOnWebsite }));
              }
            }}
            disabled={form.status === "archived"}
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-left w-full"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)", color: form.status === "archived" ? "rgba(245,232,209,0.28)" : "var(--cream)" }}
          >
            <span>
              <span className="block text-[12.5px] font-semibold">Visible on Website</span>
              <span className="block text-[10.5px]" style={{ color: "var(--cream-dim)", opacity: 0.48 }}>
                Show this category on the public website.
              </span>
            </span>
            <span style={{ color: form.showOnWebsite && form.status !== "archived" ? "#4ade80" : "rgba(245,232,209,0.35)" }}>
              {form.showOnWebsite && form.status !== "archived" ? <Eye size={17} /> : <EyeOff size={17} />}
            </span>
          </button>

          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
              {errors.map((err) => (
                <p key={err} style={{ fontSize: 11.5, color: "#fca5a5" }}>{err}</p>
              ))}
            </div>
          )}

          {/* Save error */}
          {errorMsg && (
            <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.24)" }}>
              <p style={{ fontSize: 11.5, color: "#fca5a5" }}>{errorMsg}</p>
            </div>
          )}

          {/* Info note */}
          <div className="rounded-xl p-3" style={{ background: "rgba(182,136,94,0.07)", border: "1px solid rgba(182,136,94,0.14)" }}>
            <p style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.65 }}>
              A category appears on the website only when its status is <strong>Visible</strong> and Visible on Website is enabled.
              Renaming the slug updates this category&rsquo;s product links automatically.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 px-5 py-4" style={{ background: "rgba(15,10,7,0.96)", borderTop: "1px solid rgba(182,136,94,0.12)" }}>
          {saved && <span style={{ marginRight: "auto", fontSize: 12, color: "#4ade80", fontWeight: 600 }}>✓ Saved</span>}
          {!saved && dirty && !saving && <span style={{ marginRight: "auto", fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.5 }}>Unsaved changes</span>}
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-[12.5px] font-semibold"
            style={{ background: "rgba(255,255,255,0.04)", color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.10)", cursor: saving ? "not-allowed" : "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveCategory}
            disabled={!canSave}
            className="rounded-lg px-4 py-2 text-[12.5px] font-semibold"
            style={{ background: canSave ? "rgba(182,136,94,0.18)" : "rgba(182,136,94,0.07)", color: canSave ? "var(--gold)" : "rgba(245,232,209,0.32)", border: "1px solid rgba(182,136,94,0.22)", cursor: canSave ? "pointer" : "not-allowed" }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AddProductDrawer ─────────────────────────────────────────────────────────

type AddProductForm = {
  nameEn: string;
  nameAr: string;
  category: string;
  price250: string;
  price500: string;
  pricePerKg: string;
  costPerKg: string;
  stockQty: string;
  hidden: boolean;
};

const ADD_PRODUCT_EMPTY: AddProductForm = {
  nameEn: "",
  nameAr: "",
  category: "turkish-blends",
  price250: "",
  price500: "",
  pricePerKg: "",
  costPerKg: "",
  stockQty: "10",
  hidden: true,
};

const SKU_PREFIXES: Record<string, string> = {
  "turkish-blends": "TRK",
  "espresso-blends": "ESP",
  "easy-coffee": "ECO",
  "coffee-mix": "MIX",
  cappuccino: "CAP",
  "hot-chocolate": "CHO",
  "flavor-coffee": "FLV",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Add product writes stay disabled in this read-only Supabase pass.
function AddProductDrawer({
  isOpen, onClose, onAdd, existingProducts,
}: {
  isOpen:           boolean;
  onClose:          () => void;
  onAdd:            (product: AdminProduct) => void;
  existingProducts: AdminProduct[];
}) {
  const [form, setForm] = useState<AddProductForm>(ADD_PRODUCT_EMPTY);
  const [flash, setFlash] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isOpen) { setForm(ADD_PRODUCT_EMPTY); setFlash(false); } }, [isOpen]);

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!form.nameEn.trim()) e.push("English name required.");
    if (!form.nameAr.trim()) e.push("Arabic name required.");
    if (!Number(form.pricePerKg) || Number(form.pricePerKg) <= 0) e.push("Per KG price required.");
    if (!Number(form.costPerKg)  || Number(form.costPerKg)  <= 0) e.push("Purchase cost required.");
    return e;
  }, [form]);

  const handleSave = () => {
    if (errors.length > 0) return;
    const baseSlug = slugifyCategoryName(form.nameEn) || "new-product";
    let slug = baseSlug, n = 2;
    while (existingProducts.some((p) => p.slug === slug)) { slug = `${baseSlug}-${n++}`; }
    const prefix   = SKU_PREFIXES[form.category] ?? "PRD";
    const catCount = existingProducts.filter((p) => p.category === form.category).length + 1;
    const sku      = `${prefix}-${String(catCount).padStart(3, "0")}`;
    const image    = existingProducts.find((p) => p.category === form.category)?.image ?? existingProducts[0]?.image ?? "/assets/products/classic-pouch.png";
    const p250 = Number(form.price250); const p500 = Number(form.price500); const pkg = Number(form.pricePerKg);
    const sizes: { label: string; salePrice: number }[] = [];
    if (p250 > 0) sizes.push({ label: "250g", salePrice: p250 });
    if (p500 > 0) sizes.push({ label: "500g", salePrice: p500 });
    sizes.push({ label: "1kg", salePrice: pkg });
    const stockQty = Math.max(0, Number(form.stockQty) || 0);
    const status   = stockQty === 0 ? "Out of Stock" : stockQty <= 5 ? "Low Stock" : "In Stock";
    const product = {
      name: { en: form.nameEn.trim(), ar: form.nameAr.trim() },
      slug, category: form.category, image, sizes,
      note: { en: "", ar: "" },
      pricingModel: "packaged-by-weight" as const,
      salePricePerKg: pkg, purchaseCostPerKg: Number(form.costPerKg),
      status, hidden: form.hidden, featured: false, bestSeller: false,
      stockQty, lowStockThreshold: 5, sku,
      metaTitle: { en: `${form.nameEn.trim()} | Line Coffee`, ar: `${form.nameAr.trim()} | لاين كوفي` },
      metaDescription: { en: "", ar: "" }, gallery: [],
    } as unknown as AdminProduct;
    setFlash(true);
    onAdd(product);
    setTimeout(() => { setFlash(false); onClose(); }, 800);
  };

  const inp: React.CSSProperties = { background: "rgba(255,255,255,0.045)", border: "1px solid rgba(182,136,94,0.14)", color: "var(--cream)", width: "100%", borderRadius: 10, padding: "9px 12px", fontSize: 12.5, outline: "none" };
  const fieldLabel = (label: string, children: React.ReactNode) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cream-dim)", opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      {children}
    </label>
  );

  return (
    <div className="fixed inset-0 z-[103] flex justify-end" style={{ pointerEvents: isOpen ? "auto" : "none" }}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0" style={{ background: isOpen ? "rgba(6,4,3,0.72)" : "transparent", backdropFilter: isOpen ? "blur(8px)" : "none", transition: "all 0.28s" }} />
      <div className="relative h-full overflow-y-auto" style={{ width: "clamp(320px,42vw,480px)", background: "rgba(15,10,7,0.98)", borderLeft: "1px solid rgba(182,136,94,0.20)", boxShadow: "-24px 0 80px rgba(0,0,0,0.46)", transform: isOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1)" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 py-4" style={{ background: "rgba(15,10,7,0.96)", borderBottom: "1px solid rgba(182,136,94,0.12)" }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 800, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.08em" }}>New Product</p>
            <h3 style={{ marginTop: 3, fontSize: 18, fontWeight: 800, color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>Add a product</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.10)", color: "var(--cream-dim)", flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        {/* Form body */}
        <div style={{ padding: "20px 20px 100px" }} className="space-y-4">
          {/* Names */}
          <div className="grid grid-cols-2 gap-3">
            {fieldLabel("English Name *", <input type="text" value={form.nameEn} onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))} style={inp} />)}
            {fieldLabel("Arabic Name *", <input type="text" value={form.nameAr} onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))} dir="rtl" style={inp} />)}
          </div>

          {/* Category */}
          {fieldLabel("Category *", (
            <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
              {Array.from(new Set(existingProducts.map((product) => product.category))).map((slug) => (
                <option key={slug} value={slug} style={{ background: "#0f0a07" }}>
                  {slug.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          ))}

          {/* Prices */}
          <div className="grid grid-cols-3 gap-3">
            {fieldLabel("250g (EGP)", <input type="number" min="0" value={form.price250} onChange={(e) => setForm((p) => ({ ...p, price250: e.target.value }))} style={inp} placeholder="optional" />)}
            {fieldLabel("500g (EGP)", <input type="number" min="0" value={form.price500} onChange={(e) => setForm((p) => ({ ...p, price500: e.target.value }))} style={inp} placeholder="optional" />)}
            {fieldLabel("Per KG (EGP) *", <input type="number" min="0" value={form.pricePerKg} onChange={(e) => setForm((p) => ({ ...p, pricePerKg: e.target.value }))} style={inp} placeholder="0" />)}
          </div>

          {/* Cost + Stock */}
          <div className="grid grid-cols-2 gap-3">
            {fieldLabel("Cost / KG (EGP) *", <input type="number" min="0" value={form.costPerKg} onChange={(e) => setForm((p) => ({ ...p, costPerKg: e.target.value }))} style={inp} placeholder="0" />)}
            {fieldLabel("Initial Stock (units)", <input type="number" min="0" value={form.stockQty} onChange={(e) => setForm((p) => ({ ...p, stockQty: e.target.value }))} style={inp} />)}
          </div>

          {/* Visibility toggle */}
          <button type="button" onClick={() => setForm((p) => ({ ...p, hidden: !p.hidden }))} className="w-full flex items-center justify-between gap-3 text-left" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)", borderRadius: 10, padding: "10px 12px" }}>
            <span>
              <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--cream)" }}>Visible on website</span>
              <span style={{ display: "block", fontSize: 11, color: "var(--cream-dim)", opacity: 0.45 }}>New products are hidden by default.</span>
            </span>
            <span style={{ color: !form.hidden ? "#4ade80" : "rgba(245,232,209,0.30)", flexShrink: 0 }}>
              {!form.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
            </span>
          </button>

          {/* Errors */}
          {errors.length > 0 && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 10, padding: "10px 12px" }}>
              {errors.map((err) => <p key={err} style={{ fontSize: 11.5, color: "#fca5a5", lineHeight: 1.5 }}>{err}</p>)}
            </div>
          )}

          {/* Note */}
          <div style={{ background: "rgba(182,136,94,0.06)", border: "1px solid rgba(182,136,94,0.12)", borderRadius: 10, padding: "9px 12px" }}>
            <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.55 }}>Mock only — resets on refresh. Image is auto-assigned from the selected category.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 px-5 py-4" style={{ background: "rgba(15,10,7,0.96)", borderTop: "1px solid rgba(182,136,94,0.12)" }}>
          {flash && <span style={{ marginRight: "auto", fontSize: 12, color: "#4ade80", fontWeight: 600 }}>✓ Added</span>}
          <button type="button" onClick={onClose} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: "rgba(255,255,255,0.04)", color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.10)" }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={errors.length > 0} style={{ padding: "7px 18px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: errors.length > 0 ? "rgba(182,136,94,0.06)" : "rgba(182,136,94,0.18)", color: errors.length > 0 ? "rgba(245,232,209,0.30)" : "var(--gold)", border: "1px solid rgba(182,136,94,0.22)", cursor: errors.length > 0 ? "not-allowed" : "pointer" }}>Add Product</button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [activeTab,        setActiveTab]        = useState<ProductAdminTab>("products");
  const [search,           setSearch]           = useState("");
  const [category,         setCategory]         = useState<string>("all");
  const [drawerSlug,       setDrawerSlug]       = useState<string | null>(null);
  const [products,         setProducts]         = useState<AdminProduct[]>([]);
  const [categories,       setCategories]       = useState<AdminProductCategory[]>([]);
  const [isLoading,        setIsLoading]        = useState(true);
  const [catalogError,     setCatalogError]     = useState<string | null>(null);
  const [categorySearch,   setCategorySearch]   = useState("");
  const [categoryFilter,   setCategoryFilter]   = useState<CategoryFilter>("all");
  const [categoryDrawer,   setCategoryDrawer]   = useState<CategoryDrawerState | null>(null);
  const [categoryNotice,   setCategoryNotice]   = useState<string | null>(null);
  const [categoryError,    setCategoryError]    = useState<string | null>(null);
  const [categoryBusyId,   setCategoryBusyId]   = useState<string | null>(null);
  const router = useRouter();

  // Re-reads products + categories from Supabase without toggling the full-page
  // loader — used after a drawer save so the drawer stays mounted (no flash).
  const reloadCatalog = useCallback(async () => {
    setCatalogError(null);
    try {
      const [nextProducts, nextCategories] = await Promise.all([
        getAdminProductsWithVariants(),
        getAdminCategories(),
      ]);
      setProducts(nextProducts);
      setCategories([...nextCategories].sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn)));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to read admin catalog data.";
      setCatalogError(message);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function initialLoad() {
      setIsLoading(true);
      await reloadCatalog();
      if (mounted) setIsLoading(false);
    }
    void initialLoad();
    return () => {
      mounted = false;
    };
  }, [reloadCatalog]);

  const allProducts = products;

  const kpis = useMemo(() => ({
    total:       allProducts.length,
    active:      allProducts.filter((p) => p.isActive).length,
    lowStock:    allProducts.filter((p) => p.status === "Low Stock").length,
    outOfStock:  allProducts.filter((p) => p.status === "Out of Stock").length,
    bestSellers: allProducts.filter((p) => p.bestSeller).length,
  }), [allProducts]);

  const counts = useMemo(() => {
    const next: Record<string, number> = { all: allProducts.length };
    for (const p of allProducts) next[p.category] = (next[p.category] ?? 0) + 1;
    return next;
  }, [allProducts]);

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

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn)),
    [categories]
  );

  const categoryBySlug = useMemo(
    () => new Map(sortedCategories.map((item) => [item.slug, item])),
    [sortedCategories]
  );

  const filteredCategories = useMemo(
    () => sortedCategories.filter((item) => {
      const q = categorySearch.trim().toLowerCase();
      const matchesSearch = !q
        || item.nameEn.toLowerCase().includes(q)
        || item.nameAr.includes(q)
        || item.slug.includes(q);
      if (!matchesSearch) return false;
      if (categoryFilter === "all") return true;
      return item.status === categoryFilter;
    }),
    [categoryFilter, categorySearch, sortedCategories]
  );

  const drawerProduct = drawerSlug
    ? allProducts.find((p) => p.slug === drawerSlug) ?? null
    : null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  // Refresh from Supabase after a drawer save. Re-target the drawer if the slug changed.
  const handleProductSaved = async (newSlug?: string) => {
    await reloadCatalog();
    if (newSlug) setDrawerSlug(newSlug);
  };

  // Persists the drawer edit, then refreshes from Supabase. Throws on failure so
  // the drawer can surface the exact error and stay open.
  const handleSaveCategory = async (id: string, payload: AdminCategoryUpdateInput) => {
    setCategoryError(null);
    await updateAdminCategory(id, payload);
    await reloadCatalog();
    setCategoryNotice("Category saved.");
  };

  const handleArchiveCategory = async (item: AdminProductCategory) => {
    setCategoryNotice(null);
    setCategoryError(null);
    setCategoryBusyId(item.id);
    try {
      await archiveAdminCategory(item.id);
      await reloadCatalog();
      setCategoryNotice(`${item.nameEn} archived — hidden from the website, still here in admin.`);
    } catch (error) {
      setCategoryError(writeErrorMessage(error, `Could not archive ${item.nameEn}.`));
    } finally {
      setCategoryBusyId(null);
    }
  };

  const handleRestoreCategory = async (item: AdminProductCategory) => {
    setCategoryNotice(null);
    setCategoryError(null);
    setCategoryBusyId(item.id);
    try {
      await restoreAdminCategory(item.id);
      await reloadCatalog();
      setCategoryNotice(`${item.nameEn} restored. It stays off the website until you press Show.`);
    } catch (error) {
      setCategoryError(writeErrorMessage(error, `Could not restore ${item.nameEn}.`));
    } finally {
      setCategoryBusyId(null);
    }
  };

  const handleMoveCategory = async (categoryId: string, direction: "up" | "down") => {
    const ordered = [...sortedCategories];
    const idx = ordered.findIndex((c) => c.id === categoryId);
    if (idx === -1) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= ordered.length) return;
    [ordered[idx], ordered[swapWith]] = [ordered[swapWith], ordered[idx]];

    setCategoryNotice(null);
    setCategoryError(null);
    setCategoryBusyId(categoryId);
    try {
      await reorderAdminCategories(ordered.map((c) => c.id));
      await reloadCatalog();
      setCategoryNotice("Category order updated.");
    } catch (error) {
      setCategoryError(writeErrorMessage(error, "Could not reorder categories."));
    } finally {
      setCategoryBusyId(null);
    }
  };

  const handleToggleShowOnWebsite = async (item: AdminProductCategory) => {
    if (item.status === "archived" || item.status === "draft") return;
    const next = !item.showOnWebsite;
    setCategoryNotice(null);
    setCategoryError(null);
    setCategoryBusyId(item.id);
    try {
      await updateAdminCategory(item.id, { showOnWebsite: next });
      await reloadCatalog();
      setCategoryNotice(`${item.nameEn} ${next ? "is now visible on" : "is now hidden from"} the website.`);
    } catch (error) {
      setCategoryError(writeErrorMessage(error, `Could not update ${item.nameEn}.`));
    } finally {
      setCategoryBusyId(null);
    }
  };

  const handleViewProductsFromCategory = (slug: string) => {
    if (slug === "make-your-espresso") {
      router.push("/admin/espresso-manager");
      return;
    }
    if (slug === "make-your-flavor") {
      router.push("/admin/flavor-manager");
      return;
    }
    setActiveTab("products");
    setCategory(categoryBySlug.has(slug) ? slug : "all");
  };

  if (isLoading) {
    return (
      <div className="admin-surface flex items-center gap-3" style={{ padding: "18px 20px" }}>
        <Package size={18} style={{ color: "var(--gold)" }} />
        <div>
          <p style={{ color: "var(--cream)", fontSize: 14, fontWeight: 700 }}>Loading admin catalog</p>
          <p style={{ color: "var(--cream-dim)", opacity: 0.52, fontSize: 12 }}>
            Reading products, categories, and variants from Supabase.
          </p>
        </div>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="admin-surface flex items-start gap-3" style={{ padding: "18px 20px", borderColor: "rgba(239,68,68,0.22)" }}>
        <AlertTriangle size={18} style={{ color: "#f87171", marginTop: 2 }} />
        <div>
          <p style={{ color: "var(--cream)", fontSize: 14, fontWeight: 700 }}>Admin catalog read failed</p>
          <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 4 }}>{catalogError}</p>
          <p style={{ color: "var(--cream-dim)", opacity: 0.55, fontSize: 12, marginTop: 8 }}>
            The admin screen is intentionally not falling back to mock data.
          </p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
              Products
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
              {activeTab === "products"
                ? `${allProducts.length} products across ${categories.length} catalog filters`
                : `${categories.length} categories — manage website visibility and sort order`}
            </p>
          </div>
          {activeTab === "products" ? (
            <button
              type="button"
              disabled
              title={PRODUCT_CREATE_NOTICE}
              aria-label={PRODUCT_CREATE_NOTICE}
              className="inline-flex items-center gap-2"
              style={{ padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: "rgba(182,136,94,0.08)", color: "rgba(245,232,209,0.32)", border: "1px solid rgba(182,136,94,0.14)", cursor: "not-allowed" }}
            >
              <Plus size={14} />
              Add Product — coming soon
            </button>
          ) : (
            <button
              type="button"
              disabled
              title={CATEGORY_CREATE_NOTICE}
              aria-label={CATEGORY_CREATE_NOTICE}
              className="inline-flex items-center gap-2"
              style={{ padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: "rgba(182,136,94,0.08)", color: "rgba(245,232,209,0.32)", border: "1px solid rgba(182,136,94,0.14)", cursor: "not-allowed" }}
            >
              <Plus size={14} />
              Add Category — coming soon
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div
          className="flex items-center gap-1.5 p-1 rounded-xl w-fit max-w-full overflow-x-auto"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.10)" }}
        >
          {([
            { key: "products"   as const, label: "Products",   value: allProducts.length, Icon: Package },
            { key: "categories" as const, label: "Categories", value: categories.length,  Icon: Tags    },
          ]).map(({ key, label, value, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-bold transition-all"
                style={{ background: active ? "rgba(182,136,94,0.17)" : "transparent", color: active ? "var(--gold)" : "var(--cream-dim)", border: active ? "1px solid rgba(182,136,94,0.25)" : "1px solid transparent" }}
              >
                <Icon size={13} />
                {label}
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "rgba(255,255,255,0.06)" }}>
                  {value}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Products tab ─────────────────────────────────────────────────── */}
        {activeTab === "products" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {(
                [
                  { label: "Total Products", value: kpis.total,       Icon: Package,       color: "var(--gold)" },
                  { label: "Active",          value: kpis.active,      Icon: Eye,           color: "#4ade80"     },
                  { label: "Low Stock",       value: kpis.lowStock,    Icon: AlertTriangle, color: "#fbbf24"     },
                  { label: "Out of Stock",    value: kpis.outOfStock,  Icon: TrendingDown,  color: "#ef4444"     },
                  { label: "Best Sellers",    value: kpis.bestSellers, Icon: Star,          color: "#60a5fa"     },
                ] as const
              ).map(({ label, value, Icon, color }) => (
                <SummaryCard key={label} label={label} value={value} Icon={Icon} color={color} />
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--cream-dim)", opacity: 0.35 }} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[12.5px] outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)", color: "var(--cream)" }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className="px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-all flex items-center gap-1.5"
                style={{ background: category === "all" ? "rgba(182,136,94,0.15)" : "rgba(255,255,255,0.03)", color: category === "all" ? "var(--gold)" : "var(--cream-dim)", border: category === "all" ? "1px solid rgba(182,136,94,0.25)" : "1px solid rgba(182,136,94,0.08)" }}
              >
                All
                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 99, background: "rgba(182,136,94,0.15)", color: "var(--gold)" }}>
                  {counts.all}
                </span>
              </button>

              {sortedCategories.map((cat) => {
                const active = category === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => setCategory(cat.slug)}
                    className="px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-all flex items-center gap-1.5"
                    style={{ background: active ? "rgba(182,136,94,0.15)" : "rgba(255,255,255,0.03)", color: active ? "var(--gold)" : "var(--cream-dim)", border: active ? "1px solid rgba(182,136,94,0.25)" : "1px solid rgba(182,136,94,0.08)" }}
                  >
                    {cat.nameEn}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 99, background: active ? "rgba(182,136,94,0.15)" : "rgba(255,255,255,0.06)", color: active ? "var(--gold)" : "var(--cream-dim)" }}>
                      {counts[cat.slug] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {search && (
              <p style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.4 }}>
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
              </p>
            )}

            {filtered.length === 0 && (
              <div className="py-20 text-center" style={{ color: "var(--cream-dim)", opacity: 0.3 }}>
                <Package size={32} style={{ margin: "0 auto 12px" }} />
                <p className="text-sm font-medium">No products found</p>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map((product) => (
                  <AdminProductCard key={product.slug} product={product} onClick={() => setDrawerSlug(product.slug)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Categories tab ───────────────────────────────────────────────── */}
        {activeTab === "categories" && (
          <CategoryManagementTab
            sortedCategories={sortedCategories}
            filteredCategories={filteredCategories}
            search={categorySearch}
            filter={categoryFilter}
            notice={categoryNotice}
            error={categoryError}
            busyId={categoryBusyId}
            onSearchChange={setCategorySearch}
            onFilterChange={setCategoryFilter}
            onEdit={(c) => { setCategoryNotice(null); setCategoryError(null); setCategoryDrawer({ mode: "edit", category: c }); }}
            onArchive={handleArchiveCategory}
            onRestore={handleRestoreCategory}
            onMove={handleMoveCategory}
            onToggleShowOnWebsite={handleToggleShowOnWebsite}
            onViewProducts={handleViewProductsFromCategory}
          />
        )}
      </div>

      {/* Product drawer */}
      <ProductDrawer
        product={drawerProduct}
        isOpen={!!drawerSlug}
        onClose={() => setDrawerSlug(null)}
        onSaved={handleProductSaved}
      />

      {/* Category drawer */}
      {categoryDrawer && (
        <CategoryDrawer
          key={categoryDrawer.mode === "edit" ? `edit-${categoryDrawer.category.id}` : "add-category"}
          state={categoryDrawer}
          categories={categories}
          onClose={() => setCategoryDrawer(null)}
          onSave={handleSaveCategory}
        />
      )}
    </>
  );
}
