import type { BilingualFields } from "@/types/localization";

export type MockStatus = "draft" | "published" | "hidden";

export type MediaReferenceMock = {
  asset_id: string;
  alt_ar: string;
  alt_en: string;
  folder: string;
};

export type CategoryMock = BilingualFields<"name"> &
  BilingualFields<"description"> & {
    id: string;
    slug: string;
    image: MediaReferenceMock;
    sort_order: number;
    status: MockStatus;
    visible: boolean;
  };

export type ProductMock = BilingualFields<"name"> &
  BilingualFields<"description"> & {
    id: string;
    slug: string;
    category_id: string;
    main_image: MediaReferenceMock;
    gallery: MediaReferenceMock[];
    featured: boolean;
    best_seller: boolean;
    status: MockStatus;
    variants: ProductVariantMock[];
  };

export type ProductVariantMock = {
  id: string;
  label: "250g" | "500g" | "1kg";
  price_egp: number;
  compare_at_price_egp?: number;
  stock_state: "in_stock" | "low_stock" | "out_of_stock";
};

export type HeroSlideMock = BilingualFields<"title"> &
  BilingualFields<"subtitle"> &
  BilingualFields<"button_text"> & {
    id: string;
    media: MediaReferenceMock;
    cta_link: string;
    sort_order: number;
    active: boolean;
  };

export type DashboardMetricMock = {
  id: string;
  label_ar: string;
  label_en: string;
  value: string;
  delta?: string;
  tone: "neutral" | "positive" | "warning" | "danger";
};
