import type { OrderStatus } from "./dashboard-mock";
export type { OrderStatus };

// ── Types ──────────────────────────────────────────────────────────────────────

export type OrderType        = "standard" | "make-your-espresso" | "make-your-flavor";
export type PaymentMethod    = "cash" | "instapay" | "e-wallet";
export type PaymentStatus    = "Paid" | "Pending" | "Refunded";
export type CustomerType     = "guest" | "registered";

export interface AdminOrderItem {
  name:      string;
  detail:    string;  // weight / variant
  unitPrice: number;
  qty:       number;
}

export interface EspressoOrderData {
  blendName:   string;
  arabicaPct:  number;
  robustaPct:  number;
  totalWeight: number;  // grams
  beans: Array<{
    origin:   string;
    pct:      number;
    beanType: "arabica" | "robusta";
  }>;
}

export interface FlavorOrderData {
  base:        string;
  baseName:    string;
  totalWeight: number;  // grams
  flavors:     string[];
}

export interface AdminOrder {
  id:          string;
  orderType:   OrderType;
  status:      OrderStatus;
  date:        string;

  customer: {
    name:           string;
    email:          string;
    phone:          string;
    type:           CustomerType;
    previousOrders: number;
    since?:         string;
  };

  address: {
    governorate: string;
    city:        string;
    street:      string;
    building:    string;
    floor?:      string;
    apt?:        string;
    landmark?:   string;
  };

  deliveryMethod: "standard" | "express";
  deliveryFee:    number;

  items:     AdminOrderItem[];
  subtotal:  number;
  discount:  number;
  total:     number;
  promoCode?: string;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;

  notes?:      string;
  adminNotes?: string;

