"use client";

import { supabase } from "@/lib/supabase/client";

export interface LocalizedText {
  en: string;
  ar: string;
}

export type ArticleStatus = "Draft" | "Published" | "Archived";
export type ReviewStatus = "Pending" | "Approved" | "Rejected";
export type ReviewSource = "Manual" | "WhatsApp" | "Facebook" | "Instagram" | "Website";
export type ReviewDisplayTarget = "Product Page" | "Homepage Testimonials" | "Both";
export type LegalPageStatus = "Draft" | "Published";
export type ContactStatus = "New" | "In Progress" | "Replied" | "Archived";
export type ContactSource = "Contact Form" | "Homepage" | "WhatsApp" | "Manual";

export interface CmsArticle {
  id: string;
  slug: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  content: LocalizedText;
  category: LocalizedText;
  author: string;
  status: ArticleStatus;
  featured: boolean;
  views: number;
  publishDate?: string;
  updatedDate: string;
  readTime: LocalizedText;
  tags: LocalizedText[];
  heroImage: string;
  cardImage: string;
  featuredImage: string;
  seoTitle: LocalizedText;
  seoDescription: LocalizedText;
}

export interface CmsReview {
  id: string;
  customer: {
    name: string;
  };
  product: string;
  productSlug?: string;
  rating: number;
  reviewText: LocalizedText;
  source: ReviewSource;
  status: ReviewStatus;
  featured: boolean;
  hidden: boolean;
  showOn: ReviewDisplayTarget;
  date: string;
  publishedAt?: string;
}

export interface CmsLegalPage {
  id: string;
  type: "privacy" | "terms" | "shipping" | "returns";
  page: "Privacy Policy" | "Terms & Conditions" | "Shipping Policy" | "Returns Policy";
  title: LocalizedText;
  content: LocalizedText;
  lastUpdated: string;
  version: string;
  status: LegalPageStatus;
  publishedAt?: string;
}

export interface CmsContactMessage {
  id: string;
  name: string;
  phone: string;
  whatsApp: string;
  email: string;
  source: ContactSource;
  subject: string;
  message: string;
  date: string;
  status: ContactStatus;
  assignedAdmin: string;
  internalNotes: string;
}

export type AdminCmsData = {
  articles: CmsArticle[];
  reviews: CmsReview[];
  legalPages: CmsLegalPage[];
  messages: CmsContactMessage[];
};

export const CMS_IMAGE_OPTIONS = [
  "/assets/story/roastery.png",
  "/assets/categories/espresso.png",
  "/assets/categories/turkish.png",
  "/assets/products/classic-pouch.png",
  "/assets/story/dark-roast.png",
  "/assets/story/portrait-roastery.png",
];

export class AdminCmsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminCmsError";
  }
}

type BlogRow = {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  content_en: string;
  content_ar: string;
  category_en: string;
  category_ar: string;
  author: string;
  status: string;
  featured: boolean;
  views: number;
  published_at: string | null;
  read_time_en: string;
  read_time_ar: string;
  tags: unknown;
  hero_image: string | null;
  card_image: string | null;
  featured_image: string | null;
  seo_title_en: string;
  seo_title_ar: string;
  seo_description_en: string;
  seo_description_ar: string;
  updated_at: string;
};

type ReviewRow = {
  id: string;
  customer_name: string;
  product_name: string;
  product_slug: string | null;
  rating: number;
  comment_en: string;
  comment_ar: string;
  source: string;
  status: string;
  featured: boolean;
  hidden: boolean;
  show_on: string;
  published_at: string | null;
  created_at: string;
};

type LegalPageRow = {
  id: string;
  page_type: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  status: string;
  version: string;
  published_at: string | null;
  updated_at: string;
};

type ContactMessageRow = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  source: string;
  subject: string | null;
  message: string;
  status: string;
  assigned_admin_id: string | null;
  admin_note: string | null;
  created_at: string;
};

const BLOG_COLUMNS = `
  id, slug, title_en, title_ar, excerpt_en, excerpt_ar, content_en, content_ar,
  category_en, category_ar, author, status, featured, views, published_at,
  read_time_en, read_time_ar, tags, hero_image, card_image, featured_image,
  seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, updated_at
`;

const REVIEW_COLUMNS = `
  id, customer_name, product_name, product_slug, rating, comment_en, comment_ar,
  source, status, featured, hidden, show_on, published_at, created_at
`;

const LEGAL_COLUMNS = `
  id, page_type, title_en, title_ar, content_en, content_ar, status, version,
  published_at, updated_at
`;

const CONTACT_COLUMNS = `
  id, name, phone, whatsapp, email, source, subject, message, status,
  assigned_admin_id, admin_note, created_at
`;

function dateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function safeLocalizedTags(value: unknown): LocalizedText[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const en = typeof row.en === "string" ? row.en : "";
    const ar = typeof row.ar === "string" ? row.ar : en;
    return en ? [{ en, ar }] : [];
  });
}

