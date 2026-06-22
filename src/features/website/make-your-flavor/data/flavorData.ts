// ─── Types ────────────────────────────────────────────────────────────────────

export type FlavorCategory = "chocolate" | "fruits" | "nuts" | "desserts" | "coffee-shisha";

export type FlavorMetricKey =
  | "sweetness"
  | "creaminess"
  | "chocolate"
  | "fruitiness"
  | "nutty"
  | "intensity";

export type FlavorMetrics = Record<FlavorMetricKey, number>;

export type FlavorBase = {
  id: string;
  name: { en: string; ar: string };
  pricePerKg: number;
  hint: { en: string; ar: string };
};

export type FlavorItem = {
  id: string;
  name: { en: string; ar: string };
  hint: { en: string; ar: string };
  addOnPerKg: number;
  category: FlavorCategory;
  metrics: FlavorMetrics;
};

export type FlavorPreset = {
  id: string;
  name: { en: string; ar: string };
  mood: { en: string; ar: string };
  flavorIds: string[];
  defaultBaseId: string;
};

export type PackageWeight = "250g" | "500g" | "1kg";

// ─── Package weights ──────────────────────────────────────────────────────────

export const packageWeights: Record<PackageWeight, number> = {
  "250g": 0.25,
  "500g": 0.50,
  "1kg":  1.00,
};

// ─── Labels ───────────────────────────────────────────────────────────────────

export const metricLabels: Record<FlavorMetricKey, { en: string; ar: string }> = {
  sweetness:  { en: "Sweetness",  ar: "الحلاوة"    },
  creaminess: { en: "Creaminess", ar: "الكريمية"   },
  chocolate:  { en: "Chocolate",  ar: "الشوكولاتة" },
  fruitiness: { en: "Fruitiness", ar: "الفاكهية"   },
  nutty:      { en: "Nutty",      ar: "المكسرات"   },
  intensity:  { en: "Intensity",  ar: "قوة النكهة" },
};

export const categoryLabels: Record<FlavorCategory, { en: string; ar: string }> = {
  chocolate:        { en: "Chocolate",       ar: "شوكولاتة"   },
  fruits:           { en: "Fruits",          ar: "فاكهة"      },
  nuts:             { en: "Nuts",            ar: "مكسرات"     },
  desserts:         { en: "Desserts",        ar: "حلويات"     },
  "coffee-shisha":  { en: "Coffee & Shisha", ar: "قهوة وشيشة" },
};

// ─── Bases (4) ───────────────────────────────────────────────────────────────

export const flavorBases: FlavorBase[] = [
  {
    id: "turkish",
    name: { en: "Turkish Coffee", ar: "قهوة تركي" },
    pricePerKg: 400,
    hint: { en: "Bold, dark roast tradition", ar: "تحميص غامق، أصيل وقوي" },
  },
  {
    id: "cappuccino",
    name: { en: "Cappuccino", ar: "كابتشينو" },
    pricePerKg: 500,
    hint: { en: "Creamy, smooth, premium", ar: "كريمي، ناعم، فاخر" },
  },
  {
    id: "coffee-mix",
    name: { en: "Coffee Mix", ar: "كوفي ميكس" },
    pricePerKg: 450,
    hint: { en: "Balanced, versatile blend", ar: "متوازن، متعدد الاستخدامات" },
  },
  {
    id: "hot-chocolate",
    name: { en: "Hot Chocolate", ar: "هوت شوكليت" },
    pricePerKg: 450,
    hint: { en: "Rich cocoa, velvety base", ar: "كاكاو غني، قاعدة مخملية" },
  },
];

// ─── Flavors (30) ─────────────────────────────────────────────────────────────
// All values are 0–5 and can be adjusted freely in this file.

