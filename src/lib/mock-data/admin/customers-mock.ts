// ── Frozen date anchor ─────────────────────────────────────────────────────────
const ANCHOR = "2026-06-21";

function daysSince(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const anchor = new Date(ANCHOR).getTime();
  const d      = new Date(dateStr).getTime();
  return Math.floor((anchor - d) / 86_400_000);
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type CustomerType    = "guest" | "registered";
export type ActivityType    =
  | "order-created"
  | "order-delivered"
  | "order-returned"
  | "review-submitted"
  | "promo-used"
  | "customer-note"
  | "profile-updated"
  | "customer-created";

export type CustomerSegment =
  | "vip"
  | "repeat"
  | "new"
  | "inactive"
  | "at-risk"
  | "wholesale-potential";

export interface CustomerAddress {
  id:            string;
  label:         string;
  governorate:   string;
  city:          string;
  area?:         string;
  streetAddress: string;
  buildingName?: string;
  floor?:        string;
  apartment?:    string;
  landmark?:     string;
  isDefault:     boolean;
}

export interface CustomerOrderSummary {
  orderId:   string;
  date:      string;
  status:    string;
  total:     number;
  itemsCount: number;
  orderType: "standard" | "make-espresso" | "make-flavor";
}

export interface CustomerActivity {
  id:           string;
  date:         string;
  type:         ActivityType;
  title:        string;
  description:  string;
  reference?:   string;
}

export interface AdminCustomer {
  id:                  string;
  name:                string;
  email?:              string;
  phone:               string;
  whatsapp:            string;
  type:                CustomerType;
  joinedAt:            string;
  lastOrderDate?:      string;
  ordersCount:         number;
  totalSpent:          number;
  averageOrderValue:   number;
  tags:                string[];
  favoriteCategory?:   string;
  favoriteProducts?:   string[];
  addresses:           CustomerAddress[];
  recentOrders:        CustomerOrderSummary[];
  activity:            CustomerActivity[];
  notes?:              string;
  marketingOptIn?:     boolean;
  promoUsageCount?:    number;
  lastPromoUsed?:      string;
  possibleDuplicateOf?: string;
}

// ── Segment logic (computed at display time) ────────────────────────────────────

export function getSegments(c: AdminCustomer): CustomerSegment[] {
  const segs: CustomerSegment[] = [];
  const days = daysSince(c.lastOrderDate);
  const recentJoin = daysSince(c.joinedAt) <= 30;

  const isVip = c.totalSpent >= 5000 || c.ordersCount >= 8;
  if (isVip) segs.push("vip");

  if (!isVip && c.ordersCount >= 2) segs.push("repeat");

  if (c.ordersCount <= 1 && recentJoin) segs.push("new");

  if (c.lastOrderDate && days > 90) segs.push("inactive");

  if (c.ordersCount >= 2 && days >= 60 && days <= 90) segs.push("at-risk");

  if (c.tags.includes("Wholesale Potential")) segs.push("wholesale-potential");

  return segs;
}

export function getSegmentReason(seg: CustomerSegment, c: AdminCustomer): string {
  const days = daysSince(c.lastOrderDate);
  switch (seg) {
    case "vip":
      if (c.totalSpent >= 5000 && c.ordersCount >= 8)
        return `Total spend is ${c.totalSpent.toLocaleString()} EGP across ${c.ordersCount} orders`;
      if (c.totalSpent >= 5000)
        return `Total spend is ${c.totalSpent.toLocaleString()} EGP`;
      return `${c.ordersCount} orders placed`;
    case "repeat":
      return `${c.ordersCount} orders placed`;
    case "new":
      return c.ordersCount === 0
        ? "Recently joined — no orders yet"
        : "First-time buyer — joined recently";
    case "inactive":
      return `Last order was ${days} days ago`;
    case "at-risk":
      return `Previously active — no order in ${days} days`;
    case "wholesale-potential":
      return "Manually tagged for wholesale inquiry";
  }
}

export function getSuggestedPromotion(c: AdminCustomer): string | null {
  const segs = getSegments(c);
  if (segs.includes("inactive")) return "Win-back campaign candidate";
  if (segs.includes("at-risk"))  return "Re-engagement offer";
  if (segs.includes("vip"))      return "Loyalty reward eligible";
  if (segs.includes("wholesale-potential")) return "B2B pricing inquiry";
  if (segs.includes("new") && c.ordersCount >= 1) return "First repeat purchase incentive";
  if (segs.includes("repeat"))   return "New collection offer";
  if (segs.includes("new") && c.ordersCount === 0) return "Welcome offer — no orders yet";
  return null;
}

// ── Computed status (not stored) ────────────────────────────────────────────────

export type CustomerStatus = "active" | "inactive" | "new";

export function getStatus(c: AdminCustomer): CustomerStatus {
  const days = daysSince(c.lastOrderDate);
  if (c.lastOrderDate && days > 90) return "inactive";
  if (c.ordersCount <= 1 && daysSince(c.joinedAt) <= 30) return "new";
  return "active";
}

// ── Mock data ──────────────────────────────────────────────────────────────────

export const ADMIN_CUSTOMERS: AdminCustomer[] = [
  // ─── C-001: Ahmed Kamal — registered, VIP ────────────────────────────────────
  {
    id: "C-001", name: "Ahmed Kamal", email: "a.kamal@outlook.com",
    phone: "+20 111 345 6789", whatsapp: "+20 111 345 6789",
    type: "registered", joinedAt: "2025-09-12", lastOrderDate: "2026-06-19",
    ordersCount: 18, totalSpent: 9800, averageOrderValue: 544,
    tags: ["High Value"],
    favoriteCategory: "Espresso Blends", favoriteProducts: ["Heavy Crema", "Black Label"],
    marketingOptIn: true, promoUsageCount: 4, lastPromoUsed: "SUMMER10",
    addresses: [
      { id: "A-001-1", label: "Home", governorate: "Cairo", city: "Nasr City",
        area: "Seventh District", streetAddress: "12 Abbas El-Akkad St",
        buildingName: "El-Nour Tower", floor: "5", apartment: "52",
        landmark: "Near City Stars Mall", isDefault: true },
      { id: "A-001-2", label: "Work", governorate: "Cairo", city: "Heliopolis",
        area: "Sheraton", streetAddress: "3 Hasan El-Masri St",
        buildingName: "Andalus Center", floor: "2", apartment: "201",
        isDefault: false },
    ],
    recentOrders: [
      { orderId: "LC-1091", date: "2026-06-19", status: "Delivered", total: 780, itemsCount: 3, orderType: "standard" },
      { orderId: "LC-1083", date: "2026-06-08", status: "Delivered", total: 420, itemsCount: 2, orderType: "make-espresso" },
      { orderId: "LC-1070", date: "2026-05-20", status: "Delivered", total: 950, itemsCount: 4, orderType: "standard" },
      { orderId: "LC-1054", date: "2026-04-15", status: "Delivered", total: 640, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1040", date: "2026-03-28", status: "Delivered", total: 570, itemsCount: 3, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-001-1", date: "2026-06-19", type: "order-delivered", title: "Order Delivered", description: "Order LC-1091 delivered successfully", reference: "LC-1091" },
      { id: "ACT-001-2", date: "2026-06-19", type: "order-created",   title: "New Order Placed", description: "Ordered Heavy Crema 500g + Black Label 250g", reference: "LC-1091" },
      { id: "ACT-001-3", date: "2026-06-08", type: "order-delivered", title: "Order Delivered", description: "Custom espresso blend delivered", reference: "LC-1083" },
      { id: "ACT-001-4", date: "2026-05-15", type: "promo-used",      title: "Promo Code Used", description: "Applied SUMMER10 — 10% off", reference: "SUMMER10" },
      { id: "ACT-001-5", date: "2025-09-12", type: "customer-created", title: "Account Created", description: "Registered on Line Coffee website" },
    ],
    notes: "Prefers espresso blends. Buys in bulk every 3 weeks. Happy to hear about new origins.",
  },

  // ─── C-002: Sara Hassan — registered, VIP ────────────────────────────────────
  {
    id: "C-002", name: "Sara Hassan", email: "sara.hassan@gmail.com",
    phone: "+20 100 234 5678", whatsapp: "+20 100 234 5678",
    type: "registered", joinedAt: "2025-10-05", lastOrderDate: "2026-06-20",
    ordersCount: 14, totalSpent: 7430, averageOrderValue: 531,
    tags: ["High Value", "Promo Sensitive"],
    favoriteCategory: "Turkish Blends", favoriteProducts: ["Turkish Silk", "Cairo Nights"],
    marketingOptIn: true, promoUsageCount: 7, lastPromoUsed: "WELCOME20",
    addresses: [
      { id: "A-002-1", label: "Home", governorate: "Cairo", city: "Zamalek",
        streetAddress: "27 Hassan Sabry St", buildingName: "Villa Blessings",
        floor: "1", apartment: "Ground", landmark: "Near Zamalek Club",
        isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-1092", date: "2026-06-20", status: "Preparing", total: 620, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1077", date: "2026-06-05", status: "Delivered", total: 730, itemsCount: 3, orderType: "standard" },
      { orderId: "LC-1060", date: "2026-05-01", status: "Delivered", total: 480, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1048", date: "2026-04-10", status: "Delivered", total: 910, itemsCount: 4, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-002-1", date: "2026-06-20", type: "order-created",   title: "New Order Placed", description: "Ordered Turkish Silk 1kg + Cairo Nights 500g", reference: "LC-1092" },
      { id: "ACT-002-2", date: "2026-06-05", type: "order-delivered", title: "Order Delivered", description: "Order LC-1077 delivered", reference: "LC-1077" },
      { id: "ACT-002-3", date: "2026-04-20", type: "promo-used",      title: "Promo Code Used", description: "Applied WELCOME20 — first order discount", reference: "WELCOME20" },
      { id: "ACT-002-4", date: "2026-02-14", type: "review-submitted", title: "Review Submitted", description: "Left 5-star review for Turkish Silk" },
      { id: "ACT-002-5", date: "2025-10-05", type: "customer-created", title: "Account Created", description: "Registered on Line Coffee website" },
    ],
    notes: "Loyal Turkish blend customer. Always uses promo codes — send new codes before ordering cycle.",
  },

  // ─── C-003: Mariam Hesham — registered, Repeat ───────────────────────────────
  {
    id: "C-003", name: "Mariam Hesham", email: "mariam.h@gmail.com",
    phone: "+20 122 456 7890", whatsapp: "+20 122 456 7890",
    type: "registered", joinedAt: "2025-12-01", lastOrderDate: "2026-06-18",
    ordersCount: 7, totalSpent: 3820, averageOrderValue: 546,
    tags: [],
    favoriteCategory: "Coffee Mix", favoriteProducts: ["Classic Line", "Hazelnut Dream"],
    marketingOptIn: true, promoUsageCount: 2, lastPromoUsed: "SPRING15",
    addresses: [
      { id: "A-003-1", label: "Home", governorate: "Cairo", city: "Maadi",
        area: "Degla", streetAddress: "14 Rd 233",
        landmark: "Near Maadi Metro Station", isDefault: true },
      { id: "A-003-2", label: "Work", governorate: "Cairo", city: "Dokki",
        streetAddress: "6 Tahrir Sq", buildingName: "Cairo Media Center", floor: "8", apartment: "803",
        isDefault: false },
    ],
    recentOrders: [
      { orderId: "LC-1088", date: "2026-06-18", status: "Shipped",   total: 650, itemsCount: 3, orderType: "standard" },
      { orderId: "LC-1072", date: "2026-06-02", status: "Delivered", total: 490, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1055", date: "2026-05-10", status: "Delivered", total: 580, itemsCount: 3, orderType: "make-flavor" },
    ],
    activity: [
      { id: "ACT-003-1", date: "2026-06-18", type: "order-created",   title: "New Order Placed", description: "Classic Line Coffee Mix 500g × 2 + Hazelnut Dream", reference: "LC-1088" },
      { id: "ACT-003-2", date: "2026-06-02", type: "order-delivered", title: "Order Delivered", description: "Order LC-1072 delivered", reference: "LC-1072" },
      { id: "ACT-003-3", date: "2026-03-20", type: "promo-used",      title: "Promo Code Used", description: "Applied SPRING15", reference: "SPRING15" },
      { id: "ACT-003-4", date: "2025-12-01", type: "customer-created", title: "Account Created", description: "Registered on Line Coffee website" },
    ],
  },

  // ─── C-004: Omar Ashraf — registered, Repeat ─────────────────────────────────
  {
    id: "C-004", name: "Omar Ashraf", email: "omar.ashraf@yahoo.com",
    phone: "+20 100 567 8901", whatsapp: "+20 100 567 8901",
    type: "registered", joinedAt: "2026-01-14", lastOrderDate: "2026-06-17",
    ordersCount: 5, totalSpent: 2560, averageOrderValue: 512,
    tags: [],
    favoriteCategory: "Espresso Blends", favoriteProducts: ["Aroma Body", "Heavy Crema"],
    marketingOptIn: false, promoUsageCount: 0,
    addresses: [
      { id: "A-004-1", label: "Home", governorate: "Alexandria", city: "Sidi Gaber",
        streetAddress: "19 Victor Emanuel St", buildingName: "El-Shafeei Building",
        floor: "3", apartment: "31", landmark: "Opposite Sidi Gaber Station",
        isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-1086", date: "2026-06-17", status: "Delivered", total: 680, itemsCount: 2, orderType: "make-espresso" },
      { orderId: "LC-1068", date: "2026-05-28", status: "Delivered", total: 420, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1053", date: "2026-05-05", status: "Delivered", total: 560, itemsCount: 3, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-004-1", date: "2026-06-17", type: "order-delivered", title: "Order Delivered", description: "Custom Aroma Body blend delivered", reference: "LC-1086" },
      { id: "ACT-004-2", date: "2026-06-17", type: "order-created",   title: "New Order Placed", description: "Custom Make-Your-Espresso order", reference: "LC-1086" },
      { id: "ACT-004-3", date: "2026-05-28", type: "order-delivered", title: "Order Delivered", description: "Order LC-1068 delivered", reference: "LC-1068" },
      { id: "ACT-004-4", date: "2026-01-14", type: "customer-created", title: "Account Created", description: "Registered on Line Coffee website" },
    ],
  },

  // ─── C-005: Laila Ibrahim — guest, Repeat ────────────────────────────────────
  {
    id: "C-005", name: "Laila Ibrahim",
    phone: "+20 100 789 0123", whatsapp: "+20 100 789 0123",
    type: "guest", joinedAt: "2025-11-07", lastOrderDate: "2026-06-17",
    ordersCount: 6, totalSpent: 2110, averageOrderValue: 352,
    tags: ["Promo Sensitive"],
    favoriteCategory: "Cappuccino",
    marketingOptIn: true, promoUsageCount: 3, lastPromoUsed: "COFFEE10",
    addresses: [
      { id: "A-005-1", label: "Home", governorate: "Cairo", city: "Ain Shams",
        streetAddress: "7 El-Nuzha St", buildingName: "Nour Building",
        floor: "2", apartment: "24", isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-1085", date: "2026-06-17", status: "Delivered", total: 380, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1069", date: "2026-06-01", status: "Delivered", total: 290, itemsCount: 1, orderType: "standard" },
      { orderId: "LC-1051", date: "2026-05-08", status: "Delivered", total: 450, itemsCount: 2, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-005-1", date: "2026-06-17", type: "order-delivered", title: "Order Delivered", description: "Guest checkout order LC-1085 delivered", reference: "LC-1085" },
      { id: "ACT-005-2", date: "2026-06-17", type: "order-created",   title: "Order Placed via Guest Checkout", description: "Original Cappuccino Mix 500g + Hazelnut Cappuccino", reference: "LC-1085" },
      { id: "ACT-005-3", date: "2026-04-10", type: "promo-used",      title: "Promo Code Used", description: "Applied COFFEE10 — 10% off cappuccino", reference: "COFFEE10" },
      { id: "ACT-005-4", date: "2025-11-07", type: "customer-created", title: "First Guest Order", description: "Identified via guest checkout" },
    ],
  },

  // ─── C-006: Khaled Samir — registered, Repeat ────────────────────────────────
  {
    id: "C-006", name: "Khaled Samir", email: "k.samir@gmail.com",
    phone: "+20 122 890 1234", whatsapp: "+20 122 890 1234",
    type: "registered", joinedAt: "2026-03-18", lastOrderDate: "2026-06-15",
    ordersCount: 3, totalSpent: 1640, averageOrderValue: 547,
    tags: [],
    favoriteCategory: "Turkish Blends", favoriteProducts: ["High Mood"],
    marketingOptIn: true, promoUsageCount: 1, lastPromoUsed: "NEWUSER",
    addresses: [
      { id: "A-006-1", label: "Home", governorate: "Giza", city: "October City",
        area: "Second District", streetAddress: "45 Central Axis Rd",
        buildingName: "Green Villa", floor: "G", apartment: "A1",
        landmark: "Near October University", isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-1082", date: "2026-06-15", status: "Delivered", total: 620, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1065", date: "2026-05-18", status: "Delivered", total: 540, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1042", date: "2026-04-05", status: "Delivered", total: 480, itemsCount: 2, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-006-1", date: "2026-06-15", type: "order-delivered", title: "Order Delivered", description: "Order LC-1082 delivered", reference: "LC-1082" },
      { id: "ACT-006-2", date: "2026-05-18", type: "order-delivered", title: "Order Delivered", description: "Order LC-1065 delivered", reference: "LC-1065" },
      { id: "ACT-006-3", date: "2026-04-01", type: "promo-used",      title: "Promo Code Used", description: "Applied NEWUSER — new account discount", reference: "NEWUSER" },
      { id: "ACT-006-4", date: "2026-03-18", type: "customer-created", title: "Account Created", description: "Registered on Line Coffee website" },
    ],
  },

  // ─── C-007: Rana Mostafa — guest, Repeat ─────────────────────────────────────
  {
    id: "C-007", name: "Rana Mostafa",
    phone: "+20 111 901 2345", whatsapp: "+20 111 901 2345",
    type: "guest", joinedAt: "2026-01-30", lastOrderDate: "2026-06-19",
    ordersCount: 5, totalSpent: 2870, averageOrderValue: 574,
    tags: [],
    favoriteCategory: "Hot Chocolate", favoriteProducts: ["Belgian Dark Chocolate"],
    marketingOptIn: false, promoUsageCount: 0,
    addresses: [
      { id: "A-007-1", label: "Home", governorate: "Cairo", city: "Heliopolis",
        area: "El-Merghany", streetAddress: "8 El-Merghany St",
        buildingName: "Lotus Building", floor: "4", apartment: "42",
        isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-1090", date: "2026-06-19", status: "New",       total: 700, itemsCount: 3, orderType: "make-flavor" },
      { orderId: "LC-1074", date: "2026-06-04", status: "Delivered", total: 580, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1058", date: "2026-05-12", status: "Delivered", total: 490, itemsCount: 2, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-007-1", date: "2026-06-19", type: "order-created",   title: "New Order Placed", description: "Custom flavor mix order placed", reference: "LC-1090" },
      { id: "ACT-007-2", date: "2026-06-04", type: "order-delivered", title: "Order Delivered", description: "Order LC-1074 delivered", reference: "LC-1074" },
      { id: "ACT-007-3", date: "2026-05-12", type: "order-delivered", title: "Order Delivered", description: "Order LC-1058 delivered", reference: "LC-1058" },
      { id: "ACT-007-4", date: "2026-01-30", type: "customer-created", title: "First Guest Order", description: "Identified via guest checkout" },
    ],
  },

  // ─── C-008: Tarek Hassan — registered, VIP ───────────────────────────────────
  {
    id: "C-008", name: "Tarek Hassan", email: "tarek.h@gmail.com",
    phone: "+20 100 012 3456", whatsapp: "+20 100 012 3456",
    type: "registered", joinedAt: "2025-08-22", lastOrderDate: "2026-06-18",
    ordersCount: 11, totalSpent: 6920, averageOrderValue: 629,
    tags: ["High Value"],
    favoriteCategory: "Espresso Blends", favoriteProducts: ["Black Label", "Headshot"],
    marketingOptIn: true, promoUsageCount: 3, lastPromoUsed: "VIP20",
    addresses: [
      { id: "A-008-1", label: "Home", governorate: "Cairo", city: "Fifth Settlement",
        area: "Southern 90th", streetAddress: "17 Lotus Compound",
        buildingName: "Villa 17", landmark: "AUC Gate 2 area",
        isDefault: true },
      { id: "A-008-2", label: "Work", governorate: "Cairo", city: "Smart Village",
        streetAddress: "Building B16, Smart Village",
        landmark: "26th of July Corridor", isDefault: false },
    ],
    recentOrders: [
      { orderId: "LC-1089", date: "2026-06-18", status: "Shipped",   total: 850, itemsCount: 3, orderType: "make-espresso" },
      { orderId: "LC-1078", date: "2026-06-06", status: "Delivered", total: 920, itemsCount: 4, orderType: "standard" },
      { orderId: "LC-1063", date: "2026-05-15", status: "Delivered", total: 680, itemsCount: 3, orderType: "standard" },
      { orderId: "LC-1047", date: "2026-04-20", status: "Delivered", total: 710, itemsCount: 3, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-008-1", date: "2026-06-18", type: "order-created",   title: "New Order Placed", description: "Custom Black Label espresso blend", reference: "LC-1089" },
      { id: "ACT-008-2", date: "2026-06-06", type: "order-delivered", title: "Order Delivered", description: "Order LC-1078 delivered", reference: "LC-1078" },
      { id: "ACT-008-3", date: "2026-05-10", type: "promo-used",      title: "Promo Code Used", description: "Applied VIP20 — VIP loyalty code", reference: "VIP20" },
      { id: "ACT-008-4", date: "2026-04-01", type: "review-submitted", title: "Review Submitted", description: "Left 5-star review for Black Label Espresso" },
      { id: "ACT-008-5", date: "2025-08-22", type: "customer-created", title: "Account Created", description: "Registered on Line Coffee website" },
    ],
    notes: "VIP customer — prefers espresso blends, especially dark roast. Responds well to loyalty codes.",
  },

  // ─── C-009: Youssef Tamer — guest, VIP (high-volume guest) ───────────────────
  {
    id: "C-009", name: "Youssef Tamer",
    phone: "+20 111 678 9014", whatsapp: "+20 111 678 9014",
    type: "guest", joinedAt: "2025-11-20", lastOrderDate: "2026-06-19",
    ordersCount: 9, totalSpent: 5500, averageOrderValue: 611,
    tags: ["High Value", "Promo Sensitive"],
    favoriteCategory: "Turkish Blends", favoriteProducts: ["Strike Coffee", "Turkish Silk"],
    marketingOptIn: true, promoUsageCount: 5, lastPromoUsed: "LOYAL15",
    addresses: [
      { id: "A-009-1", label: "Home", governorate: "Cairo", city: "Shubra",
        streetAddress: "22 El-Tersa St", buildingName: "Ramses Building",
        floor: "3", apartment: "33", isDefault: true },
      { id: "A-009-2", label: "Other", governorate: "Giza", city: "Mohandessin",
        streetAddress: "54 Gameat El-Dowal El-Arabia St", floor: "6", apartment: "64",
        isDefault: false },
    ],
    recentOrders: [
      { orderId: "LC-1087", date: "2026-06-19", status: "Delivered", total: 750, itemsCount: 3, orderType: "standard" },
      { orderId: "LC-1073", date: "2026-06-03", status: "Delivered", total: 620, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1056", date: "2026-05-10", status: "Delivered", total: 580, itemsCount: 3, orderType: "standard" },
      { orderId: "LC-1039", date: "2026-04-18", status: "Delivered", total: 700, itemsCount: 3, orderType: "standard" },
      { orderId: "LC-0988", date: "2026-03-10", status: "Delivered", total: 490, itemsCount: 2, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-009-1", date: "2026-06-19", type: "order-delivered", title: "Order Delivered", description: "Order LC-1087 delivered", reference: "LC-1087" },
      { id: "ACT-009-2", date: "2026-06-03", type: "order-delivered", title: "Order Delivered", description: "Order LC-1073 delivered", reference: "LC-1073" },
      { id: "ACT-009-3", date: "2026-05-20", type: "promo-used",      title: "Promo Code Used", description: "Applied LOYAL15", reference: "LOYAL15" },
      { id: "ACT-009-4", date: "2025-11-20", type: "customer-created", title: "First Guest Order", description: "Identified via guest checkout" },
    ],
    notes: "High-value guest — prefers not to register. Consistent buyer of Turkish blends.",
  },

  // ─── C-010: Karim Adel — registered, VIP + Wholesale Potential ───────────────
  {
    id: "C-010", name: "Karim Adel", email: "karim.adel@gmail.com",
    phone: "+20 111 890 2346", whatsapp: "+20 111 890 2346",
    type: "registered", joinedAt: "2025-07-10", lastOrderDate: "2026-06-12",
    ordersCount: 22, totalSpent: 14200, averageOrderValue: 645,
    tags: ["High Value", "Wholesale Potential"],
    favoriteCategory: "Turkish Blends", favoriteProducts: ["Turkish Silk", "Cairo Nights", "Strike Coffee"],
    marketingOptIn: true, promoUsageCount: 2, lastPromoUsed: "BULK10",
    addresses: [
      { id: "A-010-1", label: "Business", governorate: "Giza", city: "Dokki",
        streetAddress: "88 El-Tahrir St", buildingName: "Al-Saada Commercial Center",
        floor: "2", apartment: "205", landmark: "Next to Cairo University Gate",
        isDefault: true },
      { id: "A-010-2", label: "Home", governorate: "Giza", city: "Agouza",
        streetAddress: "14 Suleiman Gohar St", floor: "7", apartment: "73",
        isDefault: false },
    ],
    recentOrders: [
      { orderId: "LC-1084", date: "2026-06-12", status: "Delivered", total: 1850, itemsCount: 8, orderType: "standard" },
      { orderId: "LC-1071", date: "2026-05-25", status: "Delivered", total: 1620, itemsCount: 7, orderType: "standard" },
      { orderId: "LC-1057", date: "2026-05-06", status: "Delivered", total: 1400, itemsCount: 6, orderType: "standard" },
      { orderId: "LC-1041", date: "2026-04-15", status: "Delivered", total: 1750, itemsCount: 8, orderType: "standard" },
      { orderId: "LC-1025", date: "2026-03-20", status: "Delivered", total: 1200, itemsCount: 5, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-010-1", date: "2026-06-12", type: "order-delivered", title: "Bulk Order Delivered", description: "Order LC-1084 — 8 items delivered", reference: "LC-1084" },
      { id: "ACT-010-2", date: "2026-05-25", type: "order-delivered", title: "Bulk Order Delivered", description: "Order LC-1071 delivered", reference: "LC-1071" },
      { id: "ACT-010-3", date: "2026-04-10", type: "promo-used",      title: "Promo Code Used", description: "Applied BULK10 — bulk order discount", reference: "BULK10" },
      { id: "ACT-010-4", date: "2026-01-15", type: "customer-note",   title: "Admin Note Added", description: "Tagged as wholesale potential — buys monthly in bulk for café" },
      { id: "ACT-010-5", date: "2025-07-10", type: "customer-created", title: "Account Created", description: "Registered on Line Coffee website" },
    ],
    notes: "Wholesale-potential buyer. Orders in bulk every 2–3 weeks. May be sourcing for a small café. Candidate for B2B pricing.",
  },

  // ─── C-011: Sara Ibrahim — registered, Repeat — DUPLICATE PHONE WITH C-019 ───
  {
    id: "C-011", name: "Sara Ibrahim", email: "sara.ibrahim@gmail.com",
    phone: "+20 112 345 6781", whatsapp: "+20 112 345 6781",
    type: "registered", joinedAt: "2026-02-14", lastOrderDate: "2026-06-15",
    ordersCount: 4, totalSpent: 1920, averageOrderValue: 480,
    tags: [],
    favoriteCategory: "Coffee Mix",
    marketingOptIn: true, promoUsageCount: 1, lastPromoUsed: "VALENTINE",
    possibleDuplicateOf: "C-019",
    addresses: [
      { id: "A-011-1", label: "Home", governorate: "Giza", city: "Haram",
        area: "Faisal", streetAddress: "33 Faisal St", buildingName: "Al-Salam Building",
        floor: "1", apartment: "12", isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-1081", date: "2026-06-15", status: "Delivered", total: 530, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1064", date: "2026-05-20", status: "Delivered", total: 460, itemsCount: 2, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-011-1", date: "2026-06-15", type: "order-delivered", title: "Order Delivered", description: "Order LC-1081 delivered", reference: "LC-1081" },
      { id: "ACT-011-2", date: "2026-05-20", type: "order-delivered", title: "Order Delivered", description: "Order LC-1064 delivered", reference: "LC-1064" },
      { id: "ACT-011-3", date: "2026-02-14", type: "promo-used",      title: "Promo Code Used", description: "Applied VALENTINE promo", reference: "VALENTINE" },
      { id: "ACT-011-4", date: "2026-02-14", type: "customer-created", title: "Account Created", description: "Registered on Line Coffee website" },
    ],
  },

  // ─── C-012: Nour El-Din — registered, Repeat ─────────────────────────────────
  {
    id: "C-012", name: "Nour El-Din", email: "nour.eldin@gmail.com",
    phone: "+20 112 678 9012", whatsapp: "+20 112 678 9012",
    type: "registered", joinedAt: "2026-02-20", lastOrderDate: "2026-06-20",
    ordersCount: 4, totalSpent: 3200, averageOrderValue: 800,
    tags: [],
    favoriteCategory: "Espresso Blends", favoriteProducts: ["Heavy Crema"],
    marketingOptIn: false, promoUsageCount: 0,
    addresses: [
      { id: "A-012-1", label: "Home", governorate: "Cairo", city: "Nasr City",
        area: "Eighth District", streetAddress: "5 Mostafa El-Nahas St",
        buildingName: "Pyramid Heights", floor: "9", apartment: "91",
        isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-1093", date: "2026-06-20", status: "New",       total: 980, itemsCount: 3, orderType: "make-espresso" },
      { orderId: "LC-1076", date: "2026-06-05", status: "Delivered", total: 820, itemsCount: 3, orderType: "make-espresso" },
    ],
    activity: [
      { id: "ACT-012-1", date: "2026-06-20", type: "order-created",   title: "New Order Placed", description: "Custom espresso blend — Heavy Crema style", reference: "LC-1093" },
      { id: "ACT-012-2", date: "2026-06-05", type: "order-delivered", title: "Order Delivered", description: "Custom espresso delivered", reference: "LC-1076" },
      { id: "ACT-012-3", date: "2026-03-10", type: "review-submitted", title: "Review Submitted", description: "Left 5-star review for Heavy Crema blend" },
      { id: "ACT-012-4", date: "2026-02-20", type: "customer-created", title: "Account Created", description: "Registered on Line Coffee website" },
    ],
  },

  // ─── C-013: Dina Youssef — guest, New ────────────────────────────────────────
  {
    id: "C-013", name: "Dina Youssef",
    phone: "+20 122 123 4567", whatsapp: "+20 122 123 4567",
    type: "guest", joinedAt: "2026-06-10", lastOrderDate: "2026-06-16",
    ordersCount: 1, totalSpent: 220, averageOrderValue: 220,
    tags: [],
    favoriteCategory: "Easy Coffee",
    marketingOptIn: false, promoUsageCount: 0,
    addresses: [
      { id: "A-013-1", label: "Home", governorate: "Cairo", city: "Helwan",
        streetAddress: "4 Saad Zaghloul St", floor: "2", apartment: "21",
        isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-1075", date: "2026-06-16", status: "Delivered", total: 220, itemsCount: 1, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-013-1", date: "2026-06-16", type: "order-created",   title: "First Order Placed", description: "Easy Coffee Mix 250g via guest checkout", reference: "LC-1075" },
      { id: "ACT-013-2", date: "2026-06-10", type: "customer-created", title: "First Guest Order", description: "Identified via guest checkout" },
    ],
  },

  // ─── C-014: Hana Maher — registered, New ─────────────────────────────────────
  {
    id: "C-014", name: "Hana Maher", email: "hana.maher@gmail.com",
    phone: "+20 122 567 8903", whatsapp: "+20 122 567 8903",
    type: "registered", joinedAt: "2026-06-18", lastOrderDate: "2026-06-20",
    ordersCount: 1, totalSpent: 530, averageOrderValue: 530,
    tags: [],
    favoriteCategory: "Cappuccino",
    marketingOptIn: true, promoUsageCount: 1, lastPromoUsed: "WELCOME20",
    addresses: [
      { id: "A-014-1", label: "Home", governorate: "Alexandria", city: "Smouha",
        streetAddress: "12 Ahmed Orabi St", buildingName: "Salam Tower",
        floor: "5", apartment: "52", isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-1094", date: "2026-06-20", status: "Preparing", total: 530, itemsCount: 2, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-014-1", date: "2026-06-20", type: "order-created",   title: "First Order Placed", description: "Original Cappuccino 500g + Hazelnut Cappuccino 250g", reference: "LC-1094" },
      { id: "ACT-014-2", date: "2026-06-18", type: "promo-used",      title: "Promo Code Used", description: "Applied WELCOME20 — first order discount", reference: "WELCOME20" },
      { id: "ACT-014-3", date: "2026-06-18", type: "customer-created", title: "Account Created", description: "Registered on Line Coffee website" },
    ],
  },

  // ─── C-015: Lina Mostafa — registered, Repeat (recently joined) ──────────────
  {
    id: "C-015", name: "Lina Mostafa", email: "lina.m@gmail.com",
    phone: "+20 100 789 1235", whatsapp: "+20 100 789 1235",
    type: "registered", joinedAt: "2026-05-28", lastOrderDate: "2026-06-13",
    ordersCount: 2, totalSpent: 840, averageOrderValue: 420,
    tags: [],
    favoriteCategory: "Turkish Blends",
    marketingOptIn: true, promoUsageCount: 1, lastPromoUsed: "NEWUSER",
    addresses: [
      { id: "A-015-1", label: "Home", governorate: "Cairo", city: "Maadi",
        area: "Sarayat", streetAddress: "11 Rd 9", floor: "3", apartment: "31",
        isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-1080", date: "2026-06-13", status: "Delivered", total: 480, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1066", date: "2026-06-01", status: "Delivered", total: 360, itemsCount: 1, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-015-1", date: "2026-06-13", type: "order-delivered", title: "Order Delivered", description: "Order LC-1080 delivered", reference: "LC-1080" },
      { id: "ACT-015-2", date: "2026-06-01", type: "order-delivered", title: "Order Delivered", description: "Second order — quick repeat!", reference: "LC-1066" },
      { id: "ACT-015-3", date: "2026-05-28", type: "promo-used",      title: "Promo Code Used", description: "Applied NEWUSER on first order", reference: "NEWUSER" },
      { id: "ACT-015-4", date: "2026-05-28", type: "customer-created", title: "Account Created", description: "Registered on Line Coffee website" },
    ],
  },

  // ─── C-016: Maged Farouk — guest, At Risk (last order 64 days ago) ───────────
  {
    id: "C-016", name: "Maged Farouk",
    phone: "+20 100 234 5670", whatsapp: "+20 100 234 5670",
    type: "guest", joinedAt: "2025-12-02", lastOrderDate: "2026-04-18",
    ordersCount: 3, totalSpent: 1050, averageOrderValue: 350,
    tags: ["Needs Follow-up"],
    favoriteCategory: "Coffee Mix",
    marketingOptIn: false, promoUsageCount: 0,
    addresses: [
      { id: "A-016-1", label: "Home", governorate: "Cairo", city: "Imbaba",
        streetAddress: "15 Khaled Ibn El-Waleed St", buildingName: "Selim Building",
        floor: "3", apartment: "32", isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-1044", date: "2026-04-18", status: "Delivered", total: 380, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1028", date: "2026-03-25", status: "Delivered", total: 360, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-0991", date: "2026-01-10", status: "Delivered", total: 310, itemsCount: 1, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-016-1", date: "2026-04-18", type: "order-delivered", title: "Order Delivered", description: "Last guest order delivered — 64 days ago", reference: "LC-1044" },
      { id: "ACT-016-2", date: "2026-03-25", type: "order-delivered", title: "Order Delivered", description: "Order LC-1028 delivered", reference: "LC-1028" },
      { id: "ACT-016-3", date: "2025-12-02", type: "customer-created", title: "First Guest Order", description: "Identified via guest checkout" },
    ],
  },

  // ─── C-017: Amr Nasser — guest, At Risk (last order 72 days ago) ─────────────
  {
    id: "C-017", name: "Amr Nasser",
    phone: "+20 100 456 7892", whatsapp: "+20 100 456 7892",
    type: "guest", joinedAt: "2026-01-01", lastOrderDate: "2026-04-10",
    ordersCount: 4, totalSpent: 1780, averageOrderValue: 445,
    tags: [],
    favoriteCategory: "Espresso Blends", favoriteProducts: ["Aroma Body"],
    marketingOptIn: false, promoUsageCount: 0,
    addresses: [
      { id: "A-017-1", label: "Home", governorate: "Cairo", city: "Boulaq",
        streetAddress: "3 Corniche El-Nile St", floor: "2", apartment: "23",
        landmark: "Nile view building", isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-1038", date: "2026-04-10", status: "Delivered", total: 540, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1019", date: "2026-03-15", status: "Delivered", total: 460, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-1004", date: "2026-02-20", status: "Delivered", total: 390, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-0987", date: "2026-01-25", status: "Delivered", total: 390, itemsCount: 2, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-017-1", date: "2026-04-10", type: "order-delivered", title: "Order Delivered", description: "Last guest order — 72 days ago", reference: "LC-1038" },
      { id: "ACT-017-2", date: "2026-03-15", type: "order-delivered", title: "Order Delivered", description: "Order LC-1019 delivered", reference: "LC-1019" },
      { id: "ACT-017-3", date: "2026-01-01", type: "customer-created", title: "First Guest Order", description: "Identified via guest checkout" },
    ],
  },

  // ─── C-018: Reem El-Sayed — guest, Inactive (last order 103 days ago) ─────────
  {
    id: "C-018", name: "Reem El-Sayed",
    phone: "+20 122 901 3457", whatsapp: "+20 122 901 3457",
    type: "guest", joinedAt: "2025-10-05", lastOrderDate: "2026-03-10",
    ordersCount: 4, totalSpent: 1640, averageOrderValue: 410,
    tags: [],
    favoriteCategory: "Hot Chocolate",
    marketingOptIn: true, promoUsageCount: 2, lastPromoUsed: "WINTER20",
    addresses: [
      { id: "A-018-1", label: "Home", governorate: "Alexandria", city: "Miami",
        streetAddress: "7 El-Geish Rd", buildingName: "Seaview Apartments",
        floor: "5", apartment: "52", landmark: "Near Miami Beach",
        isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-1015", date: "2026-03-10", status: "Delivered", total: 460, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-0978", date: "2026-02-01", status: "Delivered", total: 380, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-0944", date: "2025-12-20", status: "Delivered", total: 420, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-0912", date: "2025-10-15", status: "Delivered", total: 380, itemsCount: 2, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-018-1", date: "2026-03-10", type: "order-delivered", title: "Order Delivered", description: "Last order — 103 days ago", reference: "LC-1015" },
      { id: "ACT-018-2", date: "2026-01-10", type: "promo-used",      title: "Promo Code Used", description: "Applied WINTER20", reference: "WINTER20" },
      { id: "ACT-018-3", date: "2025-10-05", type: "customer-created", title: "First Guest Order", description: "Identified via guest checkout" },
    ],
  },

  // ─── C-019: Fatma Nabil — guest, Inactive — DUPLICATE PHONE WITH C-011 ────────
  {
    id: "C-019", name: "Fatma Nabil",
    phone: "+20 112 345 6781", whatsapp: "+20 112 345 6781",
    type: "guest", joinedAt: "2025-09-15", lastOrderDate: "2026-02-20",
    ordersCount: 3, totalSpent: 980, averageOrderValue: 327,
    tags: [],
    favoriteCategory: "Coffee Mix",
    marketingOptIn: false, promoUsageCount: 0,
    possibleDuplicateOf: "C-011",
    addresses: [
      { id: "A-019-1", label: "Home", governorate: "Sharqia", city: "Zagazig",
        streetAddress: "18 El-Galaa St", floor: "2", apartment: "21",
        isDefault: true },
    ],
    recentOrders: [
      { orderId: "LC-0972", date: "2026-02-20", status: "Delivered", total: 360, itemsCount: 2, orderType: "standard" },
      { orderId: "LC-0940", date: "2025-12-10", status: "Delivered", total: 310, itemsCount: 1, orderType: "standard" },
      { orderId: "LC-0907", date: "2025-10-05", status: "Delivered", total: 310, itemsCount: 1, orderType: "standard" },
    ],
    activity: [
      { id: "ACT-019-1", date: "2026-02-20", type: "order-delivered", title: "Order Delivered", description: "Last order — 121 days ago", reference: "LC-0972" },
      { id: "ACT-019-2", date: "2025-12-10", type: "order-delivered", title: "Order Delivered", description: "Order LC-0940 delivered", reference: "LC-0940" },
      { id: "ACT-019-3", date: "2025-09-15", type: "customer-created", title: "First Guest Order", description: "Identified via guest checkout" },
    ],
  },

  // ─── C-020: Basma Wael — registered, New (no orders yet) ─────────────────────
  {
    id: "C-020", name: "Basma Wael", email: "basma.wael@gmail.com",
    phone: "+20 115 432 1098", whatsapp: "+20 115 432 1098",
    type: "registered", joinedAt: "2026-06-19",
    ordersCount: 0, totalSpent: 0, averageOrderValue: 0,
    tags: [],
    marketingOptIn: true, promoUsageCount: 0,
    addresses: [],
    recentOrders: [],
    activity: [
      { id: "ACT-020-1", date: "2026-06-19", type: "customer-created", title: "Account Created", description: "Registered on Line Coffee website — no orders yet" },
    ],
  },
];

// ── Summary (for KPI cards) ───────────────────────────────────────────────────

export const CUSTOMER_SUMMARY = {
  total:      ADMIN_CUSTOMERS.length,
  registered: ADMIN_CUSTOMERS.filter(c => c.type === "registered").length,
  guest:      ADMIN_CUSTOMERS.filter(c => c.type === "guest").length,
  repeat:     ADMIN_CUSTOMERS.filter(c => !getSegments(c).includes("vip") && getSegments(c).includes("repeat")).length,
  vip:        ADMIN_CUSTOMERS.filter(c => getSegments(c).includes("vip")).length,
  inactive:   ADMIN_CUSTOMERS.filter(c => getSegments(c).includes("inactive")).length,
  totalRevenue: ADMIN_CUSTOMERS.reduce((s, c) => s + c.totalSpent, 0),
};
