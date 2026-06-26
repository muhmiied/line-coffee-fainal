"use client";

import type { LocalizedValue } from "@/lib/context/language";
import { supabase } from "@/lib/supabase/client";
import type { PackageSize } from "@/lib/types/common";

export type ProductStatus = "In Stock" | "Low Stock" | "Out of Stock";
export type AdminProductLifecycleStatus = "active" | "draft" | "archived";
export type AdminProductVisibility = "public" | "hidden";
export type AdminCategoryStatus = "visible" | "hidden" | "draft" | "archived";
export type AdminCategoryVisibility = "public" | "internal";
export type AdminCategorySource =
  | "catalog"
  | "admin"
  | "system"
  | "manual"
  | "accounting-draft"
  | "imported";

export interface AdminProductMeta {
  status: ProductStatus;
  hidden: boolean;
  featured: boolean;
  bestSeller: boolean;
  /** Raw DB timestamp. Null if never set. Use isNew for display logic. */
  newUntil: string | null;
  /** True while newUntil is in the future. Computed client-side from newUntil. */
  isNew: boolean;
  stockQty: number;
  lowStockThreshold: number;
  sku: string;
  metaTitle: LocalizedValue;
  metaDescription: LocalizedValue;
  gallery: string[];
}

export type AdminProductSize = {
  id: string;
  label: PackageSize;
  salePrice: number;
  compareAtPrice?: number;
  stockState?: "in_stock" | "low_stock" | "out_of_stock";
  sku?: string;
  sortOrder: number;
};

export type AdminProductBlendComponent = {
  origin: LocalizedValue;
  beanType: "arabica" | "robusta";
  pct: number;
};

export interface AdminProduct extends AdminProductMeta {
  id: string;
  slug: string;
  category: string;
  categoryId: string;
  name: LocalizedValue;
  subtitle?: LocalizedValue;
  description?: LocalizedValue;
  note: LocalizedValue;
  blend?: AdminProductBlendComponent[];
  pricingModel: "packaged-by-weight";
  salePricePerKg: number;
  purchaseCostPerKg: number;
  sizes: AdminProductSize[];
  image: string;
  catalogStatus: AdminProductLifecycleStatus;
  visibility: AdminProductVisibility;
  showOnWebsite: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminProductCategory {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  descriptionEn: string;
  descriptionAr: string;
  status: AdminCategoryStatus;
  visibility: AdminCategoryVisibility;
  sortOrder: number;
  productCount: number;
  featured: boolean;
  showOnWebsite: boolean;
  source: AdminCategorySource;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  image?: string;
}

type AdminCategoryRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  status: AdminCategoryStatus;
  show_on_website: boolean;
  sort_order: number | null;
  image_url: string | null;
  source: AdminCategorySource | null;
  created_at: string | null;
  updated_at: string | null;
};

type AdminProductRow = {
  id: string;
  slug: string;
  category_id: string;
  category_slug: string | null;
  name_en: string;
  name_ar: string;
  subtitle_en: string | null;
  subtitle_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  notes_en: string | null;
  notes_ar: string | null;
  kind: string | null;
  status: AdminProductLifecycleStatus;
  visibility: AdminProductVisibility;
  show_on_website: boolean;
  featured: boolean | null;
  best_seller: boolean | null;
  /** Raw timestamptz from the DB. Null if never set. */
  new_until: string | null;
  pricing_model: string | null;
  sale_price_per_kg: number | string | null;
  purchase_cost_per_kg: number | string | null;
  blend: unknown;
  image_url: string | null;
  gallery: unknown;
  seo_title_en: string | null;
  seo_title_ar: string | null;
  seo_description_en: string | null;
  seo_description_ar: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AdminVariantRow = {
  id: string;
  product_id: string;
  size: string;
  sku: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  stock_state: "in_stock" | "low_stock" | "out_of_stock" | null;
  sort_order: number | null;
};

const packageSizes = ["250g", "500g", "1kg"] as const satisfies readonly PackageSize[];

const fallbackCategoryImages: Record<string, string> = {
  "turkish-blends": "/assets/categories/turkish.png",
  "espresso-blends": "/assets/categories/espresso.png",
  "easy-coffee": "/assets/products/espresso-pouch.png",
  "coffee-mix": "/assets/products/classic-pouch.png",
  cappuccino: "/assets/products/cappuccino-sachets.png",
  "hot-chocolate": "/assets/products/cappuccino-sachets.png",
  "flavor-coffee": "/assets/products/flavor-pouch.png",
};

const defaultProductImage = "/assets/products/classic-pouch.png";

export class AdminCatalogReadError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AdminCatalogReadError";
    this.cause = cause;
  }
}