  espressoData?: EspressoOrderData;
  flavorData?:   FlavorOrderData;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export const ADMIN_ORDERS: AdminOrder[] = [
  // ── New ─────────────────────────────────────────────────────────────────────
  {
    id: "LC-1090", orderType: "make-your-flavor", status: "New",
    date: "2026-06-20T11:45:00",
    customer: { name: "Nada Saleh",    email: "nada.saleh@gmail.com",    phone: "+20 112 011 2233", type: "registered", previousOrders: 4, since: "2026-03-10" },
    address:  { governorate: "Cairo",  city: "Maadi",      street: "Road 218",        building: "4", floor: "2", apt: "A",  landmark: "Near Maadi Metro" },
    deliveryMethod: "standard", deliveryFee: 50,
    items:    [{ name: "Custom Flavor Mix",      detail: "Dark Base · 5 Flavors · 500g", unitPrice: 420, qty: 1 }],
    subtotal: 420, discount: 0, total: 470,
    paymentMethod: "instapay",     paymentStatus: "Paid",
    flavorData: { base: "dark", baseName: "Dark Roast Base", totalWeight: 500, flavors: ["Hazelnut", "Chocolate", "Caramel", "Vanilla", "Cinnamon Roll"] },
  },
  {
    id: "LC-1088", orderType: "standard", status: "New",
    date: "2026-06-20T10:23:00",
    customer: { name: "Sara Hassan",   email: "sara.hassan@gmail.com",   phone: "+20 100 234 5678", type: "registered", previousOrders: 6, since: "2025-08-15" },
    address:  { governorate: "Cairo",  city: "Maadi",      street: "Road 9",          building: "12", floor: "3", apt: "A" },
    deliveryMethod: "standard", deliveryFee: 0,
    items:    [
      { name: "Turkish Silk",       detail: "250g", unitPrice: 170, qty: 2 },
      { name: "High Mood Espresso", detail: "250g", unitPrice: 300, qty: 1 },
    ],
    subtotal: 640, discount: 0, total: 640,
    paymentMethod: "cash", paymentStatus: "Pending",
  },
  {
    id: "LC-1084", orderType: "standard", status: "New",
    date: "2026-06-20T08:55:00",
    customer: { name: "Nour El-Din",   email: "nour.eldin@gmail.com",    phone: "+20 112 678 9012", type: "registered", previousOrders: 5, since: "2025-12-03" },
    address:  { governorate: "Cairo",  city: "Heliopolis", street: "Merghany St.",    building: "44", floor: "5", apt: "C" },
    deliveryMethod: "standard", deliveryFee: 0,
    items:    [
      { name: "High Mood Espresso", detail: "500g", unitPrice: 560, qty: 1 },
      { name: "Turkish Silk",       detail: "250g", unitPrice: 170, qty: 2 },
    ],
    subtotal: 900, discount: 0, total: 900,
    paymentMethod: "cash", paymentStatus: "Pending",
  },
  {
    id: "LC-1075", orderType: "standard", status: "New",
    date: "2026-06-20T07:30:00",
    customer: { name: "Hana Maher",    email: "hana.maher@gmail.com",    phone: "+20 122 567 8903", type: "guest",      previousOrders: 0 },
    address:  { governorate: "Alexandria", city: "Stanley", street: "El-Geish Rd.", building: "6", floor: "2" },
    deliveryMethod: "standard", deliveryFee: 50,
    items:    [
      { name: "Classic Line",       detail: "250g", unitPrice: 170, qty: 2 },
      { name: "Original Cappuccino", detail: "10-pack", unitPrice: 95, qty: 2 },
    ],
    subtotal: 530, discount: 0, total: 580,
    paymentMethod: "cash", paymentStatus: "Pending",
  },
  // ── Preparing ────────────────────────────────────────────────────────────────
  {
    id: "LC-1089", orderType: "make-your-espresso", status: "Preparing",
    date: "2026-06-19T17:00:00",
    customer: { name: "Karim Mostafa", email: "k.mostafa@outlook.com",   phone: "+20 100 122 3344", type: "registered", previousOrders: 9, since: "2025-11-05" },
    address:  { governorate: "Giza",   city: "Zamalek",   street: "Hassan Sabry St.", building: "11", apt: "7" },
    deliveryMethod: "standard", deliveryFee: 0,
    items:    [{ name: "Custom Espresso Blend", detail: "Advanced · Headshot Profile · 250g", unitPrice: 260, qty: 2 }],
    subtotal: 520, discount: 0, total: 520,
    paymentMethod: "instapay",     paymentStatus: "Paid",
    adminNotes: "VIP customer — double-check ratios before dispatch.",
    espressoData: {
      blendName: "Headshot", arabicaPct: 70, robustaPct: 30, totalWeight: 500,
      beans: [
        { origin: "Indian",            pct: 35, beanType: "arabica" },
        { origin: "Brazilian Regular", pct: 25, beanType: "arabica" },
        { origin: "Colombian Regular", pct: 10, beanType: "arabica" },
        { origin: "Ugandan 18",        pct: 15, beanType: "robusta" },
        { origin: "Guatemala",         pct: 15, beanType: "robusta" },
      ],
    },
  },
  {
    id: "LC-1087", orderType: "standard", status: "Preparing",
    date: "2026-06-19T14:05:00",
    customer: { name: "Ahmed Kamal",   email: "a.kamal@outlook.com",     phone: "+20 111 345 6789", type: "registered", previousOrders: 14, since: "2025-06-01" },
    address:  { governorate: "Giza",   city: "Dokki",     street: "Tahrir St.",      building: "7", floor: "2" },
    deliveryMethod: "standard", deliveryFee: 50,
    items:    [{ name: "Heavy Crema", detail: "250g", unitPrice: 300, qty: 1 }],
    subtotal: 300, discount: 0, total: 350,
    paymentMethod: "cash", paymentStatus: "Pending",
    notes: "Please ring doorbell twice.",
  },
  {
    id: "LC-1081", orderType: "standard", status: "Preparing",
    date: "2026-06-19T11:20:00",
    customer: { name: "Rana Mostafa",  email: "rana.mostafa@gmail.com",  phone: "+20 111 901 2345", type: "registered", previousOrders: 2, since: "2026-04-11" },
    address:  { governorate: "Cairo",  city: "Maadi",     street: "Corniche El-Nile", building: "22", apt: "8" },
    deliveryMethod: "express", deliveryFee: 80,
    items:    [
      { name: "Classic Line",        detail: "500g",    unitPrice: 310, qty: 1 },
      { name: "Hazelnut Cappuccino", detail: "10-pack", unitPrice: 110, qty: 3 },
    ],
    subtotal: 640, discount: 0, total: 720,
    paymentMethod: "instapay",         paymentStatus: "Paid",
  },
  // ── Shipped ──────────────────────────────────────────────────────────────────
  {
    id: "LC-1086", orderType: "standard", status: "Shipped",
    date: "2026-06-18T09:47:00",
    customer: { name: "Mariam Hesham", email: "mariam.h@gmail.com",      phone: "+20 122 456 7890", type: "registered", previousOrders: 3, since: "2025-09-20" },
    address:  { governorate: "Cairo",  city: "Zamalek",   street: "26 July St.",     building: "3",  apt: "5B" },
    deliveryMethod: "express", deliveryFee: 80,
    items:    [
      { name: "Turkish Silk", detail: "500g", unitPrice: 310, qty: 1 },
      { name: "Black Label",  detail: "250g", unitPrice: 300, qty: 2 },
    ],
    subtotal: 910, discount: 91, total: 899,
    paymentMethod: "instapay",      paymentStatus: "Paid",
    promoCode: "LINE10",
  },
  {
    id: "LC-1080", orderType: "standard", status: "Shipped",
    date: "2026-06-18T15:40:00",
    customer: { name: "Tarek Hassan",  email: "tarek.h@gmail.com",       phone: "+20 100 012 3456", type: "registered", previousOrders: 11, since: "2025-10-15" },
    address:  { governorate: "Cairo",  city: "New Cairo",  street: "90th Street",    building: "Tower 3", floor: "11", apt: "1102" },
    deliveryMethod: "standard", deliveryFee: 0,
    items:    [
      { name: "Turkish Silk",       detail: "500g", unitPrice: 310, qty: 2 },
      { name: "High Mood Espresso", detail: "250g", unitPrice: 300, qty: 1 },
    ],
    subtotal: 920, discount: 0, total: 920,
    paymentMethod: "instapay",      paymentStatus: "Paid",
  },
  {
    id: "LC-1074", orderType: "standard", status: "Shipped",
    date: "2026-06-19T09:15:00",
    customer: { name: "Youssef Tamer", email: "y.tamer@gmail.com",       phone: "+20 111 678 9014", type: "registered", previousOrders: 12, since: "2025-08-08" },
    address:  { governorate: "Cairo",  city: "Heliopolis", street: "Baghdad St.",    building: "8", apt: "6A" },
    deliveryMethod: "standard", deliveryFee: 0,
    items:    [
      { name: "High Mood Espresso", detail: "250g", unitPrice: 300, qty: 2 },
      { name: "Turkish Silk",       detail: "250g", unitPrice: 170, qty: 1 },
    ],
    subtotal: 770, discount: 0, total: 770,
    paymentMethod: "cash", paymentStatus: "Pending",
  },
  // ── Delivered ─────────────────────────────────────────────────────────────────
  {
    id: "LC-1085", orderType: "standard", status: "Delivered",
    date: "2026-06-17T11:30:00",
    customer: { name: "Omar Ashraf",   email: "omar.ashraf@yahoo.com",   phone: "+20 100 567 8901", type: "registered", previousOrders: 2, since: "2026-01-14" },
    address:  { governorate: "Alexandria", city: "Sidi Bishr", street: "Abu Qir St.", building: "18", floor: "1" },
    deliveryMethod: "standard", deliveryFee: 0,
    items:    [{ name: "Classic Line", detail: "250g", unitPrice: 170, qty: 3 }],
    subtotal: 510, discount: 0, total: 510,
    paymentMethod: "instapay",         paymentStatus: "Paid",
  },
  {
    id: "LC-1083", orderType: "standard", status: "Delivered",
    date: "2026-06-17T16:12:00",
    customer: { name: "Laila Ibrahim", email: "laila.ibrahim@hotmail.com", phone: "+20 100 789 0123", type: "guest",   previousOrders: 0 },
    address:  { governorate: "Cairo",  city: "Nasr City",  street: "Abbas El-Akkad", building: "9", apt: "12" },
    deliveryMethod: "standard", deliveryFee: 50,
    items:    [{ name: "Turkish Silk", detail: "250g", unitPrice: 170, qty: 2 }],
    subtotal: 340, discount: 0, total: 390,
    paymentMethod: "cash", paymentStatus: "Paid",
  },
  {
    id: "LC-1079", orderType: "standard", status: "Delivered",
    date: "2026-06-16T10:10:00",
    customer: { name: "Dina Youssef",  email: "dina.youssef@yahoo.com",  phone: "+20 122 123 4567", type: "guest",      previousOrders: 0 },
    address:  { governorate: "Cairo",  city: "Helwan",    street: "Ain Helwan",     building: "5" },
    deliveryMethod: "standard", deliveryFee: 50,
    items:    [{ name: "Turkish Silk", detail: "250g", unitPrice: 170, qty: 1 }],
    subtotal: 170, discount: 0, total: 220,
    paymentMethod: "cash", paymentStatus: "Paid",
  },
  {
    id: "LC-1077", orderType: "standard", status: "Delivered",
    date: "2026-06-15T14:30:00",
    customer: { name: "Sara Ibrahim",  email: "sara.ibrahim@gmail.com",  phone: "+20 112 345 6781", type: "registered", previousOrders: 3, since: "2026-01-22" },
    address:  { governorate: "Giza",   city: "Mohandessin", street: "Gamaet El-Dewal", building: "14", apt: "3" },
    deliveryMethod: "standard", deliveryFee: 0,
    items:    [
      { name: "Black Label",         detail: "250g",    unitPrice: 300, qty: 1 },
      { name: "Original Cappuccino", detail: "10-pack", unitPrice:  95, qty: 3 },
    ],
    subtotal: 585, discount: 0, total: 585,
    paymentMethod: "cash", paymentStatus: "Paid",
  },
  {
    id: "LC-1076", orderType: "standard", status: "Delivered",
    date: "2026-06-14T12:00:00",
    customer: { name: "Amr Nasser",    email: "amr.nasser@hotmail.com",  phone: "+20 100 456 7892", type: "registered", previousOrders: 4, since: "2025-11-30" },
    address:  { governorate: "Cairo",  city: "Nasr City",  street: "El-Thawra St.", building: "20", floor: "6" },
    deliveryMethod: "standard", deliveryFee: 0,
    items:    [{ name: "Turkish Silk", detail: "250g", unitPrice: 170, qty: 3 }],
    subtotal: 510, discount: 0, total: 510,
    paymentMethod: "e-wallet",    paymentStatus: "Paid",
  },
  // ── Cancelled ─────────────────────────────────────────────────────────────────
  {
    id: "LC-1082", orderType: "standard", status: "Cancelled",
    date: "2026-06-17T13:00:00",
    customer: { name: "Khaled Samir",  email: "k.samir@gmail.com",       phone: "+20 122 890 1234", type: "registered", previousOrders: 8, since: "2025-07-20" },
    address:  { governorate: "Giza",   city: "6th October", street: "Central Axis", building: "B2", floor: "G" },
    deliveryMethod: "standard", deliveryFee: 0,
    items:    [{ name: "Black Label",  detail: "250g", unitPrice: 300, qty: 2 }],
    subtotal: 600, discount: 0, total: 600,
    paymentMethod: "cash", paymentStatus: "Pending",
    notes: "Customer requested cancellation — out of town.",
    adminNotes: "Cancelled at customer request before dispatch.",
  },
  // ── Returned ──────────────────────────────────────────────────────────────────
  {
    id: "LC-1078", orderType: "standard", status: "Returned",
    date: "2026-06-15T09:05:00",
    customer: { name: "Maged Farouk",  email: "maged.f@gmail.com",       phone: "+20 100 234 5670", type: "registered", previousOrders: 7, since: "2025-09-01" },
    address:  { governorate: "Cairo",  city: "Shubra",    street: "Shubra St.",     building: "31", floor: "4" },
    deliveryMethod: "standard", deliveryFee: 50,
    items:    [{ name: "Heavy Crema",  detail: "250g", unitPrice: 300, qty: 1 }],
    subtotal: 300, discount: 0, total: 350,
    paymentMethod: "instapay",      paymentStatus: "Refunded",
    notes: "Item arrived damaged.",
    adminNotes: "Return approved. Courier pickup arranged. Refund issued.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROGRESSION: OrderStatus[] = ["New", "Preparing", "Shipped", "Delivered"];

export interface TimelineStep {
  key:       string;
  label:     string;
  done:      boolean;
  current:   boolean;
  terminal?: boolean;
  time:      string | null;
}

export function buildTimeline(order: AdminOrder, status: OrderStatus): TimelineStep[] {
  const base   = new Date(order.date).getTime();
  const H      = 3_600_000;
  const idx    = PROGRESSION.indexOf(status);
  const isTime = (minIdx: number, offset: number) =>
    idx >= minIdx ? new Date(base + H * offset).toISOString() : null;

  const steps: TimelineStep[] = [
    { key: "placed",    label: "Order Placed", done: true,    current: status === "New",       time: order.date },
    { key: "confirmed", label: "Confirmed",    done: idx >= 1, current: false,                 time: isTime(1, 0.5) },
    { key: "preparing", label: "Preparing",    done: idx >= 2, current: status === "Preparing", time: isTime(2, 2) },
    { key: "shipped",   label: "Shipped",       done: idx >= 3, current: status === "Shipped",   time: isTime(3, 20) },
    { key: "delivered", label: "Delivered",     done: status === "Delivered", current: status === "Delivered", time: status === "Delivered" ? new Date(base + H * 44).toISOString() : null },
  ];

  if (status === "Cancelled") steps.push({ key: "cancelled", label: "Cancelled", done: true, current: true, terminal: true, time: new Date(base + H * 3).toISOString() });
  if (status === "Returned")  steps.push({ key: "returned",  label: "Returned",  done: true, current: true, terminal: true, time: new Date(base + H * 60).toISOString() });

  return steps;
}

export function generateWhatsAppMessage(order: AdminOrder, status: OrderStatus): string {
  const firstName = order.customer.name.split(" ")[0];
  const id        = order.id;
  switch (status) {
    case "New":       return `مرحبًا ${firstName}! ✅ طلبك رقم ${id} وصلنا بنجاح. سنبدأ التحضير في أقرب وقت ☕`;
    case "Preparing": return `مرحبًا ${firstName}! ☕ طلبك رقم ${id} دخل مرحلة التحضير دلوقتي. هنوصّله قريباً!`;
    case "Shipped":   return `مرحبًا ${firstName}! 🚚 طلبك رقم ${id} اتشحن وفي الطريق إليك.`;
    case "Delivered": return `وصل طلبك بأمان ${firstName}! 🎉 نأمل تكون راضي عن التجربة. قيّمنا على linecoffee.eg ☕`;
    case "Cancelled": return `مرحبًا ${firstName}، تم إلغاء طلبك رقم ${id}. للاستفسار تواصل معنا على واتساب.`;
    case "Returned":  return `مرحبًا ${firstName}، تم استلام طلب الإرجاع للطلب رقم ${id}. سنتواصل معك قريباً.`;
    default:          return `مرحبًا ${firstName}، بخصوص طلبك رقم ${id} — تواصل معنا لأي استفسار.`;
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

export const ORDER_SUMMARY = {
  total:     ADMIN_ORDERS.length,
  new:       ADMIN_ORDERS.filter((o) => o.status === "New").length,
  preparing: ADMIN_ORDERS.filter((o) => o.status === "Preparing").length,
  shipped:   ADMIN_ORDERS.filter((o) => o.status === "Shipped").length,
  delivered: ADMIN_ORDERS.filter((o) => o.status === "Delivered").length,
  issues:    ADMIN_ORDERS.filter((o) => o.status === "Cancelled" || o.status === "Returned").length,
};
