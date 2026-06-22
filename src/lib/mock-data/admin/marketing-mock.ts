export type OfferType =
  | "free-shipping"
  | "percentage"
  | "fixed"
  | "gift"
  | "first-order";

export type CampaignStatus = "Active" | "Paused" | "Archived";
export type OfferStatus = CampaignStatus;
export type PromoStatus = CampaignStatus;

export type AudienceType =
  | "all"
  | "vip"
  | "repeat"
  | "new"
  | "inactive"
  | "at-risk"
  | "wholesale-potential"
  | "specific";

export type DiscountType = "percentage" | "fixed";
export type UsageRule = "unlimited" | "limited";
export type AnnouncementAnimation = "slide" | "fade" | "marquee";

export interface Offer {
  id: string;
  title: { en: string; ar: string };
  offerType: OfferType;
  conditionEn: string;
  conditionAr: string;
  discountPct?: number;
  discountAmount?: number;
  maxDiscount?: number;
  minOrder?: number;
  applyTo?: string;
  governorates?: string[];
  giftName?: string;
  giftDescription?: string;
  audience: AudienceType;
  specificCustomerIds?: string[];
  startDate: string;
  endDate: string;
  status: OfferStatus;
  announcementId?: string;
  usedCount: number;
  ordersGenerated: number;
  originalRevenue: number;
  discountGiven: number;
  paidRevenue: number;
}

export interface PromoCode {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  minOrder: number;
  maxDiscount?: number;
  usageRule: UsageRule;
  maxUses?: number;
  usedCount: number;
  audience: AudienceType;
  specificCustomerIds?: string[];
  startDate: string;
  endDate: string;
  status: PromoStatus;
  announcementId?: string;
  ordersGenerated: number;
  originalRevenue: number;
  discountGiven: number;
  paidRevenue: number;
}

export interface AnnouncementMessage {
  id: string;
  internalTitle: string;
  textEn: string;
  textAr: string;
  active: boolean;
  startDate: string;
  endDate: string;
  linkUrl?: string;
  ctaLabelEn?: string;
  ctaLabelAr?: string;
  relatedOfferId?: string;
  relatedPromoId?: string;
  priority: number;
  animationStyle: AnnouncementAnimation;
  durationSeconds: number;
}

export interface UsageRecord {
  id: string;
  campaignId: string;
  campaignType: "offer" | "promo";
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerType: "guest" | "registered";
  orderId: string;
  orderDate: string;
  originalTotal: number;
  discountAmt: number;
  finalPaid: number;
  orderStatus: string;
}

