import type {
  HeroSlide,
  HeroStat,
  StoryCopy,
  VisualCategory,
  VisualContactItem,
  VisualFeature,
  VisualJournalItem,
  VisualProduct,
  VisualTestimonial,
} from "@/types/homepage";

// ─── Asset Map ────────────────────────────────────────────────────────────────
// Single source of truth for all image paths.
// Future: replace values here when Media Studio is connected.

export const assets = {
  hero: {
    darkRoast: "/assets/hero/dark-roast.png",
  },
  story: {
    roastery: "/assets/story/roastery.png",
  },
  categories: {
    turkish: "/assets/categories/turkish.png",
    espresso: "/assets/categories/espresso.png",
    flavor: "/assets/categories/flavor.png",
    cappuccino: "/assets/categories/cappuccino.png",
  },
  products: {
    classicPouch: "/assets/products/classic-pouch.png",
    espressoPouch: "/assets/products/espresso-pouch.png",
    flavorPouch: "/assets/products/flavor-pouch.png",
    cappuccinoSachets: "/assets/products/cappuccino-sachets.png",
  },
} as const;

// ─── Hero Slides ──────────────────────────────────────────────────────────────

export const heroSlides: HeroSlide[] = [
  {
    id: "hero-dark-roast",
    image: assets.hero.darkRoast,
    title: {
      en: "Coffee Crafted for Quiet Luxury",
      ar: "قهوة صُنعت للرفاهية الهادئة",
    },
    subtitle: {
      en: "Selected beans, slow-roasted for depth, warmth, and a finish that lingers beautifully.",
      ar: "حبوب مختارة بعناية، نحمصها بهدوء لتمنحك عمقًا ودفئًا ونهاية لا تُنسى.",
    },
    primaryAction: { en: "Shop Coffee", ar: "تسوق القهوة" },
    primaryHref: "/products",
    secondaryAction: { en: "Our Story", ar: "قصتنا" },
    secondaryHref: "/about",
  },
  {
    id: "hero-roastery",
    image: assets.story.roastery,
    title: {
      en: "Slow Roasts for Warmer Rituals",
      ar: "تحميص هادئ لطقوس أكثر دفئًا",
    },
    subtitle: {
      en: "A darker coffee mood built around aroma, balance, and the comfort of a daily cup.",
      ar: "مزاج قهوة داكن مبني على الرائحة والتوازن وراحة الكوب اليومي.",
    },
    primaryAction: { en: "Explore Blends", ar: "استكشف الخلطات" },
    primaryHref: "/products",
    secondaryAction: { en: "Read Story", ar: "اقرأ القصة" },
    secondaryHref: "/about",
  },
  {
    id: "hero-espresso",
    image: assets.categories.espresso,
    title: {
      en: "Espresso Blends with a Velvet Finish",
      ar: "خلطات إسبريسو بنهاية مخملية",
    },
    subtitle: {
      en: "Clean crema, polished body, and a refined finish shaped for quiet moments.",
      ar: "كريما نظيفة، قوام مصقول، ونهاية راقية مصممة للحظات الهادئة.",
    },
    primaryAction: { en: "Shop Espresso", ar: "تسوق الإسبريسو" },
    primaryHref: "/products?category=espresso-blends",
    secondaryAction: { en: "Make Yours", ar: "اصنع خلطتك" },
    secondaryHref: "/make-your-espresso",
  },
];

// ─── Hero Stats ───────────────────────────────────────────────────────────────

export const heroStats: HeroStat[] = [
  { value: "15+", label: { en: "Origins Curated", ar: "مصادر مختارة" } },
  { value: "72h", label: { en: "Fresh Roast Window", ar: "نافذة التحميص الطازج" } },
  { value: "100%", label: { en: "Arabica Focus", ar: "تركيز أرابيكا" } },
];

// ─── Categories ───────────────────────────────────────────────────────────────

export const visualCategories: VisualCategory[] = [
  {
    slug: "turkish-blends",
    name: { en: "Turkish Blends", ar: "خلطات تركي" },
    action: { en: "Explore", ar: "اكتشف" },
    image: assets.categories.turkish,
  },
  {
    slug: "espresso-blends",
    name: { en: "Espresso Blends", ar: "خلطات إسبريسو" },
    action: { en: "Explore", ar: "اكتشف" },
    image: assets.categories.espresso,
  },
  {
    slug: "make-your-espresso",
    name: { en: "Make Your Espresso", ar: "اصنع إسبريسو خاصتك" },
    action: { en: "Create Blend", ar: "ابنِ خلطتك" },
    image: assets.products.espressoPouch,
    tone: "highlight",
  },
  {
    slug: "easy-coffee",
    name: { en: "Easy Coffee", ar: "إيزي كوفي" },
    action: { en: "Explore", ar: "اكتشف" },
    image: assets.categories.cappuccino,
  },
  {
    slug: "coffee-mix",
    name: { en: "Coffee Mix", ar: "كوفي ميكس" },
    action: { en: "Explore", ar: "اكتشف" },
    image: assets.products.classicPouch,
  },
  {
    slug: "cappuccino",
    name: { en: "Cappuccino", ar: "كابتشينو" },
    action: { en: "Explore", ar: "اكتشف" },
    image: assets.categories.cappuccino,
  },
  {
    slug: "flavor-coffee",
    name: { en: "Flavor Coffee", ar: "قهوة بالنكهات" },
    action: { en: "Explore", ar: "اكتشف" },
    image: assets.categories.flavor,
  },
];

