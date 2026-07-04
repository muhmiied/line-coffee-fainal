// Line Coffee V3 — Phase 20A: page metadata helpers.
//
// Builds complete Next.js Metadata objects for public pages so each page emits a
// correct canonical + a FULL Open Graph / Twitter block (Next replaces nested
// metadata objects rather than deep-merging, so partial OG would drop the root
// image/siteName). Titles are plain strings so the root title template
// ("%s | Line Coffee") applies; OG/Twitter titles are pre-composed. No UI, no
// data access — callers pass already-resolved real values.

import type { Metadata } from "next";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  absoluteUrl,
} from "@/lib/seo/site";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  keywords?: string[];
  index?: boolean;
};

export function pageMetadata(input: PageMetadataInput): Metadata {
  const image = input.image || DEFAULT_OG_IMAGE;
  const ogTitle = `${input.title} | ${SITE_NAME}`;

  return {
    title: input.title,
    description: input.description,
    ...(input.keywords ? { keywords: input.keywords } : {}),
    alternates: { canonical: input.path },
    ...(input.index === false ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: ogTitle,
      description: input.description,
      url: absoluteUrl(input.path),
      locale: "en_US",
      alternateLocale: ["ar_EG"],
      images: [{ url: image, alt: input.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: input.description,
      images: [image],
    },
  };
}

type ArticleMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  publishedTime?: string;
  section?: string;
};

export function articleMetadata(input: ArticleMetadataInput): Metadata {
  const image = input.image || DEFAULT_OG_IMAGE;
  const ogTitle = `${input.title} | ${SITE_NAME}`;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title: ogTitle,
      description: input.description,
      url: absoluteUrl(input.path),
      locale: "en_US",
      alternateLocale: ["ar_EG"],
      images: [{ url: image, alt: input.title }],
      authors: [SITE_NAME],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.section ? { section: input.section } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: input.description,
      images: [image],
    },
  };
}
