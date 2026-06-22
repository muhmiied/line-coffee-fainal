import { catalogProducts } from "../product-catalog";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StockStatus  = "In Stock" | "Low Stock" | "Out of Stock";
export type ItemType     = "finished" | "bean" | "packaging";
export type MovementType = "restock" | "order-deducted" | "manual-adjust" | "damaged" | "lost" | "customer-return" | "supplier-return";

export type FinishedProduct = {
  slug:          string;
  nameEn:        string;
  nameAr:        string;
  image:         string;
  category:      string;
  stock250g:     number;
  stock500g:     number;
  stock1kg:      number;
  threshold250g: number;
  threshold500g: number;
  threshold1kg:  number;
  cost250g:      number;
  cost500g:      number;
  cost1kg:       number;
  supplierId:    string;
  lastRestocked: string;
};

export type EspressoBean = {
  slug:          string;
  nameEn:        string;
  nameAr:        string;
  beanType:      "arabica" | "robusta";
  stockKg:       number;
  lowStockKg:    number;
  costPerKg:     number;
  supplierId:    string;
  lastRestocked: string;
};

export type PackagingItem = {
  slug:        string;
  name:        string;
  type:        "Bag" | "Sticker" | "Valve" | "Box";
  quantity:    number;
  threshold:   number;
  costPerUnit: number;
  archived:    boolean;
};

export type Supplier = {
  id:                string;
  name:              string;
  contactPerson:     string;
  phone:             string;
  whatsapp:          string;
  email?:            string;
  preferred:         boolean;
  categories:        string[];
  totalPurchasesEGP: number;
  lastPurchaseDate:  string;
  notes:             string;
};

export type StockMovement = {
  id:          string;
  date:        string;
  type:        MovementType;
  itemType:    ItemType;
  itemSlug:    string;
  itemName:    string;
  change:      string;
  before:      string;
  after:       string;
  supplierId?: string;
  orderRef?:   string;
  reason?:     string;
  notes:       string;
  adminName:   string;
};

// ── Category defaults (stock, thresholds, cost ratios, supplier) ──────────────

type CatCfg = {
  s250: number; s500: number; s1kg: number;
  t250: number; t500: number; t1kg: number;
  r250: number; r500: number; r1kg: number;
  sup:  string;
};

const CAT_CFG: Record<string, CatCfg> = {
  "turkish-blends":  { s250: 22, s500: 12, s1kg: 5,  t250: 8,  t500: 4, t1kg: 2, r250: 0.55, r500: 0.55, r1kg: 0.52, sup: "sup-001" },
  "espresso-blends": { s250: 18, s500: 10, s1kg: 4,  t250: 6,  t500: 3, t1kg: 2, r250: 0.55, r500: 0.55, r1kg: 0.52, sup: "sup-001" },
  "easy-coffee":     { s250: 30, s500: 15, s1kg: 6,  t250: 8,  t500: 4, t1kg: 2, r250: 0.58, r500: 0.58, r1kg: 0.55, sup: "sup-002" },
  "coffee-mix":      { s250: 55, s500: 28, s1kg: 12, t250: 12, t500: 6, t1kg: 3, r250: 0.56, r500: 0.56, r1kg: 0.53, sup: "sup-002" },
  "cappuccino":      { s250: 50, s500: 25, s1kg: 10, t250: 12, t500: 6, t1kg: 3, r250: 0.57, r500: 0.57, r1kg: 0.54, sup: "sup-002" },
  "hot-chocolate":   { s250: 45, s500: 22, s1kg: 9,  t250: 10, t500: 5, t1kg: 3, r250: 0.57, r500: 0.57, r1kg: 0.54, sup: "sup-002" },
  "flavor-coffee":   { s250: 40, s500: 20, s1kg: 8,  t250: 10, t500: 5, t1kg: 2, r250: 0.56, r500: 0.56, r1kg: 0.53, sup: "sup-002" },
};

// Specific stock spots to create realistic low/out scenarios
const STOCK_SPOTS: Record<string, Partial<{ s250: number; s500: number; s1kg: number }>> = {
  "heavy-crema":            { s250: 5, s500: 2, s1kg: 0 },
  "cairo-nights":           { s250: 7, s500: 3 },
  "gold-line":              { s250: 6, s500: 2 },
  "original-cappuccino":    { s250: 8, s500: 0 },
  "original-hot-chocolate": { s250: 0, s500: 0, s1kg: 0 },
  "lotus-coffee":           { s500: 2, s1kg: 0 },
  "nutella-cappuccino":     { s250: 4 },
  "black-label":            { s1kg: 1 },
  "yemeni-arabica":         { s250: 5 },
};

