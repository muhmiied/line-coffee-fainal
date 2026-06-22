// ── Toggle KPI Stats ────────────────────────────────────────────────

export type KPIPeriod = "today" | "week" | "month" | "all";

export interface KPIPeriodValue {
  formatted: string;
  trend: number | null;
  trendLabel: string;
}

export interface KPIToggleStat {
  label: string;
  unit: string;
  values: Record<KPIPeriod, KPIPeriodValue>;
  // Optional visual enrichments
  sparkline?: number[];                                                   // Sales: 7-day line
  breakdown?: Array<{ label: string; count: number; color: string }>;    // Orders: status donut
  customerSplit?: { newCount: number; totalCount: number };              // Customers: new/returning
}

export const KPI_TOGGLE_STATS: KPIToggleStat[] = [
  {
    label: "Sales",
    unit: "EGP",
    sparkline: [2800, 3200, 1900, 4100, 4850, 6200, 5400],
    values: {
      today: { formatted: "4,850",    trend: +18.2, trendLabel: "vs yesterday" },
      week:  { formatted: "22,400",   trend: +12.5, trendLabel: "vs last week" },
      month: { formatted: "96,300",   trend: +15.1, trendLabel: "vs last month" },
      all:   { formatted: "348,200",  trend: null,  trendLabel: "since launch" },
    },
  },
  {
    label: "Orders",
    unit: "orders",
    breakdown: [
      { label: "New",       count: 2, color: "#fbbf24" },
      { label: "Preparing", count: 1, color: "#60a5fa" },
      { label: "Shipped",   count: 1, color: "#a78bfa" },
      { label: "Delivered", count: 2, color: "#4ade80" },
      { label: "Returned",  count: 1, color: "#9ca3af" },
    ],
    values: {
      today: { formatted: "7",      trend: +2.0,  trendLabel: "vs yesterday" },
      week:  { formatted: "48",     trend: +8.3,  trendLabel: "vs last week" },
      month: { formatted: "184",    trend: +11.2, trendLabel: "vs last month" },
      all:   { formatted: "2,847",  trend: null,  trendLabel: "since launch" },
    },
  },
  {
    label: "Customers",
    unit: "users",
    customerSplit: { newCount: 46, totalCount: 284 },
    values: {
      today: { formatted: "3",    trend: null, trendLabel: "new today" },
      week:  { formatted: "18",   trend: +4.4, trendLabel: "new this week" },
      month: { formatted: "47",   trend: +9.8, trendLabel: "new this month" },
      all:   { formatted: "284",  trend: null, trendLabel: "all time" },
    },
  },
  {
    label: "Net Profit",
    unit: "EGP",
    values: {
      today: { formatted: "1,940",    trend: +8.2, trendLabel: "vs yesterday" },
      week:  { formatted: "9,600",    trend: +6.5, trendLabel: "vs last week" },
      month: { formatted: "28,400",   trend: +8.2, trendLabel: "vs last month" },
      all:   { formatted: "124,600",  trend: null, trendLabel: "since launch" },
    },
  },
];

// ── Top Review ─────────────────────────────────────────────────────────

export const TOP_REVIEW = {
  author:  "Ahmed Kamal",
  initials: "AK",
  rating:  5,
  product: "Turkish Silk",
  text:    "The Turkish Silk is incomparable — bold, smooth, and endlessly aromatic. Line Coffee is my daily ritual. Every single cup.",
  time:    "3h ago",
  totalReviews: 47,
  avgRating:    4.8,
};

// ── Visitors ──────────────────────────────────────────────────────────

export const VISITORS_DATA = {
  total: 142,
  guests: 98,
  registered: 44,
};

// ── Low Stock Items ───────────────────────────────────────────────────

export interface LowStockItem {
  name: string;
  remaining: string;
}

export const LOW_STOCK_ITEMS: LowStockItem[] = [
  { name: "Brazil Arabica",     remaining: "1.2 kg" },
  { name: "Turkish Silk 250g",  remaining: "4 units" },
  { name: "Heavy Crema 500g",   remaining: "2 units" },
];

// ── Best Sellers (Month) ──────────────────────────────────────────────

export interface BestSellerProduct {
  rank: number;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  image: string;
}

