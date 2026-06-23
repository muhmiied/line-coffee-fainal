import { catalogProducts, type CatalogCategorySlug } from "@/lib/mock-data/product-catalog";

export type AccountingOrderStatus = "Delivered" | "Cancelled";
export type PurchasePaymentMethod = "Cash" | "Bank Transfer" | "Vodafone Cash" | "Supplier Credit";
export type SupplierPaymentMethod = "Cash" | "Bank" | "Wallet";
export type ExpensePaymentMethod = "Cash" | "Bank Transfer" | "Card" | "Vodafone Cash";
export type AccountingActivityKind = "Inflow" | "Outflow" | "Neutral";
export type AccountingProductCategory = CatalogCategorySlug | "custom";
export type AccountingPurchaseType = "Finished Product Units" | "Espresso Beans KG" | "Packaging Units" | "Other";
export type AccountingSupplierCategory = "Beans" | "Packaging" | "Finished Products" | "Maintenance" | "Other";
export type AccountingExpenseCategory =
  | "Rent"
  | "Utilities"
  | "Delivery"
  | "Marketing"
  | "Payroll"
  | "Maintenance"
  | "Tools"
  | "Packaging Design"
  | "Other";

export interface AccountingProductCost {
  slug: string;
  productName: string;
  category: CatalogCategorySlug;
  purchaseCostPerKg: number;
}

export interface AccountingOrderLineItem {
  id: string;
  productSlug?: string;
  productName: string;
  category: AccountingProductCategory;
  quantity: number;
  returnedQuantity?: number;
  packageWeightKg?: number;
  unitSalePrice: number;
}

export interface AccountingOrder {
  id: string;
  date: string;
  customerName: string;
  status: AccountingOrderStatus;
  paymentMethod: "Cash" | "Card" | "Instapay" | "Wallet";
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  refundAmount: number;
  cashCollected: number;
  returnNote?: string;
  lineItems: AccountingOrderLineItem[];
}

export interface AccountingSupplier {
  id: string;
  name: string;
  category: AccountingSupplierCategory;
  contact: string;
  terms: string;
  notes?: string;
}

export interface AccountingPurchase {
  id: string;
  date: string;
  supplierId: string;
  reference: string;
  purchaseType: AccountingPurchaseType;
  item: string;
  quantityLabel: string;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: PurchasePaymentMethod;
  note?: string;
}

export interface AccountingSupplierPayment {
  id: string;
  date: string;
  supplierId: string;
  reference: string;
  amount: number;
  method: SupplierPaymentMethod;
  note: string;
}

export interface AccountingOperatingExpense {
  id: string;
  date: string;
  category: AccountingExpenseCategory;
  vendor: string;
  description: string;
  amount: number;
  method: ExpensePaymentMethod;
}

export interface AccountingCashAdjustment {
  id: string;
  date: string;
  description: string;
  amount: number;
  kind: AccountingActivityKind;
}

export const ACCOUNTING_PERIOD = {
  label: "June 2026",
  asOf: "2026-06-23",
};

export const OPENING_CASH_BALANCE = 42000;

export const ACCOUNTING_PRODUCT_COSTS: AccountingProductCost[] = catalogProducts.map((product) => ({
  slug: product.slug,
  productName: product.name.en,
  category: product.category,
  purchaseCostPerKg: product.purchaseCostPerKg,
}));

export const CATEGORY_COST_RATIOS: Record<AccountingProductCategory, number> = {
  "turkish-blends": 0.61,
  "espresso-blends": 0.60,
  "easy-coffee": 0.63,
  "coffee-mix": 0.62,
  cappuccino: 0.62,
  "hot-chocolate": 0.58,
  "flavor-coffee": 0.64,
  custom: 0.60,
};

export const ACCOUNTING_SUPPLIERS: AccountingSupplier[] = [
  {
    id: "SUP-BEANS",
    name: "Delta Bean Imports",
    category: "Beans",
    contact: "0100 442 1198",
    terms: "30% upfront, balance within 14 days",
  },
  {
    id: "SUP-PACK",
    name: "Nile Pack Studio",
    category: "Packaging",
    contact: "0101 773 4288",
    terms: "Cash on delivery or 7-day credit",
  },
  {
    id: "SUP-OPS",
    name: "Roastery Maintenance Co.",
    category: "Maintenance",
    contact: "0114 921 6300",
    terms: "Invoice due within 10 days",
  },
];

export const ACCOUNTING_BEAN_OPTIONS = [
  "Brazil 17-18",
  "Santos Fine Cup",
  "Habashi Lekempti",
  "Indian Washed",
  "AA Indian Robusta",
  "Colombian Regular",
  "Yemeni",
  "Costa Rica",
  "Ugandan 18",
];

