export type LocalizedName = {
  en: string;
  ar: string;
};

export type KpiFormat = "money" | "number" | "percent";
export type AnalyticsTone = "gold" | "green" | "blue" | "amber" | "red" | "violet";
export type AlertSeverity = "High" | "Medium" | "Low";
export type ProductDemand = "High" | "Medium" | "Low";

export interface AnalyticsKpi {
  label: string;
  value: number;
  format: KpiFormat;
  trend: number;
  caption: string;
  tone: AnalyticsTone;
}

export interface SalesTrendPoint {
  label: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface CategoryRevenue {
  category: LocalizedName;
  revenue: number;
  orders: number;
  percent: number;
  trend: number;
}

export interface ProductPerformance {
  id: string;
  name: LocalizedName;
  category: LocalizedName;
  sold: number;
  views: number;
  addedToCart: number;
  orders: number;
  revenue: number;
  stock: number;
  returnRate: number;
  conversionRate: number;
  demand: ProductDemand;
  signal: string;
}

export interface CustomerSegment {
  label: string;
  count: number;
  revenue: number;
  trend: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  segment: string;
  orders: number;
  revenue: number;
  lastOrder: string;
}

export interface MarketingPerformance {
  id: string;
  name: string;
  type: "Offer" | "Promo Code";
  usageCount: number;
  originalRevenue: number;
  discountGiven: number;
  paidRevenue: number;
  conversionRate: number;
  status: "Strong" | "Watch" | "Weak";
}

export interface GovernoratePerformance {
  governorate: LocalizedName;
  orders: number;
  revenue: number;
  customers: number;
  averageOrderValue: number;
  repeatRate: number;
  deliveryIssues: number;
}

export interface BusinessInsight {
  title: string;
  detail: string;
  metric: string;
  tone: AnalyticsTone;
}

export interface RiskAlert {
  id: string;
  title: string;
  detail: string;
  severity: AlertSeverity;
  metric: string;
  action: string;
}

export const ANALYTICS_META = {
  period: "Last 30 days",
  updatedAt: "2026-06-22",
  mode: "Mock-only business analytics. No real tracking or backend binding.",
};

export const OVERVIEW_KPIS: AnalyticsKpi[] = [
  {
    label: "Revenue",
    value: 184500,
    format: "money",
    trend: 18.4,
    caption: "Paid revenue after discounts",
    tone: "green",
  },
  {
    label: "Orders",
    value: 286,
    format: "number",
    trend: 11.8,
    caption: "Completed and preparing orders",
    tone: "gold",
  },
  {
    label: "Average Order Value",
    value: 645,
    format: "money",
    trend: 5.9,
    caption: "Revenue divided by orders",
    tone: "blue",
  },
  {
    label: "Repeat Rate",
    value: 34,
    format: "percent",
    trend: 4.2,
    caption: "Customers who ordered again",
    tone: "violet",
  },
];

export const SALES_TREND: SalesTrendPoint[] = [
  { label: "Week 1", revenue: 38500, orders: 61, averageOrderValue: 631 },
  { label: "Week 2", revenue: 42000, orders: 69, averageOrderValue: 609 },
  { label: "Week 3", revenue: 48200, orders: 75, averageOrderValue: 643 },
  { label: "Week 4", revenue: 55800, orders: 81, averageOrderValue: 689 },
];

export const REVENUE_BY_CATEGORY: CategoryRevenue[] = [
  {
    category: { en: "Espresso Blends", ar: "خلطات الإسبريسو" },
    revenue: 83025,
    orders: 112,
    percent: 45,
    trend: 16.5,
  },
  {
    category: { en: "Turkish Blends", ar: "البن التركي" },
    revenue: 55350,
    orders: 86,
    percent: 30,
    trend: 9.2,
  },
  {
    category: { en: "Easy Coffee", ar: "القهوة السريعة" },
    revenue: 27675,
    orders: 51,
    percent: 15,
    trend: 4.8,
  },
  {
    category: { en: "Flavor Coffee", ar: "القهوة المنكهة" },
    revenue: 18450,
    orders: 37,
    percent: 10,
    trend: -7.8,
  },
];

export const PRODUCT_ANALYTICS: ProductPerformance[] = [
  {
    id: "heavy-crema",
    name: { en: "Heavy Crema", ar: "هيفي كريما" },
    category: { en: "Espresso Blends", ar: "خلطات الإسبريسو" },
    sold: 78,
    views: 1260,
    addedToCart: 214,
    orders: 62,
    revenue: 35880,
    stock: 9,
    returnRate: 2.1,
    conversionRate: 4.9,
    demand: "High",
    signal: "High demand with low stock",
  },
  {
    id: "high-mood",
    name: { en: "High Mood", ar: "هاي مود" },
    category: { en: "Espresso Blends", ar: "خلطات الإسبريسو" },
    sold: 66,
    views: 910,
    addedToCart: 170,
    orders: 55,
    revenue: 32200,
    stock: 24,
    returnRate: 1.4,
    conversionRate: 6.0,
    demand: "High",
    signal: "Healthy conversion",
  },
  {
    id: "turkish-silk",
    name: { en: "Turkish Silk", ar: "تركيش سيلك" },
    category: { en: "Turkish Blends", ar: "البن التركي" },
    sold: 93,
    views: 760,
    addedToCart: 135,
    orders: 72,
    revenue: 30690,
    stock: 34,
    returnRate: 0.9,
    conversionRate: 9.5,
    demand: "High",
    signal: "Most sold finished product",
  },
  {
    id: "black-label",
    name: { en: "Black Label", ar: "بلاك ليبل" },
    category: { en: "Espresso Blends", ar: "خلطات الإسبريسو" },
    sold: 31,
    views: 720,
    addedToCart: 84,
    orders: 28,
    revenue: 19375,
    stock: 41,
    returnRate: 8.4,
    conversionRate: 3.9,
    demand: "Medium",
    signal: "Return rate needs review",
  },
  {
    id: "original-cappuccino",
    name: { en: "Original Cappuccino", ar: "كابتشينو أصلي" },
    category: { en: "Easy Coffee", ar: "القهوة السريعة" },
    sold: 48,
    views: 540,
    addedToCart: 98,
    orders: 39,
    revenue: 11160,
    stock: 58,
    returnRate: 1.1,
    conversionRate: 7.2,
    demand: "Medium",
    signal: "Stable easy coffee seller",
  },
  {
    id: "cairo-nights",
    name: { en: "Cairo Nights", ar: "ليالي القاهرة" },
    category: { en: "Flavor Coffee", ar: "القهوة المنكهة" },
    sold: 14,
    views: 620,
    addedToCart: 76,
    orders: 12,
    revenue: 4760,
    stock: 50,
    returnRate: 1.2,
    conversionRate: 1.9,
    demand: "Low",
    signal: "High views with low orders",
  },
  {
    id: "brazil-arabica",
    name: { en: "Brazil Arabica", ar: "برازيلي أرابيكا" },
    category: { en: "Make Your Espresso", ar: "اصنع إسبريسو" },
    sold: 24,
    views: 320,
    addedToCart: 62,
    orders: 21,
    revenue: 12240,
    stock: 7,
    returnRate: 0.5,
    conversionRate: 6.6,
    demand: "High",
    signal: "Builder ingredient moving fast",
  },
];

export const SLOW_PRODUCTS = PRODUCT_ANALYTICS.filter((product) => product.demand === "Low");
export const MOST_SOLD_PRODUCTS = [...PRODUCT_ANALYTICS].sort((a, b) => b.sold - a.sold);
export const MOST_VIEWED_PRODUCTS = [...PRODUCT_ANALYTICS].sort((a, b) => b.views - a.views);
export const MOST_RETURNED_PRODUCTS = [...PRODUCT_ANALYTICS].sort((a, b) => b.returnRate - a.returnRate);

export const CUSTOMER_KPIS: AnalyticsKpi[] = [
  {
    label: "New Customers",
    value: 94,
    format: "number",
    trend: 14.0,
    caption: "First order customers",
    tone: "green",
  },
  {
    label: "Returning Customers",
    value: 67,
    format: "number",
    trend: 6.3,
    caption: "Customers with 2+ orders",
    tone: "gold",
  },
  {
    label: "VIP Customers",
    value: 18,
    format: "number",
    trend: 3.0,
    caption: "High value repeat buyers",
    tone: "violet",
  },
  {
    label: "Customer Lifetime Value",
    value: 1910,
    format: "money",
    trend: 8.7,
    caption: "Average projected value",
    tone: "blue",
  },
];

export const CUSTOMER_SEGMENTS: CustomerSegment[] = [
  { label: "New", count: 94, revenue: 46200, trend: 14.0 },
  { label: "Returning", count: 67, revenue: 73150, trend: 6.3 },
  { label: "VIP", count: 18, revenue: 43800, trend: 3.0 },
  { label: "Inactive", count: 41, revenue: 6900, trend: -5.4 },
];

export const TOP_CUSTOMERS: TopCustomer[] = [
  { id: "C-104", name: "Ahmed Kamal", segment: "VIP", orders: 14, revenue: 12850, lastOrder: "2026-06-19" },
  { id: "C-118", name: "Karim Mostafa", segment: "VIP", orders: 9, revenue: 9820, lastOrder: "2026-06-19" },
  { id: "C-096", name: "Sara Hassan", segment: "Repeat", orders: 6, revenue: 6410, lastOrder: "2026-06-20" },
  { id: "C-135", name: "Nada Saleh", segment: "Repeat", orders: 4, revenue: 4220, lastOrder: "2026-06-20" },
];

export const MARKETING_SUMMARY: AnalyticsKpi[] = [
  {
    label: "Campaign Revenue",
    value: 64560,
    format: "money",
    trend: 12.1,
    caption: "Paid revenue from offers/codes",
    tone: "green",
  },
  {
    label: "Discount Given",
    value: 5140,
    format: "money",
    trend: 4.6,
    caption: "Total cost of incentives",
    tone: "amber",
  },
  {
    label: "Usage Count",
    value: 95,
    format: "number",
    trend: 19.0,
    caption: "Offer and promo redemptions",
    tone: "gold",
  },
  {
    label: "Best Conversion",
    value: 18.9,
    format: "percent",
    trend: 2.8,
    caption: "Free delivery threshold",
    tone: "blue",
  },
];

export const MARKETING_PERFORMANCE: MarketingPerformance[] = [
  {
    id: "FREEDEL500",
    name: "Free Shipping 500+",
    type: "Offer",
    usageCount: 42,
    originalRevenue: 35200,
    discountGiven: 2100,
    paidRevenue: 33100,
    conversionRate: 18.9,
    status: "Strong",
  },
  {
    id: "WELCOME50",
    name: "WELCOME50",
    type: "Promo Code",
    usageCount: 30,
    originalRevenue: 19500,
    discountGiven: 1500,
    paidRevenue: 18000,
    conversionRate: 16.2,
    status: "Strong",
  },
  {
    id: "ESPRESSO10",
    name: "10% Off Espresso",
    type: "Offer",
    usageCount: 18,
    originalRevenue: 12200,
    discountGiven: 980,
    paidRevenue: 11220,
    conversionRate: 9.4,
    status: "Watch",
  },
  {
    id: "WINBACK20",
    name: "Win-back 20%",
    type: "Promo Code",
    usageCount: 5,
    originalRevenue: 2800,
    discountGiven: 560,
    paidRevenue: 2240,
    conversionRate: 3.1,
    status: "Weak",
  },
];

export const GEOGRAPHY_ANALYTICS: GovernoratePerformance[] = [
  {
    governorate: { en: "Cairo", ar: "القاهرة" },
    orders: 122,
    revenue: 78600,
    customers: 94,
    averageOrderValue: 644,
    repeatRate: 31,
    deliveryIssues: 4,
  },
  {
    governorate: { en: "Giza", ar: "الجيزة" },
    orders: 72,
    revenue: 50400,
    customers: 57,
    averageOrderValue: 700,
    repeatRate: 38,
    deliveryIssues: 3,
  },
  {
    governorate: { en: "Alexandria", ar: "الإسكندرية" },
    orders: 39,
    revenue: 31200,
    customers: 28,
    averageOrderValue: 800,
    repeatRate: 21,
    deliveryIssues: 6,
  },
  {
    governorate: { en: "Mansoura", ar: "المنصورة" },
    orders: 24,
    revenue: 13920,
    customers: 18,
    averageOrderValue: 580,
    repeatRate: 17,
    deliveryIssues: 2,
  },
  {
    governorate: { en: "Tanta", ar: "طنطا" },
    orders: 18,
    revenue: 9360,
    customers: 14,
    averageOrderValue: 520,
    repeatRate: 11,
    deliveryIssues: 1,
  },
];

export const BUSINESS_INSIGHTS: BusinessInsight[] = [
  {
    title: "Espresso is carrying the month",
    detail: "Espresso Blends generate 45% of revenue and still show the strongest weekly momentum.",
    metric: "45% revenue share",
    tone: "green",
  },
  {
    title: "Repeat demand is more valuable than acquisition",
    detail: "Returning and VIP customers together generate more revenue than first-time buyers.",
    metric: "63% revenue from repeat/VIP",
    tone: "gold",
  },
  {
    title: "WELCOME50 is efficient",
    detail: "The code produced 18,000 EGP paid revenue from 1,500 EGP discount cost.",
    metric: "12x revenue-to-discount",
    tone: "blue",
  },
  {
    title: "Alexandria orders are fewer but larger",
    detail: "Alexandria has the highest average order value, but delivery issues are higher than other areas.",
    metric: "800 EGP AOV",
    tone: "amber",
  },
];

export const RISK_ALERTS: RiskAlert[] = [
  {
    id: "low-stock-high-demand",
    title: "High demand + low stock",
    detail: "Heavy Crema and Brazil Arabica are moving fast while stock is under 10 units.",
    severity: "High",
    metric: "2 products under 10 units",
    action: "Increase stock before the weekend demand spike.",
  },
  {
    id: "high-views-low-orders",
    title: "High views + low orders",
    detail: "Cairo Nights gets attention, but only converts 1.9% of product views into orders.",
    severity: "Medium",
    metric: "620 views / 12 orders",
    action: "Review price, image strength, and product description.",
  },
  {
    id: "high-returns",
    title: "High returns",
    detail: "Black Label return rate is above the rest of the catalog and needs quality/context review.",
    severity: "High",
    metric: "8.4% return rate",
    action: "Check roast expectations, grind notes, and recent order feedback.",
  },
  {
    id: "weak-category",
    title: "Weak category performance",
    detail: "Flavor Coffee contributes only 10% of revenue and is trending down this period.",
    severity: "Medium",
    metric: "-7.8% category trend",
    action: "Refresh offer positioning or move it into a tighter seasonal campaign.",
  },
];
