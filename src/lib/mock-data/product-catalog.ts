// ─── Types ────────────────────────────────────────────────────────────────────

export type BlendComponent = {
  origin: { en: string; ar: string };
  beanType: "arabica" | "robusta";
  pct: number;
};

export type CatalogCategorySlug =
  | "turkish-blends"
  | "espresso-blends"
  | "easy-coffee"
  | "coffee-mix"
  | "cappuccino"
  | "hot-chocolate"
  | "flavor-coffee";

export type CatalogPricingModel = "packaged-by-weight";

export type CatalogCategory = {
  slug: CatalogCategorySlug;
  name: { en: string; ar: string };
  image: string;
};

export type CatalogSize = {
  label: "250g" | "500g";
  salePrice: number;
};

export type CatalogProduct = {
  slug: string;
  category: CatalogCategorySlug;
  name: { en: string; ar: string };
  note: { en: string; ar: string };
  blend?: BlendComponent[];
  pricingModel: CatalogPricingModel;
  salePricePerKg: number;
  purchaseCostPerKg: number;
  sizes: CatalogSize[];
  image: string;
};

// ─── Images ───────────────────────────────────────────────────────────────────

const img = {
  turkish: "/assets/categories/turkish.png",
  espresso: "/assets/categories/espresso.png",
  flavor: "/assets/categories/flavor.png",
  cappuccino: "/assets/categories/cappuccino.png",
  classicPouch: "/assets/products/classic-pouch.png",
  espressoPouch: "/assets/products/espresso-pouch.png",
  flavorPouch: "/assets/products/flavor-pouch.png",
  cappuccinoSachets: "/assets/products/cappuccino-sachets.png",
} as const;

// ─── Category notes ───────────────────────────────────────────────────────────