export const flavorItems: FlavorItem[] = [

  // ── Chocolate — 3 ────────────────────────────────────────────────────────────
  {
    id: "chocolate-pieces",
    name: { en: "Chocolate Pieces", ar: "شيكولاتة قطع" },
    hint: { en: "Dark cocoa with a rich, slightly bitter depth", ar: "كاكاو غامق بعمق غني وخفيف المرارة" },
    addOnPerKg: 85,
    category: "chocolate",
    metrics: { sweetness: 3, creaminess: 2, chocolate: 5, fruitiness: 0, nutty: 1, intensity: 3 },
  },
  {
    id: "chocolate",
    name: { en: "Chocolate", ar: "شيكولاتة" },
    hint: { en: "Classic cocoa warmth, smooth and full", ar: "دفء الكاكاو الكلاسيكي، ناعم وكامل" },
    addOnPerKg: 70,
    category: "chocolate",
    metrics: { sweetness: 3, creaminess: 2, chocolate: 5, fruitiness: 0, nutty: 0, intensity: 3 },
  },
  {
    id: "nutella",
    name: { en: "Nutella", ar: "نوتيلا" },
    hint: { en: "Hazelnut chocolate, creamy and indulgent", ar: "شوكولاتة بالبندق، كريمية ومدللة" },
    addOnPerKg: 70,
    category: "chocolate",
    metrics: { sweetness: 4, creaminess: 4, chocolate: 4, fruitiness: 0, nutty: 3, intensity: 3 },
  },

  // ── Fruits — 13 ──────────────────────────────────────────────────────────────
  {
    id: "strawberry",
    name: { en: "Strawberry", ar: "فراولة" },
    hint: { en: "Fresh berry sweetness, lightly tart", ar: "حلاوة الفراولة الطازجة، خفيفة الحموضة" },
    addOnPerKg: 70,
    category: "fruits",
    metrics: { sweetness: 4, creaminess: 1, chocolate: 0, fruitiness: 5, nutty: 0, intensity: 3 },
  },
  {
    id: "banana",
    name: { en: "Banana", ar: "موز" },
    hint: { en: "Soft tropical sweetness, smooth finish", ar: "حلاوة استوائية ناعمة، نهاية سلسة" },
    addOnPerKg: 70,
    category: "fruits",
    metrics: { sweetness: 4, creaminess: 2, chocolate: 0, fruitiness: 4, nutty: 0, intensity: 2 },
  },
  {
    id: "mango",
    name: { en: "Mango", ar: "مانجو" },
    hint: { en: "Vibrant tropical fruit, rich and juicy", ar: "فاكهة استوائية حيوية، غنية وعصيرية" },
    addOnPerKg: 70,
    category: "fruits",
    metrics: { sweetness: 4, creaminess: 1, chocolate: 0, fruitiness: 5, nutty: 0, intensity: 3 },
  },
  {
    id: "peach",
    name: { en: "Peach", ar: "خوخ" },
    hint: { en: "Delicate stone fruit, mild and fragrant", ar: "فاكهة حجرية رقيقة، خفيفة وعطرية" },
    addOnPerKg: 70,
    category: "fruits",
    metrics: { sweetness: 3, creaminess: 1, chocolate: 0, fruitiness: 5, nutty: 0, intensity: 2 },
  },
  {
    id: "berries",
    name: { en: "Berries", ar: "توت" },
    hint: { en: "Mixed forest berries, bright and bold", ar: "توت مختلط، حيوي ومنعش" },
    addOnPerKg: 70,
    category: "fruits",
    metrics: { sweetness: 3, creaminess: 0, chocolate: 0, fruitiness: 5, nutty: 0, intensity: 3 },
  },
  {
    id: "blueberry",
    name: { en: "Blueberry", ar: "توت أزرق" },
    hint: { en: "Wild berries, deep colour with gentle tartness", ar: "توت بري، لون عميق وحموضة خفيفة" },
    addOnPerKg: 70,
    category: "fruits",
    metrics: { sweetness: 3, creaminess: 0, chocolate: 0, fruitiness: 5, nutty: 0, intensity: 3 },
  },
  {
    id: "cherry",
    name: { en: "Cherry", ar: "كرز" },
    hint: { en: "Dark cherry, sweet with a subtle tang", ar: "كرز داكن، حلو بلمسة حامضة خفيفة" },
    addOnPerKg: 70,
    category: "fruits",
    metrics: { sweetness: 3, creaminess: 0, chocolate: 0, fruitiness: 5, nutty: 0, intensity: 3 },
  },
  {
    id: "apple",
    name: { en: "Apple", ar: "تفاح" },
    hint: { en: "Crisp orchard apple, clean and refreshing", ar: "تفاح منعش، نظيف ومنتعش" },
    addOnPerKg: 70,
    category: "fruits",
    metrics: { sweetness: 3, creaminess: 0, chocolate: 0, fruitiness: 4, nutty: 0, intensity: 2 },
  },
  {
    id: "grape",
    name: { en: "Grape", ar: "عنب" },
    hint: { en: "Ripe vineyard grape, round and fruity", ar: "عنب ناضج، دائري وفواكهي" },
    addOnPerKg: 70,
    category: "fruits",
    metrics: { sweetness: 3, creaminess: 0, chocolate: 0, fruitiness: 4, nutty: 0, intensity: 2 },
  },
  {
    id: "watermelon",
    name: { en: "Watermelon", ar: "بطيخ" },
    hint: { en: "Summer freshness, light and juicy", ar: "انتعاش صيفي، خفيف وعصيري" },
    addOnPerKg: 70,
    category: "fruits",
    metrics: { sweetness: 3, creaminess: 0, chocolate: 0, fruitiness: 4, nutty: 0, intensity: 2 },
  },
  {
    id: "guava",
    name: { en: "Guava", ar: "جوافة" },
    hint: { en: "Tropical guava, fragrant and exotic", ar: "جوافة استوائية، عطرية وغريبة" },
    addOnPerKg: 70,
    category: "fruits",
    metrics: { sweetness: 3, creaminess: 0, chocolate: 0, fruitiness: 4, nutty: 0, intensity: 2 },
  },
  {
    id: "pineapple",
    name: { en: "Pineapple", ar: "أناناس" },
    hint: { en: "Bright citrus tropics, sharp and sweet", ar: "حمضيات استوائية حادة وحلوة" },
    addOnPerKg: 70,
    category: "fruits",
    metrics: { sweetness: 3, creaminess: 0, chocolate: 0, fruitiness: 5, nutty: 0, intensity: 3 },
  },
  {
    id: "orange",
    name: { en: "Orange", ar: "برتقال" },
    hint: { en: "Citrus zest, bright and lightly tangy", ar: "نكهة حمضيات مشرقة وخفيفة" },
    addOnPerKg: 70,
    category: "fruits",
    metrics: { sweetness: 3, creaminess: 0, chocolate: 0, fruitiness: 4, nutty: 0, intensity: 3 },
  },

  // ── Nuts — 5 ─────────────────────────────────────────────────────────────────
  {
    id: "hazelnut-pieces",
    name: { en: "Hazelnut Pieces", ar: "بندق قطع" },
    hint: { en: "Roasted hazelnut with warm toasty depth", ar: "بندق محمص بعمق دافئ" },
    addOnPerKg: 85,
    category: "nuts",
    metrics: { sweetness: 2, creaminess: 2, chocolate: 1, fruitiness: 0, nutty: 5, intensity: 3 },
  },
  {
    id: "almond",
    name: { en: "Almond", ar: "لوز" },
    hint: { en: "Mild roasted almond, clean and dry", ar: "لوز محمص خفيف، نظيف وجاف" },
    addOnPerKg: 70,
    category: "nuts",
    metrics: { sweetness: 2, creaminess: 1, chocolate: 0, fruitiness: 0, nutty: 5, intensity: 2 },
  },
  {
    id: "pistachio",
    name: { en: "Pistachio", ar: "فستق" },
    hint: { en: "Lightly sweet nut with subtle earthy depth", ar: "مكسر خفيف الحلاوة بعمق ترابي" },
    addOnPerKg: 70,
    category: "nuts",
    metrics: { sweetness: 2, creaminess: 2, chocolate: 0, fruitiness: 0, nutty: 5, intensity: 2 },
  },
  {
    id: "hazelnut",
    name: { en: "Hazelnut", ar: "بندق" },
    hint: { en: "Smooth roasted hazelnut, rich and nutty", ar: "بندق محمص ناعم، غني بنكهة المكسرات" },
    addOnPerKg: 70,
    category: "nuts",
    metrics: { sweetness: 2, creaminess: 2, chocolate: 1, fruitiness: 0, nutty: 5, intensity: 2 },
  },
  {
    id: "coconut",
    name: { en: "Coconut", ar: "جوز الهند" },
    hint: { en: "Creamy tropical nut, sweet and velvety", ar: "مكسر استوائي كريمي، حلو ومخملي" },
    addOnPerKg: 70,
    category: "nuts",
    metrics: { sweetness: 3, creaminess: 4, chocolate: 0, fruitiness: 2, nutty: 3, intensity: 2 },
  },

  // ── Desserts — 5 ─────────────────────────────────────────────────────────────
  {
    id: "oreo",
    name: { en: "Oreo", ar: "أوريو" },
    hint: { en: "Dark cocoa cookie with a creamy centre", ar: "بسكويت كاكاو غامق بمركز كريمي" },
    addOnPerKg: 70,
    category: "desserts",
    metrics: { sweetness: 4, creaminess: 3, chocolate: 3, fruitiness: 0, nutty: 0, intensity: 2 },
  },
  {
    id: "lotus",
    name: { en: "Lotus", ar: "لوتس" },
    hint: { en: "Caramelised biscuit, warm and lightly spiced", ar: "بسكويت كراميل، دافئ ومتبل بخفة" },
    addOnPerKg: 70,
    category: "desserts",
    metrics: { sweetness: 5, creaminess: 4, chocolate: 1, fruitiness: 0, nutty: 2, intensity: 3 },
  },
  {
    id: "cinnabon",
    name: { en: "Cinnabon", ar: "سينابون" },
    hint: { en: "Warm cinnamon roll, sweet with spiced intensity", ar: "لفة قرفة دافئة، حلوة وذات كثافة متبلة" },
    addOnPerKg: 70,
    category: "desserts",
    metrics: { sweetness: 5, creaminess: 3, chocolate: 0, fruitiness: 0, nutty: 0, intensity: 4 },
  },
  {
    id: "caramel",
    name: { en: "Caramel", ar: "كراميل" },
    hint: { en: "Buttery caramel, golden and silky smooth", ar: "كراميل زبداني ذهبي وحريري" },
    addOnPerKg: 70,
    category: "desserts",
    metrics: { sweetness: 5, creaminess: 4, chocolate: 1, fruitiness: 0, nutty: 1, intensity: 3 },
  },
  {
    id: "vanilla",
    name: { en: "Vanilla", ar: "فانيلا" },
    hint: { en: "Soft vanilla cream, delicate and pure", ar: "كريمة فانيلا ناعمة، رقيقة ونقية" },
    addOnPerKg: 70,
    category: "desserts",
    metrics: { sweetness: 3, creaminess: 5, chocolate: 0, fruitiness: 1, nutty: 0, intensity: 2 },
  },

  // ── Coffee & Shisha — 4 ───────────────────────────────────────────────────────
  {
    id: "mocha",
    name: { en: "Mocha", ar: "موكا" },
    hint: { en: "Espresso meets chocolate, bold and deep", ar: "إسبريسو وشوكولاتة، جريء وعميق" },
    addOnPerKg: 70,
    category: "coffee-shisha",
    metrics: { sweetness: 2, creaminess: 2, chocolate: 3, fruitiness: 0, nutty: 0, intensity: 4 },
  },
  {
    id: "apple-shisha",
    name: { en: "Apple Shisha", ar: "شيشة تفاح" },
    hint: { en: "Sweet apple smoke, aromatic and intense", ar: "دخان تفاح حلو، عطري ومكثف" },
    addOnPerKg: 70,
    category: "coffee-shisha",
    metrics: { sweetness: 3, creaminess: 0, chocolate: 0, fruitiness: 3, nutty: 0, intensity: 5 },
  },
  {
    id: "grape-shisha",
    name: { en: "Grape Shisha", ar: "شيشة عنب" },
    hint: { en: "Dark grape smoke, rich and full-bodied", ar: "دخان عنب داكن، غني وممتلئ القوام" },
    addOnPerKg: 70,
    category: "coffee-shisha",
    metrics: { sweetness: 3, creaminess: 0, chocolate: 0, fruitiness: 3, nutty: 0, intensity: 5 },
  },
  {
    id: "hot-cider",
    name: { en: "Hot Cider", ar: "هوت سيدر" },
    hint: { en: "Spiced apple cider, warm and aromatic", ar: "عصير تفاح متبل، دافئ وعطري" },
    addOnPerKg: 70,
    category: "coffee-shisha",
    metrics: { sweetness: 3, creaminess: 1, chocolate: 0, fruitiness: 2, nutty: 0, intensity: 4 },
  },
];

