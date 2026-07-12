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
  createAdminCategory,
  createAdminProduct,
  getAdminCategories,
  getAdminProductsWithVariants,
  reorderAdminCategories,
  restoreAdminCategory,
  updateAdminCategory,
  type AdminCategoryCreateInput,
  type AdminCategoryStatus,
  type AdminCategoryUpdateInput,
  type AdminProduct,
  type AdminProductCategory,
  type AdminProductCreateInput,
  type ProductStatus,
} from "@/lib/admin/admin-catalog";
import ProductDrawer from "@/components/admin/products/ProductDrawer";
import ProductCreateDrawer from "@/components/admin/products/ProductCreateDrawer";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

function writeErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

const STATUS_STYLE: Record<ProductStatus, { bg: string; color: string }> = {
  "In Stock": { bg: "rgba(74,222,128,0.12)", color: "#8fcf9a" },
  "Low Stock": { bg: "rgba(251,191,36,0.12)", color: "#e3b673" },
  "Out of Stock": { bg: "rgba(239,68,68,0.12)", color: "#e39a8c" },
};

const CATEGORY_STATUS_STYLE: Record<AdminCategoryStatus, { bg: string; color: string; label: string }> = {
  visible:  { bg: "rgba(74,222,128,0.12)",   color: "#8fcf9a",  label: "Visible"  },
  hidden:   { bg: "rgba(148,163,184,0.12)",  color: "#cbd5e1",  label: "Hidden"   },
  draft:    { bg: "rgba(251,191,36,0.12)",   color: "#e3b673",  label: "Draft"    },
  archived: { bg: "rgba(239,68,68,0.12)",    color: "#e39a8c",  label: "Archived" },
};

type ProductAdminTab        = "products" | "categories";
type ProductLifecycleFilter = "all" | "active" | "draft" | "archived";
type CategoryFilter         = "all" | "visible" | "hidden" | "draft" | "archived";

const PRODUCT_STATUS_FILTERS: { key: ProductLifecycleFilter; label: string }[] = [
  { key: "all",      label: "All"      },
  { key: "active",   label: "Active"   },
  { key: "draft",    label: "Draft"    },
  { key: "archived", label: "Archived" },
];
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
    <div className="admin-kpi-card flex items-center gap-3">
      <span className="admin-icon-chip !w-9 !h-9 !rounded-lg" style={{ color, background: `linear-gradient(150deg, ${color}2e, rgb(66 32 12 / 0.30))` }}>
        <Icon size={15} />
      </span>
      <div>
        <p className="admin-value-sm">{value}</p>
        <p className="text-[10.5px] admin-faint mt-0.5">{label}</p>
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
      className="admin-btn admin-btn-sm !w-[30px] !h-[30px] !p-0"
    >
      {children}
    </button>
  );
}

function SegmentedField<T extends string,>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="admin-label mb-2">{label}</p>
      <div className="admin-tabs rounded-xl p-1" style={{ background: "rgb(5 3 2 / 0.35)" }}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => onChange(opt.value)}
              className={`admin-tab !px-3 !py-1.5 !text-[11.5px]${active ? " admin-tab-active" : ""}`}
              style={opt.disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
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
    <label className="grid gap-1.5 admin-label !normal-case !tracking-normal !text-[11px]">
      {children}
    </label>
  );
}

function CategoryStatusBadge({ category }: { category: AdminProductCategory }) {
  const { t } = useAdminLanguage();
  const s = CATEGORY_STATUS_STYLE[category.status];
  return <Badge bg={s.bg} color={s.color}>{t(s.label)}</Badge>;
}

// ─── AdminProductCard (Products tab) ─────────────────────────────────────────