function articleStatus(value: string): ArticleStatus {
  if (value === "published") return "Published";
  if (value === "archived") return "Archived";
  return "Draft";
}

function reviewStatus(value: string): ReviewStatus {
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return "Pending";
}

function reviewSource(value: string): ReviewSource {
  if (value === "whatsapp") return "WhatsApp";
  if (value === "facebook") return "Facebook";
  if (value === "instagram") return "Instagram";
  if (value === "website") return "Website";
  return "Manual";
}

function reviewTarget(value: string): ReviewDisplayTarget {
  if (value === "homepage") return "Homepage Testimonials";
  if (value === "both") return "Both";
  return "Product Page";
}

function legalPageName(value: string): CmsLegalPage["page"] {
  if (value === "terms") return "Terms & Conditions";
  if (value === "shipping") return "Shipping Policy";
  if (value === "returns") return "Returns Policy";
  return "Privacy Policy";
}

function legalPageType(value: string): CmsLegalPage["type"] {
  if (value === "terms" || value === "shipping" || value === "returns") return value;
  return "privacy";
}

function contactStatus(value: string): ContactStatus {
  if (value === "in_progress") return "In Progress";
  if (value === "replied") return "Replied";
  if (value === "archived") return "Archived";
  return "New";
}

function contactSource(value: string): ContactSource {
  if (value === "homepage") return "Homepage";
  if (value === "whatsapp") return "WhatsApp";
  if (value === "manual") return "Manual";
  return "Contact Form";
}

function mapArticle(row: BlogRow): CmsArticle {
  const fallbackImage = CMS_IMAGE_OPTIONS[0];
  return {
    id: row.id,
    slug: row.slug,
    title: { en: row.title_en, ar: row.title_ar },
    excerpt: { en: row.excerpt_en, ar: row.excerpt_ar },
    content: { en: row.content_en, ar: row.content_ar },
    category: { en: row.category_en, ar: row.category_ar },
    author: row.author,
    status: articleStatus(row.status),
    featured: row.featured,
    views: Number(row.views) || 0,
    publishDate: row.published_at ? dateOnly(row.published_at) : undefined,
    updatedDate: dateOnly(row.updated_at),
    readTime: { en: row.read_time_en, ar: row.read_time_ar },
    tags: safeLocalizedTags(row.tags),
    heroImage: row.hero_image ?? fallbackImage,
    cardImage: row.card_image ?? row.hero_image ?? fallbackImage,
    featuredImage: row.featured_image ?? row.hero_image ?? fallbackImage,
    seoTitle: { en: row.seo_title_en, ar: row.seo_title_ar },
    seoDescription: { en: row.seo_description_en, ar: row.seo_description_ar },
  };
}

function mapReview(row: ReviewRow): CmsReview {
  return {
    id: row.id,
    customer: { name: row.customer_name },
    product: row.product_name,
    productSlug: row.product_slug ?? undefined,
    rating: Number(row.rating) || 1,
    reviewText: { en: row.comment_en, ar: row.comment_ar },
    source: reviewSource(row.source),
    status: reviewStatus(row.status),
    featured: row.featured,
    hidden: row.hidden,
    showOn: reviewTarget(row.show_on),
    date: dateOnly(row.created_at),
    publishedAt: row.published_at ?? undefined,
  };
}

function mapLegalPage(row: LegalPageRow): CmsLegalPage {
  return {
    id: row.id,
    type: legalPageType(row.page_type),
    page: legalPageName(row.page_type),
    title: { en: row.title_en, ar: row.title_ar },
    content: { en: row.content_en, ar: row.content_ar },
    lastUpdated: dateOnly(row.updated_at),
    version: row.version,
    status: row.status === "published" ? "Published" : "Draft",
    publishedAt: row.published_at ?? undefined,
  };
}

function mapContactMessage(row: ContactMessageRow): CmsContactMessage {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    whatsApp: row.whatsapp ?? row.phone ?? "",
    email: row.email ?? "",
    source: contactSource(row.source),
    subject: row.subject ?? "Customer message",
    message: row.message,
    date: dateOnly(row.created_at),
    status: contactStatus(row.status),
    assignedAdmin: row.assigned_admin_id ? "Assigned" : "Unassigned",
    internalNotes: row.admin_note ?? "",
  };
}