// ─── Presets (8) ─────────────────────────────────────────────────────────────

export const flavorPresets: FlavorPreset[] = [
  {
    id: "dessert-mix",
    name: { en: "Dessert Mix", ar: "خلطة حلويات" },
    mood: { en: "Sweet & indulgent", ar: "حلو ومدلل" },
    flavorIds: ["lotus", "oreo", "caramel"],
    defaultBaseId: "coffee-mix",
  },
  {
    id: "nutty-classic",
    name: { en: "Nutty Classic", ar: "كلاسيك مكسرات" },
    mood: { en: "Warm & nutty depth", ar: "دفء وعمق المكسرات" },
    flavorIds: ["hazelnut", "almond", "pistachio"],
    defaultBaseId: "cappuccino",
  },
  {
    id: "chocolate-lover",
    name: { en: "Chocolate Lover", ar: "عاشق الشوكولاتة" },
    mood: { en: "Rich & decadent", ar: "غني ومكثف" },
    flavorIds: ["chocolate", "nutella", "chocolate-pieces"],
    defaultBaseId: "cappuccino",
  },
  {
    id: "fruity-mix",
    name: { en: "Fruity Mix", ar: "خلطة فاكهة" },
    mood: { en: "Fresh & vibrant", ar: "منعش وحيوي" },
    flavorIds: ["strawberry", "mango", "blueberry"],
    defaultBaseId: "turkish",
  },
  {
    id: "cafe-style",
    name: { en: "Café Style", ar: "ستايل كافيه" },
    mood: { en: "Smooth café experience", ar: "تجربة كافيه ناعمة" },
    flavorIds: ["mocha", "vanilla", "caramel"],
    defaultBaseId: "coffee-mix",
  },
  {
    id: "shisha-mood",
    name: { en: "Shisha Mood", ar: "موود شيشة" },
    mood: { en: "Intense & aromatic", ar: "مكثف وعطري" },
    flavorIds: ["apple-shisha", "grape-shisha"],
    defaultBaseId: "turkish",
  },
  {
    id: "tropical",
    name: { en: "Tropical", ar: "تروبيكال" },
    mood: { en: "Exotic & creamy", ar: "غريب وكريمي" },
    flavorIds: ["coconut", "pineapple", "mango"],
    defaultBaseId: "hot-chocolate",
  },
  {
    id: "warm-winter",
    name: { en: "Warm Winter", ar: "شتاء دافئ" },
    mood: { en: "Cozy & warming", ar: "دافئ ومريح" },
    flavorIds: ["cinnabon", "hot-cider", "caramel"],
    defaultBaseId: "hot-chocolate",
  },
];
