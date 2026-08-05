import type {
  HeroSlide,
  HeroStat,
  StoryCopy,
  VisualCategory,
  VisualContactItem,
  VisualFeature,
  VisualJournalItem,
} from "@/types/homepage";

// ─── Asset Map ────────────────────────────────────────────────────────────────
// Single source of truth for all image paths.
// Future: replace values here when Media Studio is connected.

export const assets = {
  hero: {
    darkRoast: "/site-images/home/hero-section/01-dark-roast.png",
    espressoStudio: "/site-images/home/hero-section/02-espresso-studio.png",
    flavorStudio: "/site-images/home/hero-section/03-flavor-studio.png",
  },
  story: {
    roastery: "/site-images/home/story-section/story-roastery.png",
  },
  categories: {
    turkish: "/site-images/home/categories-section/turkish-blends.png",
    espresso: "/site-images/home/categories-section/espresso-blends.png",
    flavor: "/site-images/home/categories-section/flavor-coffee.png",
    easyCoffee: "/site-images/home/categories-section/easy-coffee.png",
    cappuccino: "/site-images/home/categories-section/cappuccino.png",
  },
  products: {
    classicPouch: "/site-images/home/categories-section/coffee-mix.png",
    espressoPouch: "/site-images/home/categories-section/make-your-espresso.png",
    flavorPouch: "/site-images/home/social-gallery-section/05-flavor-pouch.png",
    cappuccinoSachets: "/site-images/products/categories/cappuccino/fallback.png",
  },
  backgrounds: {
    categories: "/site-images/home/background-decoration/categories-section.png",
    features: "/site-images/home/background-decoration/features-section.png",
    bestSellers: "/site-images/home/background-decoration/best-sellers-section.png",
    testimonials: "/site-images/home/background-decoration/testimonials-section.png",
    contact: "/site-images/home/background-decoration/contact-section.png",
  },
  journal: {
    roastNotes: "/site-images/home/journal-section/01-roast-notes.png",
    blendGuide: "/site-images/home/journal-section/02-blend-guide.png",
    freshness: "/site-images/home/journal-section/03-keeping-it-fresh.png",
  },
  socialGallery: [
    "/site-images/home/social-gallery-section/01-flavor.png",
    "/site-images/home/social-gallery-section/02-espresso.png",
    "/site-images/home/social-gallery-section/03-classic-pouch.png",
    "/site-images/home/social-gallery-section/04-roastery.png",
    "/site-images/home/social-gallery-section/05-flavor-pouch.png",
    "/site-images/home/social-gallery-section/06-turkish.png",
  ],
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
    id: "hero-espresso-studio",
    image: assets.hero.espressoStudio,
    title: {
      en: "Craft Your Own Espresso Blend",
      ar: "اصنع خلطة الإسبريسو الخاصة بك",
    },
    subtitle: {
      en: "Balance beans by ratio for a signature espresso, or explore our ready blends.",
      ar: "وازن الحبوب بالنسب لإسبريسو مميز، أو استكشف خلطاتنا الجاهزة.",
    },
    primaryAction: { en: "Make Your Espresso", ar: "اصنع إسبريسو خاصتك" },
    primaryHref: "/products?category=make-your-espresso",
    secondaryAction: { en: "Explore Espresso Blends", ar: "استكشف خلطات الإسبريسو" },
    secondaryHref: "/products?category=espresso-blends",
  },
  {
    id: "hero-flavor-studio",
    image: assets.hero.flavorStudio,
    title: {
      en: "Design Your Flavored Coffee",
      ar: "صمّم قهوتك بالنكهات",
    },
    subtitle: {
      en: "Pick a base and layer warm flavors into a cup made entirely your way.",
      ar: "اختر قاعدة وأضِف نكهات دافئة لكوب مصنوع على ذوقك تمامًا.",
    },
    primaryAction: { en: "Make Your Flavor", ar: "اصنع نكهتك" },
    primaryHref: "/products?category=make-your-flavor",
    secondaryAction: { en: "Explore Flavor Coffee", ar: "استكشف قهوة النكهات" },
    secondaryHref: "/products?category=flavor-coffee",
  },
];

// ─── Hero Stats ───────────────────────────────────────────────────────────────

export const heroStats: HeroStat[] = [
  { value: "15+", label: { en: "Origins Curated", ar: "مصادر مختارة" } },
  { value: "2", label: { en: "Custom Builders", ar: "أدوات تخصيص" } },
  { value: "7+", label: { en: "Coffee Categories", ar: "أنماط قهوة" } },
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
    image: assets.categories.easyCoffee,
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
    image: assets.journal.roastNotes,
    category: { en: "Craft", ar: "صناعة القهوة" },
  },
  {
    slug: "blend-guide",
    title: { en: "Blend Guide", ar: "دليل الخلطات" },
    excerpt: {
      en: "A quick guide to matching roast depth with your daily ritual.",
      ar: "دليل سريع لاختيار عمق التحميص المناسب لطقسك اليومي.",
    },
    image: assets.journal.blendGuide,
    category: { en: "Guide", ar: "أدلة" },
  },
  {
    slug: "freshness",
    title: { en: "Keeping It Fresh", ar: "الحفاظ على الطزاجة" },
    excerpt: {
      en: "How careful storage preserves aroma and body in every bag.",
      ar: "كيف يساعد التخزين الصحيح في الحفاظ على رائحة البن وقوامه.",
    },
    image: assets.journal.freshness,
    category: { en: "Tips", ar: "نصائح" },
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
    value: { en: "", ar: "" },
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

export const socialGalleryImages: string[] = [...assets.socialGallery];