export const BEST_SELLERS_MONTH: BestSellerProduct[] = [
  { rank: 1, name: "Turkish Silk",        category: "Turkish Blends",   unitsSold: 87, revenue: 14790, image: "/assets/products/classic-pouch.png" },
  { rank: 2, name: "High Mood Espresso",  category: "Espresso Blends",  unitsSold: 64, revenue: 19200, image: "/assets/products/espresso-pouch.png" },
  { rank: 3, name: "Classic Line",        category: "Easy Coffee",       unitsSold: 58, revenue: 8120,  image: "/assets/products/classic-pouch.png" },
  { rank: 4, name: "Heavy Crema",         category: "Espresso Blends",  unitsSold: 51, revenue: 15300, image: "/assets/products/espresso-pouch.png" },
  { rank: 5, name: "Cappuccino Sachets",  category: "Cappuccino",        unitsSold: 43, revenue: 6450,  image: "/assets/products/cappuccino-sachets.png" },
];

// ── Notifications ────────────────────────────────────────────────────

export type NotifType = "order" | "inventory" | "review" | "system";

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  type: NotifType;
  read: boolean;
}

export const ADMIN_NOTIFICATIONS: AdminNotification[] = [
  { id: "n1", title: "New order received",    body: "Sara Hassan placed order #LC-1088",   time: "45m ago", type: "order",     read: false },
  { id: "n2", title: "Low stock alert",       body: "Brazil Arabica below 5 kg threshold", time: "2h ago",  type: "inventory", read: false },
  { id: "n3", title: "New 5-star review",     body: "Ahmed Kamal reviewed Turkish Silk",   time: "3h ago",  type: "review",    read: false },
  { id: "n4", title: "Order delivered",       body: "#LC-1089 delivered to Ahmed Kamal",  time: "4h ago",  type: "order",     read: true  },
  { id: "n5", title: "Promo code redeemed",   body: "SUMMER15 used 3 times today",        time: "6h ago",  type: "system",    read: true  },
];

// ── Types ──────────────────────────────────────────────────────────

export type OrderStatus =
  | "New"
  | "Preparing"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Returned";

export type ActivityType =
  | "order"
  | "inventory"
  | "marketing"
  | "customer"
  | "alert";

export type AlertType =
  | "low-stock"
  | "late-orders"
  | "messages"
  | "reviews";

// ── KPI Cards ──────────────────────────────────────────────────────

export interface KPIStat {
  label: string;
  value: number;
  formatted: string;
  unit: string;
  trend: number | null;      // percentage — positive = up, negative = down
  trendLabel: string;
  alert?: boolean;           // renders as red accent instead of green/grey trend
}

export const DASHBOARD_KPIS: KPIStat[] = [
  {
    label: "Sales Today",
    value: 4850,
    formatted: "4,850",
    unit: "EGP",
    trend: +18.2,
    trendLabel: "vs yesterday",
  },
  {
    label: "Orders Today",
    value: 7,
    formatted: "7",
    unit: "orders",
    trend: +2,
    trendLabel: "vs yesterday",
  },
  {
    label: "Customers",
    value: 284,
    formatted: "284",
    unit: "total",
    trend: +4.4,
    trendLabel: "this week",
  },
  {
    label: "Net Profit",
    value: 28400,
    formatted: "28,400",
    unit: "EGP",
    trend: +8.2,
    trendLabel: "this month",
  },
  {
    label: "Inventory Value",
    value: 67200,
    formatted: "67,200",
    unit: "EGP",
    trend: null,
    trendLabel: "",
  },
  {
    label: "Low Stock Items",
    value: 3,
    formatted: "3",
    unit: "items",
    trend: null,
    trendLabel: "needs attention",
    alert: true,
  },
  {
    label: "Visitors Today",
    value: 142,
    formatted: "142",
    unit: "sessions",
    trend: +11.0,
    trendLabel: "vs yesterday",
  },
  {
    label: "Sales This Month",
    value: 96300,
    formatted: "96,300",
    unit: "EGP",
    trend: +15.1,
    trendLabel: "vs last month",
  },
];

// ── Sales Chart Data ────────────────────────────────────────────────

export interface ChartPoint {
  label: string;
  value: number;
}

export const SALES_DATA: Record<"week" | "month" | "year", ChartPoint[]> = {
  week: [
    { label: "Mon", value: 2800 },
    { label: "Tue", value: 3200 },
    { label: "Wed", value: 1900 },
    { label: "Thu", value: 4100 },
    { label: "Fri", value: 4850 },
    { label: "Sat", value: 6200 },
    { label: "Sun", value: 5400 },
  ],
  month: [
    { label: "Jun 1",  value: 15200 },
    { label: "Jun 5",  value: 22800 },
    { label: "Jun 10", value: 19400 },
    { label: "Jun 15", value: 31000 },
    { label: "Jun 20", value: 28600 },
    { label: "Jun 25", value: 33900 },
    { label: "Jun 30", value: 37200 },
  ],
  year: [
    { label: "Jan", value: 65000 },
    { label: "Feb", value: 58000 },
    { label: "Mar", value: 72000 },
    { label: "Apr", value: 89000 },
    { label: "May", value: 95000 },
    { label: "Jun", value: 96300 },
  ],
};