export const OFFERS: Offer[] = [
  {
    id: "offer-001",
    title: {
      en: "Free Shipping on Orders 500+ EGP",
      ar: "شحن مجاني للطلبات فوق 500 جنيه",
    },
    offerType: "free-shipping",
    conditionEn: "Free delivery when the order total is 500 EGP or more.",
    conditionAr: "توصيل مجاني عند وصول الطلب إلى 500 جنيه أو أكثر.",
    minOrder: 500,
    governorates: ["All"],
    audience: "all",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "Active",
    announcementId: "ann-001",
    usedCount: 6,
    ordersGenerated: 6,
    originalRevenue: 5220,
    discountGiven: 300,
    paidRevenue: 4920,
  },
  {
    id: "offer-002",
    title: {
      en: "10% Off Espresso Blends",
      ar: "خصم 10% على خلطات الإسبريسو",
    },
    offerType: "percentage",
    conditionEn: "10% off Espresso Blends, capped at 120 EGP per order.",
    conditionAr: "خصم 10% على خلطات الإسبريسو بحد أقصى 120 جنيه لكل طلب.",
    discountPct: 10,
    maxDiscount: 120,
    minOrder: 400,
    applyTo: "Espresso Blends",
    audience: "vip",
    startDate: "2026-06-01",
    endDate: "2026-07-31",
    status: "Active",
    usedCount: 4,
    ordersGenerated: 4,
    originalRevenue: 2780,
    discountGiven: 278,
    paidRevenue: 2502,
  },
  {
    id: "offer-003",
    title: {
      en: "Welcome Gift - 50 EGP Off First Order",
      ar: "هدية الترحيب - خصم 50 جنيه على أول طلب",
    },
    offerType: "first-order",
    conditionEn: "New customers get 50 EGP off their first order above 400 EGP.",
    conditionAr: "العملاء الجدد يحصلون على خصم 50 جنيه لأول طلب فوق 400 جنيه.",
    discountAmount: 50,
    minOrder: 400,
    audience: "new",
    startDate: "2026-03-01",
    endDate: "2026-12-31",
    status: "Active",
    announcementId: "ann-004",
    usedCount: 3,
    ordersGenerated: 3,
    originalRevenue: 1650,
    discountGiven: 150,
    paidRevenue: 1500,
  },
  {
    id: "offer-004",
    title: {
      en: "Ramadan Special - 25% Bundle Discount",
      ar: "عرض رمضان - خصم 25% على الباقات",
    },
    offerType: "percentage",
    conditionEn: "Archived seasonal bundle discount retained for history.",
    conditionAr: "عرض موسمي مؤرشف محفوظ لأرقام الأداء.",
    discountPct: 25,
    maxDiscount: 200,
    minOrder: 500,
    applyTo: "Bundles",
    audience: "all",
    startDate: "2026-03-01",
    endDate: "2026-04-09",
    status: "Archived",
    usedCount: 91,
    ordersGenerated: 91,
    originalRevenue: 38220,
    discountGiven: 9100,
    paidRevenue: 29120,
  },
  {
    id: "offer-005",
    title: {
      en: "Win-Back - 20% for Inactive Customers",
      ar: "عودة العملاء - خصم 20% للعملاء غير النشطين",
    },
    offerType: "percentage",
    conditionEn: "20% off orders above 300 EGP for inactive customers.",
    conditionAr: "خصم 20% للطلبات فوق 300 جنيه للعملاء غير النشطين.",
    discountPct: 20,
    maxDiscount: 150,
    minOrder: 300,
    audience: "inactive",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    status: "Paused",
    usedCount: 0,
    ordersGenerated: 0,
    originalRevenue: 0,
    discountGiven: 0,
    paidRevenue: 0,
  },
  {
    id: "offer-006",
    title: {
      en: "Gift With Order - Sample Espresso 50g",
      ar: "هدية مع الطلب - عينة إسبريسو 50 جم",
    },
    offerType: "gift",
    conditionEn: "VIP customers get a Sample Espresso 50g gift on orders above 1000 EGP.",
    conditionAr: "عملاء VIP يحصلون على عينة إسبريسو 50 جم مع الطلبات فوق 1000 جنيه.",
    giftName: "Sample Espresso 50g",
    giftDescription: "A complimentary sample bag of the House Blend espresso.",
    minOrder: 1000,
    audience: "vip",
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    status: "Active",
    announcementId: "ann-005",
    usedCount: 3,
    ordersGenerated: 3,
    originalRevenue: 3700,
    discountGiven: 0,
    paidRevenue: 3700,
  },
];

