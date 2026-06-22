import type { LocalizedValue } from "@/lib/context/language";

// ─── Hero ─────────────────────────────────────────────────────────────────────

export type HeroSlide = {
  id: string;
  image: string;
  title: LocalizedValue;
  subtitle: LocalizedValue;
  primaryAction: LocalizedValue;
  primaryHref: string;
  secondaryAction: LocalizedValue;
  secondaryHref: string;
};

export type HeroStat = {
  value: string;
  label: LocalizedValue;
};

// ─── Categories ───────────────────────────────────────────────────────────────

export type CategoryTone = "default" | "highlight";

export type VisualCategory = {
  slug: string;
  name: LocalizedValue;
  action: LocalizedValue;
  image: string;
  tone?: CategoryTone;
};

// ─── Products ─────────────────────────────────────────────────────────────────

export type ProductSizeLabel = "250g" | "500g" | "1kg";

export type ProductSize = {
  label: ProductSizeLabel;
  price: string;
};

export type VisualProduct = {
  slug: string;
  name: LocalizedValue;
  note: LocalizedValue;
  image: string;
  badge?: LocalizedValue;
  category: string;
  sizes: ProductSize[];
};

// ─── Features ─────────────────────────────────────────────────────────────────

export type FeatureIconKey = "support" | "delivery" | "coffee" | "quality";

export type VisualFeature = {
  icon: FeatureIconKey;
  label: LocalizedValue;
  description: LocalizedValue;
};

// ─── Story ────────────────────────────────────────────────────────────────────

export type StoryValue = {
  title: LocalizedValue;
  description: LocalizedValue;
};

export type StoryCopy = {
  eyebrow: LocalizedValue;
  title: LocalizedValue;
  body: LocalizedValue;
  values: StoryValue[];
};

// ─── Journal / Blog ───────────────────────────────────────────────────────────

export type VisualJournalItem = {
  slug: string;
  title: LocalizedValue;
  excerpt: LocalizedValue;
  image: string;
  category?: LocalizedValue;
};

// ─── Testimonials ─────────────────────────────────────────────────────────────

export type VisualTestimonial = {
  name: LocalizedValue;
  meta: LocalizedValue;
  quote: LocalizedValue;
  rating: 1 | 2 | 3 | 4 | 5;
};

// ─── Contact ──────────────────────────────────────────────────────────────────

export type ContactItemKind = "location" | "phone" | "mail";

export type VisualContactItem = {
  kind: ContactItemKind;
  label: LocalizedValue;
  value: LocalizedValue;
  href?: string;
};
