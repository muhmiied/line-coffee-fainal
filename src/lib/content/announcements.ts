// Public announcement bar source (Phase 20C).
//
// The public top bar reads ACTIVE announcements from the real
// `public.announcements` table (managed in Admin -> Marketing -> Announcement
// Bar). If the table is empty or unreachable (e.g. before the Phase-20C
// migration is applied), it falls back to the built-in launch messages below,
// so the bar is never blank. Anonymous read of active rows is allowed by RLS.

import { supabase } from "@/lib/supabase/client";

export type PublicAnnouncement = {
  text: { en: string; ar: string };
  cta: { label: { en: string; ar: string }; href: string };
};

// Built-in fallback — kept in sync with the Phase-20C migration seed.
export const DEFAULT_ANNOUNCEMENTS: PublicAnnouncement[] = [
  {
    text: {
      en: "Launch offers are live — shop your favorite coffee now",
      ar: "عروض الافتتاح وصلت — اطلب قهوتك المفضلة الآن",
    },
    cta: { label: { en: "Shop now", ar: "تسوق الآن" }, href: "/products" },
  },
  {
    text: {
      en: "Limited-time special discount on Line Coffee products",
      ar: "خصم خاص لفترة محدودة على منتجات لاين كوفي",
    },
    cta: { label: { en: "Shop now", ar: "تسوق الآن" }, href: "/products" },
  },
];

type PublicAnnouncementRow = {
  message_en: string;
  message_ar: string;
  cta_label_en: string;
  cta_label_ar: string;
  cta_href: string;
};

export async function getPublicAnnouncements(): Promise<PublicAnnouncement[]> {
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("message_en, message_ar, cta_label_en, cta_label_ar, cta_href")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) return DEFAULT_ANNOUNCEMENTS;

    return (data as PublicAnnouncementRow[]).map((row) => ({
      text: { en: row.message_en, ar: row.message_ar },
      cta: {
        label: { en: row.cta_label_en, ar: row.cta_label_ar },
        href: row.cta_href,
      },
    }));
  } catch {
    return DEFAULT_ANNOUNCEMENTS;
  }
}