// ─── Products ─────────────────────────────────────────────────────────────────

export const visualProducts: VisualProduct[] = [
  {
    slug: "signature-dark-roast",
    name: { en: "Signature Dark Roast", ar: "دارك روست المميز" },
    note: {
      en: "Dense aroma, polished body, warm finish.",
      ar: "رائحة كثيفة، قوام ناعم، ونهاية دافئة.",
    },
    image: assets.products.classicPouch,
    badge: { en: "New", ar: "جديد" },
    category: "turkish-blends",
    sizes: [
      { label: "250g", price: "185" },
      { label: "500g", price: "355" },
      { label: "1kg", price: "690" },
    ],
  },
  {
    slug: "velvet-espresso",
    name: { en: "Velvet Espresso", ar: "فيلفت إسبريسو" },
    note: {
      en: "Crema-forward blend with quiet depth.",
      ar: "خلطة كريما واضحة بعمق هادئ.",
    },
    image: assets.products.espressoPouch,
    badge: { en: "Best Seller", ar: "الأكثر مبيعًا" },
    category: "espresso-blends",
    sizes: [
      { label: "250g", price: "210" },
      { label: "500g", price: "405" },
      { label: "1kg", price: "790" },
    ],
  },
  {
    slug: "amber-flavor",
    name: { en: "Amber Flavor", ar: "آمبر فليفر" },
    note: {
      en: "Soft spice notes over a dark roast base.",
      ar: "لمسات توابل ناعمة فوق قاعدة تحميص داكن.",
    },
    image: assets.products.flavorPouch,
    category: "flavor-coffee",
    sizes: [
      { label: "250g", price: "195" },
      { label: "500g", price: "375" },
      { label: "1kg", price: "730" },
    ],
  },
  {
    slug: "cream-cappuccino",
    name: { en: "Cream Cappuccino", ar: "كريم كابتشينو" },
    note: {
      en: "Smooth cup profile with a warm foam finish.",
      ar: "كوب ناعم بطبقة كريمية دافئة.",
    },
    image: assets.products.cappuccinoSachets,
    category: "cappuccino",
    sizes: [
      { label: "250g", price: "165" },
      { label: "500g", price: "315" },
      { label: "1kg", price: "610" },
    ],
  },
];

// ─── Features ─────────────────────────────────────────────────────────────────

export const visualFeatures: VisualFeature[] = [
  {
    icon: "support",
    label: { en: "Genuine Support", ar: "دعم حقيقي" },
    description: {
      en: "We are here whenever your coffee ritual needs care or a question answered.",
      ar: "نحن هنا كلما احتاجت تجربة قهوتك إلى اهتمام أو إجابة.",
    },
  },
  {
    icon: "delivery",
    label: { en: "Delivered to Your Door", ar: "توصيل لباب بيتك" },
    description: {
      en: "Carefully packed orders with a polished delivery experience every time.",
      ar: "طلبات مغلفة بعناية وتجربة توصيل منظمة في كل مرة.",
    },
  },
  {
    icon: "coffee",
    label: { en: "Fresh Roast", ar: "تحميص طازج" },
    description: {
      en: "Coffee prepared to preserve aroma, body, and freshness from the first bag.",
      ar: "قهوة مجهزة للحفاظ على الرائحة والقوام والطزاجة من أول كيس.",
    },
  },
  {
    icon: "quality",
    label: { en: "Premium Quality", ar: "جودة لا تُساوَم" },
    description: {
      en: "Selected beans and packaging that protect every blend from roast to cup.",
      ar: "حبوب مختارة وتغليف يحمي كل خلطة من التحميص حتى الكوب.",
    },
  },
];

// ─── Story ────────────────────────────────────────────────────────────────────