const RESTOCK_DATES: Record<string, string> = {
  "turkish-silk":  "2026-06-14",
  "heavy-crema":   "2026-05-28",
  "cairo-nights":  "2026-06-01",
  "gold-line":     "2026-05-30",
};

// ── Finished Products (derived from catalog) ──────────────────────────────────

export const FINISHED_PRODUCTS: FinishedProduct[] = catalogProducts.map(p => {
  const cfg = CAT_CFG[p.category] ?? CAT_CFG["coffee-mix"];
  const sp  = STOCK_SPOTS[p.slug] ?? {};
  const p250 = p.sizes[0]?.salePrice ?? 130;
  const p500 = p.sizes[1]?.salePrice ?? 260;
  const p1kg = Math.round(p500 * 1.85);

  return {
    slug:          p.slug,
    nameEn:        p.name.en,
    nameAr:        p.name.ar,
    image:         p.image,
    category:      p.category,
    stock250g:     sp.s250 ?? cfg.s250,
    stock500g:     sp.s500 ?? cfg.s500,
    stock1kg:      sp.s1kg ?? cfg.s1kg,
    threshold250g: cfg.t250,
    threshold500g: cfg.t500,
    threshold1kg:  cfg.t1kg,
    cost250g:      Math.round(p250 * cfg.r250),
    cost500g:      Math.round(p500 * cfg.r500),
    cost1kg:       Math.round(p1kg * cfg.r1kg),
    supplierId:    cfg.sup,
    lastRestocked: RESTOCK_DATES[p.slug] ?? "2026-06-10",
  };
});

// ── Espresso Beans ────────────────────────────────────────────────────────────

export const ESPRESSO_BEANS: EspressoBean[] = [
  { slug: "brazilian-arabica",  nameEn: "Brazilian Arabica",  nameAr: "برازيلي",         beanType: "arabica",  stockKg: 35, lowStockKg: 8, costPerKg: 482, supplierId: "sup-001", lastRestocked: "2026-06-12" },
  { slug: "santos-fine-cup",    nameEn: "Santos Fine Cup",    nameAr: "سانتوس فاين كاب", beanType: "arabica",  stockKg: 18, lowStockKg: 5, costPerKg: 490, supplierId: "sup-001", lastRestocked: "2026-06-10" },
  { slug: "ethiopian-lekempti", nameEn: "Ethiopian Lekempti", nameAr: "حبشي لقمتي",      beanType: "arabica",  stockKg: 20, lowStockKg: 5, costPerKg: 487, supplierId: "sup-001", lastRestocked: "2026-06-08" },
  { slug: "indian-arabica",     nameEn: "Indian Arabica",     nameAr: "هندي",            beanType: "arabica",  stockKg: 30, lowStockKg: 8, costPerKg: 599, supplierId: "sup-001", lastRestocked: "2026-06-11" },
  { slug: "colombian-regular",  nameEn: "Colombian Regular",  nameAr: "كولومبي عادي",    beanType: "arabica",  stockKg: 22, lowStockKg: 6, costPerKg: 705, supplierId: "sup-001", lastRestocked: "2026-06-09" },
  { slug: "colombian-18",       nameEn: "Colombian 18",       nameAr: "كولومبي 18",      beanType: "arabica",  stockKg: 12, lowStockKg: 5, costPerKg: 820, supplierId: "sup-001", lastRestocked: "2026-06-06" },
  { slug: "yemeni-arabica",     nameEn: "Yemeni",             nameAr: "يمني",            beanType: "arabica",  stockKg: 8,  lowStockKg: 4, costPerKg: 950, supplierId: "sup-001", lastRestocked: "2026-05-30" },
  { slug: "guatemalan-arabica", nameEn: "Guatemala",          nameAr: "جواتيمالا",       beanType: "arabica",  stockKg: 15, lowStockKg: 4, costPerKg: 680, supplierId: "sup-001", lastRestocked: "2026-06-07" },
  { slug: "costa-rica-arabica", nameEn: "Costa Rica",         nameAr: "كوستاريكا",       beanType: "arabica",  stockKg: 10, lowStockKg: 4, costPerKg: 720, supplierId: "sup-001", lastRestocked: "2026-06-03" },
  { slug: "nicaraguan-arabica", nameEn: "Nicaragua",          nameAr: "نيكاراجوا",       beanType: "arabica",  stockKg: 7,  lowStockKg: 4, costPerKg: 650, supplierId: "sup-001", lastRestocked: "2026-06-01" },
  { slug: "india-robusta-aa",   nameEn: "India Robusta AA",   nameAr: "روبوستا هندي AA", beanType: "robusta",  stockKg: 25, lowStockKg: 6, costPerKg: 380, supplierId: "sup-001", lastRestocked: "2026-06-10" },
  { slug: "indonesian-xl",      nameEn: "Indonesian XL",      nameAr: "إندونيسي XL",    beanType: "robusta",  stockKg: 3,  lowStockKg: 5, costPerKg: 410, supplierId: "sup-001", lastRestocked: "2026-05-20" },
  { slug: "ugandan-18",         nameEn: "Uganda 18",          nameAr: "أوغندي 18",       beanType: "robusta",  stockKg: 12, lowStockKg: 4, costPerKg: 390, supplierId: "sup-001", lastRestocked: "2026-06-05" },
  { slug: "vietnam-robusta",    nameEn: "Vietnam Robusta",    nameAr: "روبوستا فيتنام",  beanType: "robusta",  stockKg: 18, lowStockKg: 5, costPerKg: 320, supplierId: "sup-001", lastRestocked: "2026-06-08" },
];

