"use client";

import type { LocalizedValue } from "@/lib/context/language";
import { supabase } from "@/lib/supabase/client";
import type { LegalPageType } from "@/lib/types/cms";

type PublicLegalRow = {
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  updated_at: string;
};

export type PublicLegalContent = {
  heroTitle: LocalizedValue;
  lastUpdated: string;
  sections: Array<{ title: LocalizedValue; paragraphs: LocalizedValue[] }>;
};

function contentChunks(value: string) {
  return value
    .split(/\r?\n\s*\r?\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

export async function getPublicLegalContent(
  pageType: LegalPageType,
): Promise<PublicLegalContent | null> {
  const { data, error } = await supabase
    .from("legal_pages")
    .select("title_en, title_ar, content_en, content_ar, updated_at")
    .eq("page_type", pageType)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw new Error("Could not load the published legal page.");
  if (!data) return null;

  const row = data as PublicLegalRow;
  const titleEn = row.title_en.trim();
  const titleAr = row.title_ar.trim() || titleEn;
  const enChunks = contentChunks(row.content_en);
  const arChunks = contentChunks(row.content_ar);
  if (!titleEn || enChunks.length === 0 || !Number.isFinite(Date.parse(row.updated_at))) return null;

  return {
    heroTitle: { en: titleEn, ar: titleAr },
    lastUpdated: row.updated_at.slice(0, 10),
    sections: [{
      title: { en: titleEn, ar: titleAr },
      paragraphs: enChunks.map((en, index) => ({ en, ar: arChunks[index] ?? en })),
    }],
  };
}