export const PROMO_CODES: PromoCode[] = [
  {
    id: "pc-001",
    code: "SUMMER15",
    type: "percentage",
    value: 15,
    minOrder: 300,
    maxDiscount: 90,
    usageRule: "limited",
    maxUses: 100,
    usedCount: 38,
    audience: "all",
    startDate: "2026-06-01",
    endDate: "2026-07-31",
    status: "Active",
    announcementId: "ann-002",
    ordersGenerated: 38,
    originalRevenue: 13200,
    discountGiven: 1974,
    paidRevenue: 11226,
  },
  {
    id: "pc-002",
    code: "LINE10",
    type: "percentage",
    value: 10,
    minOrder: 200,
    maxDiscount: 80,
    usageRule: "unlimited",
    usedCount: 62,
    audience: "all",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "Active",
    ordersGenerated: 62,
    originalRevenue: 21700,
    discountGiven: 2170,
    paidRevenue: 19530,
  },
  {
    id: "pc-003",
    code: "WELCOME50",
    type: "fixed",
    value: 50,
    minOrder: 400,
    usageRule: "limited",
    maxUses: 50,
    usedCount: 14,
    audience: "new",
    startDate: "2026-03-10",
    endDate: "2026-12-31",
    status: "Active",
    announcementId: "ann-004",
    ordersGenerated: 14,
    originalRevenue: 7210,
    discountGiven: 700,
    paidRevenue: 6510,
  },
  {
    id: "pc-004",
    code: "RAMADAN25",
    type: "percentage",
    value: 25,
    minOrder: 500,
    maxDiscount: 200,
    usageRule: "limited",
    maxUses: 91,
    usedCount: 91,
    audience: "all",
    startDate: "2026-03-01",
    endDate: "2026-04-09",
    status: "Archived",
    ordersGenerated: 91,
    originalRevenue: 38220,
    discountGiven: 9100,
    paidRevenue: 29120,
  },
  {
    id: "pc-005",
    code: "EID20",
    type: "percentage",
    value: 20,
    minOrder: 350,
    maxDiscount: 120,
    usageRule: "limited",
    maxUses: 55,
    usedCount: 55,
    audience: "all",
    startDate: "2026-04-10",
    endDate: "2026-04-21",
    status: "Archived",
    ordersGenerated: 55,
    originalRevenue: 22440,
    discountGiven: 3850,
    paidRevenue: 18590,
  },
  {
    id: "pc-006",
    code: "BACK2FALL",
    type: "fixed",
    value: 75,
    minOrder: 600,
    usageRule: "limited",
    maxUses: 80,
    usedCount: 0,
    audience: "all",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    status: "Paused",
    ordersGenerated: 0,
    originalRevenue: 0,
    discountGiven: 0,
    paidRevenue: 0,
  },
  {
    id: "pc-007",
    code: "WINBACK20",
    type: "percentage",
    value: 20,
    minOrder: 300,
    maxDiscount: 150,
    usageRule: "limited",
    maxUses: 60,
    usedCount: 0,
    audience: "inactive",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    status: "Paused",
    ordersGenerated: 0,
    originalRevenue: 0,
    discountGiven: 0,
    paidRevenue: 0,
  },
  {
    id: "pc-008",
    code: "VIP2026",
    type: "fixed",
    value: 100,
    minOrder: 0,
    usageRule: "limited",
    maxUses: 20,
    usedCount: 3,
    audience: "vip",
    startDate: "2026-06-15",
    endDate: "2026-08-15",
    status: "Paused",
    ordersGenerated: 3,
    originalRevenue: 4620,
    discountGiven: 300,
    paidRevenue: 4320,
  },
];

export const ANNOUNCEMENT_MESSAGES: AnnouncementMessage[] = [
  {
    id: "ann-001",
    internalTitle: "Free Shipping Offer",
    textEn: "Free delivery on orders above 500 EGP.",
    textAr: "توصيل مجاني للطلبات فوق 500 جنيه.",
    active: true,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    linkUrl: "/products",
    ctaLabelEn: "Shop now",
    ctaLabelAr: "تسوق الآن",
    relatedOfferId: "offer-001",
    priority: 1,
    animationStyle: "slide",
    durationSeconds: 4,
  },
  {
    id: "ann-002",
    internalTitle: "SUMMER15 Promo Code",
    textEn: "Use code SUMMER15 for 15% off your next order.",
    textAr: "استخدم كود SUMMER15 واحصل على خصم 15% على طلبك القادم.",
    active: true,
    startDate: "2026-06-01",
    endDate: "2026-07-31",
    relatedPromoId: "pc-001",
    priority: 2,
    animationStyle: "fade",
    durationSeconds: 4,
  },
  {
    id: "ann-003",
    internalTitle: "Fresh Roast Promise",
    textEn: "Fresh roast, delivered within 72 hours.",
    textAr: "تحميص طازج يصل إليك خلال 72 ساعة.",
    active: true,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    priority: 3,
    animationStyle: "slide",
    durationSeconds: 4,
  },
  {
    id: "ann-004",
    internalTitle: "Welcome Offer - New Customers",
    textEn: "New customers get 50 EGP off their first order with WELCOME50.",
    textAr: "للعملاء الجدد: خصم 50 جنيه على أول طلب بكود WELCOME50.",
    active: true,
    startDate: "2026-03-01",
    endDate: "2026-12-31",
    relatedOfferId: "offer-003",
    relatedPromoId: "pc-003",
    priority: 4,
    animationStyle: "slide",
    durationSeconds: 5,
  },
  {
    id: "ann-005",
    internalTitle: "VIP Gift With Order",
    textEn: "Order above 1000 EGP and get a free espresso sample gift.",
    textAr: "اطلب فوق 1000 جنيه واحصل على هدية عينة إسبريسو مجانية.",
    active: true,
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    relatedOfferId: "offer-006",
    priority: 5,
    animationStyle: "marquee",
    durationSeconds: 6,
  },
];

