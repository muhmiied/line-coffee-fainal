export const TRAFFIC_DATA = {
  pageviews:    { value: 3840, trend: +12.4 },
  sessions:     { value: 2210, trend: +8.1  },
  bounceRate:   { value: 42.3, trend: -3.2  },
  avgDuration:  { value: "2m 44s", trend: +5.6 },
};

export const TOP_PAGES = [
  { path: "/products",               views: 1420, pct: 36.9 },
  { path: "/",                       views: 892,  pct: 23.2 },
  { path: "/make-your-espresso",     views: 548,  pct: 14.3 },
  { path: "/products/turkish-silk",  views: 298,  pct: 7.8  },
  { path: "/about",                  views: 241,  pct: 6.3  },
  { path: "/blog",                   views: 185,  pct: 4.8  },
  { path: "/contact",                views: 142,  pct: 3.7  },
];

export const ACQUISITION_DATA = [
  { channel: "Organic Search", pct: 38, color: "var(--gold)"   },
  { channel: "Direct",         pct: 27, color: "#60a5fa"       },
  { channel: "Social",         pct: 19, color: "#c084fc"       },
  { channel: "Referral",       pct: 11, color: "#4ade80"       },
  { channel: "Email",          pct:  5, color: "#fbbf24"       },
];

export const DEVICE_SPLIT = {
  mobile:  { pct: 68, color: "var(--gold)" },
  desktop: { pct: 24, color: "#60a5fa"     },
  tablet:  { pct:  8, color: "#9ca3af"     },
};

export const WEEKLY_SESSIONS = [420, 380, 510, 490, 620, 580, 210];
export const WEEKLY_LABELS   = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const TOP_PRODUCTS_TRAFFIC = [
  { name: "Turkish Silk",  views: 298, addToCart: 41 },
  { name: "High Mood",     views: 187, addToCart: 28 },
  { name: "Heavy Crema",   views: 156, addToCart: 22 },
  { name: "Black Label",   views: 134, addToCart: 18 },
  { name: "Classic Line",  views: 121, addToCart: 15 },
];
