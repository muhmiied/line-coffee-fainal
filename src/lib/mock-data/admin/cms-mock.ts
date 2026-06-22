export type ReviewStatus = "Approved" | "Pending" | "Rejected";

export interface AdminReview {
  id: string;
  author: string;
  product: string;
  rating: number;
  text: string;
  date: string;
  status: ReviewStatus;
}

export const ADMIN_REVIEWS: AdminReview[] = [
  { id: "R-041", author: "Ahmed Kamal",   product: "Turkish Silk",   rating: 5, text: "The Turkish Silk is incomparable — bold, smooth, and endlessly aromatic.",      date: "2026-06-19", status: "Approved" },
  { id: "R-042", author: "Sara Hassan",   product: "High Mood",      rating: 5, text: "Perfect espresso kick. I make it every morning and can't start my day without it.", date: "2026-06-20", status: "Pending"  },
  { id: "R-043", author: "Omar Ashraf",   product: "Heavy Crema",    rating: 4, text: "Great crema, exactly what I wanted for latte art. Smooth and balanced.",           date: "2026-06-18", status: "Approved" },
  { id: "R-044", author: "Mariam Hesham", product: "Cairo Nights",   rating: 3, text: "Nice blend but I expected more cardamom note. Still enjoyable.",                   date: "2026-06-17", status: "Approved" },
  { id: "R-045", author: "Nour El-Din",   product: "Black Label",    rating: 5, text: "This is the real deal. Complex, bold, and beautiful. Highly recommend.",           date: "2026-06-20", status: "Pending"  },
  { id: "R-046", author: "Khaled Samir",  product: "Classic Line",   rating: 2, text: "Too sweet for my taste. I prefer something drier.",                                 date: "2026-06-15", status: "Rejected" },
  { id: "R-047", author: "Dina Youssef",  product: "Hazelnut Cappuccino", rating: 5, text: "My daughter loves this! Perfect sweetness and hazelnut.",                    date: "2026-06-16", status: "Pending"  },
];

export interface BlogAdminEntry {
  slug: string;
  title: { en: string; ar: string };
  category: { en: string; ar: string };
  date: string;
  status: "Published" | "Draft";
}

export const BLOG_ADMIN_ENTRIES: BlogAdminEntry[] = [
  { slug: "origins-of-arabic-coffee", title: { en: "Origins of Arabic Coffee",       ar: "أصول القهوة العربية"       }, category: { en: "Origins",    ar: "الأصول"    }, date: "2026-06-10", status: "Published" },
  { slug: "roast-notes",              title: { en: "Reading the Roast Notes",         ar: "قراءة ملاحظات التحميص"     }, category: { en: "Craft",      ar: "الصنعة"    }, date: "2026-06-05", status: "Published" },
  { slug: "blend-guide",              title: { en: "Blend Guide: Choosing Your Base", ar: "دليل المزيج: اختيار قاعدتك" }, category: { en: "Guides",     ar: "الأدلة"    }, date: "2026-05-28", status: "Published" },
  { slug: "freshness",                title: { en: "Why Freshness Is Everything",      ar: "لماذا الطازجية هي كل شيء" }, category: { en: "Knowledge",  ar: "المعرفة"   }, date: "2026-05-20", status: "Published" },
  { slug: "turkish-ritual",           title: { en: "The Turkish Ritual",              ar: "طقوس القهوة التركية"        }, category: { en: "Rituals",    ar: "الطقوس"    }, date: "2026-05-15", status: "Published" },
  { slug: "espresso-craft",           title: { en: "Espresso as Craft",               ar: "الإسبريسو كحرفة"            }, category: { en: "Craft",      ar: "الصنعة"    }, date: "2026-05-08", status: "Published" },
];

export const CMS_SUMMARY = {
  totalReviews:   ADMIN_REVIEWS.length,
  pendingReviews: ADMIN_REVIEWS.filter((r) => r.status === "Pending").length,
  blogPosts:      BLOG_ADMIN_ENTRIES.length,
  avgRating:      Math.round((ADMIN_REVIEWS.reduce((s, r) => s + r.rating, 0) / ADMIN_REVIEWS.length) * 10) / 10,
};
