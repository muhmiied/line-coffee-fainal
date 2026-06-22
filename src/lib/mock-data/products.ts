import type { ProductMock } from "./types";

export const mockProducts: ProductMock[] = [
  {
    id: "prod-turkish-silk",
    slug: "turkish-silk",
    category_id: "cat-turkish-blends",
    name_ar: "تركي سيلك",
    name_en: "Turkish Silk",
    description_ar: "منتج تجريبي يمثل شكل بيانات المنتجات ثنائية اللغة.",
    description_en: "A mock product showing the bilingual product data shape.",
    main_image: {
      asset_id: "media-product-turkish-silk",
      alt_ar: "عبوة تركي سيلك",
      alt_en: "Turkish Silk package",
      folder: "Products",
    },
    gallery: [],
    featured: true,
    best_seller: false,
    status: "published",
    variants: [
      {
        id: "var-turkish-silk-250",
        label: "250g",
        price_egp: 0,
        stock_state: "in_stock",
      },
    ],
  },
  {
    id: "prod-heavy-crema",
    slug: "heavy-crema",
    category_id: "cat-espresso-blends",
    name_ar: "هيفي كريما",
    name_en: "Heavy Crema",
    description_ar: "منتج تجريبي لتجهيز شكل بيانات خلطات الإسبريسو.",
    description_en: "A mock product preparing espresso blend data shape.",
    main_image: {
      asset_id: "media-product-heavy-crema",
      alt_ar: "عبوة هيفي كريما",
      alt_en: "Heavy Crema package",
      folder: "Products",
    },
    gallery: [],
    featured: true,
    best_seller: true,
    status: "published",
    variants: [
      {
        id: "var-heavy-crema-250",
        label: "250g",
        price_egp: 0,
        stock_state: "in_stock",
      },
    ],
  },
];