function writeError(message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[admin-cms] ${message}`);
  }
  if (message.includes("Admin access required") || message.includes("permission denied")) {
    return new AdminCmsError("Admin permission is required.");
  }
  if (message.includes("blog_posts_slug_key") || message.includes("duplicate key")) {
    return new AdminCmsError("That blog slug is already in use.");
  }
  return new AdminCmsError("Could not save this CMS change. Please try again.");
}

function unwrapRpcRow<T>(value: unknown): T {
  if (Array.isArray(value)) {
    if (!value[0]) throw new AdminCmsError("The database did not return the saved row.");
    return value[0] as T;
  }
  if (!value || typeof value !== "object") {
    throw new AdminCmsError("The database did not return the saved row.");
  }
  return value as T;
}

export async function getAdminCmsData(): Promise<AdminCmsData> {
  const [articlesResult, reviewsResult, legalResult, messagesResult] = await Promise.all([
    supabase.from("blog_posts").select(BLOG_COLUMNS).order("updated_at", { ascending: false }).limit(500),
    supabase.from("reviews").select(REVIEW_COLUMNS).order("created_at", { ascending: false }).limit(1000),
    supabase.from("legal_pages").select(LEGAL_COLUMNS).order("page_type", { ascending: true }),
    supabase.from("contact_messages").select(CONTACT_COLUMNS).order("created_at", { ascending: false }).limit(1000),
  ]);

  const error =
    articlesResult.error ?? reviewsResult.error ?? legalResult.error ?? messagesResult.error;
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[admin-cms:load] ${error.message}`);
    }
    throw new AdminCmsError("Could not load CMS data. Please try again.");
  }

  return {
    articles: ((articlesResult.data ?? []) as BlogRow[]).map(mapArticle),
    reviews: ((reviewsResult.data ?? []) as ReviewRow[]).map(mapReview),
    legalPages: ((legalResult.data ?? []) as LegalPageRow[]).map(mapLegalPage),
    messages: ((messagesResult.data ?? []) as ContactMessageRow[]).map(mapContactMessage),
  };
}

export async function saveAdminArticle(article: CmsArticle): Promise<CmsArticle> {
  const { data, error } = await supabase.rpc("save_admin_blog_post", {
    p_post: {
      id: article.id,
      slug: article.slug,
      title_en: article.title.en,
      title_ar: article.title.ar,
      excerpt_en: article.excerpt.en,
      excerpt_ar: article.excerpt.ar,
      content_en: article.content.en,
      content_ar: article.content.ar,
      category_en: article.category.en,
      category_ar: article.category.ar,
      author: article.author,
      status: article.status.toLowerCase(),
      featured: article.featured,
      views: article.views,
      published_at: article.publishDate || null,
      read_time_en: article.readTime.en,
      read_time_ar: article.readTime.ar,
      tags: article.tags,
      hero_image: article.heroImage,
      card_image: article.cardImage,
      featured_image: article.featuredImage,
      seo_title_en: article.seoTitle.en,
      seo_title_ar: article.seoTitle.ar,
      seo_description_en: article.seoDescription.en,
      seo_description_ar: article.seoDescription.ar,
    },
  });

  if (error) throw writeError(error.message);
  return mapArticle(unwrapRpcRow<BlogRow>(data));
}

export async function saveAdminReview(review: CmsReview): Promise<CmsReview> {
  const source = review.source.toLowerCase();
  const showOn =
    review.showOn === "Homepage Testimonials"
      ? "homepage"
      : review.showOn === "Both"
        ? "both"
        : "product";

  const { data, error } = await supabase.rpc("save_admin_review", {
    p_review: {
      id: review.id,
      customer_name: review.customer.name,
      product_name: review.product,
      product_slug: review.productSlug ?? null,
      rating: review.rating,
      comment_en: review.reviewText.en,
      comment_ar: review.reviewText.ar,
      source,
      status: review.status.toLowerCase(),
      featured: review.featured,
      hidden: review.hidden,
      show_on: showOn,
      published_at: review.publishedAt ?? null,
    },
  });

  if (error) throw writeError(error.message);
  return mapReview(unwrapRpcRow<ReviewRow>(data));
}

export async function saveAdminLegalPage(page: CmsLegalPage): Promise<CmsLegalPage> {
  const { data, error } = await supabase.rpc("save_admin_legal_page", {
    p_page: {
      id: page.id,
      page_type: page.type,
      title_en: page.title.en,
      title_ar: page.title.ar,
      content_en: page.content.en,
      content_ar: page.content.ar,
      status: page.status.toLowerCase(),
      version: page.version,
      published_at: page.publishedAt ?? null,
    },
  });

  if (error) throw writeError(error.message);
  return mapLegalPage(unwrapRpcRow<LegalPageRow>(data));
}

export async function saveAdminContactMessage(
  message: CmsContactMessage,
): Promise<CmsContactMessage> {
  const status =
    message.status === "In Progress"
      ? "in_progress"
      : message.status.toLowerCase();

  const { data, error } = await supabase.rpc("update_admin_contact_message", {
    p_message_id: message.id,
    p_status: status,
    p_admin_note: message.internalNotes || null,
  });

  if (error) throw writeError(error.message);
  return mapContactMessage(unwrapRpcRow<ContactMessageRow>(data));
}