function readError(table: string, error: { message?: string } | null) {
  const detail = error?.message ? ` ${error.message}` : "";
  return new AdminCatalogReadError(`Unable to read admin ${table}.${detail}`.trim(), error);
}

function asCatalogError(error: unknown) {
  if (error instanceof AdminCatalogReadError) return error;
  const message =
    error instanceof Error ? error.message : "Unable to read admin catalog data.";
  return new AdminCatalogReadError(message, error);
}

function toNumber(value: number | string | null | undefined, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toOptionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function localized(en?: string | null, ar?: string | null): LocalizedValue {
  return {
    en: en?.trim() ?? "",
    ar: ar?.trim() ?? en?.trim() ?? "",
  };
}

function hasLocalizedValue(value?: LocalizedValue) {
  return Boolean(value?.en || value?.ar);
}

function getFallbackImage(categorySlug?: string | null) {
  return (categorySlug && fallbackCategoryImages[categorySlug]) || defaultProductImage;
}

function isPackageSize(size: string): size is PackageSize {
  return packageSizes.includes(size as PackageSize);
}

function sizeRank(size: string) {
  const index = packageSizes.indexOf(size as PackageSize);
  return index === -1 ? packageSizes.length : index;
}

function normalizeGallery(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "url" in item) {
        const maybeUrl = (item as { url?: unknown }).url;
        return typeof maybeUrl === "string" ? maybeUrl : undefined;
      }
      return undefined;
    })
    .filter((url): url is string => Boolean(url));
}

function normalizeBlend(value: unknown): AdminProductBlendComponent[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const components = value
    .map((component): AdminProductBlendComponent | null => {
      if (!component || typeof component !== "object") return null;

      const raw = component as {
        origin?: { en?: unknown; ar?: unknown };
        origin_en?: unknown;
        origin_ar?: unknown;
        beanType?: unknown;
        bean_type?: unknown;
        percentage?: unknown;
        pct?: unknown;
      };

      const originEn =
        typeof raw.origin?.en === "string"
          ? raw.origin.en
          : typeof raw.origin_en === "string"
            ? raw.origin_en
            : "";
      const originAr =
        typeof raw.origin?.ar === "string"
          ? raw.origin.ar
          : typeof raw.origin_ar === "string"
            ? raw.origin_ar
            : originEn;
      const beanType = raw.beanType ?? raw.bean_type;
      const pct = toNumber(
        typeof raw.percentage === "number" || typeof raw.percentage === "string"
          ? raw.percentage
          : typeof raw.pct === "number" || typeof raw.pct === "string"
            ? raw.pct
            : 0,
      );

      if (!originEn && !originAr) return null;
      if (beanType !== "arabica" && beanType !== "robusta") return null;
      if (pct <= 0) return null;

      return {
        origin: localized(originEn, originAr),
        beanType,
        pct,
      };
    })
    .filter((component): component is AdminProductBlendComponent => component !== null);

  return components.length > 0 ? components : undefined;
}

function mapVariantRows(rows: AdminVariantRow[]): AdminProductSize[] {
  const bySize = new Map<PackageSize, AdminProductSize>();

  for (const row of [...rows].sort((a, b) => {
    const sortDelta = (a.sort_order ?? sizeRank(a.size)) - (b.sort_order ?? sizeRank(b.size));
    return sortDelta !== 0 ? sortDelta : sizeRank(a.size) - sizeRank(b.size);
  })) {
    if (!isPackageSize(row.size) || bySize.has(row.size)) continue;

    const compareAtPrice = toOptionalNumber(row.compare_at_price);
    bySize.set(row.size, {
      id: row.id,
      label: row.size,
      salePrice: toNumber(row.price),
      compareAtPrice,
      stockState: row.stock_state ?? undefined,
      sku: row.sku ?? undefined,
      sortOrder: row.sort_order ?? sizeRank(row.size),
    });
  }

  return packageSizes
    .map((size) => bySize.get(size))
    .filter((size): size is AdminProductSize => size !== undefined);
}

function groupVariantRows(rows: AdminVariantRow[]) {
  const grouped = new Map<string, AdminVariantRow[]>();
  for (const row of rows) {
    const variants = grouped.get(row.product_id) ?? [];
    variants.push(row);
    grouped.set(row.product_id, variants);
  }
  return grouped;
}

