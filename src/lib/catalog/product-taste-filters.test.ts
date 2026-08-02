import { describe, expect, it } from "vitest";
import {
  getProductTasteFilterOptions,
  getProductTasteGroup,
  matchesProductTasteFilter,
  organizeFlavorCategoryProducts,
} from "@/lib/catalog/product-taste-filters";

function product(
  slug: string,
  merchandising: {
    isAvailable?: boolean;
    bestSeller?: boolean;
    featured?: boolean;
    isNew?: boolean;
  } = {},
) {
  return {
    slug,
    name: { en: slug, ar: slug },
    note: { en: "", ar: "" },
    ...merchandising,
  };
}

describe("product taste filters", () => {
  it("groups the flavored catalog into customer-facing families", () => {
    expect(getProductTasteGroup("cappuccino", product("original-cappuccino"))).toBe("original");
    expect(getProductTasteGroup("cappuccino", product("strawberry-cappuccino"))).toBe("fruit");
    expect(getProductTasteGroup("cappuccino", product("hazelnut-cappuccino"))).toBe("nuts");
    expect(getProductTasteGroup("cappuccino", product("nutella-cappuccino"))).toBe("chocolate");
    expect(getProductTasteGroup("cappuccino", product("oreo-cappuccino"))).toBe("chocolate");
    expect(getProductTasteGroup("cappuccino", product("apple-shisha-cappuccino"))).toBe("signature");
  });

  it("does not let the hot-chocolate category name collide with the chocolate family", () => {
    // "hot-chocolate" is both the category slug AND a taste-family token, so every
    // product slug in this category (e.g. "strawberry-hot-chocolate") literally
    // contains the substring "chocolate". Classification must strip the category
    // suffix first so only the real flavor is checked against the taste tokens.
    expect(getProductTasteGroup("hot-chocolate", product("strawberry-hot-chocolate"))).toBe("fruit");
    expect(getProductTasteGroup("hot-chocolate", product("hazelnut-hot-chocolate"))).toBe("nuts");
    expect(getProductTasteGroup("hot-chocolate", product("lotus-hot-chocolate"))).toBe("dessert");
    expect(getProductTasteGroup("hot-chocolate", product("coconut-hot-chocolate"))).toBe("dessert");
    expect(getProductTasteGroup("hot-chocolate", product("chocolate-hot-chocolate"))).toBe("chocolate");
    expect(getProductTasteGroup("hot-chocolate", product("oreo-hot-chocolate"))).toBe("chocolate");
    expect(getProductTasteGroup("hot-chocolate", product("apple-shisha-hot-chocolate"))).toBe("signature");
  });

  it("strips the flavor-coffee category's shorter product suffix correctly", () => {
    // flavor-coffee products end in "-coffee", not "-flavor-coffee".
    expect(getProductTasteGroup("flavor-coffee", product("hazelnut-chunk-coffee"))).toBe("nuts");
    expect(getProductTasteGroup("flavor-coffee", product("chocolate-chunk-coffee"))).toBe("chocolate");
    expect(getProductTasteGroup("flavor-coffee", product("french-coffee"))).toBe("original");
  });

  it("uses category-specific families for classic coffee ranges", () => {
    expect(getProductTasteGroup("turkish-blends", product("turkish-silk"))).toBe("smooth");
    expect(getProductTasteGroup("turkish-blends", product("cairo-nights"))).toBe("bold");
    expect(getProductTasteGroup("espresso-blends", product("aroma-body"))).toBe("balanced");
    expect(getProductTasteGroup("easy-coffee", product("gold-line"))).toBe("premium");
  });

  it("keeps the known category filter bar stable while counts reflect matches", () => {
    const options = getProductTasteFilterOptions("cappuccino", [
      product("original-cappuccino"),
      product("strawberry-cappuccino"),
      product("hazelnut-cappuccino"),
    ]);

    expect(options.map((option) => [option.key, option.count])).toEqual([
      ["all", 3],
      ["original", 1],
      ["fruit", 1],
      ["nuts", 1],
      ["chocolate", 0],
      ["dessert", 0],
      ["signature", 0],
    ]);
  });

  it("always lets the all filter pass", () => {
    expect(matchesProductTasteFilter("cappuccino", product("oreo-cappuccino"), "all")).toBe(true);
    expect(matchesProductTasteFilter("cappuccino", product("oreo-cappuccino"), "fruit")).toBe(false);
  });

  it("puts each flavored category original first in the all filter", () => {
    const cases = [
      ["coffee-mix", "original-coffee-mix"],
      ["cappuccino", "original-cappuccino"],
      ["hot-chocolate", "original-hot-chocolate"],
      ["flavor-coffee", "french-coffee"],
    ] as const;

    for (const [category, originalSlug] of cases) {
      const products = [
        product(`strawberry-${category}`),
        product(originalSlug),
        product(`chocolate-${category}`),
      ];

      expect(organizeFlavorCategoryProducts(category, products, "all")[0]?.slug).toBe(originalSlug);
    }
  });

  it("groups flavored cards by filter family and merchandises within each family", () => {
    const products = [
      product("strawberry-cappuccino"),
      product("hazelnut-cappuccino", { isAvailable: false, bestSeller: true }),
      product("chocolate-cappuccino"),
      product("original-cappuccino", { isAvailable: false }),
      product("banana-cappuccino", { featured: true }),
      product("almond-cappuccino"),
      product("oreo-cappuccino"),
      product("apple-shisha-cappuccino"),
    ];

    expect(
      organizeFlavorCategoryProducts("cappuccino", products, "all").map(({ slug }) => slug),
    ).toEqual([
      "original-cappuccino",
      "banana-cappuccino",
      "strawberry-cappuccino",
      "almond-cappuccino",
      "hazelnut-cappuccino",
      "chocolate-cappuccino",
      "oreo-cappuccino",
      "apple-shisha-cappuccino",
    ]);
  });
});
