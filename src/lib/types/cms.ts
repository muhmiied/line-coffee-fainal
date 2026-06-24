// Line Coffee V3 - Launch-Core CMS Contract
// cms.ts - canonical blog, review, legal page, and contact message contracts.
//
// Phase 3D. Type-only. Additive. Imported by nothing yet.
//
// These contracts prepare CMS data ownership for public blog articles, reviews,
// legal pages, and contact messages without connecting Admin CMS to public
// pages or implementing a contact backend.

import type {
  ID,
  ISODateTime,
  ImageAssetRef,
  LocalizedValue,
} from "@/lib/types/common";

export type CmsPublishStatus = "draft" | "published" | "archived";

export type BlogPostStatus = CmsPublishStatus;

export type BodyBlockType = "paragraph" | "heading" | "image" | "quote" | "list";

// Structured localized content block for blog/editorial pages.
export interface BodyBlock {
  id: ID;
  type: BodyBlockType;
  content?: LocalizedValue;
  image?: ImageAssetRef;
  items?: LocalizedValue[];
  sortOrder: number;
}

// Public journal article contract, owned by CMS later and read by the public
// blog plus homepage journal surfaces.
// Supabase mapping: `blog_posts` table.
export interface BlogPost {
  id: ID;
  slug: string;
  title: LocalizedValue;
  excerpt: LocalizedValue;
  body: BodyBlock[];
  category?: LocalizedValue;
  image?: ImageAssetRef;
  status: CmsPublishStatus;
  featured: boolean;
  author?: string;
  publishedAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt?: ISODateTime;
  seoTitle?: LocalizedValue;
  seoDescription?: LocalizedValue;
}

export type ReviewStatus = "pending" | "approved" | "rejected" | "archived";

export type ReviewSource = "website" | "manual" | "social" | "whatsapp";

export type ReviewDisplayTarget = "homepage" | "product" | "hidden";

// Review/testimonial contract that can support manually-entered, social,
// WhatsApp, and future website-submitted reviews.
// Supabase mapping: `reviews` table.
export interface Review {
  id: ID;
  authorName: string;
  rating: number;
  text: LocalizedValue;
  source: ReviewSource;
  status: ReviewStatus;
  displayTarget: ReviewDisplayTarget;
  productId?: ID;
  productSlug?: string;
  proofImage?: ImageAssetRef;
  publishedAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt?: ISODateTime;
}

export type LegalPageType = "privacy" | "terms" | "shipping" | "returns";

// CMS-owned legal/support content for the existing public legal routes.
// Supabase mapping: `legal_pages` table.
export interface LegalPage {
  id: ID;
  type: LegalPageType;
  title: LocalizedValue;
  content: LocalizedValue;
  status: CmsPublishStatus;
  version?: string;
  publishedAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt?: ISODateTime;
}

export type ContactMessageStatus = "new" | "read" | "replied" | "archived";

export type ContactMessageSource =
  | "contact_page"
  | "footer"
  | "whatsapp"
  | "manual";

// Future contact form submission contract. No backend write is implemented in
// this phase.
// Supabase mapping: `contact_messages` table.
export interface ContactMessage {
  id: ID;
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  source: ContactMessageSource;
  subject?: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: ISODateTime;
  updatedAt?: ISODateTime;
  adminNote?: string;
}
