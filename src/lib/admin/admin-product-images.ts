"use client";

// ─── ADMIN PRODUCT IMAGES — Supabase Storage + products.image_url / gallery ───
//
// Phase 19A. Reuses the EXISTING image model on public.products:
//   image_url  text   -> primary image URL
//   gallery    jsonb  -> ordered array of additional image URLs
// There is no separate product_images table (per "reuse existing fields").
//
// Files live in the public `product-images` Storage bucket under a product-scoped
// key `<productId>/<file>`. Reads use the public URL; writes/deletes are gated by
// the storage RLS policies (public.is_admin()) added in migration 20260704180000,
// and the products update is gated by products_admin_all. No service-role code.

import { supabase } from "@/lib/supabase/client";

export const PRODUCT_IMAGE_BUCKET = "product-images";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB (matches the bucket file_size_limit)
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export class ProductImageError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ProductImageError";
    this.cause = cause;
  }
}

export interface ProductImage {
  /** Public URL used by both admin preview and the public site. */
  url: string;
  /** Storage object path (`<productId>/<file>`), or null when the URL is a static/legacy asset. */
  path: string | null;
  /** True when this URL is the product's primary image (products.image_url). */
  isPrimary: boolean;
  /** True when this is a real Storage object we can set-primary / delete. Static fallbacks are false. */
  isManaged: boolean;
}

interface ProductImageRow {
  imageUrl: string | null;
  gallery: string[];
}

// ── URL / path helpers ──────────────────────────────────────────────────────

function publicUrlForPath(path: string): string {
  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Extract the storage object path from a public URL, or null if it isn't one of ours. */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const raw = url.slice(index + marker.length).split("?")[0] ?? "";
  try {
    return decodeURIComponent(raw) || null;
  } catch {
    return raw || null;
  }
}

function uniqueUrls(urls: (string | null | undefined)[]): string[] {
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url && url.trim()))));
}