export const ACCOUNTING_PACKAGING_OPTIONS = [
  "250g kraft pouch",
  "500g kraft pouch",
  "1kg valve bag",
  "Retail paper bag",
  "Shipping carton",
  "Product labels roll",
];

export const ACCOUNTING_ORDERS: AccountingOrder[] = [
  {
    id: "LC-1088",
    date: "2026-06-20",
    customerName: "Sara Hassan",
    status: "Delivered",
    paymentMethod: "Instapay",
    subtotal: 700,
    discountAmount: 60,
    deliveryFee: 45,
    refundAmount: 0,
    cashCollected: 685,
    lineItems: [
      {
        id: "LI-1088-1",
        productSlug: "turkish-silk",
        productName: "Turkish Silk 500g",
        category: "turkish-blends",
        quantity: 2,
        packageWeightKg: 0.5,
        unitSalePrice: 350,
      },
    ],
  },
  {
    id: "LC-1087",
    date: "2026-06-19",
    customerName: "Ahmed Kamal",
    status: "Delivered",
    paymentMethod: "Cash",
    subtotal: 350,
    discountAmount: 0,
    deliveryFee: 0,
    refundAmount: 0,
    cashCollected: 350,
    lineItems: [
      {
        id: "LI-1087-1",
        productSlug: "heavy-crema",
        productName: "Heavy Crema 500g",
        category: "espresso-blends",
        quantity: 1,
        packageWeightKg: 0.5,
        unitSalePrice: 350,
      },
    ],
  },
  {
    id: "LC-1086",
    date: "2026-06-18",
    customerName: "Mariam Hesham",
    status: "Delivered",
    paymentMethod: "Card",
    subtotal: 850,
    discountAmount: 85,
    deliveryFee: 55,
    refundAmount: 0,
    cashCollected: 820,
    lineItems: [
      {
        id: "LI-1086-1",
        productSlug: "cairo-nights",
        productName: "Cairo Nights 500g",
        category: "turkish-blends",
        quantity: 1,
        packageWeightKg: 0.5,
        unitSalePrice: 425,
      },
      {
        id: "LI-1086-2",
        productSlug: "cairo-nights",
        productName: "Cairo Nights 500g",
        category: "turkish-blends",
        quantity: 1,
        packageWeightKg: 0.5,
        unitSalePrice: 425,
      },
    ],
  },
  {
    id: "LC-1085",
    date: "2026-06-17",
    customerName: "Omar Ashraf",
    status: "Delivered",
    paymentMethod: "Wallet",
    subtotal: 510,
    discountAmount: 0,
    deliveryFee: 50,
    refundAmount: 0,
    cashCollected: 560,
    lineItems: [
      {
        id: "LI-1085-1",
        productSlug: "classic-line",
        productName: "Classic Line 500g",
        category: "easy-coffee",
        quantity: 1,
        packageWeightKg: 0.5,
        unitSalePrice: 475,
      },
      {
        id: "LI-1085-2",
        productName: "Branded gift wrap",
        category: "custom",
        quantity: 1,
        unitSalePrice: 35,
      },
    ],
  },
  {
    id: "LC-1084",
    date: "2026-06-20",
    customerName: "Nour El-Din",
    status: "Delivered",
    paymentMethod: "Instapay",
    subtotal: 900,
    discountAmount: 0,
    deliveryFee: 45,
    refundAmount: 225,
    cashCollected: 945,
    returnNote: "One 250g Strike Coffee pack returned and refunded after delivery.",
    lineItems: [
      {
        id: "LI-1084-1",
        productSlug: "strike-coffee",
        productName: "Strike Coffee 250g",
        category: "turkish-blends",
        quantity: 4,
        returnedQuantity: 1,
        packageWeightKg: 0.25,
        unitSalePrice: 225,
      },
    ],
  },
  {
    id: "LC-1078",
    date: "2026-06-15",
    customerName: "Maged Farouk",
    status: "Delivered",
    paymentMethod: "Cash",
    subtotal: 350,
    discountAmount: 0,
    deliveryFee: 45,
    refundAmount: 350,
    cashCollected: 395,
    returnNote: "Full product refund after delivery issue. Delivery fee was not recognized as product revenue.",
    lineItems: [
      {
        id: "LI-1078-1",
        productSlug: "heavy-crema",
        productName: "Heavy Crema 500g",
        category: "espresso-blends",
        quantity: 1,
        returnedQuantity: 1,
        packageWeightKg: 0.5,
        unitSalePrice: 350,
      },
    ],
  },
  {
    id: "LC-1074",
    date: "2026-06-19",
    customerName: "Youssef Tamer",
    status: "Delivered",
    paymentMethod: "Cash",
    subtotal: 770,
    discountAmount: 0,
    deliveryFee: 50,
    refundAmount: 0,
    cashCollected: 820,
    lineItems: [
      {
        id: "LI-1074-1",
        productSlug: "gold-line",
        productName: "Gold Line 500g",
        category: "easy-coffee",
        quantity: 1,
        packageWeightKg: 0.5,
        unitSalePrice: 750,
      },
      {
        id: "LI-1074-2",
        productName: "Sample spoon",
        category: "custom",
        quantity: 1,
        unitSalePrice: 20,
      },
    ],
  },
  {
    id: "LC-1073",
    date: "2026-06-18",
    customerName: "Laila Mostafa",
    status: "Cancelled",
    paymentMethod: "Cash",
    subtotal: 575,
    discountAmount: 0,
    deliveryFee: 0,
    refundAmount: 0,
    cashCollected: 0,
    lineItems: [
      {
        id: "LI-1073-1",
        productSlug: "high-mood",
        productName: "High Mood 500g",
        category: "turkish-blends",
        quantity: 1,
        packageWeightKg: 0.5,
        unitSalePrice: 575,
      },
    ],
  },
];

