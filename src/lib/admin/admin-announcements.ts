"use client";

// Admin Announcement Bar — real Supabase data layer (Phase 20C).
//
// Backs the Admin -> Marketing "Announcement Bar" tab. Reads/writes the
// `public.announcements` table directly through the browser anon/publishable
// key; RLS (`announcements_admin_all` = `is_admin()`) is the authoritative gate
// on every write, same pattern as admin-settings.ts / expenses. No RPC, no
// service-role. The public site reads active rows via lib/content/announcements.

import { supabase } from "@/lib/supabase/client";

export type Announcement = {
  id: string;
  messageEn: string;
  messageAr: string;
  ctaLabelEn: string;
  ctaLabelAr: string;
  ctaHref: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
};

export type AnnouncementInput = {
  id?: string;
  messageEn: string;
  messageAr: string;
  ctaLabelEn: string;
  ctaLabelAr: string;
  ctaHref: string;
  active: boolean;
  sortOrder: number;
};

type AnnouncementRow = {
  id: string;
  message_en: string;
  message_ar: string;
  cta_label_en: string;
  cta_label_ar: string;
  cta_href: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
};

export class AdminAnnouncementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAnnouncementError";
  }
}

function mapRow(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    messageEn: row.message_en,
    messageAr: row.message_ar,
    ctaLabelEn: row.cta_label_en,
    ctaLabelAr: row.cta_label_ar,
    ctaHref: row.cta_href,
    active: row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

// Only internal relative paths are allowed (mirrors the DB CHECK) so the link
// can never become an external or javascript: URL.
function cleanHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return "/products";
  if (!/^\/[A-Za-z0-9/_-]*$/.test(trimmed)) {
    throw new AdminAnnouncementError(
      "Link must be an internal path that starts with '/', e.g. /products.",
    );
  }
  return trimmed;
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new AdminAnnouncementError("Could not load announcements.");
  }
  return ((data ?? []) as AnnouncementRow[]).map(mapRow);
}

export async function saveAnnouncement(
  input: AnnouncementInput,
): Promise<Announcement> {
  const payload = {
    message_en: input.messageEn.trim(),
    message_ar: input.messageAr.trim(),
    cta_label_en: input.ctaLabelEn.trim() || "Shop now",
    cta_label_ar: input.ctaLabelAr.trim() || "تسوق الآن",
    cta_href: cleanHref(input.ctaHref),
    active: input.active,
    sort_order: Number.isFinite(input.sortOrder) ? Math.trunc(input.sortOrder) : 0,
  };

  if (!payload.message_en || !payload.message_ar) {
    throw new AdminAnnouncementError(
      "Both the English and Arabic message are required.",
    );
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("announcements")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new AdminAnnouncementError("Could not update the announcement.");
    return mapRow(data as AnnouncementRow);
  }

  const { data, error } = await supabase
    .from("announcements")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new AdminAnnouncementError("Could not create the announcement.");
  return mapRow(data as AnnouncementRow);
}

export async function setAnnouncementActive(
  id: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("announcements")
    .update({ active })
    .eq("id", id);
  if (error) throw new AdminAnnouncementError("Could not update the announcement.");
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw new AdminAnnouncementError("Could not delete the announcement.");
}
