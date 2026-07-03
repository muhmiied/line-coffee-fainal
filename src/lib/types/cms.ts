// Line Coffee V3 - Launch-Core CMS Contract
// cms.ts - canonical blog, review, legal page, and contact message contracts.
//
// Phase 13A. Live database contract reference.
//
// Runtime row mapping lives in `admin/admin-cms.ts`; public approved-review and
// contact-submit boundaries live in `cms/public-cms.ts`.

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

export type ReviewStatus = "pending" | "approved" | "rejected";

export type ReviewSource =
  | "website"
  | "manual"
  | "whatsapp"
  | "facebook"
  | "instagram";

export type ReviewDisplayTarget = "homepage" | "product" | "both";

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
  featured: boolean;
  hidden: boolean;
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

export type ContactMessageStatus = "new" | "in_progress" | "replied" | "archived";

export type ContactMessageSource =
  | "contact_page"
  | "homepage"
  | "whatsapp"
  | "manual";

// Public form submission + admin-only inbox contract.
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