// ── Latest Orders ───────────────────────────────────────────────────

export interface MockOrder {
  id: string;
  customer: string;
  items: number;
  total: number;
  status: OrderStatus;
  time: string;
}

export const LATEST_ORDERS: MockOrder[] = [
  { id: "LC-1089", customer: "Ahmed Kamal",  items: 2, total: 420,  status: "Delivered", time: "2h ago" },
  { id: "LC-1088", customer: "Sara Hassan",  items: 1, total: 170,  status: "New",       time: "45m ago" },
  { id: "LC-1087", customer: "Omar Farouk",  items: 3, total: 850,  status: "Preparing", time: "1h ago" },
  { id: "LC-1086", customer: "Nour El-Din",  items: 2, total: 680,  status: "Shipped",   time: "3h ago" },
  { id: "LC-1085", customer: "Mariam Adel",  items: 1, total: 340,  status: "New",       time: "4h ago" },
  { id: "LC-1084", customer: "Tarek Mansour",items: 4, total: 1190, status: "Delivered", time: "5h ago" },
];

// ── Alerts Center ───────────────────────────────────────────────────

export interface AlertItem {
  type: AlertType;
  label: string;
  count: number;
  color: string;
  bg: string;
  detail: string;
  href: string;
}

export const ALERTS_DATA: AlertItem[] = [
  {
    type: "low-stock",
    label: "Low stock items",
    count: 3,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
    detail: "Brazil Arabica · Turkish Silk 250g · Heavy Crema 500g",
    href: "/admin/inventory",
  },
  {
    type: "late-orders",
    label: "Orders overdue in prep",
    count: 2,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    detail: "LC-1082 · LC-1080 — over 48h in Preparing",
    href: "/admin/orders",
  },
  {
    type: "messages",
    label: "Unanswered messages",
    count: 4,
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.10)",
    detail: "4 contact form submissions awaiting reply",
    href: "/admin/cms",
  },
  {
    type: "reviews",
    label: "Reviews awaiting approval",
    count: 6,
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.10)",
    detail: "6 customer reviews pending moderation",
    href: "/admin/cms",
  },
];

// ── Activity Feed ───────────────────────────────────────────────────

export interface ActivityEntry {
  id: string;
  action: string;
  time: string;
  type: ActivityType;
}

export const ACTIVITY_FEED: ActivityEntry[] = [
  { id: "a1", action: "Order #LC-1089 marked as Delivered",             time: "2h ago",  type: "order" },
  { id: "a2", action: "New order #LC-1088 received from Sara Hassan",   time: "45m ago", type: "order" },
  { id: "a3", action: "Stock purchase: 50kg Brazil Arabica logged",     time: "3h ago",  type: "inventory" },
  { id: "a4", action: "Order #LC-1087 moved to Preparing",              time: "1h ago",  type: "order" },
  { id: "a5", action: "Promo code SUMMER15 used 3 times today",         time: "6h ago",  type: "marketing" },
  { id: "a6", action: "New customer registered: Nour El-Din",           time: "3h ago",  type: "customer" },
  { id: "a7", action: "Low stock alert: Brazil Arabica at 1.2 kg",      time: "5h ago",  type: "alert" },
];

// ── Preparing Orders ────────────────────────────────────────────────

export const PREPARING_ORDERS_DATA = {
  total:      12,
  overdue:     3,
  overdueIds: ["LC-1082", "LC-1080", "LC-1078"],
};

// ── Quick Actions ───────────────────────────────────────────────────

export interface QuickAction {
  label: string;
  sublabel: string;
  href: string;
  iconName: string; // resolved inside the component to avoid server→client prop issues
}

export const QUICK_ACTIONS: QuickAction[] = [
  { label: "Add Product",       sublabel: "New catalog item",     href: "/admin/products",   iconName: "Package" },
  { label: "Add Expense",       sublabel: "Log a business cost",  href: "/admin/accounting", iconName: "Receipt" },
  { label: "Buy Inventory",     sublabel: "Record a purchase",    href: "/admin/inventory",  iconName: "ShoppingCart" },
  { label: "Create Promo Code", sublabel: "Discount or offer",    href: "/admin/marketing",  iconName: "Tag" },
];