// ── Packaging ─────────────────────────────────────────────────────────────────

export const PACKAGING_ITEMS: PackagingItem[] = [
  { slug: "bag-250g",     name: "Bag 250g",     type: "Bag",     quantity: 1200, threshold: 200, costPerUnit: 1.8,  archived: false },
  { slug: "bag-500g",     name: "Bag 500g",     type: "Bag",     quantity: 850,  threshold: 150, costPerUnit: 2.2,  archived: false },
  { slug: "bag-1kg",      name: "Bag 1kg",      type: "Bag",     quantity: 180,  threshold: 100, costPerUnit: 2.8,  archived: false },
  { slug: "sticker-roll", name: "Sticker Roll", type: "Sticker", quantity: 45,   threshold: 10,  costPerUnit: 85.0, archived: false },
  { slug: "valve-bag",    name: "Valve Bag",    type: "Valve",   quantity: 92,   threshold: 50,  costPerUnit: 3.5,  archived: false },
];

// ── Suppliers ─────────────────────────────────────────────────────────────────

export const SUPPLIERS: Supplier[] = [
  {
    id: "sup-001", name: "بن الأمداء للتجارة", contactPerson: "أحمد الأمداء",
    phone: "+20 100 234 5678", whatsapp: "+20 100 234 5678", email: "amda@coffee.eg",
    preferred: true,
    categories: ["Turkish Blends", "Espresso Blends", "Espresso Beans"],
    totalPurchasesEGP: 142000, lastPurchaseDate: "2026-06-12",
    notes: "Main blends and beans supplier. Fresh stock every 2 weeks. COD payment.",
  },
  {
    id: "sup-002", name: "المصري للجملة", contactPerson: "كريم المصري",
    phone: "+20 122 345 6789", whatsapp: "+20 122 345 6789",
    preferred: false,
    categories: ["Easy Coffee", "Coffee Mix", "Cappuccino", "Hot Chocolate", "Flavor Coffee"],
    totalPurchasesEGP: 68400, lastPurchaseDate: "2026-06-14",
    notes: "Ready-made products wholesaler. Credit 15 days.",
  },
  {
    id: "sup-003", name: "الراشدي للتغليف", contactPerson: "محمد الراشدي",
    phone: "+20 111 876 5432", whatsapp: "+20 111 876 5432",
    preferred: false,
    categories: ["Packaging"],
    totalPurchasesEGP: 18750, lastPurchaseDate: "2026-06-05",
    notes: "Bags, stickers, valves. Min order 500 units/SKU. 7-day lead.",
  },
];

// ── Stock Movements ───────────────────────────────────────────────────────────