export const USAGE_RECORDS: UsageRecord[] = [
  { id: "ur-001", campaignId: "offer-001", campaignType: "offer", customerId: "C-001", customerName: "Ahmed Kamal", customerPhone: "+20 111 345 6789", customerType: "registered", orderId: "LC-2001", orderDate: "2026-06-18", originalTotal: 780, discountAmt: 50, finalPaid: 730, orderStatus: "Delivered" },
  { id: "ur-002", campaignId: "offer-001", campaignType: "offer", customerId: "C-002", customerName: "Sara Hassan", customerPhone: "+20 100 234 5678", customerType: "registered", orderId: "LC-2002", orderDate: "2026-06-17", originalTotal: 870, discountAmt: 50, finalPaid: 820, orderStatus: "Delivered" },
  { id: "ur-003", campaignId: "offer-001", campaignType: "offer", customerId: "C-004", customerName: "Omar Ashraf", customerPhone: "+20 100 567 8901", customerType: "registered", orderId: "LC-2003", orderDate: "2026-06-16", originalTotal: 640, discountAmt: 50, finalPaid: 590, orderStatus: "Delivered" },
  { id: "ur-004", campaignId: "offer-001", campaignType: "offer", customerId: "C-005", customerName: "Laila Ibrahim", customerPhone: "+20 100 789 0123", customerType: "guest", orderId: "LC-2004", orderDate: "2026-06-14", originalTotal: 1150, discountAmt: 50, finalPaid: 1100, orderStatus: "Delivered" },
  { id: "ur-005", campaignId: "offer-001", campaignType: "offer", customerId: "C-003", customerName: "Mariam Hesham", customerPhone: "+20 122 456 7890", customerType: "registered", orderId: "LC-2005", orderDate: "2026-06-12", originalTotal: 780, discountAmt: 50, finalPaid: 730, orderStatus: "Delivered" },
  { id: "ur-006", campaignId: "offer-001", campaignType: "offer", customerId: "C-010", customerName: "Karim Adel", customerPhone: "+20 111 890 2346", customerType: "registered", orderId: "LC-2006", orderDate: "2026-06-10", originalTotal: 1000, discountAmt: 50, finalPaid: 950, orderStatus: "Delivered" },
  { id: "ur-007", campaignId: "offer-002", campaignType: "offer", customerId: "C-001", customerName: "Ahmed Kamal", customerPhone: "+20 111 345 6789", customerType: "registered", orderId: "LC-2007", orderDate: "2026-06-20", originalTotal: 680, discountAmt: 68, finalPaid: 612, orderStatus: "Delivered" },
  { id: "ur-008", campaignId: "offer-002", campaignType: "offer", customerId: "C-006", customerName: "Khaled Samir", customerPhone: "+20 122 890 1234", customerType: "registered", orderId: "LC-2008", orderDate: "2026-06-18", originalTotal: 750, discountAmt: 75, finalPaid: 675, orderStatus: "Delivered" },
  { id: "ur-009", campaignId: "offer-002", campaignType: "offer", customerId: "C-010", customerName: "Karim Adel", customerPhone: "+20 111 890 2346", customerType: "registered", orderId: "LC-2009", orderDate: "2026-06-15", originalTotal: 510, discountAmt: 51, finalPaid: 459, orderStatus: "Shipped" },
  { id: "ur-010", campaignId: "offer-002", campaignType: "offer", customerId: "C-002", customerName: "Sara Hassan", customerPhone: "+20 100 234 5678", customerType: "registered", orderId: "LC-2010", orderDate: "2026-06-12", originalTotal: 840, discountAmt: 84, finalPaid: 756, orderStatus: "Delivered" },
  { id: "ur-011", campaignId: "offer-003", campaignType: "offer", customerId: "C-013", customerName: "Dina Youssef", customerPhone: "+20 122 123 4567", customerType: "guest", orderId: "LC-2011", orderDate: "2026-06-19", originalTotal: 480, discountAmt: 50, finalPaid: 430, orderStatus: "Delivered" },
  { id: "ur-012", campaignId: "offer-003", campaignType: "offer", customerId: "C-014", customerName: "Hana Maher", customerPhone: "+20 122 567 8903", customerType: "registered", orderId: "LC-2012", orderDate: "2026-06-20", originalTotal: 620, discountAmt: 50, finalPaid: 570, orderStatus: "Preparing" },
  { id: "ur-013", campaignId: "offer-003", campaignType: "offer", customerId: "C-020", customerName: "Basma Wael", customerPhone: "+20 115 432 1098", customerType: "registered", orderId: "LC-2013", orderDate: "2026-06-21", originalTotal: 550, discountAmt: 50, finalPaid: 500, orderStatus: "New" },
  { id: "ur-014", campaignId: "offer-006", campaignType: "offer", customerId: "C-001", customerName: "Ahmed Kamal", customerPhone: "+20 111 345 6789", customerType: "registered", orderId: "LC-2014", orderDate: "2026-06-19", originalTotal: 1200, discountAmt: 0, finalPaid: 1200, orderStatus: "Delivered" },
  { id: "ur-015", campaignId: "offer-006", campaignType: "offer", customerId: "C-010", customerName: "Karim Adel", customerPhone: "+20 111 890 2346", customerType: "registered", orderId: "LC-2015", orderDate: "2026-06-15", originalTotal: 1400, discountAmt: 0, finalPaid: 1400, orderStatus: "Delivered" },
  { id: "ur-016", campaignId: "offer-006", campaignType: "offer", customerId: "C-006", customerName: "Khaled Samir", customerPhone: "+20 122 890 1234", customerType: "registered", orderId: "LC-2016", orderDate: "2026-06-10", originalTotal: 1100, discountAmt: 0, finalPaid: 1100, orderStatus: "Delivered" },
  { id: "ur-017", campaignId: "pc-001", campaignType: "promo", customerId: "C-003", customerName: "Mariam Hesham", customerPhone: "+20 122 456 7890", customerType: "registered", orderId: "LC-2017", orderDate: "2026-06-21", originalTotal: 580, discountAmt: 87, finalPaid: 493, orderStatus: "New" },
  { id: "ur-018", campaignId: "pc-001", campaignType: "promo", customerId: "C-004", customerName: "Omar Ashraf", customerPhone: "+20 100 567 8901", customerType: "registered", orderId: "LC-2018", orderDate: "2026-06-20", originalTotal: 720, discountAmt: 90, finalPaid: 630, orderStatus: "Preparing" },
  { id: "ur-019", campaignId: "pc-001", campaignType: "promo", customerId: "C-012", customerName: "Nour El-Din", customerPhone: "+20 112 678 9012", customerType: "registered", orderId: "LC-2019", orderDate: "2026-06-19", originalTotal: 430, discountAmt: 65, finalPaid: 365, orderStatus: "Delivered" },
  { id: "ur-020", campaignId: "pc-001", campaignType: "promo", customerId: "C-019", customerName: "Fatma Nabil", customerPhone: "+20 112 345 6781", customerType: "guest", orderId: "LC-2020", orderDate: "2026-06-18", originalTotal: 890, discountAmt: 90, finalPaid: 800, orderStatus: "Delivered" },
  { id: "ur-021", campaignId: "pc-001", campaignType: "promo", customerId: "C-018", customerName: "Reem El-Sayed", customerPhone: "+20 122 901 3457", customerType: "guest", orderId: "LC-2021", orderDate: "2026-06-17", originalTotal: 650, discountAmt: 90, finalPaid: 560, orderStatus: "Delivered" },
  { id: "ur-022", campaignId: "pc-002", campaignType: "promo", customerId: "C-006", customerName: "Khaled Samir", customerPhone: "+20 122 890 1234", customerType: "registered", orderId: "LC-2022", orderDate: "2026-06-21", originalTotal: 450, discountAmt: 45, finalPaid: 405, orderStatus: "New" },
  { id: "ur-023", campaignId: "pc-002", campaignType: "promo", customerId: "C-001", customerName: "Ahmed Kamal", customerPhone: "+20 111 345 6789", customerType: "registered", orderId: "LC-2023", orderDate: "2026-06-20", originalTotal: 380, discountAmt: 38, finalPaid: 342, orderStatus: "Preparing" },
  { id: "ur-024", campaignId: "pc-002", campaignType: "promo", customerId: "C-005", customerName: "Laila Ibrahim", customerPhone: "+20 100 789 0123", customerType: "guest", orderId: "LC-2024", orderDate: "2026-06-19", originalTotal: 610, discountAmt: 61, finalPaid: 549, orderStatus: "Delivered" },
  { id: "ur-025", campaignId: "pc-002", campaignType: "promo", customerId: "C-009", customerName: "Youssef Tamer", customerPhone: "+20 111 789 1235", customerType: "registered", orderId: "LC-2025", orderDate: "2026-06-18", originalTotal: 520, discountAmt: 52, finalPaid: 468, orderStatus: "Delivered" },
  { id: "ur-026", campaignId: "pc-003", campaignType: "promo", customerId: "C-013", customerName: "Dina Youssef", customerPhone: "+20 122 123 4567", customerType: "guest", orderId: "LC-2026", orderDate: "2026-06-21", originalTotal: 510, discountAmt: 50, finalPaid: 460, orderStatus: "New" },
  { id: "ur-027", campaignId: "pc-003", campaignType: "promo", customerId: "C-016", customerName: "Maged Farouk", customerPhone: "+20 100 234 5670", customerType: "guest", orderId: "LC-2027", orderDate: "2026-06-20", originalTotal: 680, discountAmt: 50, finalPaid: 630, orderStatus: "Preparing" },
  { id: "ur-028", campaignId: "pc-003", campaignType: "promo", customerId: "C-014", customerName: "Hana Maher", customerPhone: "+20 122 567 8903", customerType: "registered", orderId: "LC-2028", orderDate: "2026-06-18", originalTotal: 450, discountAmt: 50, finalPaid: 400, orderStatus: "Delivered" },
];

export const MARKETING_SUMMARY = {
  activeOffers: OFFERS.filter((offer) => offer.status === "Active").length,
  activeCodes: PROMO_CODES.filter((code) => code.status === "Active").length,
  totalUsage:
    OFFERS.reduce((sum, offer) => sum + offer.usedCount, 0) +
    PROMO_CODES.reduce((sum, code) => sum + code.usedCount, 0),
  totalDiscountGiven:
    OFFERS.reduce((sum, offer) => sum + offer.discountGiven, 0) +
    PROMO_CODES.reduce((sum, code) => sum + code.discountGiven, 0),
  totalCampaignRevenue:
    OFFERS.reduce((sum, offer) => sum + offer.paidRevenue, 0) +
    PROMO_CODES.reduce((sum, code) => sum + code.paidRevenue, 0),
  missingAnnouncements:
    OFFERS.filter((offer) => offer.status === "Active" && !offer.announcementId).length +
    PROMO_CODES.filter((code) => code.status === "Active" && !code.announcementId).length,
};
