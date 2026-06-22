import type { DashboardMetricMock } from "./types";

export const mockDashboardMetrics: DashboardMetricMock[] = [
  {
    id: "metric-revenue-today",
    label_ar: "إيراد اليوم",
    label_en: "Today's Revenue",
    value: "EGP 0",
    delta: "Mock",
    tone: "neutral",
  },
  {
    id: "metric-orders-today",
    label_ar: "طلبات اليوم",
    label_en: "Orders Today",
    value: "0",
    delta: "Mock",
    tone: "neutral",
  },
  {
    id: "metric-best-sellers",
    label_ar: "الأكثر مبيعا",
    label_en: "Best Sellers",
    value: "0",
    delta: "Future",
    tone: "warning",
  },
];