function getProductStockStatus(variants: AdminProductSize[]): ProductStatus {
  if (variants.length === 0) return "Out of Stock";

  const states = variants.map((variant) => variant.stockState).filter(Boolean);
  if (states.length === 0) return "In Stock";
  if (states.every((state) => state === "out_of_stock")) return "Out of Stock";
  if (states.some((state) => state === "low_stock" || state === "out_of_stock")) {
    return "Low Stock";
  }
  return "In Stock";
}

function mapCategoryRow(
  row: AdminCategoryRow,
  productCounts: Map<string, number>,
): AdminProductCategory {
  return {
    id: row.id,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    slug: row.slug,
    descriptionEn: row.description_en ?? "",
    descriptionAr: row.description_ar ?? "",
    status: row.status,
    visibility: row.show_on_website ? "public" : "internal",
    sortOrder: row.sort_order ?? 0,
    productCount: productCounts.get(row.id) ?? 0,
    featured: false,
    showOnWebsite: row.show_on_website,
    source: row.source ?? "catalog",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? "",
    image: row.image_url ?? getFallbackImage(row.slug),
  };
}

function mapProductRows(
  rows: AdminProductRow[],
  variantRows: AdminVariantRow[],
  categories: AdminProductCategory[],
) {
  const variantsByProductId = groupVariantRows(variantRows);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return rows.map((row): AdminProduct => {
    const category = categoryById.get(row.category_id);
    const categorySlug = row.category_slug ?? category?.slug ?? "";
    const variants = mapVariantRows(variantsByProductId.get(row.id) ?? []);
    const note = localized(
      row.notes_en ?? row.description_en ?? row.subtitle_en ?? "",
      row.notes_ar ?? row.description_ar ?? row.subtitle_ar ?? row.notes_en ?? "",
    );
    const subtitle = localized(row.subtitle_en, row.subtitle_ar);
    const description = localized(row.description_en, row.description_ar);
    const image = row.image_url ?? category?.image ?? getFallbackImage(categorySlug);
    const gallery = Array.from(new Set([image, ...normalizeGallery(row.gallery)]));
    const stockStatus = getProductStockStatus(variants);
    const sku = variants.find((variant) => variant.sku)?.sku ?? row.slug;
    const isActive = row.status === "active";
    const hidden = row.visibility === "hidden" || !row.show_on_website || !isActive;

    return {
      id: row.id,
      slug: row.slug,
      category: categorySlug,
      categoryId: row.category_id,
      name: localized(row.name_en, row.name_ar),
      subtitle: hasLocalizedValue(subtitle) ? subtitle : undefined,
      description: hasLocalizedValue(description) ? description : undefined,
      note,
      blend: normalizeBlend(row.blend),
      pricingModel: "packaged-by-weight",
      salePricePerKg: toNumber(row.sale_price_per_kg),
      purchaseCostPerKg: toNumber(row.purchase_cost_per_kg),
      sizes: variants,
      image,
      status: stockStatus,
      catalogStatus: row.status,
      visibility: row.visibility,
      showOnWebsite: row.show_on_website,
      isActive,
      hidden,
      featured: Boolean(row.featured),
      bestSeller: Boolean(row.best_seller),
      newUntil: row.new_until ?? null,
      isNew: row.new_until != null && new Date(row.new_until) > new Date(),
      stockQty: 0,
      lowStockThreshold: 0,
      sku,
      metaTitle: localized(row.seo_title_en, row.seo_title_ar),
      metaDescription: localized(row.seo_description_en, row.seo_description_ar),
      gallery,
      createdAt: row.created_at ?? undefined,
      updatedAt: row.updated_at ?? undefined,
    };
  });
}