export const STOCK_MOVEMENTS: StockMovement[] = [
  { id: "mv-001", date: "2026-06-14", type: "restock",        itemType: "finished",  itemSlug: "original-cappuccino",    itemName: "Original Cappuccino",  change: "250g +50 / 500g +25 / 1kg +10", before: "250g:8 / 500g:25 / 1kg:10",  after: "250g:58 / 500g:50 / 1kg:20",  supplierId: "sup-002", notes: "Invoice #312 — June batch",                     adminName: "Mohamed Sayed" },
  { id: "mv-002", date: "2026-06-13", type: "restock",        itemType: "finished",  itemSlug: "turkish-silk",           itemName: "Turkish Silk",          change: "250g +30 / 500g +15 / 1kg +5",  before: "250g:15 / 500g:7 / 1kg:3",  after: "250g:45 / 500g:22 / 1kg:8",   supplierId: "sup-001", notes: "دفعة يونيو — بن الأمداء",                      adminName: "Mohamed Sayed" },
  { id: "mv-003", date: "2026-06-12", type: "restock",        itemType: "bean",      itemSlug: "brazilian-arabica",      itemName: "Brazilian Arabica",     change: "+25 KG",                         before: "10 KG",                      after: "35 KG",                        supplierId: "sup-001", notes: "Invoice #155 — Brazil fresh harvest",            adminName: "Mohamed Sayed" },
  { id: "mv-004", date: "2026-06-12", type: "order-deducted", itemType: "finished",  itemSlug: "turkish-silk",           itemName: "Turkish Silk",          change: "500g -1",                        before: "500g:23",                    after: "500g:22",                      orderRef: "LC-1092",   notes: "",                                              adminName: "System" },
  { id: "mv-005", date: "2026-06-12", type: "order-deducted", itemType: "finished",  itemSlug: "heavy-crema",            itemName: "Heavy Crema",           change: "250g -2",                        before: "250g:7",                     after: "250g:5",                       orderRef: "LC-1092",   notes: "",                                              adminName: "System" },
  { id: "mv-006", date: "2026-06-11", type: "manual-adjust",  itemType: "finished",  itemSlug: "cairo-nights",           itemName: "Cairo Nights",          change: "500g -2",                        before: "500g:5",                     after: "500g:3",                       reason: "Manual Count Correction", notes: "Physical count showed 2 fewer units",           adminName: "Mohamed Sayed" },
  { id: "mv-007", date: "2026-06-10", type: "damaged",        itemType: "finished",  itemSlug: "original-hot-chocolate", itemName: "Original Hot Chocolate",change: "250g -12 / 500g -6",             before: "250g:12 / 500g:6",           after: "250g:0 / 500g:0",             reason: "Damaged",     notes: "Water damage — storage leak",                   adminName: "Mohamed Sayed" },
  { id: "mv-008", date: "2026-06-10", type: "restock",        itemType: "packaging", itemSlug: "bag-250g",               itemName: "Bag 250g",              change: "+500 units",                     before: "700 units",                  after: "1,200 units",                  supplierId: "sup-003", notes: "Invoice الراشدي #88 — June bags",                adminName: "Mohamed Sayed" },
  { id: "mv-009", date: "2026-06-09", type: "order-deducted", itemType: "bean",      itemSlug: "india-robusta-aa",       itemName: "India Robusta AA",      change: "-2 KG",                          before: "27 KG",                      after: "25 KG",                        orderRef: "LC-1088",   notes: "Custom Espresso order",                         adminName: "System" },
  { id: "mv-010", date: "2026-06-08", type: "lost",           itemType: "packaging", itemSlug: "sticker-roll",           itemName: "Sticker Roll",          change: "-5 units",                       before: "50 units",                   after: "45 units",                     reason: "Lost",        notes: "Sticker roll missing from storage",              adminName: "Mohamed Sayed" },
  { id: "mv-011", date: "2026-06-07", type: "customer-return", itemType: "finished",  itemSlug: "aroma-body",             itemName: "Aroma Body",            change: "500g +1",                        before: "500g:9",                     after: "500g:10",                      orderRef: "LC-1071",   notes: "Sealed — customer returned wrong item",          adminName: "Mohamed Sayed" },
  { id: "mv-012", date: "2026-06-06", type: "restock",        itemType: "bean",      itemSlug: "yemeni-arabica",         itemName: "Yemeni",                change: "+10 KG",                         before: "0 KG",                       after: "10 KG",                        supplierId: "sup-001", notes: "Premium Yemen lot — limited",                    adminName: "Mohamed Sayed" },
  { id: "mv-013", date: "2026-06-05", type: "restock",        itemType: "packaging", itemSlug: "bag-1kg",                itemName: "Bag 1kg",               change: "+100 units",                     before: "80 units",                   after: "180 units",                    supplierId: "sup-003", notes: "",                                              adminName: "Mohamed Sayed" },
  { id: "mv-014", date: "2026-06-04", type: "order-deducted", itemType: "finished",  itemSlug: "gold-line",              itemName: "Gold Line",             change: "500g -2",                        before: "500g:4",                     after: "500g:2",                       orderRef: "LC-1083",   notes: "",                                              adminName: "System" },
  { id: "mv-015", date: "2026-06-03", type: "damaged",        itemType: "bean",      itemSlug: "indonesian-xl",          itemName: "Indonesian XL",         change: "-5 KG",                          before: "8 KG",                       after: "3 KG",                         reason: "Damaged",     notes: "Humidity damage — batch rejected",               adminName: "Mohamed Sayed" },
  { id: "mv-016", date: "2026-06-02", type: "manual-adjust",  itemType: "bean",      itemSlug: "nicaraguan-arabica",     itemName: "Nicaragua",             change: "-2 KG",                          before: "9 KG",                       after: "7 KG",                         reason: "Manual Count Correction", notes: "After physical weigh-in",                       adminName: "Mohamed Sayed" },
  { id: "mv-017", date: "2026-06-01", type: "restock",        itemType: "finished",  itemSlug: "gold-line",              itemName: "Gold Line",             change: "250g +20 / 500g +10 / 1kg +4",  before: "250g:0 / 500g:0 / 1kg:2",   after: "250g:20 / 500g:10 / 1kg:6",   supplierId: "sup-002", notes: "Initial restock after stockout",                 adminName: "Mohamed Sayed" },
  { id: "mv-018", date: "2026-05-30", type: "customer-return", itemType: "finished",  itemSlug: "original-cappuccino",    itemName: "Original Cappuccino",  change: "250g +3",                        before: "250g:5",                     after: "250g:8",                       orderRef: "LC-1055",   notes: "Sealed — restocked after admin approval",        adminName: "Amira Hassan" },
  { id: "mv-019", date: "2026-05-28", type: "lost",           itemType: "finished",  itemSlug: "heavy-crema",            itemName: "Heavy Crema",           change: "1kg -2",                         before: "1kg:2",                      after: "1kg:0",                        reason: "Lost",        notes: "Unaccounted during stocktake",                   adminName: "Mohamed Sayed" },
  { id: "mv-020", date: "2026-05-25", type: "restock",        itemType: "bean",      itemSlug: "indian-arabica",         itemName: "Indian Arabica",        change: "+20 KG",                         before: "10 KG",                      after: "30 KG",                        supplierId: "sup-001", notes: "",                                              adminName: "Mohamed Sayed" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getStatus(stock: number, threshold: number): StockStatus {
  if (stock === 0)        return "Out of Stock";
  if (stock <= threshold) return "Low Stock";
  return "In Stock";
}

export function productWorstStatus(p: FinishedProduct): StockStatus {
  const s = [
    getStatus(p.stock250g, p.threshold250g),
    getStatus(p.stock500g, p.threshold500g),
    getStatus(p.stock1kg,  p.threshold1kg),
  ];
  if (s.includes("Out of Stock")) return "Out of Stock";
  if (s.includes("Low Stock"))    return "Low Stock";
  return "In Stock";
}

export function productValue(p: FinishedProduct): number {
  return Math.round(p.stock250g * p.cost250g + p.stock500g * p.cost500g + p.stock1kg * p.cost1kg);
}

export function beanValue(b: EspressoBean): number {
  return Math.round(b.stockKg * b.costPerKg);
}

export const CATEGORY_LABEL: Record<string, string> = {
  "turkish-blends":  "Turkish Blends",
  "espresso-blends": "Espresso Blends",
  "easy-coffee":     "Easy Coffee",
  "coffee-mix":      "Coffee Mix",
  "cappuccino":      "Cappuccino",
  "hot-chocolate":   "Hot Chocolate",
  "flavor-coffee":   "Flavor Coffee",
};

// ── Summary (for InventoryCard dashboard widget) ──────────────────────────────

const _fv = FINISHED_PRODUCTS.reduce((s, p) => s + productValue(p), 0);
const _bv = ESPRESSO_BEANS.reduce((s, b) => s + beanValue(b), 0);
const _pv = PACKAGING_ITEMS.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);

export const INVENTORY_SUMMARY = {
  totalValue:      Math.round(_fv + _bv + _pv),
  finishedUnits:   FINISHED_PRODUCTS.reduce((s, p) => s + p.stock250g + p.stock500g + p.stock1kg, 0),
  beanKg:          Math.round(ESPRESSO_BEANS.reduce((s, b) => s + b.stockKg, 0) * 10) / 10,
  lowStockCount:
    FINISHED_PRODUCTS.filter(p => productWorstStatus(p) === "Low Stock").length +
    ESPRESSO_BEANS.filter(b => getStatus(b.stockKg, b.lowStockKg) === "Low Stock").length +
    PACKAGING_ITEMS.filter(i => getStatus(i.quantity, i.threshold) === "Low Stock").length,
  outOfStockCount:
    FINISHED_PRODUCTS.filter(p => productWorstStatus(p) === "Out of Stock").length +
    ESPRESSO_BEANS.filter(b => b.stockKg === 0).length +
    PACKAGING_ITEMS.filter(i => i.quantity === 0).length,
};