const CATEGORY_NOTES: Record<CatalogCategorySlug, { en: string; ar: string }> = {
  "turkish-blends":  { en: "Dark-roast artisan Turkish blend",          ar: "خلطة تركي تحميص غامق يدوي"             },
  "espresso-blends": { en: "Full-crema espresso blend",                 ar: "خلطة إسبريسو غنية بالكريما"            },
  "easy-coffee":     { en: "Easy-brew coffee blend, ready in minutes",  ar: "خلطة قهوة سريعة التحضير، جاهزة في دقائق" },
  "coffee-mix":      { en: "Instant coffee mix — just add hot water",   ar: "قهوة فورية — أضف ماءً ساخناً فقط"      },
  "cappuccino":      { en: "Instant cappuccino with frothy milk",       ar: "كابتشينو فوري بالحليب الرغوي"          },
  "hot-chocolate":   { en: "Rich cocoa & milk hot chocolate mix",       ar: "خليط شوكولاتة ساخنة بالكاكاو والحليب" },
  "flavor-coffee":   { en: "Instant flavored coffee, ready in seconds", ar: "قهوة نكهات فورية تحضر في ثوانٍ"       },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PackedOpts = {
  note?: { en: string; ar: string };
  blend?: BlendComponent[];
};

function packed(
  slug: string,
  category: CatalogCategorySlug,
  en: string,
  ar: string,
  salePricePerKg: number,
  purchaseCostPerKg: number,
  size250: number,
  size500: number,
  image: string,
  opts?: PackedOpts,
): CatalogProduct {
  return {
    slug,
    category,
    name: { en, ar },
    note: opts?.note ?? CATEGORY_NOTES[category],
    blend: opts?.blend,
    pricingModel: "packaged-by-weight",
    salePricePerKg,
    purchaseCostPerKg,
    sizes: [
      { label: "250g", salePrice: size250 },
      { label: "500g", salePrice: size500 },
    ],
    image,
  };
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const catalogCategories: CatalogCategory[] = [
  { slug: "turkish-blends",  name: { en: "Turkish Blends",              ar: "خلطات تركي"               }, image: img.turkish },
  { slug: "espresso-blends", name: { en: "Espresso Blends",             ar: "خلطات إسبريسو"             }, image: img.espresso },
  { slug: "easy-coffee",     name: { en: "Easy Coffee",                 ar: "قهوة سريعة التحضير"        }, image: img.espressoPouch },
  { slug: "coffee-mix",      name: { en: "Coffee Mix",                  ar: "كوفي ميكس"                }, image: img.classicPouch },
  { slug: "cappuccino",      name: { en: "Cappuccino",                  ar: "كابتشينو"                  }, image: img.cappuccinoSachets },
  { slug: "hot-chocolate",   name: { en: "Hot Chocolate",               ar: "هوت شوكليت"               }, image: img.cappuccinoSachets },
  { slug: "flavor-coffee",   name: { en: "Flavor Coffee",               ar: "قهوة نكهات"               }, image: img.flavorPouch },
];

// ─── Products ─────────────────────────────────────────────────────────────────

export const catalogProducts: CatalogProduct[] = [

  // ── Turkish Blends ──────────────────────────────────────────────────────────
  packed("turkish-silk",  "turkish-blends", "Turkish Silk",  "حرير تركي",      700,  422.25, 175, 350, img.turkish, {
    note:  { en: "Ultra-smooth Turkish blend with silky body, delicate chocolate notes, and a refined velvety finish.", ar: "مزيج تركي فاخر بملمس حريري ونفحات شوكولاتة ناعمة، مصمم لعشاق القهوة المتوازنة ذات النهاية المخملية الهادئة." },
    blend: [
      { origin: { en: "Brazil 17-18",       ar: "برازيلي 17-18"    }, beanType: "arabica",  pct: 45 },
      { origin: { en: "Santos Fine Cup",    ar: "سانتوس فاين كاب"  }, beanType: "arabica",  pct: 25 },
      { origin: { en: "Habashi Lekempti",   ar: "حبشي لقمتي"       }, beanType: "arabica",  pct: 15 },
      { origin: { en: "Indian Washed",      ar: "هندي مغسول"       }, beanType: "arabica",  pct: 10 },
      { origin: { en: "AA Indian Robusta",  ar: "روبوستا هندي AA"  }, beanType: "robusta",  pct:  5 },
    ],
  }),
  packed("strike-coffee", "turkish-blends", "Strike Coffee", "طلقة قهوة",      900,  552.90, 225, 450, img.turkish, {
    note:  { en: "Bold Turkish blend with elevated caffeine, powerful aroma, and a vibrant energetic character.", ar: "توليفة تركية جريئة بكافيين أعلى ورائحة قوية تمنحك بداية يوم مليئة بالطاقة والتركيز." },
    blend: [
      { origin: { en: "Brazilian Regular",  ar: "برازيلي عادي"     }, beanType: "arabica",  pct: 35 },
      { origin: { en: "Habashi Lekempti",   ar: "حبشي لقمتي"       }, beanType: "arabica",  pct: 25 },
      { origin: { en: "Colombian Regular",  ar: "كولومبي عادي"     }, beanType: "arabica",  pct: 20 },
      { origin: { en: "Yemeni",             ar: "يمني"             }, beanType: "arabica",  pct: 10 },
      { origin: { en: "Indonesian Large",   ar: "إندونيسي كبير"   }, beanType: "robusta",  pct: 10 },
    ],
  }),
  packed("cairo-nights",  "turkish-blends", "Cairo Nights",  "ليالي القاهرة",  850,  532.80, 215, 425, img.turkish, {
    note:  { en: "Dark oriental Turkish blend with deep aroma, intense body, and rich chocolate undertones.", ar: "قهوة تركية داكنة بطابع شرقي غني، تجمع بين القوة والعمق مع لمسات شوكولاتة داكنة مميزة." },
    blend: [
      { origin: { en: "Brazil 17-18",       ar: "برازيلي 17-18"    }, beanType: "arabica",  pct: 40 },
      { origin: { en: "Indian",             ar: "هندي"             }, beanType: "arabica",  pct: 20 },
      { origin: { en: "Guatemala",          ar: "جواتيمالا"        }, beanType: "arabica",  pct: 15 },
      { origin: { en: "Colombian Regular",  ar: "كولومبي عادي"     }, beanType: "arabica",  pct: 15 },
      { origin: { en: "Ugandan 18",         ar: "أوغندي 18"        }, beanType: "robusta",  pct: 10 },
    ],
  }),
  packed("high-mood",     "turkish-blends", "High Mood",     "المزاج العالي", 1150,  725.20, 290, 575, img.turkish, {
    note:  { en: "Our most luxurious Turkish blend with layered aromas and a sophisticated lingering finish.", ar: "أفخم خلطات القهوة التركية لدينا، بطبقات عطرية معقدة ومذاق فاخر يدوم حتى آخر رشفة." },
    blend: [
      { origin: { en: "Yemeni",            ar: "يمني"             }, beanType: "arabica",  pct: 25 },
      { origin: { en: "Colombian 18",      ar: "كولومبي 18"       }, beanType: "arabica",  pct: 25 },
      { origin: { en: "Santos Fine Cup",   ar: "سانتوس فاين كاب"  }, beanType: "arabica",  pct: 20 },
      { origin: { en: "Costa Rica",        ar: "كوستاريكا"        }, beanType: "arabica",  pct: 15 },
      { origin: { en: "Habashi Regular",   ar: "حبشي عادي"        }, beanType: "arabica",  pct: 10 },
      { origin: { en: "Robusta AA",        ar: "روبوستا AA"        }, beanType: "robusta",  pct:  5 },
    ],
  }),

  // ── Espresso Blends ─────────────────────────────────────────────────────────
  packed("heavy-crema", "espresso-blends", "Heavy Crema", "هيفي كريما",  700,  436.35, 175, 350, img.espresso, {
    note:  { en: "Dense espresso with rich crema and full body, perfect for milk-based drinks and cappuccino.", ar: "إسبريسو غني بكريما كثيفة وقوام ممتلئ، مثالي للمشروبات اللبنية والكابتشينو." },
    blend: [
      { origin: { en: "Brazil 17-18",       ar: "برازيلي 17-18"    }, beanType: "arabica",  pct: 45 },
      { origin: { en: "Indian",             ar: "هندي"             }, beanType: "arabica",  pct: 25 },
      { origin: { en: "AA Indian Robusta",  ar: "روبوستا هندي AA"  }, beanType: "robusta",  pct: 15 },
      { origin: { en: "Indonesian XL",      ar: "إندونيسي XL"      }, beanType: "robusta",  pct: 10 },
      { origin: { en: "Colombian Regular",  ar: "كولومبي عادي"     }, beanType: "arabica",  pct:  5 },
    ],
  }),
  packed("aroma-body",  "espresso-blends", "Aroma Body",  "أروما بودي",  900,  556.65, 225, 450, img.espresso, {
    note:  { en: "Balanced espresso with strong aroma, creamy body, and subtle caramel notes.", ar: "توازن مثالي بين الرائحة العطرية والقوام الكريمي مع لمسات كراميل ناعمة." },
    blend: [
      { origin: { en: "Colombian Regular",  ar: "كولومبي عادي"     }, beanType: "arabica",  pct: 35 },
      { origin: { en: "Brazilian Regular",  ar: "برازيلي عادي"     }, beanType: "arabica",  pct: 25 },
      { origin: { en: "Habashi Regular",    ar: "حبشي عادي"        }, beanType: "arabica",  pct: 20 },
      { origin: { en: "Nicaragua",          ar: "نيكاراجوا"        }, beanType: "arabica",  pct: 10 },
      { origin: { en: "Robusta AA",         ar: "روبوستا AA"        }, beanType: "robusta",  pct: 10 },
    ],
  }),
  packed("headshot",    "espresso-blends", "Headshot",    "هيدشوت",      960,  567.90, 240, 480, img.espresso, {
    note:  { en: "Intense espresso blend with elevated caffeine and a bold, powerful profile.", ar: "جرعة إسبريسو قوية بكافيين مرتفع وطابع جريء لعشاق القوة والتركيز." },
    blend: [
      { origin: { en: "Indian",             ar: "هندي"             }, beanType: "arabica",  pct: 35 },
      { origin: { en: "Brazilian Regular",  ar: "برازيلي عادي"     }, beanType: "arabica",  pct: 25 },
      { origin: { en: "Guatemala",          ar: "جواتيمالا"        }, beanType: "arabica",  pct: 15 },
      { origin: { en: "Ugandan 18",         ar: "أوغندي 18"        }, beanType: "robusta",  pct: 15 },
      { origin: { en: "Colombian Regular",  ar: "كولومبي عادي"     }, beanType: "arabica",  pct: 10 },
    ],
  }),
  packed("black-label", "espresso-blends", "Black Label", "بلاك ليبل",  1200,  673.45, 300, 600, img.espresso, {
    note:  { en: "Premium specialty espresso with layered aroma, natural sweetness, and chocolate complexity.", ar: "إسبريسو فاخر متعدد الطبقات يجمع بين التعقيد العطري والحلاوة الطبيعية ولمسات الشوكولاتة." },
    blend: [
      { origin: { en: "Colombian 18",      ar: "كولومبي 18"       }, beanType: "arabica",  pct: 25 },
      { origin: { en: "Guatemala",         ar: "جواتيمالا"        }, beanType: "arabica",  pct: 20 },
      { origin: { en: "Costa Rica",        ar: "كوستاريكا"        }, beanType: "arabica",  pct: 20 },
      { origin: { en: "Nicaragua",         ar: "نيكاراجوا"        }, beanType: "arabica",  pct: 15 },
      { origin: { en: "Habashi Regular",   ar: "حبشي عادي"        }, beanType: "arabica",  pct: 10 },
      { origin: { en: "Peru",              ar: "بيرو"             }, beanType: "arabica",  pct:  5 },
      { origin: { en: "AA Indian Robusta", ar: "روبوستا هندي AA"  }, beanType: "robusta",  pct:  5 },
    ],
  }),

  // ── Easy Coffee ─────────────────────────────────────────────────────────────
  packed("classic-line", "easy-coffee", "Classic Line", "كلاسيك لاين",  950, 600, 240, 475, img.espressoPouch),
  packed("gold-line",    "easy-coffee", "Gold Line",    "جولد لاين",   1500, 700, 375, 750, img.espressoPouch),

  // ── Coffee Mix ──────────────────────────────────────────────────────────────
  packed("original-coffee-mix",       "coffee-mix", "Original Coffee Mix",       "كوفي ميكس اورجينال",   500, 300, 125, 250, img.classicPouch),
  packed("strawberry-coffee-mix",     "coffee-mix", "Strawberry Coffee Mix",     "كوفي ميكس فراولة",     520, 320, 130, 260, img.classicPouch),
  packed("banana-coffee-mix",         "coffee-mix", "Banana Coffee Mix",         "كوفي ميكس موز",        520, 320, 130, 260, img.classicPouch),
  packed("mango-coffee-mix",          "coffee-mix", "Mango Coffee Mix",          "كوفي ميكس مانجو",      520, 320, 130, 260, img.classicPouch),
  packed("peach-coffee-mix",          "coffee-mix", "Peach Coffee Mix",          "كوفي ميكس خوخ",        520, 320, 130, 260, img.classicPouch),
  packed("blueberry-coffee-mix",      "coffee-mix", "Blueberry Coffee Mix",      "كوفي ميكس توت أزرق",   520, 320, 130, 260, img.classicPouch),
  packed("cherry-coffee-mix",         "coffee-mix", "Cherry Coffee Mix",         "كوفي ميكس كريز",       520, 320, 130, 260, img.classicPouch),
  packed("apple-coffee-mix",          "coffee-mix", "Apple Coffee Mix",          "كوفي ميكس تفاح",       520, 320, 130, 260, img.classicPouch),
  packed("grape-coffee-mix",          "coffee-mix", "Grape Coffee Mix",          "كوفي ميكس عنب",        520, 320, 130, 260, img.classicPouch),
  packed("watermelon-coffee-mix",     "coffee-mix", "Watermelon Coffee Mix",     "كوفي ميكس بطيخ",       520, 320, 130, 260, img.classicPouch),
  packed("guava-coffee-mix",          "coffee-mix", "Guava Coffee Mix",          "كوفي ميكس جوافة",      520, 320, 130, 260, img.classicPouch),
  packed("pineapple-coffee-mix",      "coffee-mix", "Pineapple Coffee Mix",      "كوفي ميكس أناناس",     520, 320, 130, 260, img.classicPouch),
  packed("orange-coffee-mix",         "coffee-mix", "Orange Coffee Mix",         "كوفي ميكس برتقال",     520, 320, 130, 260, img.classicPouch),
  packed("hazelnut-coffee-mix",       "coffee-mix", "Hazelnut Coffee Mix",       "كوفي ميكس بندق",       520, 320, 130, 260, img.classicPouch),
  packed("almond-coffee-mix",         "coffee-mix", "Almond Coffee Mix",         "كوفي ميكس لوز",        520, 320, 130, 260, img.classicPouch),
  packed("pistachio-coffee-mix",      "coffee-mix", "Pistachio Coffee Mix",      "كوفي ميكس فستق",       520, 320, 130, 260, img.classicPouch),
  packed("chocolate-coffee-mix",      "coffee-mix", "Chocolate Coffee Mix",      "كوفي ميكس شيكولاتة",   520, 320, 130, 260, img.classicPouch),
  packed("nutella-coffee-mix",        "coffee-mix", "Nutella Coffee Mix",        "كوفي ميكس نوتيلا",     520, 320, 130, 260, img.classicPouch),
  packed("oreo-coffee-mix",           "coffee-mix", "Oreo Coffee Mix",           "كوفي ميكس أوريو",      520, 320, 130, 260, img.classicPouch),
  packed("lotus-coffee-mix",          "coffee-mix", "Lotus Coffee Mix",          "كوفي ميكس لونس",       520, 320, 130, 260, img.classicPouch),
  packed("cinnamon-roll-coffee-mix",  "coffee-mix", "Cinnamon Roll Coffee Mix",  "كوفي ميكس سينابون",    520, 320, 130, 260, img.classicPouch),
  packed("coconut-coffee-mix",        "coffee-mix", "Coconut Coffee Mix",        "كوفي ميكس جوز الهند",  520, 320, 130, 260, img.classicPouch),
  packed("vilaella-coffee-mix",       "coffee-mix", "Vilaella Coffee Mix",       "كوفي ميكس فيلايلا",    520, 320, 130, 260, img.classicPouch),
  packed("caramel-coffee-mix",        "coffee-mix", "Caramel Coffee Mix",        "كوفي ميكس كراميل",     520, 320, 130, 260, img.classicPouch),
  packed("mocha-coffee-mix",          "coffee-mix", "Mocha Coffee Mix",          "كوفي ميكس موكا",       520, 320, 130, 260, img.classicPouch),
  packed("apple-shisha-coffee-mix",   "coffee-mix", "Apple Shisha Coffee Mix",   "كوفي ميكس شيشة تفاح",  520, 320, 130, 260, img.classicPouch),
  packed("grape-shisha-coffee-mix",   "coffee-mix", "Grape Shisha Coffee Mix",   "كوفي ميكس شيشة عنب",   520, 320, 130, 260, img.classicPouch),
  packed("hot-cider-coffee-mix",      "coffee-mix", "Hot Cider Coffee Mix",      "كوفي ميكس هوت سيدر",   520, 320, 130, 260, img.classicPouch),

  // ── Cappuccino ──────────────────────────────────────────────────────────────
  packed("original-cappuccino",       "cappuccino", "Original Cappuccino",       "كابتشينو أوريجينال",   520, 320, 130, 260, img.cappuccinoSachets),
  packed("strawberry-cappuccino",     "cappuccino", "Strawberry Cappuccino",     "كابتشينو فراولة",      560, 350, 140, 280, img.cappuccinoSachets),
  packed("banana-cappuccino",         "cappuccino", "Banana Cappuccino",         "كابتشينو موز",         560, 350, 140, 280, img.cappuccinoSachets),
  packed("mango-cappuccino",          "cappuccino", "Mango Cappuccino",          "كابتشينو مانجو",       560, 350, 140, 280, img.cappuccinoSachets),
  packed("peach-cappuccino",          "cappuccino", "Peach Cappuccino",          "كابتشينو خوخ",         560, 350, 140, 280, img.cappuccinoSachets),
  packed("blueberry-cappuccino",      "cappuccino", "Blueberry Cappuccino",      "كابتشينو توت أزرق",    560, 350, 140, 280, img.cappuccinoSachets),
  packed("cherry-cappuccino",         "cappuccino", "Cherry Cappuccino",         "كابتشينو كريز",        560, 350, 140, 280, img.cappuccinoSachets),
  packed("apple-cappuccino",          "cappuccino", "Apple Cappuccino",          "كابتشينو تفاح",        560, 350, 140, 280, img.cappuccinoSachets),
  packed("grape-cappuccino",          "cappuccino", "Grape Cappuccino",          "كابتشينو عنب",         560, 350, 140, 280, img.cappuccinoSachets),
  packed("watermelon-cappuccino",     "cappuccino", "Watermelon Cappuccino",     "كابتشينو بطيخ",        560, 350, 140, 280, img.cappuccinoSachets),
  packed("guava-cappuccino",          "cappuccino", "Guava Cappuccino",          "كابتشينو جوافة",       560, 350, 140, 280, img.cappuccinoSachets),
  packed("pineapple-cappuccino",      "cappuccino", "Pineapple Cappuccino",      "كابتشينو أناناس",      560, 350, 140, 280, img.cappuccinoSachets),
  packed("orange-cappuccino",         "cappuccino", "Orange Cappuccino",         "كابتشينو برتقال",      560, 350, 140, 280, img.cappuccinoSachets),
  packed("hazelnut-cappuccino",       "cappuccino", "Hazelnut Cappuccino",       "كابتشينو بندق",        560, 350, 140, 280, img.cappuccinoSachets),
  packed("almond-cappuccino",         "cappuccino", "Almond Cappuccino",         "كابتشينو لوز",         560, 350, 140, 280, img.cappuccinoSachets),
  packed("pistachio-cappuccino",      "cappuccino", "Pistachio Cappuccino",      "كابتشينو فستق",        560, 350, 140, 280, img.cappuccinoSachets),
  packed("chocolate-cappuccino",      "cappuccino", "Chocolate Cappuccino",      "كابتشينو شيكولاتة",    560, 350, 140, 280, img.cappuccinoSachets),
  packed("nutella-cappuccino",        "cappuccino", "Nutella Cappuccino",        "كابتشينو نوتيلا",      560, 350, 140, 280, img.cappuccinoSachets),
  packed("oreo-cappuccino",           "cappuccino", "Oreo Cappuccino",           "كابتشينو أوريو",       560, 350, 140, 280, img.cappuccinoSachets),
  packed("lotus-cappuccino",          "cappuccino", "Lotus Cappuccino",          "كابتشينو لوتس",        560, 350, 140, 280, img.cappuccinoSachets),
  packed("cinnamon-roll-cappuccino",  "cappuccino", "Cinnamon Roll Cappuccino",  "كابتشينو سينابون",     560, 350, 140, 280, img.cappuccinoSachets),
  packed("coconut-cappuccino",        "cappuccino", "Coconut Cappuccino",        "كابتشينو جوز الهند",   560, 350, 140, 280, img.cappuccinoSachets),
  packed("vanilla-cappuccino",        "cappuccino", "Vanilla Cappuccino",        "كابتشينو فانيلا",      560, 350, 140, 280, img.cappuccinoSachets),
  packed("caramel-cappuccino",        "cappuccino", "Caramel Cappuccino",        "كابتشينو كراميل",      560, 350, 140, 280, img.cappuccinoSachets),
  packed("mocha-cappuccino",          "cappuccino", "Mocha Cappuccino",          "كابتشينو موكا",        560, 350, 140, 280, img.cappuccinoSachets),
  packed("apple-shisha-cappuccino",   "cappuccino", "Apple Shisha Cappuccino",   "كابتشينو شيشة تفاح",   560, 350, 140, 280, img.cappuccinoSachets),
  packed("grape-shisha-cappuccino",   "cappuccino", "Grape Shisha Cappuccino",   "كابتشينو شيشة عنب",    560, 350, 140, 280, img.cappuccinoSachets),
  packed("hot-cider-cappuccino",      "cappuccino", "Hot Cider Cappuccino",      "كابتشينو هوت سيدر",    560, 350, 140, 280, img.cappuccinoSachets),

  // ── Hot Chocolate ───────────────────────────────────────────────────────────
  packed("original-hot-chocolate",       "hot-chocolate", "Original Hot Chocolate",       "هوت شوكليت أوريجينال",  350, 230,  90, 180, img.cappuccinoSachets),
  packed("strawberry-hot-chocolate",     "hot-chocolate", "Strawberry Hot Chocolate",     "هوت شوكليت فراولة",     400, 250, 100, 200, img.cappuccinoSachets),
  packed("banana-hot-chocolate",         "hot-chocolate", "Banana Hot Chocolate",         "هوت شوكليت موز",        400, 250, 100, 200, img.cappuccinoSachets),
  packed("mango-hot-chocolate",          "hot-chocolate", "Mango Hot Chocolate",          "هوت شوكليت مانجو",      400, 250, 100, 200, img.cappuccinoSachets),
  packed("peach-hot-chocolate",          "hot-chocolate", "Peach Hot Chocolate",          "هوت شوكليت خوخ",        400, 250, 100, 200, img.cappuccinoSachets),
  packed("raspberry-hot-chocolate",      "hot-chocolate", "Raspberry Hot Chocolate",      "هوت شوكليت توت",        400, 250, 100, 200, img.cappuccinoSachets),
  packed("blueberry-hot-chocolate",      "hot-chocolate", "Blueberry Hot Chocolate",      "هوت شوكليت توت أزرق",   400, 250, 100, 200, img.cappuccinoSachets),
  packed("cherry-hot-chocolate",         "hot-chocolate", "Cherry Hot Chocolate",         "هوت شوكليت كريز",       400, 250, 100, 200, img.cappuccinoSachets),
  packed("apple-hot-chocolate",          "hot-chocolate", "Apple Hot Chocolate",          "هوت شوكليت تفاح",       400, 250, 100, 200, img.cappuccinoSachets),
  packed("grape-hot-chocolate",          "hot-chocolate", "Grape Hot Chocolate",          "هوت شوكليت عنب",        400, 250, 100, 200, img.cappuccinoSachets),
  packed("watermelon-hot-chocolate",     "hot-chocolate", "Watermelon Hot Chocolate",     "هوت شوكليت بطيخ",       400, 250, 100, 200, img.cappuccinoSachets),
  packed("guava-hot-chocolate",          "hot-chocolate", "Guava Hot Chocolate",          "هوت شوكليت جوافة",      400, 250, 100, 200, img.cappuccinoSachets),
  packed("pineapple-hot-chocolate",      "hot-chocolate", "Pineapple Hot Chocolate",      "هوت شوكليت أناناس",     400, 250, 100, 200, img.cappuccinoSachets),
  packed("orange-hot-chocolate",         "hot-chocolate", "Orange Hot Chocolate",         "هوت شوكليت برتقال",     400, 250, 100, 200, img.cappuccinoSachets),
  packed("hazelnut-hot-chocolate",       "hot-chocolate", "Hazelnut Hot Chocolate",       "هوت شوكليت بندق",       400, 250, 100, 200, img.cappuccinoSachets),
  packed("almond-hot-chocolate",         "hot-chocolate", "Almond Hot Chocolate",         "هوت شوكليت لوز",        400, 250, 100, 200, img.cappuccinoSachets),
  packed("pistachio-hot-chocolate",      "hot-chocolate", "Pistachio Hot Chocolate",      "هوت شوكليت فستق",       400, 250, 100, 200, img.cappuccinoSachets),
  packed("chocolate-hot-chocolate",      "hot-chocolate", "Chocolate Hot Chocolate",      "هوت شوكليت شيكولاتة",   400, 250, 100, 200, img.cappuccinoSachets),
  packed("nutella-hot-chocolate",        "hot-chocolate", "Nutella Hot Chocolate",        "هوت شوكليت نوتيلا",     400, 250, 100, 200, img.cappuccinoSachets),
  packed("oreo-hot-chocolate",           "hot-chocolate", "Oreo Hot Chocolate",           "هوت شوكليت أوريو",      400, 250, 100, 200, img.cappuccinoSachets),
  packed("lotus-hot-chocolate",          "hot-chocolate", "Lotus Hot Chocolate",          "هوت شوكليت لوتس",       400, 250, 100, 200, img.cappuccinoSachets),
  packed("cinnamon-roll-hot-chocolate",  "hot-chocolate", "Cinnamon Roll Hot Chocolate",  "هوت شوكليت سينابون",    400, 250, 100, 200, img.cappuccinoSachets),
  packed("coconut-hot-chocolate",        "hot-chocolate", "Coconut Hot Chocolate",        "هوت شوكليت جوز الهند",  400, 250, 100, 200, img.cappuccinoSachets),
  packed("vanilla-hot-chocolate",        "hot-chocolate", "Vanilla Hot Chocolate",        "هوت شوكليت فانيلا",     400, 250, 100, 200, img.cappuccinoSachets),
  packed("caramel-hot-chocolate",        "hot-chocolate", "Caramel Hot Chocolate",        "هوت شوكليت كراميل",     400, 250, 100, 200, img.cappuccinoSachets),
  packed("mocha-hot-chocolate",          "hot-chocolate", "Mocha Hot Chocolate",          "هوت شوكليت موكا",       400, 250, 100, 200, img.cappuccinoSachets),
  packed("apple-shisha-hot-chocolate",   "hot-chocolate", "Apple Shisha Hot Chocolate",   "هوت شوكليت شيشة تفاح",  400, 250, 100, 200, img.cappuccinoSachets),
  packed("grape-shisha-hot-chocolate",   "hot-chocolate", "Grape Shisha Hot Chocolate",   "هوت شوكليت شيشة عنب",   400, 250, 100, 200, img.cappuccinoSachets),
  packed("hot-cider-hot-chocolate",      "hot-chocolate", "Hot Cider Hot Chocolate",      "هوت شوكليت هوت سيدر",   400, 250, 100, 200, img.cappuccinoSachets),

  // ── Flavor Coffee ───────────────────────────────────────────────────────────
  packed("french-coffee",              "flavor-coffee", "French Coffee",              "قهوة فرنساوي",       390, 230, 100, 200, img.flavorPouch),
  packed("strawberry-coffee",          "flavor-coffee", "Strawberry Coffee",          "قهوة فراولة",        390, 230, 100, 200, img.flavorPouch),
  packed("banana-coffee",              "flavor-coffee", "Banana Coffee",              "قهوة موز",           390, 230, 100, 200, img.flavorPouch),
  packed("mango-coffee",               "flavor-coffee", "Mango Coffee",               "قهوة مانجو",         390, 230, 100, 200, img.flavorPouch),
  packed("peach-coffee",               "flavor-coffee", "Peach Coffee",               "قهوة خوخ",           390, 230, 100, 200, img.flavorPouch),
  packed("raspberry-coffee",           "flavor-coffee", "Raspberry Coffee",           "قهوة توت",           390, 230, 100, 200, img.flavorPouch),
  packed("cherry-coffee",              "flavor-coffee", "Cherry Coffee",              "قهوة كريز",          390, 230, 100, 200, img.flavorPouch),
  packed("apple-coffee",               "flavor-coffee", "Apple Coffee",               "قهوة تفاح",          390, 230, 100, 200, img.flavorPouch),
  packed("grape-coffee",               "flavor-coffee", "Grape Coffee",               "قهوة عنب",           390, 230, 100, 200, img.flavorPouch),
  packed("watermelon-coffee",          "flavor-coffee", "Watermelon Coffee",          "قهوة بطيخ",          390, 230, 100, 200, img.flavorPouch),
  packed("guava-coffee",               "flavor-coffee", "Guava Coffee",               "قهوة جوافة",         390, 230, 100, 200, img.flavorPouch),
  packed("pineapple-coffee",           "flavor-coffee", "Pineapple Coffee",           "قهوة أناناس",        390, 230, 100, 200, img.flavorPouch),
  packed("orange-coffee",              "flavor-coffee", "Orange Coffee",              "قهوة برتقال",        390, 230, 100, 200, img.flavorPouch),
  packed("hazelnut-coffee",            "flavor-coffee", "Hazelnut Coffee",            "قهوة بندق",          390, 230, 100, 200, img.flavorPouch),
  packed("almond-coffee",              "flavor-coffee", "Almond Coffee",              "قهوة لوز",           390, 230, 100, 200, img.flavorPouch),
  packed("pistachio-coffee",           "flavor-coffee", "Pistachio Coffee",           "قهوة فستق",          390, 230, 100, 200, img.flavorPouch),
  packed("chocolate-coffee",           "flavor-coffee", "Chocolate Coffee",           "قهوة شيكولاتة",      390, 230, 100, 200, img.flavorPouch),
  packed("nutella-coffee",             "flavor-coffee", "Nutella Coffee",             "قهوة نوتيلا",        390, 230, 100, 200, img.flavorPouch),
  packed("oreo-coffee",                "flavor-coffee", "Oreo Coffee",                "قهوة أوريو",         390, 230, 100, 200, img.flavorPouch),
  packed("lotus-coffee",               "flavor-coffee", "Lotus Coffee",               "قهوة لوتس",          390, 230, 100, 200, img.flavorPouch),
  packed("cinnamon-roll-coffee",       "flavor-coffee", "Cinnamon Roll Coffee",       "قهوة سينابون",       390, 230, 100, 200, img.flavorPouch),
  packed("coconut-coffee",             "flavor-coffee", "Coconut Coffee",             "قهوة جوز الهند",     390, 230, 100, 200, img.flavorPouch),
  packed("vanilla-coffee",             "flavor-coffee", "Vanilla Coffee",             "قهوة فانيلا",        390, 230, 100, 200, img.flavorPouch),
  packed("caramel-coffee",             "flavor-coffee", "Caramel Coffee",             "قهوة كراميل",        390, 230, 100, 200, img.flavorPouch),
  packed("mocha-coffee",               "flavor-coffee", "Mocha Coffee",               "قهوة موكا",          390, 230, 100, 200, img.flavorPouch),
  packed("apple-shisha-coffee",        "flavor-coffee", "Apple Shisha Coffee",        "قهوة شيشة تفاح",     390, 230, 100, 200, img.flavorPouch),
  packed("grape-shisha-coffee",        "flavor-coffee", "Grape Shisha Coffee",        "قهوة شيشة عنب",      390, 230, 100, 200, img.flavorPouch),
  packed("hot-cider-coffee",           "flavor-coffee", "Hot Cider Coffee",           "قهوة هوت سيدر",      390, 230, 100, 200, img.flavorPouch),
  packed("hazelnut-chunk-coffee",      "flavor-coffee", "Hazelnut Chunk Coffee",      "قهوة بندق قطع",      390, 230, 100, 200, img.flavorPouch),
  packed("chocolate-chunk-coffee",     "flavor-coffee", "Chocolate Chunk Coffee",     "قهوة شيكولاتة قطع",  390, 230, 100, 200, img.flavorPouch),

];
