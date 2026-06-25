"use client";

import type { LocalizedValue } from "@/lib/context/language";
import { supabase } from "@/lib/supabase/client";
import type { PackageSize } from "@/lib/types/common";

const publicCatalogPackageSizes = ["250g", "500g", "1kg"] as const satisfies readonly PackageSize[];

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

export type PublicCatalogSize = {
  label: PackageSize;
  salePrice: number;
  compareAtPrice?: number;
  stockState?: "in_stock" | "low_stock" | "out_of_stock";
};

export type PublicCatalogBlendComponent = {
  origin: LocalizedValue;
  beanType: "arabica" | "robusta";
  pct: number;
};

export type PublicCatalogCategory = {
  id: string;
  slug: string;
  name: LocalizedValue;
  description?: LocalizedValue;
  image: string;
  sortOrder: number;
};

export type PublicCatalogProduct = {
  id: string;
  slug: string;
  category: string;
  categoryId: string;
  name: LocalizedValue;
  subtitle?: LocalizedValue;
  description?: LocalizedValue;
  note: LocalizedValue;
  blend?: PublicCatalogBlendComponent[];
  pricingModel: "packaged-by-weight";
  salePricePerKg: number;
  sizes: PublicCatalogSize[];
  image: string;
  gallery: string[];
  featured: boolean;
  bestSeller: boolean;
};

type PublicCategoryRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  sort_order: number | null;
};

type PublicProductRow = {
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
  pricing_model: string | null;
  sale_price_per_kg: number | string | null;
  featured: boolean | null;
  best_seller: boolean | null;
  blend: unknown;
  image_url: string | null;
  gallery: unknown;
};

type PublicVariantRow = {
  id: string;
  product_id: string;
  size: string;
  price: number | string;
  compare_at_price: number | string | null;
  stock_state: "in_stock" | "low_stock" | "out_of_stock" | null;
  sort_order: number | null;
};

export class PublicCatalogReadError extends Error {
  readonly cause?: unknown;

  constructor(message = "Public catalog is temporarily unavailable.", cause?: unknown) {
    super(message);
    this.name = "PublicCatalogReadError";
    this.cause = cause;
  }
}

function asCatalogError(error: unknown) {
  if (error instanceof PublicCatalogReadError) return error;
  return new PublicCatalogReadError(undefined, error);
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
  return publicCatalogPackageSizes.includes(size as PackageSize);
}

function sizeRank(size: string) {
  const index = publicCatalogPackageSizes.indexOf(size as PackageSize);
  return index === -1 ? publicCatalogPackageSizes.length : index;
}

function mapCategoryRow(row: PublicCategoryRow): PublicCatalogCategory {
  const description = localized(row.description_en, row.description_ar);
  return {
    id: row.id,
    slug: row.slug,
    name: localized(row.name_en, row.name_ar),
    description: hasLocalizedValue(description) ? description : undefined,
    image: row.image_url ?? getFallbackImage(row.slug),
    sortOrder: row.sort_order ?? 0,
  };
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

function normalizeBlend(value: unknown): PublicCatalogBlendComponent[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const components = value
    .map((component): PublicCatalogBlendComponent | null => {
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
    .filter((component): component is PublicCatalogBlendComponent => component !== null);

  return components.length > 0 ? components : undefined;
}

function mapVariantRows(rows: PublicVariantRow[]): PublicCatalogSize[] {
  const bySize = new Map<PackageSize, PublicCatalogSize>();

  for (const row of [...rows].sort((a, b) => {
    const sortDelta = (a.sort_order ?? sizeRank(a.size)) - (b.sort_order ?? sizeRank(b.size));
    return sortDelta !== 0 ? sortDelta : sizeRank(a.size) - sizeRank(b.size);
  })) {
    if (!isPackageSize(row.size) || bySize.has(row.size)) continue;

    const compareAtPrice = toOptionalNumber(row.compare_at_price);
    bySize.set(row.size, {
      label: row.size,
      salePrice: toNumber(row.price),
      compareAtPrice,
      stockState: row.stock_state ?? undefined,
    });
  }

  return publicCatalogPackageSizes
    .map((size) => bySize.get(size))
    .filter((size): size is PublicCatalogSize => size !== undefined);
}

function groupVariantRows(rows: PublicVariantRow[]) {
  const grouped = new Map<string, PublicVariantRow[]>();
  for (const row of rows) {
    const variants = grouped.get(row.product_id) ?? [];
    variants.push(row);
    grouped.set(row.product_id, variants);
  }
  return grouped;
}

function mapProductRows(
  rows: PublicProductRow[],
  variantRows: PublicVariantRow[],
  categories: PublicCatalogCategory[],
) {
  const variantsByProductId = groupVariantRows(variantRows);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return rows.map((row): PublicCatalogProduct => {
    const category = categoryById.get(row.category_id);
    const categorySlug = row.category_slug ?? category?.slug ?? "";
    const subtitle = localized(row.subtitle_en, row.subtitle_ar);
    const description = localized(row.description_en, row.description_ar);
    const note = localized(
      row.notes_en ?? row.description_en ?? row.subtitle_en ?? "",
      row.notes_ar ?? row.description_ar ?? row.subtitle_ar ?? row.notes_en ?? "",
    );
    const image = row.image_url ?? category?.image ?? getFallbackImage(categorySlug);
    const gallery = Array.from(new Set([image, ...normalizeGallery(row.gallery)]));

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
      sizes: mapVariantRows(variantsByProductId.get(row.id) ?? []),
      image,
      gallery,
      featured: Boolean(row.featured),
      bestSeller: Boolean(row.best_seller),
    };
  });
}

async function fetchCategoryRows() {
  const { data, error } = await supabase
    .from("public_categories")
    .select("id, slug, name_en, name_ar, description_en, description_ar, image_url, sort_order")
    .order("sort_order", { ascending: true })
    .order("name_en", { ascending: true });

  if (error) throw new PublicCatalogReadError(undefined, error);
  return (data ?? []) as PublicCategoryRow[];
}

async function fetchProductRows() {
  const { data, error } = await supabase
    .from("public_products")
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
        "pricing_model",
        "sale_price_per_kg",
        "featured",
        "best_seller",
        "blend",
        "image_url",
        "gallery",
      ].join(", "),
    )
    .order("category_slug", { ascending: true })
    .order("name_en", { ascending: true });

  if (error) throw new PublicCatalogReadError(undefined, error);
  return (data ?? []) as unknown as PublicProductRow[];
}