export const ACCOUNTING_PURCHASES: AccountingPurchase[] = [
  {
    id: "PUR-0615",
    date: "2026-06-15",
    supplierId: "SUP-BEANS",
    reference: "DBI-8821",
    purchaseType: "Espresso Beans KG",
    item: "Turkish Silk green beans batch",
    quantityLabel: "8 kg",
    totalAmount: 3376,
    paidAmount: 3376,
    paymentMethod: "Bank Transfer",
    note: "Paid purchase. Cash outflow only; not treated as operating expense.",
  },
  {
    id: "PUR-0618",
    date: "2026-06-18",
    supplierId: "SUP-BEANS",
    reference: "DBI-8835",
    purchaseType: "Espresso Beans KG",
    item: "High Mood beans batch",
    quantityLabel: "5 kg",
    totalAmount: 3626,
    paidAmount: 1400,
    paymentMethod: "Supplier Credit",
    note: "Partially paid purchase. Remaining supplier balance stays in payables.",
  },
  {
    id: "PUR-0619",
    date: "2026-06-19",
    supplierId: "SUP-PACK",
    reference: "NPS-2440",
    purchaseType: "Packaging Units",
    item: "Classic Line pouches",
    quantityLabel: "30 units",
    totalAmount: 5100,
    paidAmount: 0,
    paymentMethod: "Supplier Credit",
    note: "Unpaid purchase. No cash outflow until payment is recorded.",
  },
];

export const ACCOUNTING_SUPPLIER_PAYMENTS: AccountingSupplierPayment[] = [
  {
    id: "SP-0621",
    date: "2026-06-21",
    supplierId: "SUP-BEANS",
    reference: "PAY-DBI-8835",
    amount: 900,
    method: "Bank",
    note: "Payment against DBI-8835 balance.",
  },
];

export const ACCOUNTING_OPERATING_EXPENSES: AccountingOperatingExpense[] = [
  {
    id: "EXP-0601",
    date: "2026-06-01",
    category: "Rent",
    vendor: "Roastery landlord",
    description: "Roastery rent - June",
    amount: 8500,
    method: "Bank Transfer",
  },
  {
    id: "EXP-0605",
    date: "2026-06-05",
    category: "Utilities",
    vendor: "Utilities provider",
    description: "Electricity and water",
    amount: 1200,
    method: "Cash",
  },
  {
    id: "EXP-0608",
    date: "2026-06-08",
    category: "Delivery",
    vendor: "Delivery partner",
    description: "Delivery partner fees - May settlement",
    amount: 1450,
    method: "Vodafone Cash",
  },
  {
    id: "EXP-0610",
    date: "2026-06-10",
    category: "Packaging Design",
    vendor: "Retail supplies",
    description: "Retail bag artwork and label design",
    amount: 2200,
    method: "Cash",
  },
  {
    id: "EXP-0616",
    date: "2026-06-16",
    category: "Marketing",
    vendor: "Local creator",
    description: "June product reel shoot",
    amount: 1800,
    method: "Bank Transfer",
  },
];

export const ACCOUNTING_CASH_ADJUSTMENTS: AccountingCashAdjustment[] = [
  {
    id: "ADJ-OPEN",
    date: "2026-06-01",
    description: "Opening balance imported from previous month mock snapshot.",
    amount: 0,
    kind: "Neutral",
  },
];