function normalizeGalleryValue(value: unknown): string[] {
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

/**
 * Build the ordered ProductImage list from a primary URL + gallery URLs. Pure —
 * used both for the fresh DB read and for the drawer's initial render from the
 * already-loaded AdminProduct (no extra round trip).
 */
export function toProductImages(
  primaryUrl: string | null,
  galleryUrls: string[],
): ProductImage[] {
  const ordered = uniqueUrls([primaryUrl, ...galleryUrls]);
  return ordered.map((url) => {
    const path = storagePathFromUrl(url);
    return {
      url,
      path,
      isPrimary: url === primaryUrl,
      isManaged: path !== null,
    };
  });
}

// ── DB read/write of the two product columns ────────────────────────────────

async function readImageRow(productId: string): Promise<ProductImageRow> {
  const { data, error } = await supabase
    .from("products")
    .select("image_url, gallery")
    .eq("id", productId)
    .maybeSingle();

  if (error) throw new ProductImageError(`Unable to read product images. ${error.message}`, error);
  if (!data) throw new ProductImageError("Product not found.");

  const row = data as { image_url: string | null; gallery: unknown };
  return { imageUrl: row.image_url, gallery: normalizeGalleryValue(row.gallery) };
}

/**
 * Persist the primary image + gallery in one products UPDATE.
 * gallery stores the full ordered list of managed image URLs; image_url points at
 * the chosen primary. RLS (products_admin_all / is_admin()) authorizes the write.
 */
async function writeImages(
  productId: string,
  primaryUrl: string | null,
  galleryUrls: string[],
): Promise<void> {
  const gallery = uniqueUrls(galleryUrls);
  const { error } = await supabase
    .from("products")
    .update({ image_url: primaryUrl, gallery })
    .eq("id", productId);

  if (error) {
    throw new ProductImageError(`Unable to save product images. ${error.message}`, error);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Read the current managed image set for a product from Supabase. */
export async function getProductImages(productId: string): Promise<ProductImage[]> {
  if (!productId) throw new ProductImageError("Missing product id.");
  const { imageUrl, gallery } = await readImageRow(productId);
  return toProductImages(imageUrl, gallery);
}

function validateFile(file: File): string {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new ProductImageError("Only JPG, PNG, WEBP, AVIF, or GIF images are allowed.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ProductImageError("Image is too large. Maximum size is 5 MB.");
  }
  return EXT_BY_MIME[file.type] ?? "jpg";
}

/**
 * Upload an image to the product-scoped storage folder, then record its public
 * URL on the product. If the product has no managed primary yet (null or a static
 * fallback), the new upload becomes the primary. Returns the refreshed image set.
 */
export async function uploadProductImage(
  productId: string,
  file: File,
): Promise<ProductImage[]> {
  if (!productId) throw new ProductImageError("Missing product id.");
  const ext = validateFile(file);

  // Product-scoped, collision-resistant key. Math.random is fine here (non-crypto,
  // client-only naming) and avoids Date.now purity concerns in React render paths.
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${productId}/${unique}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

  if (uploadError) {
    throw new ProductImageError(`Upload failed. ${uploadError.message}`, uploadError);
  }

  const url = publicUrlForPath(path);
  const { imageUrl, gallery } = await readImageRow(productId);

  const currentPrimaryManaged = imageUrl != null && storagePathFromUrl(imageUrl) !== null;
  const nextPrimary = currentPrimaryManaged ? imageUrl : url;
  const nextGallery = uniqueUrls([...gallery, url]);

  try {
    await writeImages(productId, nextPrimary, nextGallery);
  } catch (error) {
    // Roll back the orphaned storage object if the DB write failed.
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]).catch(() => {});
    throw error;
  }

  return toProductImages(nextPrimary, nextGallery);
}

/** Set an existing managed image as the product's primary image. */
export async function setPrimaryProductImage(
  productId: string,
  url: string,
): Promise<ProductImage[]> {
  if (!productId) throw new ProductImageError("Missing product id.");
  const { gallery } = await readImageRow(productId);
  const nextGallery = gallery.includes(url) ? gallery : uniqueUrls([url, ...gallery]);
  if (!nextGallery.includes(url)) {
    throw new ProductImageError("That image is not part of this product.");
  }
  await writeImages(productId, url, nextGallery);
  return toProductImages(url, nextGallery);
}

/**
 * Remove an image: drop it from the product row first (so it disappears from the
 * site immediately even if the storage delete fails), then best-effort delete the
 * storage object. If the deleted image was primary, the next gallery image is
 * promoted; if none remain, image_url falls back to null (the UI shows the
 * category/default placeholder).
 */
export async function deleteProductImage(
  productId: string,
  url: string,
): Promise<ProductImage[]> {
  if (!productId) throw new ProductImageError("Missing product id.");
  const { imageUrl, gallery } = await readImageRow(productId);

  const nextGallery = gallery.filter((entry) => entry !== url);
  const nextPrimary = imageUrl === url ? (nextGallery[0] ?? null) : imageUrl;

  await writeImages(productId, nextPrimary, nextGallery);

  const path = storagePathFromUrl(url);
  if (path) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]).catch(() => {});
  }

  return toProductImages(nextPrimary, nextGallery);
}

/**
 * Return the product to the site's default/fallback image by clearing the
 * primary (products.image_url = null) while KEEPING every uploaded image in the
 * gallery, so an admin can re-select one later with Set Primary. No Storage
 * object is deleted. With image_url null, the public catalog falls back to the
 * category image (or the global default), i.e. the same placeholder shown before
 * any upload. Returns the refreshed image set (managed uploads, none primary).
 */
export async function restoreDefaultProductImage(
  productId: string,
): Promise<ProductImage[]> {
  if (!productId) throw new ProductImageError("Missing product id.");
  const { gallery } = await readImageRow(productId);
  await writeImages(productId, null, gallery);
  return toProductImages(null, gallery);
}

/** Persist a new gallery display order (primary unchanged). */
export async function reorderProductImages(
  productId: string,
  orderedUrls: string[],
): Promise<ProductImage[]> {
  if (!productId) throw new ProductImageError("Missing product id.");
  const { imageUrl } = await readImageRow(productId);
  const nextGallery = uniqueUrls(orderedUrls);
  await writeImages(productId, imageUrl, nextGallery);
  return toProductImages(imageUrl, nextGallery);
}
