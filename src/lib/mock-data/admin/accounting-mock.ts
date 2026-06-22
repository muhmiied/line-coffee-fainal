export type TransactionType = "Sale" | "Expense" | "Refund" | "Purchase";

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export const TRANSACTIONS: Transaction[] = [
  { id: "T-088", type: "Sale",     description: "Order LC-1088 — Sara Hassan",    amount: +640,   date: "2026-06-20", category: "Revenue"       },
  { id: "T-087", type: "Sale",     description: "Order LC-1087 — Ahmed Kamal",    amount: +350,   date: "2026-06-19", category: "Revenue"       },
  { id: "T-086", type: "Sale",     description: "Order LC-1086 — Mariam Hesham",  amount: +819,   date: "2026-06-18", category: "Revenue"       },
  { id: "T-085", type: "Sale",     description: "Order LC-1085 — Omar Ashraf",    amount: +510,   date: "2026-06-17", category: "Revenue"       },
  { id: "T-E01", type: "Expense",  description: "Rent — Roastery June",           amount: -8500,  date: "2026-06-01", category: "Operations"    },
  { id: "T-E02", type: "Expense",  description: "Utilities",                      amount: -1200,  date: "2026-06-05", category: "Operations"    },
  { id: "T-P01", type: "Purchase", description: "Turkish Silk beans 8 kg",        amount: -3376,  date: "2026-06-15", category: "Raw Materials"  },
  { id: "T-P02", type: "Purchase", description: "Classic Line units 30",          amount: -5100,  date: "2026-06-18", category: "Raw Materials"  },
  { id: "T-P03", type: "Purchase", description: "High Mood beans 5 kg",           amount: -3626,  date: "2026-06-14", category: "Raw Materials"  },
  { id: "T-R01", type: "Refund",   description: "Order LC-1078 — Maged Farouk",  amount: -350,   date: "2026-06-15", category: "Refund"        },
  { id: "T-E03", type: "Expense",  description: "Packaging materials",            amount: -2200,  date: "2026-06-10", category: "Packaging"     },
  { id: "T-E04", type: "Expense",  description: "Delivery partner fees — May",   amount: -1450,  date: "2026-06-08", category: "Logistics"     },
  { id: "T-084", type: "Sale",     description: "Order LC-1084 — Nour El-Din",   amount: +900,   date: "2026-06-20", category: "Revenue"       },
  { id: "T-075", type: "Sale",     description: "Order LC-1075 — Hana Maher",    amount: +530,   date: "2026-06-20", category: "Revenue"       },
  { id: "T-074", type: "Sale",     description: "Order LC-1074 — Youssef Tamer", amount: +770,   date: "2026-06-19", category: "Revenue"       },
];

const revenue  = TRANSACTIONS.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
const expenses = TRANSACTIONS.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

export const ACCOUNTING_SUMMARY = {
  revenue,
  expenses,
  netProfit: revenue - expenses,
  refunds:   TRANSACTIONS.filter((t) => t.type === "Refund").reduce((s, t) => s + Math.abs(t.amount), 0),
};

export const MONTHLY_CHART = [
  { month: "Jan", revenue: 28400, expenses: 18200 },
  { month: "Feb", revenue: 31200, expenses: 19100 },
  { month: "Mar", revenue: 38600, expenses: 21400 },
  { month: "Apr", revenue: 35100, expenses: 20800 },
  { month: "May", revenue: 44200, expenses: 23600 },
  { month: "Jun", revenue: 22400, expenses: 11800 },  // partial month
];