export const storyCopy: StoryCopy = {
  eyebrow: { en: "Our Story", ar: "قصتنا" },
  title: {
    en: "A Warmer Way to Make Coffee",
    ar: "طريقة أدفأ لصناعة القهوة",
  },
  body: {
    en: "Line Coffee is built around calm rituals, selected beans, and a dark premium experience that feels personal from the first aroma.",
    ar: "لاين كوفي مبني حول طقوس هادئة، حبوب مختارة، وتجربة فاخرة داكنة تشعر أنها تخصك من أول رائحة.",
  },
  values: [
    {
      title: { en: "Selected Sources", ar: "مصادر مختارة" },
      description: {
        en: "Blends shaped around balance, aroma, and lasting comfort.",
        ar: "خلطات مصممة لتحقيق التوازن المثالي بين الرائحة والدفء الممتد.",
      },
    },
    {
      title: { en: "Expert Roasting", ar: "تحميص باحترافية" },
      description: {
        en: "Slow roast profiles that bring out each blend's character.",
        ar: "درجات تحميص هادئة ومدروسة تبرز شخصية كل خلطة.",
      },
    },
    {
      title: { en: "Quiet Luxury", ar: "رفاهية هادئة" },
      description: {
        en: "A visual and tasting experience made to feel refined, never loud.",
        ar: "تجربة بصرية ومذاقية راقية — أنيقة دون ضجيج.",
      },
    },
  ],
};

// ─── Journal / Blog ───────────────────────────────────────────────────────────

export const visualJournal: VisualJournalItem[] = [
  {
    slug: "roast-notes",
    title: { en: "Roast Notes", ar: "ملاحظات التحميص" },
    excerpt: {
      en: "Small coffee notes for a warmer daily cup.",
      ar: "ملاحظات قصيرة لكوب يومي أكثر دفئًا وعمقًا.",
    },
    image: assets.story.roastery,
    category: { en: "Craft", ar: "صناعة القهوة" },
  },
  {
    slug: "blend-guide",
    title: { en: "Blend Guide", ar: "دليل الخلطات" },
    excerpt: {
      en: "A quick guide to matching roast depth with your daily ritual.",
      ar: "دليل سريع لاختيار عمق التحميص المناسب لطقسك اليومي.",
    },
    image: assets.categories.espresso,
    category: { en: "Guide", ar: "أدلة" },
  },
  {
    slug: "freshness",
    title: { en: "Keeping It Fresh", ar: "الحفاظ على الطزاجة" },
    excerpt: {
      en: "How careful storage preserves aroma and body in every bag.",
      ar: "كيف يساعد التخزين الصحيح في الحفاظ على رائحة البن وقوامه.",
    },
    image: assets.products.classicPouch,
    category: { en: "Tips", ar: "نصائح" },
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────

export const visualTestimonials: VisualTestimonial[] = [
  {
    name: { en: "Mariam Hassan", ar: "مريم حسن" },
    meta: { en: "Home brewer · Cairo", ar: "تحضير منزلي · القاهرة" },
    quote: {
      en: "The roast arrives fresh and beautifully balanced. It turned my morning coffee into a quiet little ritual.",
      ar: "وصلت القهوة طازجة ومتوازنة تمامًا. أصبحت قهوتي الصباحية طقسًا هادئًا أنتظره كل يوم.",
    },
    rating: 5,
  },
  {
    name: { en: "Omar Nabil", ar: "عمر نبيل" },
    meta: { en: "Espresso lover · Alexandria", ar: "محب للإسبريسو · الإسكندرية" },
    quote: {
      en: "Smooth crema, warm aroma, and a finish that feels premium without being heavy.",
      ar: "كريما ناعمة، رائحة دافئة، ونهاية فاخرة بلا ثقل — تجربة إسبريسو استثنائية.",
    },
    rating: 5,
  },
  {
    name: { en: "Nour El-Din", ar: "نور الدين" },
    meta: { en: "Filter coffee fan · Giza", ar: "محب القهوة المقطرة · الجيزة" },
    quote: {
      en: "Elegant packaging, clear flavor notes, and delivery that kept the beans perfectly fragrant.",
      ar: "تغليف أنيق، نكهات واضحة، والتوصيل حافظ على رائحة البن ونضارته بشكل مثالي.",
    },
    rating: 5,
  },
];

// ─── Contact ──────────────────────────────────────────────────────────────────

export const contactItems: VisualContactItem[] = [
  {
    kind: "location",
    label: { en: "Location", ar: "الموقع" },
    value: { en: "Cairo, Egypt", ar: "القاهرة، مصر" },
  },
  {
    kind: "phone",
    label: { en: "Phone / WhatsApp", ar: "الهاتف / واتساب" },
    value: { en: "+20 100 000 0000", ar: "+20 100 000 0000" },
    href: "tel:+201000000000",
  },
  {
    kind: "mail",
    label: { en: "Email", ar: "البريد الإلكتروني" },
    value: { en: "info@linecoffee.com", ar: "info@linecoffee.com" },
    href: "mailto:info@linecoffee.com",
  },
];

// ─── Social Gallery ───────────────────────────────────────────────────────────
// Images sourced from brand assets until real social API is connected.

export const socialGalleryImages: string[] = [
  assets.categories.flavor,
  assets.categories.espresso,
  assets.products.classicPouch,
  assets.story.roastery,
  assets.products.flavorPouch,
  assets.categories.turkish,
];
