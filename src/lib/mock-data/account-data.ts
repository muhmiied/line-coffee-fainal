export type OrderStatus = "processing" | "roasting" | "shipped" | "delivered" | "cancelled";

export interface OrderItem {
  name:     { en: string; ar: string };
  detail:   { en: string; ar: string };
  qty:      number;
  price:    number;
}

export interface MockOrder {
  id:        string;
  date:      string;
  status:    OrderStatus;
  items:     OrderItem[];
  subtotal:  number;
  delivery:  number;
  total:     number;
  address:   { en: string; ar: string };
}

export const MOCK_ORDERS: MockOrder[] = [
  {
    id: "LC-004821",
    date: "2026-06-15",
    status: "delivered",
    items: [
      { name: { en: "Turkish Silk", ar: "تركي سيلك" }, detail: { en: "500g", ar: "٥٠٠ جم" }, qty: 2, price: 189 },
      { name: { en: "Heavy Crema", ar: "هيفي كريما" }, detail: { en: "250g", ar: "٢٥٠ جم" }, qty: 1, price: 129 },
    ],
    subtotal: 507,
    delivery: 0,
    total: 507,
    address: { en: "15 El-Nasr Rd, Nasr City, Cairo", ar: "١٥ شارع النصر، مدينة نصر، القاهرة" },
  },
  {
    id: "LC-005134",
    date: "2026-06-18",
    status: "roasting",
    items: [
      { name: { en: "Black Label", ar: "بلاك لايبل" }, detail: { en: "1kg", ar: "١ كجم" }, qty: 1, price: 349 },
    ],
    subtotal: 349,
    delivery: 50,
    total: 399,
    address: { en: "8 Tahrir Square, Downtown, Cairo", ar: "٨ ميدان التحرير، وسط البلد، القاهرة" },
  },
  {
    id: "LC-005290",
    date: "2026-06-19",
    status: "processing",
    items: [
      { name: { en: "Custom Espresso Blend", ar: "خلطة إسبريسو مخصصة" }, detail: { en: "500g · High Mood profile", ar: "٥٠٠ جم · بروفايل هاي مود" }, qty: 1, price: 229 },
      { name: { en: "Original Cappuccino", ar: "كابتشينو أوريجينال" }, detail: { en: "1kg", ar: "١ كجم" }, qty: 2, price: 199 },
    ],
    subtotal: 627,
    delivery: 0,
    total: 627,
    address: { en: "22 Corniche El-Nil, Maadi, Cairo", ar: "٢٢ كورنيش النيل، المعادي، القاهرة" },
  },
];

export const STATUS_LABEL: Record<OrderStatus, { en: string; ar: string }> = {
  processing: { en: "Processing",  ar: "قيد المعالجة" },
  roasting:   { en: "Roasting",    ar: "جارٍ التحميص" },
  shipped:    { en: "Shipped",      ar: "تم الشحن" },
  delivered:  { en: "Delivered",   ar: "تم التوصيل" },
  cancelled:  { en: "Cancelled",   ar: "ملغي" },
};

export const STATUS_COLOR: Record<OrderStatus, string> = {
  processing: "text-amber-400   bg-amber-400/10   border-amber-400/25",
  roasting:   "text-orange-400  bg-orange-400/10  border-orange-400/25",
  shipped:    "text-sky-400     bg-sky-400/10     border-sky-400/25",
  delivered:  "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
  cancelled:  "text-red-400     bg-red-400/10     border-red-400/25",
};

export interface MockAddress {
  id:        string;
  label:     { en: string; ar: string };
  name:      string;
  phone:     string;
  street:    { en: string; ar: string };
  city:      { en: string; ar: string };
  isDefault: boolean;
}

export const MOCK_ADDRESSES: MockAddress[] = [
  {
    id: "addr-1",
    label: { en: "Home", ar: "المنزل" },
    name: "Mohamed Sayed",
    phone: "+20 100 476 1171",
    street: { en: "15 El-Nasr Road, Apt 4", ar: "١٥ شارع النصر، شقة ٤" },
    city: { en: "Nasr City, Cairo", ar: "مدينة نصر، القاهرة" },
    isDefault: true,
  },
  {
    id: "addr-2",
    label: { en: "Work", ar: "العمل" },
    name: "Mohamed Sayed",
    phone: "+20 100 476 1171",
    street: { en: "8 Tahrir Square, Floor 3", ar: "٨ ميدان التحرير، الطابق ٣" },
    city: { en: "Downtown, Cairo", ar: "وسط البلد، القاهرة" },
    isDefault: false,
  },
];

export type MockNotification = {
  id:   string;
  date: string;
  read: boolean;
  title: { en: string; ar: string };
  body:  { en: string; ar: string };
};

export const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: "n1",
    date: "2026-06-19",
    read: false,
    title: { en: "Your order is being roasted", ar: "طلبك قيد التحميص الآن" },
    body:  { en: "LC-005134 has entered the roasting stage. Fresh delivery soon.", ar: "دخل الطلب LC-005134 مرحلة التحميص. التوصيل قريباً." },
  },
  {
    id: "n2",
    date: "2026-06-18",
    read: false,
    title: { en: "Order confirmed", ar: "تم تأكيد طلبك" },
    body:  { en: "LC-005290 has been received and is being prepared.", ar: "تم استلام الطلب LC-005290 وجارٍ تجهيزه." },
  },
  {
    id: "n3",
    date: "2026-06-15",
    read: true,
    title: { en: "Order delivered", ar: "تم توصيل طلبك" },
    body:  { en: "LC-004821 was delivered successfully. Enjoy your coffee!", ar: "تم توصيل الطلب LC-004821 بنجاح. استمتع بقهوتك!" },
  },
];