async function fetchCategoryRows() {
  const { data, error } = await supabase
    .from("categories")
    .select(
      [
        "id",
        "slug",
        "name_en",
        "name_ar",
        "description_en",
        "description_ar",
        "status",
        "show_on_website",
        "sort_order",
        "image_url",
        "source",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .order("sort_order", { ascending: true })
    .order("name_en", { ascending: true });

  if (error) throw readError("categories", error);
  return (data ?? []) as unknown as AdminCategoryRow[];
}

async function fetchProductRows() {
  const { data, error } = await supabase
    .from("products")
    .select(
      [
        "id",
        "slug",
        "category_id",
        "category_slug",
        "name_en",
        "name_ar",
        "subtitle_en",
        "subtitle_ar",
        "description_en",
        "description_ar",
        "notes_en",
        "notes_ar",
        "kind",
        "status",
        "visibility",
        "show_on_website",
        "featured",
        "best_seller",
        "new_until",
        "pricing_model",
        "sale_price_per_kg",
        "purchase_cost_per_kg",
        "blend",
        "image_url",
        "gallery",
        "seo_title_en",
        "seo_title_ar",
        "seo_description_en",
        "seo_description_ar",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .order("category_slug", { ascending: true })
    .order("name_en", { ascending: true });

  if (error) throw readError("products", error);
  return (data ?? []) as unknown as AdminProductRow[];
}

async function fetchProductRowById(id: string) {
  const { data, error } = await supabase
    .from("products")
    .select(
      [
        "id",
        "slug",
        "category_id",
        "category_slug",
        "name_en",
        "name_ar",
        "subtitle_en",
        "subtitle_ar",
        "description_en",
        "description_ar",
        "notes_en",
        "notes_ar",
        "kind",
        "status",
        "visibility",
        "show_on_website",
        "featured",
        "best_seller",
        "new_until",
        "pricing_model",
        "sale_price_per_kg",
        "purchase_cost_per_kg",
        "blend",
        "image_url",
        "gallery",
        "seo_title_en",
        "seo_title_ar",
        "seo_description_en",
        "seo_description_ar",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw readError("products", error);
  return data as unknown as AdminProductRow | null;
}

async function fetchProductRowBySlug(slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select(
      [
        "id",
        "slug",
        "category_id",
        "category_slug",
        "name_en",
        "name_ar",
        "subtitle_en",
        "subtitle_ar",
        "description_en",
        "description_ar",
        "notes_en",
        "notes_ar",
        "kind",
        "status",
        "visibility",
        "show_on_website",
        "featured",
        "best_seller",
        "new_until",
        "pricing_model",
        "sale_price_per_kg",
        "purchase_cost_per_kg",
        "blend",
        "image_url",
        "gallery",
        "seo_title_en",
        "seo_title_ar",
        "seo_description_en",
        "seo_description_ar",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw readError("products", error);
  return data as unknown as AdminProductRow | null;
}

async function fetchVariantRows(productIds?: string[]) {
  if (productIds && productIds.length === 0) return [];

  let query = supabase
    .from("product_variants")
    .select("id, product_id, size, sku, price, compare_at_price, stock_state, sort_order")
    .order("sort_order", { ascending: true });

  if (productIds) {
    query = query.in("product_id", productIds);
  }

  const { data, error } = await query;
  if (error) throw readError("product_variants", error);
  return (data ?? []) as AdminVariantRow[];
}

async function fetchVariantRowsByProductId(productId: string) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, product_id, size, sku, price, compare_at_price, stock_state, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) throw readError("product_variants", error);
  return (data ?? []) as AdminVariantRow[];
}

export async function getAdminCategoryProductCounts() {
  try {
    const { data, error } = await supabase.from("products").select("category_id");
    if (error) throw readError("products", error);

    const counts = new Map<string, number>();
    for (const row of (data ?? []) as { category_id: string }[]) {
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    }
    return counts;
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getAdminCategories() {
  try {
    const [categoryRows, productCounts] = await Promise.all([
      fetchCategoryRows(),
      getAdminCategoryProductCounts(),
    ]);
    return categoryRows.map((row) => mapCategoryRow(row, productCounts));
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getAdminProductVariants(productId: string) {
  try {
    return mapVariantRows(await fetchVariantRowsByProductId(productId));
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getAdminProductsWithVariants() {
  try {
    const [categories, productRows] = await Promise.all([
      getAdminCategories(),
      fetchProductRows(),
    ]);
    const variants = await fetchVariantRows(productRows.map((product) => product.id));
    return mapProductRows(productRows, variants, categories);
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getAdminProducts() {
  return getAdminProductsWithVariants();
}

export async function getAdminProductById(id: string) {
  try {
    const [categories, productRow] = await Promise.all([
      getAdminCategories(),
      fetchProductRowById(id),
    ]);

    if (!productRow) return null;

    const variants = await fetchVariantRowsByProductId(productRow.id);
    return mapProductRows([productRow], variants, categories)[0] ?? null;
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getAdminProductBySlug(slug: string) {
  try {
    const [categories, productRow] = await Promise.all([
      getAdminCategories(),
      fetchProductRowBySlug(slug),
    ]);

    if (!productRow) return null;

    const variants = await fetchVariantRowsByProductId(productRow.id);
    return mapProductRows([productRow], variants, categories)[0] ?? null;
  } catch (error) {
    throw asCatalogError(error);
  }
}

// ─── WRITE LAYER — basic admin product updates ───────────────────────────────
// Scope: update existing products + existing variants only. No create/delete,
// no media/storage, no inventory/stock writes (see ProductDrawer for the disabled
// Media/Inventory tabs). RLS (products_admin_all / product_variants_admin_all,
// both `for all ... is_admin()`) already gates these writes to admins; the matching
// table-level UPDATE grant is added in the admin_catalog_write_grants migration.
// updated_at is set automatically by the trg_*_updated_at triggers — never set here.

export class AdminCatalogWriteError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AdminCatalogWriteError";
    this.cause = cause;
  }
}

function writeError(table: string, error: { message?: string } | null) {
  const detail = error?.message ? ` ${error.message}` : "";
  return new AdminCatalogWriteError(`Unable to update admin ${table}.${detail}`.trim(), error);
}

export interface AdminProductUpdateInput {
  name?: LocalizedValue;
  /** Maps to notes_en/notes_ar — the description shown/edited in the admin drawer + public catalog. */
  note?: LocalizedValue;
  slug?: string;
  salePricePerKg?: number;
  showOnWebsite?: boolean;
  visibility?: AdminProductVisibility;
  featured?: boolean;
  bestSeller?: boolean;
  /**
   * Controls the New badge lifetime:
   *   - string (ISO 8601) → set new_until to that timestamp (badge active until then)
   *   - null              → clear new_until (badge off)
   *   - undefined         → do not touch new_until
   *
   * ProductDrawer computes: isNew=true → now + 40 days, isNew=false → null.
   * Product Create (not yet implemented) should default to now() + 40 days.
   */
  newUntil?: string | null;
  metaTitle?: LocalizedValue;
  metaDescription?: LocalizedValue;
}

export interface AdminVariantPriceInput {
  size: PackageSize;
  price: number;
}

/** Update the basic, in-scope columns of a single product row. */
export async function updateAdminProduct(productId: string, input: AdminProductUpdateInput) {
  if (!productId) throw new AdminCatalogWriteError("Missing product id for update.");

  const patch: Record<string, unknown> = {};

  if (input.name) {
    patch.name_en = input.name.en.trim();
    patch.name_ar = input.name.ar.trim();
  }
  if (input.note) {
    patch.notes_en = input.note.en.trim();
    patch.notes_ar = input.note.ar.trim();
  }
  if (input.slug !== undefined) patch.slug = input.slug.trim().toLowerCase();
  if (input.salePricePerKg !== undefined) {
    if (!Number.isFinite(input.salePricePerKg) || input.salePricePerKg < 0) {
      throw new AdminCatalogWriteError("Per-kg sale price must be a non-negative number.");
    }
    patch.sale_price_per_kg = input.salePricePerKg;
  }
  if (input.showOnWebsite !== undefined) patch.show_on_website = input.showOnWebsite;
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.featured !== undefined) patch.featured = input.featured;
  if (input.bestSeller !== undefined) patch.best_seller = input.bestSeller;
  if (input.newUntil !== undefined) patch.new_until = input.newUntil; // null clears; ISO string sets
  if (input.metaTitle) {
    patch.seo_title_en = input.metaTitle.en.trim();
    patch.seo_title_ar = input.metaTitle.ar.trim();
  }
  if (input.metaDescription) {
    patch.seo_description_en = input.metaDescription.en.trim();
    patch.seo_description_ar = input.metaDescription.ar.trim();
  }

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("products").update(patch).eq("id", productId);
  if (error) throw writeError("products", error);
}

/** Update the price of existing variants (250g / 500g / 1kg) for a product. */
export async function updateAdminProductVariantPrices(
  productId: string,
  prices: AdminVariantPriceInput[],
) {
  if (!productId) throw new AdminCatalogWriteError("Missing product id for variant update.");

  for (const { size, price } of prices) {
    if (!isPackageSize(size)) continue;
    if (!Number.isFinite(price) || price < 0) {
      throw new AdminCatalogWriteError(`Price for ${size} must be a non-negative number.`);
    }
    const { error } = await supabase
      .from("product_variants")
      .update({ price })
      .eq("product_id", productId)
      .eq("size", size);
    if (error) throw writeError("product_variants", error);
  }
}