async function fetchProductRowsByCategorySlug(slug: string) {
  const { data, error } = await supabase
    .from("public_products")
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
        "pricing_model",
        "sale_price_per_kg",
        "featured",
        "best_seller",
        "blend",
        "image_url",
        "gallery",
      ].join(", "),
    )
    .eq("category_slug", slug)
    .order("name_en", { ascending: true });

  if (error) throw new PublicCatalogReadError(undefined, error);
  return (data ?? []) as unknown as PublicProductRow[];
}

async function fetchProductRowsBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];

  const { data, error } = await supabase
    .from("public_products")
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
        "pricing_model",
        "sale_price_per_kg",
        "featured",
        "best_seller",
        "blend",
        "image_url",
        "gallery",
      ].join(", "),
    )
    .in("slug", slugs);

  if (error) throw new PublicCatalogReadError(undefined, error);
  return (data ?? []) as unknown as PublicProductRow[];
}

async function fetchProductRowBySlug(slug: string) {
  const { data, error } = await supabase
    .from("public_products")
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
        "pricing_model",
        "sale_price_per_kg",
        "featured",
        "best_seller",
        "blend",
        "image_url",
        "gallery",
      ].join(", "),
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new PublicCatalogReadError(undefined, error);
  return data as unknown as PublicProductRow | null;
}

async function fetchVariantRows(productIds?: string[]) {
  if (productIds && productIds.length === 0) return [];

  let query = supabase
    .from("public_product_variants")
    .select("id, product_id, size, price, compare_at_price, stock_state, sort_order")
    .order("sort_order", { ascending: true });

  if (productIds) {
    query = query.in("product_id", productIds);
  }

  const { data, error } = await query;
  if (error) throw new PublicCatalogReadError(undefined, error);
  return (data ?? []) as PublicVariantRow[];
}

async function fetchVariantRowsByProductId(productId: string) {
  const { data, error } = await supabase
    .from("public_product_variants")
    .select("id, product_id, size, price, compare_at_price, stock_state, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) throw new PublicCatalogReadError(undefined, error);
  return (data ?? []) as PublicVariantRow[];
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getPublicCategories() {
  try {
    return (await fetchCategoryRows()).map(mapCategoryRow);
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getPublicProducts() {
  try {
    const [categoryRows, productRows] = await Promise.all([
      fetchCategoryRows(),
      fetchProductRows(),
    ]);
    const categories = categoryRows.map(mapCategoryRow);
    const variants = await fetchVariantRows(productRows.map((product) => product.id));
    return mapProductRows(productRows, variants, categories);
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getPublicProductsByCategorySlug(slug: string) {
  try {
    const [categoryRows, productRows] = await Promise.all([
      fetchCategoryRows(),
      fetchProductRowsByCategorySlug(slug),
    ]);
    const categories = categoryRows.map(mapCategoryRow);
    const variants = await fetchVariantRows(productRows.map((product) => product.id));
    return mapProductRows(productRows, variants, categories);
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getPublicProductsBySlugs(slugs: string[]) {
  try {
    const uniqueSlugs = uniqueValues(slugs);
    const [categoryRows, productRows] = await Promise.all([
      fetchCategoryRows(),
      fetchProductRowsBySlugs(uniqueSlugs),
    ]);
    const categories = categoryRows.map(mapCategoryRow);
    const variants = await fetchVariantRows(productRows.map((product) => product.id));
    const products = mapProductRows(productRows, variants, categories);
    const bySlug = new Map(products.map((product) => [product.slug, product]));

    return uniqueSlugs
      .map((slug) => bySlug.get(slug))
      .filter((product): product is PublicCatalogProduct => product !== undefined);
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getPublicProductBySlug(slug: string) {
  try {
    const [categoryRows, productRow] = await Promise.all([
      fetchCategoryRows(),
      fetchProductRowBySlug(slug),
    ]);

    if (!productRow) return null;

    const categories = categoryRows.map(mapCategoryRow);
    const variants = await fetchVariantRowsByProductId(productRow.id);
    return mapProductRows([productRow], variants, categories)[0] ?? null;
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getPublicProductVariants(productIdOrSlug: string) {
  try {
    if (looksLikeUuid(productIdOrSlug)) {
      return mapVariantRows(await fetchVariantRowsByProductId(productIdOrSlug));
    }

    const product = await fetchProductRowBySlug(productIdOrSlug);
    if (!product) return [];

    return mapVariantRows(await fetchVariantRowsByProductId(product.id));
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getPublicCatalogProductBySlug(slug: string) {
  return getPublicProductBySlug(slug);
}