function AdminProductCard({ product, onClick }: { product: AdminProduct; onClick: () => void }) {
  const { language, localize, t } = useAdminLanguage();
  const ss  = STATUS_STYLE[product.status];
  const s250 = product.sizes.find((sz) => sz.label === "250g");
  const s500 = product.sizes.find((sz) => sz.label === "500g");
  const s1kg = product.sizes.find((sz) => sz.label === "1kg");

  return (
    <button
      type="button"
      onClick={onClick}
      className="admin-card text-left group"
      style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "1", background: "var(--admin-border)", flexShrink: 0, overflow: "hidden" }}>
        <Image src={product.image} alt={product.name.en} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw" className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]" />
        <span style={{ position: "absolute", top: 8, left: 8, fontSize: 8.5, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: ss.bg, color: ss.color, letterSpacing: "0.03em" }}>
          {t(product.status)}
        </span>
        <div style={{ position: "absolute", top: 7, right: 7, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          {product.bestSeller && <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 99, background: "var(--admin-border-strong)", color: "#0b0806" }}>BEST</span>}
          {product.featured   && <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 99, background: "rgba(96,165,250,0.88)",  color: "#0b0806" }}>FEAT</span>}
          {product.catalogStatus === "archived" ? (
            <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 99, background: "rgba(248,113,113,0.9)", color: "#0b0806" }}>ARCHIVED</span>
          ) : product.catalogStatus === "draft" ? (
            <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 99, background: "rgba(251,191,36,0.9)", color: "#0b0806" }}>DRAFT</span>
          ) : product.hidden ? (
            <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 99, background: "rgba(156,163,175,0.7)", color: "#0b0806" }}>HIDDEN</span>
          ) : null}
        </div>
      </div>
      <div style={{ padding: "10px 11px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <p
          className="truncate"
          dir={language === "ar" ? "rtl" : "ltr"}
          data-admin-no-translate
          style={{ fontSize: 12, fontWeight: 600, fontFamily: language === "ar" ? "var(--font-tajawal)" : "var(--font-playfair)", color: "var(--admin-white-coffee)", lineHeight: 1.25 }}
        >
          {localize(product.name)}
        </p>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 5 }}>
          {s250 && <span style={{ fontSize: 9.5, padding: "1.5px 6px", borderRadius: 5, background: "var(--admin-border)", color: "var(--admin-vanilla)" }}>250g {s250.salePrice}</span>}
          {s500 && <span style={{ fontSize: 9.5, padding: "1.5px 6px", borderRadius: 5, background: "var(--admin-border)", color: "var(--admin-vanilla)" }}>500g {s500.salePrice}</span>}
          {s1kg && <span style={{ fontSize: 9.5, padding: "1.5px 6px", borderRadius: 5, background: "var(--admin-border)", color: "var(--admin-muted)" }}>1kg {s1kg.salePrice}</span>}
        </div>
        <p style={{ fontSize: 9.5, color: "var(--admin-muted)", opacity: 0.35, marginTop: 3 }}>
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
  const { language, t } = useAdminLanguage();
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
      style={{ border: "1px solid var(--admin-border)", overflow: "hidden" }}
    >
      {/* Top accent line — green when on website, muted gold otherwise */}
      <div
        style={{
          height: 3,
          background: webActive
            ? "linear-gradient(90deg, rgba(74,222,128,0.55), transparent)"
            : "linear-gradient(90deg, var(--admin-border-strong), transparent)",
        }}
      />

      {/* Card body */}
      <div style={{ padding: "14px 16px", flex: 1 }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className="truncate"
              style={{ fontSize: 13.5, fontWeight: 700, color: "var(--admin-white-coffee)", fontFamily: "var(--font-playfair)", lineHeight: 1.3 }}
            >
              <span data-admin-no-translate>
                {language === "ar" ? category.nameAr || category.nameEn : category.nameEn || category.nameAr}
              </span>
            </p>
          </div>
          <CategoryStatusBadge category={category} />
        </div>

        {/* Slug · product count · sort order */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <span style={{ fontSize: 10.5, color: "var(--admin-vanilla)", fontFamily: "monospace" }}>
            {category.slug}
          </span>
          <span style={{ fontSize: 10, color: "var(--admin-muted)", opacity: 0.28 }}>·</span>
          <span style={{ fontSize: 10.5, color: "var(--admin-muted)", opacity: 0.5 }}>
            {category.productCount} {t("Products")}
          </span>
          <span style={{ fontSize: 10, color: "var(--admin-muted)", opacity: 0.28 }}>·</span>
          <span style={{ fontSize: 10.5, color: "var(--admin-muted)", opacity: 0.42 }}>
            Order #{category.sortOrder}
          </span>
        </div>

        {/* Website visibility indicator */}
        <div className="mt-3">
          {webActive ? (
            <span className="inline-flex items-center gap-1.5" style={{ fontSize: 10.5, fontWeight: 600, color: "#8fcf9a" }}>
              <Eye size={11} /> Visible on website
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5" style={{ fontSize: 10.5, fontWeight: 600, color: "var(--admin-muted)", opacity: 0.36 }}>
              <EyeOff size={11} />
              {isArchived ? "Archived — not on website" : "Hidden from website"}
            </span>
          )}
        </div>
      </div>

      {/* Action footer */}
      <div
        className="flex items-center gap-1.5 flex-wrap"
        style={{ padding: "10px 12px", borderTop: "1px solid var(--admin-border)", background: "rgb(5 3 2 / 0.18)" }}
      >
        {/* Edit */}
        <button type="button" onClick={() => onEdit(category)} className="admin-btn admin-btn-sm">
          <Pencil size={10} /> Edit
        </button>

        {/* View Products */}
        <button type="button" onClick={() => onViewProducts(category.slug)} className="admin-btn admin-btn-sm">
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
          className="admin-btn admin-btn-sm"
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
        <SummaryCard label="Total Categories" value={summary.total}       Icon={Tags}          color="var(--admin-hazelnut)" />
        <SummaryCard label="On Website"        value={summary.onWebsite}  Icon={Globe2}        color="#8fcf9a"     />
        <SummaryCard label="Hidden / Draft"    value={summary.hiddenDraft}Icon={AlertTriangle} color="#e3b673"     />
        <SummaryCard label="Archived"          value={summary.archived}   Icon={Archive}       color="#e39a8c"     />
      </div>

      {/* Error flash */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(227,154,140,0.08)", border: "1px solid rgba(227,154,140,0.28)" }}>
          <AlertTriangle size={14} style={{ color: "#e39a8c" }} />
          <p className="text-[12px]" style={{ color: "#eeb4a8" }}>{error}</p>
        </div>
      )}

      {/* Notice flash */}
      {notice && !error && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(143,207,154,0.08)", border: "1px solid rgba(143,207,154,0.24)" }}>
          <Check size={14} style={{ color: "#8fcf9a" }} />
          <p className="text-[12px] admin-text">{notice}</p>
        </div>
      )}

      {/* Search + filter pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[190px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none admin-faint" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="admin-input w-full !pl-9 !pr-4 !py-2.5 !rounded-xl"
          />
        </div>
        <div className="admin-tabs">
          {CATEGORY_FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onFilterChange(item.key)}
                className={`admin-chip${active ? " admin-chip-active" : ""}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {filteredCategories.length === 0 && (
        <div className="admin-empty-state">
          <span className="admin-empty-icon"><Tags size={26} /></span>
          <p className="text-sm font-medium admin-muted">No categories match this view</p>
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

type CategorySubmit =
  | { mode: "create"; input: AdminCategoryCreateInput }
  | { mode: "edit"; id: string; payload: AdminCategoryUpdateInput };

function CategoryDrawer({
  state,
  categories,
  onClose,
  onSubmit,
}: {
  state:      CategoryDrawerState;
  categories: AdminProductCategory[];
  onClose:    () => void;
  onSubmit:   (submit: CategorySubmit) => Promise<void>;
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
  const canSave = (editing ? dirty : true) && errors.length === 0 && !saving;

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
    if (!canSave) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      if (editing && existingCategory) {
        await onSubmit({ mode: "edit", id: existingCategory.id, payload: changedPayload });
      } else {
        await onSubmit({
          mode: "create",
          input: {
            nameEn: form.nameEn,
            nameAr: form.nameAr,
            slug: normalizedSlug,
            descriptionEn: form.descriptionEn,
            descriptionAr: form.descriptionAr,
            status: form.status,
            showOnWebsite: form.showOnWebsite,
            sortOrder: Number(form.sortOrder),
          },
        });
      }
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
        className="admin-modal-overlay absolute inset-0"
      />
      <div className="admin-drawer-surface relative h-full w-full max-w-md overflow-y-auto">
        {/* Header */}
        <div className="admin-drawer-header sticky top-0 z-10 flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <p className="admin-label !text-[11px]" style={{ color: "var(--admin-hazelnut)" }}>
              {editing ? "Edit Category" : "Add Category"}
            </p>
            <h3 className="mt-1 text-[19px] font-bold" style={{ color: "var(--admin-heading)", fontFamily: "var(--font-playfair)" }}>
              {editing ? existingCategory?.nameEn : "New product category"}
            </h3>
          </div>
          <button
            type="button"
            title="Close drawer"
            aria-label="Close drawer"
            onClick={onClose}
            className="admin-btn admin-btn-sm !w-8 !h-8 !p-0"
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
                className="admin-input"
              />
            </FieldLabel>
            <FieldLabel>
              Arabic name *
              <input
                type="text"
                value={form.nameAr}
                onChange={(e) => setForm((prev) => ({ ...prev, nameAr: e.target.value }))}
                dir="rtl"
                className="admin-input"
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
              className="admin-input"
            />
          </FieldLabel>
          <p className="-mt-2 text-[11px] admin-faint">
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
              className="admin-textarea"
            />
          </FieldLabel>
          <FieldLabel>
            Description (Arabic)
            <textarea
              value={form.descriptionAr}
              onChange={(e) => { setErrorMsg(null); setForm((prev) => ({ ...prev, descriptionAr: e.target.value })); }}
              dir="rtl"
              rows={2}
              className="admin-textarea"
            />
          </FieldLabel>

          {/* Sort order */}
          <FieldLabel>
            Sort order
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => { setErrorMsg(null); setForm((prev) => ({ ...prev, sortOrder: e.target.value })); }}
              className="admin-input"
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
            className="admin-btn flex items-center justify-between gap-3 !rounded-xl !px-3 !py-3 text-left w-full"
            style={{ color: form.status === "archived" ? "var(--admin-faint)" : "var(--admin-white-coffee)" }}
          >
            <span>
              <span className="block text-[12.5px] font-semibold">Visible on Website</span>
              <span className="block text-[10.5px] admin-faint">
                Show this category on the public website.
              </span>
            </span>
            <span style={{ color: form.showOnWebsite && form.status !== "archived" ? "#8fcf9a" : "rgba(245,232,209,0.35)" }}>
              {form.showOnWebsite && form.status !== "archived" ? <Eye size={17} /> : <EyeOff size={17} />}
            </span>
          </button>

          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: "rgba(227,154,140,0.08)", border: "1px solid rgba(227,154,140,0.24)" }}>
              {errors.map((err) => (
                <p key={err} className="text-[11.5px]" style={{ color: "#eeb4a8" }}>{err}</p>
              ))}
            </div>
          )}

          {/* Save error */}
          {errorMsg && (
            <div className="rounded-xl p-3" style={{ background: "rgba(227,154,140,0.10)", border: "1px solid rgba(227,154,140,0.28)" }}>
              <p className="text-[11.5px]" style={{ color: "#eeb4a8" }}>{errorMsg}</p>
            </div>
          )}

          {/* Info note */}
          <div className="admin-surface !shadow-none p-3">
            <p className="text-[11.5px] admin-muted">
              A category appears on the website only when its status is <strong>Visible</strong> and Visible on Website is enabled.
              Renaming the slug updates this category&rsquo;s product links automatically.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="admin-drawer-footer sticky bottom-0 flex items-center justify-end gap-2 px-5 py-4">
          {saved && <span className="mr-auto text-[12px] font-semibold" style={{ color: "#8fcf9a" }}>{editing ? "✓ Saved" : "✓ Created"}</span>}
          {!saved && editing && dirty && !saving && <span className="mr-auto text-[11.5px] admin-faint">Unsaved changes</span>}
          <button type="button" onClick={onClose} disabled={saving} className="admin-btn !px-4 !py-2 !text-[12.5px]">
            Cancel
          </button>
          <button
            type="button"
            onClick={saveCategory}
            disabled={!canSave}
            className="admin-btn admin-btn-primary !px-4 !py-2 !text-[12.5px]"
          >
            {saving ? (editing ? "Saving…" : "Creating…") : (editing ? "Save changes" : "Create category")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { language } = useAdminLanguage();
  const [activeTab,        setActiveTab]        = useState<ProductAdminTab>("products");
  const [search,           setSearch]           = useState("");
  const [category,         setCategory]         = useState<string>("all");
  const [statusFilter,     setStatusFilter]     = useState<ProductLifecycleFilter>("all");
  const [drawerSlug,       setDrawerSlug]       = useState<string | null>(null);
  const [productCreateOpen, setProductCreateOpen] = useState(false);
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

  const statusCounts = useMemo(() => ({
    all:      allProducts.length,
    active:   allProducts.filter((p) => p.catalogStatus === "active").length,
    draft:    allProducts.filter((p) => p.catalogStatus === "draft").length,
    archived: allProducts.filter((p) => p.catalogStatus === "archived").length,
  }), [allProducts]);

  const filtered = useMemo(
    () => allProducts.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (statusFilter !== "all" && p.catalogStatus !== statusFilter) return false;
      const q = search.toLowerCase();
      return !q
        || p.name.en.toLowerCase().includes(q)
        || p.name.ar.includes(q)
        || p.slug.includes(q)
        || p.sku.toLowerCase().includes(q);
    }),
    [allProducts, category, statusFilter, search]
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

  // Creates product + 3 variants (atomic RPC), refreshes the grid, and opens the
  // new product in the existing ProductDrawer. Throws on failure so the create
  // drawer can show the exact error and stay open.
  const handleCreateProduct = async (input: AdminProductCreateInput) => {
    const { slug } = await createAdminProduct(input);
    await reloadCatalog();
    setProductCreateOpen(false);
    setActiveTab("products");
    setCategory("all");
    setSearch("");
    setDrawerSlug(slug);
  };

  // Handles both category create and edit from the shared CategoryDrawer.
  // Throws on failure so the drawer surfaces the exact error and stays open.
  const handleCategorySubmit = async (submit: CategorySubmit) => {
    setCategoryError(null);
    if (submit.mode === "create") {
      await createAdminCategory(submit.input);
      await reloadCatalog();
      setCategoryNotice("Category created — hidden until you publish it.");
    } else {
      await updateAdminCategory(submit.id, submit.payload);
      await reloadCatalog();
      setCategoryNotice("Category saved.");
    }
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
      <div className="admin-surface flex items-center gap-3 px-5 py-4.5">
        <span className="admin-icon-chip !w-9 !h-9"><Package size={16} /></span>
        <div>
          <p className="text-[14px] font-bold" style={{ color: "var(--admin-heading)" }}>Loading admin catalog</p>
          <p className="text-[12px] admin-muted">
            Reading products, categories, and variants from Supabase.
          </p>
        </div>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="flex items-start gap-3 rounded-2xl px-5 py-4.5" style={{ background: "rgba(227,154,140,0.06)", border: "1px solid rgba(227,154,140,0.28)" }}>
        <AlertTriangle size={18} style={{ color: "#e39a8c", marginTop: 2 }} />
        <div>
          <p className="text-[14px] font-bold" style={{ color: "var(--admin-heading)" }}>Admin catalog read failed</p>
          <p className="mt-1 text-[12px]" style={{ color: "#eeb4a8" }}>{catalogError}</p>
          <p className="mt-2 text-[12px] admin-muted">
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
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">
              Products
            </h1>
            <p className="admin-page-subtitle">
              {activeTab === "products"
                ? `${allProducts.length} products across ${categories.length} catalog filters`
                : `${categories.length} categories — manage website visibility and sort order`}
            </p>
          </div>
          {activeTab === "products" ? (
            <button
              type="button"
              onClick={() => setProductCreateOpen(true)}
              className="admin-btn admin-btn-primary inline-flex items-center gap-2"
            >
              <Plus size={14} />
              Add Product
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setCategoryNotice(null); setCategoryError(null); setCategoryDrawer({ mode: "add" }); }}
              className="admin-btn admin-btn-primary inline-flex items-center gap-2"
            >
              <Plus size={14} />
              Add Category
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="admin-tabs rounded-xl p-1 w-fit max-w-full overflow-x-auto" style={{ background: "rgb(5 3 2 / 0.35)" }}>
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
                className={`admin-tab${active ? " admin-tab-active" : ""}`}
              >
                <Icon size={13} />
                {label}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? "rgb(5 3 2 / 0.18)" : "rgb(227 210 184 / 0.08)" }}
                >
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
                  { label: "Total Products", value: kpis.total,       Icon: Package,       color: "var(--admin-hazelnut)" },
                  { label: "Active",          value: kpis.active,      Icon: Eye,           color: "#8fcf9a"     },
                  { label: "Low Stock",       value: kpis.lowStock,    Icon: AlertTriangle, color: "#e3b673"     },
                  { label: "Out of Stock",    value: kpis.outOfStock,  Icon: TrendingDown,  color: "#e39a8c"     },
                  { label: "Best Sellers",    value: kpis.bestSellers, Icon: Star,          color: "#8fb0d9"     },
                ] as const
              ).map(({ label, value, Icon, color }) => (
                <SummaryCard key={label} label={label} value={value} Icon={Icon} color={color} />
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none admin-faint" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="admin-input w-full !pl-9 !pr-4 !py-2.5 !rounded-xl"
                />
              </div>
              {/* Lifecycle status filter — All / Active / Draft / Archived */}
              <div className="admin-tabs">
                {PRODUCT_STATUS_FILTERS.map((item) => {
                  const active = statusFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStatusFilter(item.key)}
                      className={`admin-chip${active ? " admin-chip-active" : ""}`}
                    >
                      {item.label}
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: active ? "rgb(5 3 2 / 0.18)" : "rgb(227 210 184 / 0.08)" }}
                      >
                        {statusCounts[item.key]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="admin-tabs">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={`admin-chip${category === "all" ? " admin-chip-active" : ""}`}
              >
                All
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: category === "all" ? "rgb(5 3 2 / 0.18)" : "rgb(227 210 184 / 0.08)" }}
                >
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
                    className={`admin-chip${active ? " admin-chip-active" : ""}`}
                  >
                    <span data-admin-no-translate>
                      {language === "ar" ? cat.nameAr || cat.nameEn : cat.nameEn || cat.nameAr}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: active ? "rgb(5 3 2 / 0.18)" : "rgb(227 210 184 / 0.08)" }}
                    >
                      {counts[cat.slug] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {search && (
              <p className="text-[12px] admin-faint">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
              </p>
            )}

            {filtered.length === 0 && (
              <div className="admin-empty-state">
                <span className="admin-empty-icon"><Package size={26} /></span>
                <p className="text-sm font-medium admin-muted">No products found</p>
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

      {/* Product create drawer */}
      <ProductCreateDrawer
        isOpen={productCreateOpen}
        categories={sortedCategories}
        existingSlugs={allProducts.map((p) => p.slug)}
        onClose={() => setProductCreateOpen(false)}
        onCreate={handleCreateProduct}
      />

      {/* Product drawer */}
      <ProductDrawer
        product={drawerProduct}
        isOpen={!!drawerSlug}
        onClose={() => setDrawerSlug(null)}
        onSaved={handleProductSaved}
      />

      {/* Category drawer (create + edit) */}
      {categoryDrawer && (
        <CategoryDrawer
          key={categoryDrawer.mode === "edit" ? `edit-${categoryDrawer.category.id}` : "add-category"}
          state={categoryDrawer}
          categories={categories}
          onClose={() => setCategoryDrawer(null)}
          onSubmit={handleCategorySubmit}
        />
      )}
    </>
  );
}
