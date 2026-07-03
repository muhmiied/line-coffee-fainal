"use client";

import { supabase } from "@/lib/supabase/client";

export type PublicReview = {
  id: string;
  customerName: string;
  productName: string;
  rating: number;
  comment: {
    en: string;
    ar: string;
  };
};

export type ContactMessageInput = {
  name: string;
  phone?: string;
  email?: string;
  subject?: string;
  message: string;
  source: "contact_page" | "homepage";
};

type PublicReviewRow = {
  id: string;
  customer_name: string;
  product_name: string;
  rating: number;
  comment_en: string;
  comment_ar: string;
};

export async function listApprovedHomepageReviews(): Promise<PublicReview[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, customer_name, product_name, rating, comment_en, comment_ar")
    .eq("status", "approved")
    .eq("hidden", false)
    .in("show_on", ["homepage", "both"])
    .lte("published_at", new Date().toISOString())
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(6);

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[public-cms:reviews] ${error.message}`);
    }
    throw new Error("Could not load customer reviews.");
  }

  return ((data ?? []) as PublicReviewRow[]).map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    productName: row.product_name,
    rating: Math.min(5, Math.max(1, Number(row.rating) || 1)),
    comment: {
      en: row.comment_en,
      ar: row.comment_ar,
    },
  }));
}

export async function submitContactMessage(input: ContactMessageInput): Promise<string> {
  const { data, error } = await supabase.rpc("create_contact_message", {
    p_message: {
      name: input.name,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      subject: input.subject?.trim() || null,
      message: input.message,
      source: input.source,
    },
  });

  if (error || typeof data !== "string") {
    if (process.env.NODE_ENV !== "production" && error) {
      console.warn(`[public-cms:contact] ${error.message}`);
    }
    throw new Error("Could not send your message. Please try again.");
  }

  return data;
}
