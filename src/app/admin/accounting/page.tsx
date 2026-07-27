"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calculator,
  Check,
  CreditCard,
  Landmark,
  Loader2,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  getAdminAccounting,
  type AccountingActivityDirection,
  type AccountingOrderRow,
  type AccountingTransaction,
  type AdminAccountingData,
  AdminAccountingError,
} from "@/lib/admin/admin-accounting";
import {
  createExpense,
  createPurchase,
  createSupplier,
  listPurchasableProducts,
  listSuppliers,
  receivePurchase,
  recordPurchasePayment,
  AdminPurchasingError,
  type PurchasableProduct,
  type Supplier,
} from "@/lib/admin/admin-purchasing";
import type { OrderStatus } from "@/lib/types/order";
import { MixedNumeric } from "@/components/shared/MixedNumeric";

type ActiveTab = "overview" | "revenue" | "purchases" | "expenses" | "suppliers" | "activity";
type ActivityFilter = "All" | "in" | "out" | "neutral";
type Tone = "gold" | "green" | "blue" | "amber" | "red" | "cream";

const TABS: Array<{ key: ActiveTab; label: string; icon: LucideIcon }> = [
  { key: "overview", label: "Overview", icon: Landmark },
  { key: "revenue", label: "Revenue", icon: Receipt },
  { key: "purchases", label: "Purchases", icon: Package },
  { key: "expenses", label: "Expenses", icon: Calculator },
  { key: "suppliers", label: "Suppliers", icon: CreditCard },
  { key: "activity", label: "Activity", icon: Activity },
];

const TONE_STYLE: Record<Tone, { color: string; bg: string; border: string }> = {
  gold: { color: "var(--admin-hazelnut)", bg: "var(--admin-border)", border: "var(--admin-border-strong)" },
  green: { color: "#8fcf9a", bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.24)" },
  blue: { color: "#8fb0d9", bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.24)" },
  amber: { color: "#e3b673", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.24)" },
  red: { color: "#e39a8c", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.24)" },
  cream: { color: "var(--admin-white-coffee)", bg: "rgba(245,230,216,0.07)", border: "rgba(245,230,216,0.14)" },
};

const STATUS_TONE: Record<OrderStatus, Tone> = {
  pending: "amber",
  preparing: "blue",
  shipped: "blue",
  delivered: "green",
  cancelled: "red",
  returned: "cream",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

const ACTIVITY_TONE: Record<AccountingActivityDirection, Tone> = {
  in: "green",
  out: "red",
  neutral: "blue",
};

const KIND_LABEL: Record<AccountingTransaction["kind"], string> = {
  payment: "Payment",
  refund: "Refund",
  expense: "Expense",
  purchase: "Purchase",
  "supplier-payment": "Supplier Pay",
  return: "Return",
};

const moneyFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function fmt(value: number) {
  return moneyFormatter.format(Math.round(value * 100) / 100);
}

function money(value: number) {
  return `${fmt(value)} EGP`;
}

function signedMoney(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${money(Math.abs(value))}`;
}

function pct(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function shortDate(value: string) {
  if (!value) return "—";
  return value.slice(0, 10);
}

// ── Add Expense form (real insert into the Phase-4 `expenses` table) ────────────

const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Delivery",
  "Marketing",
  "Payroll",
  "Maintenance",
  "Tools",
  "Packaging Design",
  "Other",
];
const EXPENSE_METHODS = ["Cash", "Bank Transfer", "Card", "Vodafone Cash"];

type ExpenseFormState = {
  date: string;
  category: string;
  amount: string;
  method: string;
  notes: string;
};

const EMPTY_EXPENSE_FORM: ExpenseFormState = {
  date: "",
  category: "",
  amount: "",
  method: "Cash",
  notes: "",
};

const INPUT_STYLE = {} as const;

const SELECT_STYLE = { colorScheme: "dark" as const };

// Local YYYY-MM-DD for the default expense date. Called only from event handlers
// (never during render) so it stays clear of the react-hooks purity rule.
function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="admin-label mb-1.5 block !text-[10.5px]">
        {label}
      </span>
      {children}
    </label>
  );
}

// ── Primitives (shared visual language) ────────────────────────────────────────

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const style = TONE_STYLE[tone];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
      style={{ color: style.color, background: style.bg, borderColor: style.border }}
    >
      {label}
    </span>
  );
}

function Surface({
  title,
  caption,
  icon: Icon,
  right,
  children,
}: {
  title: string;
  caption?: string;
  icon?: LucideIcon;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="admin-surface overflow-hidden">
      <div
        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
        style={{ borderBottom: "1px solid var(--admin-border)" }}
      >
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span
              className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              style={{
                color: "var(--admin-hazelnut)",
                background: "var(--admin-border)",
                border: "1px solid var(--admin-border-strong)",
              }}
            >
              <Icon size={15} />
            </span>
          )}
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--admin-muted)", opacity: 0.55 }}
            >
              {title}
            </p>
            {caption && (
              <p className="mt-1 max-w-3xl text-[12px] leading-relaxed" style={{ color: "var(--admin-muted)", opacity: 0.58 }}>
                {caption}
              </p>
            )}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  caption,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  caption?: string;
  tone: Tone;
  icon?: LucideIcon;
}) {
  const style = TONE_STYLE[tone];
  return (
    <article className="admin-kpi-card py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-muted)", opacity: 0.46 }}>
            {label}
          </p>
          <p className="mt-1 text-[20px] font-bold leading-tight" style={{ color: style.color }}>
            <MixedNumeric text={value} />
          </p>
        </div>
        {Icon && (
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
          >
            <Icon size={15} />
          </span>
        )}
      </div>
      {caption && (
        <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: "var(--admin-muted)", opacity: 0.52 }}>
          <MixedNumeric text={caption} />
        </p>
      )}
    </article>
  );
}

function Note({ children, tone = "gold" }: { children: ReactNode; tone?: Tone }) {
  const style = TONE_STYLE[tone];
  return (
    <div
      role={tone === "red" ? "alert" : undefined}
      className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12px] leading-relaxed"
      style={{ color: "var(--admin-muted)", background: style.bg, borderColor: style.border }}
    >
      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: style.color }} />
      <span>{children}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="admin-empty-state !border-0 !rounded-none">
      <span className="admin-empty-icon">
        <Icon size={17} />
      </span>
      <p className="text-[12.5px] admin-muted">
        {message}
      </p>
    </div>
  );
}

const TREND_SERIES: Array<{ key: "revenue" | "collections" | "grossProfit" | "expenses"; label: string; tone: Tone }> = [
  { key: "revenue", label: "Revenue", tone: "gold" },
  { key: "collections", label: "Collections", tone: "green" },
  { key: "grossProfit", label: "Gross Profit", tone: "blue" },
  { key: "expenses", label: "Expenses", tone: "red" },
];

function MonthlyTrendChart({ points }: { points: AdminAccountingData["monthly"] }) {
  const max = Math.max(
    1,
    ...points.flatMap((p) => [p.revenue, p.collections, p.grossProfit, p.expenses].map((v) => Math.max(0, v))),
  );

  return (
    <div className="px-5 py-5">
      <div className="flex flex-wrap gap-3 pb-4">
        {TREND_SERIES.map((series) => (
          <span key={series.key} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: "var(--admin-muted)" }}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TONE_STYLE[series.tone].color }} />
            {series.label}
          </span>
        ))}
      </div>
      <div className="flex items-end gap-3 overflow-x-auto" style={{ height: 168 }}>
        {points.map((point) => (
          <div key={point.label} className="flex min-w-[54px] flex-1 flex-col items-center gap-2">
            <div className="flex h-[132px] w-full items-end justify-center gap-1">
              {TREND_SERIES.map((series) => {
                const value = point[series.key];
                const height = `${(Math.max(0, value) / max) * 100}%`;
                return (
                  <div
                    key={series.key}
                    className="w-2 rounded-t-sm"
                    style={{ height, background: TONE_STYLE[series.tone].color, opacity: 0.9 }}
                    title={`${series.label} · ${point.label}: ${money(value)}`}
                  />
                );
              })}
            </div>
            <span className="text-[10.5px]" style={{ color: "var(--admin-muted)", opacity: 0.6 }}>
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddExpenseDrawer({
  open,
  form,
  saving,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  form: ExpenseFormState;
  saving: boolean;
  error: string | null;
  onChange: (patch: Partial<ExpenseFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close add expense" className="admin-modal-overlay absolute inset-0" onClick={onClose} />
      <aside className="admin-drawer-surface relative flex h-full w-full max-w-[460px] flex-col overflow-hidden">
        <div className="admin-drawer-header flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[18px] font-bold" style={{ color: "var(--admin-heading)", fontFamily: "var(--font-playfair)" }}>
              Add Expense
            </p>
            <p className="mt-1 text-[12px] leading-relaxed admin-muted">
              Saves a real operating expense straight to the database.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close"
            className="admin-btn admin-btn-sm !w-8 !h-8 !p-0 flex-shrink-0"
          >
            <X size={15} />
          </button>
        </div>
        <form
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {error && <Note tone="red">{error}</Note>}
          <Note tone="blue">
            Operating expenses only (rent, utilities, marketing, payroll…). Stock, beans, and packaging belong in Purchases — never here.
          </Note>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date">
              <input
                type="date"
                value={form.date}
                onChange={(event) => onChange({ date: event.target.value })}
                className="admin-input !text-[13px]"
                style={SELECT_STYLE}
              />
            </Field>
            <Field label="Category">
              <select
                value={form.category}
                onChange={(event) => onChange({ category: event.target.value })}
                aria-label="Expense category"
                className="admin-select !text-[13px]"
                style={SELECT_STYLE}
              >
                <option value="">Select category…</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount (EGP)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => onChange({ amount: event.target.value })}
                placeholder="0"
                className="admin-input !text-[13px]"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Payment Method">
              <select
                value={form.method}
                onChange={(event) => onChange({ method: event.target.value })}
                aria-label="Expense payment method"
                className="admin-select !text-[13px]"
                style={SELECT_STYLE}
              >
                {EXPENSE_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notes (optional)">
            <textarea
              value={form.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              rows={3}
              placeholder="Short reason for the expense"
              className="admin-textarea !resize-none !text-[13px]"
              style={INPUT_STYLE}
            />
          </Field>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="admin-btn admin-btn-primary inline-flex items-center gap-2 !px-4 !py-2 !text-[13px]"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? "Saving…" : "Save Expense"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="admin-btn !px-4 !py-2 !text-[13px]"
            >
              Cancel
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

// ── Add Purchase form (real draft purchase via create_purchase RPC) ─────────
// Creating a purchase establishes inventory cost basis + supplier payable only.
// Stock/lots change later and only through receive_purchase.

type PurchaseItemFormState = {
  key: string;
  productId: string;
  quantityKg: string;
  unitCost: string;
};

type PurchaseFormState = {
  supplierId: string;
  date: string;
  reference: string;
  notes: string;
  items: PurchaseItemFormState[];
};

type QuickSupplierFormState = {
  name: string;
  phone: string;
  email: string;
  notes: string;
};

const SUPPLIER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPLIER_PHONE_PATTERN = /^\+?[\d\s().-]+$/;

function quickSupplierValidationError(form: QuickSupplierFormState): string | null {
  const name = form.name.trim();
  const phone = form.phone.trim();
  const email = form.email.trim();
  const phoneDigits = phone.replace(/\D/g, "");

  if (!name) return "Supplier name is required.";
  if (name.length > 160) return "Supplier name must be 160 characters or fewer.";
  if (phone && (!SUPPLIER_PHONE_PATTERN.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15)) {
    return "Enter a valid supplier phone number, or leave it blank.";
  }
  if (email && (email.length > 254 || !SUPPLIER_EMAIL_PATTERN.test(email))) {
    return "Enter a valid supplier email address, or leave it blank.";
  }
  return null;
}

const EMPTY_PURCHASE_FORM: PurchaseFormState = {
  supplierId: "",
  date: "",
  reference: "",
  notes: "",
  items: [],
};

const EMPTY_QUICK_SUPPLIER_FORM: QuickSupplierFormState = {
  name: "",
  phone: "",
  email: "",
  notes: "",
};

let purchaseItemSequence = 0;

function emptyPurchaseItem(): PurchaseItemFormState {
  purchaseItemSequence += 1;
  return {
    key: `purchase-item-${purchaseItemSequence}`,
    productId: "",
    quantityKg: "",
    unitCost: "",
  };
}

function purchaseLineTotal(item: PurchaseItemFormState): number {
  const quantity = Number(item.quantityKg);
  const unitCost = Number(item.unitCost);
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  if (!Number.isFinite(unitCost) || unitCost < 0) return 0;
  return Math.round(quantity * unitCost * 100) / 100;
}

function QuickCreateSupplier({
  onCreated,
}: {
  onCreated: (supplier: Supplier) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<QuickSupplierFormState>(EMPTY_QUICK_SUPPLIER_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);

  const submit = async () => {
    const validationError = quickSupplierValidationError(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const supplier = await createSupplier({
        name: form.name,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
        status: "active",
      });
      await onCreated(supplier);
      setForm(EMPTY_QUICK_SUPPLIER_FORM);
      setCreatedName(supplier.name);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof AdminPurchasingError
          ? err.message
          : "Could not create the supplier. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="mt-2 space-y-2">
        {createdName && (
          <p className="text-[11.5px]" style={{ color: "#8fcf9a" }}>
            {createdName} created and selected.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setCreatedName(null);
            setError(null);
            setOpen(true);
          }}
          className="admin-btn admin-btn-sm inline-flex items-center gap-1.5 !px-2.5 !py-1.5 !text-[11.5px]"
        >
          <Plus size={12} /> Add Supplier
        </button>
      </div>
    );
  }

  return (
    <div
      className="admin-surface !shadow-none mt-2 space-y-3 p-3"
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void submit();
        }
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-semibold" style={{ color: "var(--admin-heading)" }}>New Supplier</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(false);
          }}
          disabled={saving}
          aria-label="Cancel adding supplier"
          className="admin-btn admin-btn-sm !w-7 !h-7 !p-0"
        >
          <X size={13} />
        </button>
      </div>
      {error && <Note tone="red">{error}</Note>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Supplier Name">
          <input
            type="text"
            value={form.name}
            onChange={(event) => {
              setError(null);
              setForm((current) => ({ ...current, name: event.target.value }));
            }}
            placeholder="Supplier name"
            maxLength={160}
            autoComplete="organization"
            className="admin-input !text-[13px]"
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Phone (optional)">
          <input
            type="tel"
            value={form.phone}
            onChange={(event) => {
              setError(null);
              setForm((current) => ({ ...current, phone: event.target.value }));
            }}
            placeholder="+20…"
            maxLength={30}
            autoComplete="tel"
            className="admin-input !text-[13px]"
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Email (optional)">
          <input
            type="email"
            value={form.email}
            onChange={(event) => {
              setError(null);
              setForm((current) => ({ ...current, email: event.target.value }));
            }}
            placeholder="supplier@example.com"
            maxLength={254}
            autoComplete="email"
            className="admin-input !text-[13px]"
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Notes (optional)">
          <input
            type="text"
            value={form.notes}
            onChange={(event) => {
              setError(null);
              setForm((current) => ({ ...current, notes: event.target.value }));
            }}
            placeholder="Short supplier note"
            maxLength={500}
            className="admin-input !text-[13px]"
            style={INPUT_STYLE}
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className="admin-btn admin-btn-primary inline-flex items-center gap-2 !px-3 !py-2 !text-[12px]"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {saving ? "Creating…" : "Create Supplier"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(false);
          }}
          disabled={saving}
          className="admin-btn !px-3 !py-2 !text-[12px]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddPurchaseDrawer({
  open,
  suppliers,
  products,
  form,
  saving,
  error,
  onChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSupplierCreated,
  onClose,
  onSubmit,
}: {
  open: boolean;
  suppliers: Supplier[];
  products: PurchasableProduct[];
  form: PurchaseFormState;
  saving: boolean;
  error: string | null;
  onChange: (patch: Partial<Omit<PurchaseFormState, "items">>) => void;
  onItemChange: (key: string, patch: Partial<Omit<PurchaseItemFormState, "key">>) => void;
  onAddItem: () => void;
  onRemoveItem: (key: string) => void;
  onSupplierCreated: (supplier: Supplier) => void | Promise<void>;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [supplierQuery, setSupplierQuery] = useState("");

  if (!open) return null;

  const activeSuppliers = suppliers.filter((supplier) => supplier.status === "active");
  const normalizedSupplierQuery = supplierQuery.trim().toLocaleLowerCase();
  const matchingSuppliers = normalizedSupplierQuery
    ? activeSuppliers.filter((supplier) => (
      supplier.name.toLocaleLowerCase().includes(normalizedSupplierQuery) ||
      supplier.contactName?.toLocaleLowerCase().includes(normalizedSupplierQuery) ||
      supplier.phone?.toLocaleLowerCase().includes(normalizedSupplierQuery) ||
      supplier.email?.toLocaleLowerCase().includes(normalizedSupplierQuery)
    ))
    : activeSuppliers;
  const selectedSupplier = activeSuppliers.find((supplier) => supplier.id === form.supplierId) ?? null;
  const visibleSuppliers = selectedSupplier && !matchingSuppliers.some((supplier) => supplier.id === selectedSupplier.id)
    ? [selectedSupplier, ...matchingSuppliers]
    : matchingSuppliers;
  const estimatedTotal = form.items.reduce((sum, item) => sum + purchaseLineTotal(item), 0);
  const cannotCreate = activeSuppliers.length === 0 || products.length === 0;

  const handleSupplierCreated = async (supplier: Supplier) => {
    setSupplierQuery("");
    await onSupplierCreated(supplier);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close add purchase"
        className="admin-modal-overlay absolute inset-0 disabled:cursor-wait"
        onClick={onClose}
        disabled={saving}
      />
      <aside className="admin-drawer-surface relative flex h-full w-full max-w-[620px] flex-col overflow-hidden">
        <div className="admin-drawer-header flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[18px] font-bold" style={{ color: "var(--admin-heading)", fontFamily: "var(--font-playfair)" }}>
              Add Purchase
            </p>
            <p className="mt-1 text-[12px] leading-relaxed admin-muted">
              Creates a real draft purchase and supplier payable. Receive it separately when the goods arrive.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            title="Close"
            aria-label="Close"
            className="admin-btn admin-btn-sm !w-8 !h-8 !p-0 flex-shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        <form
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {error && <Note tone="red">{error}</Note>}
          <Note tone="blue">
            Purchases are inventory / cost basis, not operating expenses. Creating this draft does not change stock, COGS, or net profit.
          </Note>
          {activeSuppliers.length === 0 && (
            <Note tone="amber">No active supplier is available. Create one below to continue.</Note>
          )}
          {products.length === 0 && (
            <Note tone="amber">No non-archived finished product is available for purchasing.</Note>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Field label="Find Supplier">
                <input
                  type="search"
                  value={supplierQuery}
                  onChange={(event) => setSupplierQuery(event.target.value)}
                  placeholder="Search name, phone, or email"
                  aria-label="Search suppliers"
                  disabled={activeSuppliers.length === 0}
                  className="mb-2 w-full rounded-lg px-3 py-2 text-[13px] outline-none disabled:opacity-50"
                  style={INPUT_STYLE}
                />
              </Field>
              <Field label="Supplier">
                <select
                  value={form.supplierId}
                  onChange={(event) => onChange({ supplierId: event.target.value })}
                  aria-label="Purchase supplier"
                  disabled={activeSuppliers.length === 0}
                  className="admin-select !text-[13px] disabled:opacity-50"
                  style={SELECT_STYLE}
                >
                  <option value="">Select supplier…</option>
                  {visibleSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </Field>
              {normalizedSupplierQuery && matchingSuppliers.length === 0 && (
                <p className="mt-1.5 text-[11px]" style={{ color: "var(--admin-muted)", opacity: 0.62 }}>
                  No supplier matches this search.
                </p>
              )}
              <QuickCreateSupplier onCreated={handleSupplierCreated} />
            </div>
            <Field label="Purchase Date">
              <input
                type="date"
                value={form.date}
                onChange={(event) => onChange({ date: event.target.value })}
                required
                className="admin-input !text-[13px]"
                style={SELECT_STYLE}
              />
            </Field>
          </div>

          <Field label="Reference (optional)">
            <input
              type="text"
              value={form.reference}
              onChange={(event) => onChange({ reference: event.target.value })}
              placeholder="Supplier invoice / PO number"
              maxLength={120}
              className="admin-input !text-[13px]"
              style={INPUT_STYLE}
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-muted)", opacity: 0.5 }}>
                Purchase Items
              </p>
              <button
                type="button"
                onClick={onAddItem}
                disabled={products.length === 0 || form.items.length >= 200}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold disabled:opacity-50"
                style={{ color: "var(--admin-hazelnut)", border: "1px solid var(--admin-border-strong)" }}
              >
                <Plus size={12} /> Add Item
              </button>
            </div>
            <div className="space-y-3">
              {form.items.map((item, index) => (
                <div
                  key={item.key}
                  className="rounded-lg p-3"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--admin-border)" }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11.5px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>Item {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.key)}
                      disabled={form.items.length === 1}
                      aria-label={`Remove purchase item ${index + 1}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg disabled:opacity-30"
                      style={{ color: "#e39a8c", border: "1px solid rgba(248,113,113,0.16)" }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.6fr_0.7fr_0.8fr]">
                    <Field label="Finished Product">
                      <select
                        value={item.productId}
                        onChange={(event) => onItemChange(item.key, { productId: event.target.value })}
                        aria-label={`Product for item ${index + 1}`}
                        required
                        className="admin-select !text-[13px]"
                        style={SELECT_STYLE}
                      >
                        <option value="">Select product…</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.nameEn} · {product.nameAr}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Quantity (kg)">
                      <input
                        type="number"
                        min="0.001"
                        max="100000"
                        step="0.001"
                        value={item.quantityKg}
                        onChange={(event) => onItemChange(item.key, { quantityKg: event.target.value })}
                        placeholder="0"
                        required
                        className="admin-input !text-[13px]"
                        style={INPUT_STYLE}
                      />
                    </Field>
                    <Field label="Cost / kg (EGP)">
                      <input
                        type="number"
                        min="0"
                        max="1000000"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(event) => onItemChange(item.key, { unitCost: event.target.value })}
                        placeholder="0"
                        required
                        className="admin-input !text-[13px]"
                        style={INPUT_STYLE}
                      />
                    </Field>
                  </div>
                  <p className="mt-2 text-right text-[11.5px]" style={{ color: "var(--admin-muted)", opacity: 0.7 }}>
                    Line total: <span className="font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{money(purchaseLineTotal(item))}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Field label="Notes (optional)">
            <textarea
              value={form.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              rows={3}
              placeholder="Short note about this purchase"
              maxLength={2000}
              className="admin-textarea !resize-none !text-[13px]"
              style={INPUT_STYLE}
            />
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5" style={{ background: "var(--admin-border)" }}>
            <span className="text-[12px]" style={{ color: "var(--admin-muted)" }}>Draft total · payable increase</span>
            <span className="text-[14px] font-bold" style={{ color: "var(--admin-hazelnut)" }}>{money(estimatedTotal)}</span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || cannotCreate}
              className="admin-btn admin-btn-primary inline-flex items-center gap-2 !px-4 !py-2 !text-[13px]"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? "Creating…" : "Create Purchase"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="admin-btn !px-4 !py-2 !text-[13px]"
            >
              Cancel
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

// ── Pay Supplier form (real payment via record_purchase_payment RPC) ────────────
// A supplier payment settles a specific unpaid purchase (the backend keys payments
// to a purchase_id, then rolls them up per supplier). It moves the supplier payable
// / paid balance ONLY — never orders, COGS, expenses, or net profit.

const SUPPLIER_PAYMENT_METHODS = ["Cash", "Bank Transfer", "Mobile Wallet", "Cheque", "Other"];

type PaySupplierFormState = {
  supplierId: string;
  purchaseId: string;
  amount: string;
  method: string;
  reference: string;
  notes: string;
  date: string;
};

const EMPTY_PAY_SUPPLIER_FORM: PaySupplierFormState = {
  supplierId: "",
  purchaseId: "",
  amount: "",
  method: "Cash",
  reference: "",
  notes: "",
  date: "",
};

function unpaidPurchasesForSupplier(data: AdminAccountingData, supplierId: string) {
  return data.purchases.filter(
    (purchase) =>
      purchase.supplierId === supplierId &&
      purchase.status !== "cancelled" &&
      purchase.unpaid > 0,
  );
}

function purchaseStatusLabel(status: string): string {
  if (status === "draft") return "Draft";
  if (status === "received") return "Received";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function purchasePaymentStatusLabel(status: string): string {
  if (status === "unpaid") return "Unpaid";
  if (status === "partial") return "Partially paid";
  if (status === "paid") return "Paid";
  return status;
}

function PaySupplierDrawer({
  open,
  data,
  form,
  saving,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  data: AdminAccountingData | null;
  form: PaySupplierFormState;
  saving: boolean;
  error: string | null;
  onChange: (patch: Partial<PaySupplierFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open || !data) return null;

  const payableSuppliers = data.supplierBalances.filter((supplier) => supplier.payable > 0);
  const supplierPurchases = form.supplierId
    ? unpaidPurchasesForSupplier(data, form.supplierId)
    : [];
  const selectedPurchase = supplierPurchases.find((purchase) => purchase.id === form.purchaseId) ?? null;
  const noneToPay = payableSuppliers.length === 0;

  const handleSupplierChange = (supplierId: string) => {
    const first = unpaidPurchasesForSupplier(data, supplierId)[0] ?? null;
    onChange({
      supplierId,
      purchaseId: first?.id ?? "",
      amount: first ? String(first.unpaid) : "",
    });
  };

  const handlePurchaseChange = (purchaseId: string) => {
    const purchase = data.purchases.find((entry) => entry.id === purchaseId) ?? null;
    onChange({ purchaseId, amount: purchase ? String(purchase.unpaid) : "" });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close pay supplier"
        className="admin-modal-overlay absolute inset-0 disabled:cursor-wait"
        onClick={onClose}
        disabled={saving}
      />
      <aside
        className="admin-drawer-surface relative flex h-full w-full max-w-[460px] flex-col overflow-hidden"
      >
        <div className="admin-drawer-header flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[18px] font-bold" style={{ color: "var(--admin-heading)", fontFamily: "var(--font-playfair)" }}>
              Pay Supplier
            </p>
            <p className="mt-1 text-[12px] leading-relaxed admin-muted">
              Records a real payment against an unpaid purchase and lowers the supplier payable.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            title="Close"
            aria-label="Close"
            className="admin-btn admin-btn-sm !w-8 !h-8 !p-0 flex-shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {noneToPay ? (
          <div className="flex flex-1 flex-col gap-4 px-5 py-5">
            <Note tone="green">All supplier purchases are settled — there is no outstanding payable to pay right now.</Note>
            <button type="button" onClick={onClose} className="admin-btn !px-4 !py-2 !text-[13px]">
              Close
            </button>
          </div>
        ) : (
          <form
            className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            {error && <Note tone="red">{error}</Note>}
            <Note tone="blue">
              A payment settles one unpaid purchase. This is a cash outflow to a supplier — it is NOT an operating expense and never changes net profit or COGS.
            </Note>
            <Field label="Supplier">
              <select
                value={form.supplierId}
                onChange={(event) => handleSupplierChange(event.target.value)}
                aria-label="Supplier"
                className="admin-select !text-[13px]"
                style={SELECT_STYLE}
              >
                <option value="">Select supplier…</option>
                {payableSuppliers.map((supplier) => (
                  <option key={supplier.supplierId} value={supplier.supplierId}>
                    {supplier.name} · {money(supplier.payable)} due
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Purchase to settle">
              <select
                value={form.purchaseId}
                onChange={(event) => handlePurchaseChange(event.target.value)}
                aria-label="Purchase to settle"
                disabled={!form.supplierId}
                className="admin-select !text-[13px] disabled:opacity-50"
                style={SELECT_STYLE}
              >
                <option value="">{form.supplierId ? "Select purchase…" : "Choose a supplier first"}</option>
                {supplierPurchases.map((purchase) => (
                  <option key={purchase.id} value={purchase.id}>
                    {shortDate(purchase.date)} · {purchase.reference || "No ref"} · {money(purchase.unpaid)} due
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Amount (EGP)">
                <input
                  type="number"
                  min="0.01"
                  max={selectedPurchase?.unpaid}
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => onChange({ amount: event.target.value })}
                  placeholder="0"
                  required
                  className="admin-input !text-[13px]"
                  style={INPUT_STYLE}
                />
              </Field>
              <Field label="Payment Date">
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => onChange({ date: event.target.value })}
                  required
                  className="admin-input !text-[13px]"
                  style={SELECT_STYLE}
                />
              </Field>
              <Field label="Payment Method">
                <select
                  value={form.method}
                  onChange={(event) => onChange({ method: event.target.value })}
                  aria-label="Supplier payment method"
                  className="admin-select !text-[13px]"
                  style={SELECT_STYLE}
                >
                  {SUPPLIER_PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Reference (optional)">
                <input
                  type="text"
                  value={form.reference}
                  onChange={(event) => onChange({ reference: event.target.value })}
                  placeholder="Transfer / cheque no."
                  maxLength={120}
                  className="admin-input !text-[13px]"
                  style={INPUT_STYLE}
                />
              </Field>
            </div>
            <Field label="Notes (optional)">
              <textarea
                value={form.notes}
                onChange={(event) => onChange({ notes: event.target.value })}
                rows={3}
                placeholder="Short note about this payment"
                maxLength={800}
                className="admin-textarea !resize-none !text-[13px]"
                style={INPUT_STYLE}
              />
            </Field>
            {selectedPurchase && (
              <div className="space-y-2 rounded-lg px-3 py-2.5" style={{ background: "var(--admin-border)", border: "1px solid var(--admin-border)" }}>
                <div className="flex items-center justify-between gap-3 text-[11.5px]">
                  <span style={{ color: "var(--admin-muted)" }}>Outstanding on purchase</span>
                  <span className="font-semibold" style={{ color: "#e3b673" }}>{money(selectedPurchase.unpaid)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[11.5px]">
                  <span style={{ color: "var(--admin-muted)" }}>Balance after this payment</span>
                  <span className="font-semibold" style={{ color: "var(--admin-white-coffee)" }}>
                    {money(Math.max(0, selectedPurchase.unpaid - (Number(form.amount) || 0)))}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ amount: String(selectedPurchase.unpaid) })}
                  className="text-[11px] font-semibold"
                  style={{ color: "var(--admin-hazelnut)" }}
                >
                  Use full outstanding amount
                </button>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="admin-btn admin-btn-primary inline-flex items-center gap-2 !px-4 !py-2 !text-[13px]"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? "Saving…" : "Record Payment"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="admin-btn !px-4 !py-2 !text-[13px]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountingPage() {
  const [data, setData] = useState<AdminAccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("All");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseProducts, setPurchaseProducts] = useState<PurchasableProduct[]>([]);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(EMPTY_PURCHASE_FORM);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSaving, setPurchaseSaving] = useState(false);
  const [receivingPurchaseId, setReceivingPurchaseId] = useState<string | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(EMPTY_EXPENSE_FORM);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [paySupplierOpen, setPaySupplierOpen] = useState(false);
  const [paySupplierForm, setPaySupplierForm] = useState<PaySupplierFormState>(EMPTY_PAY_SUPPLIER_FORM);
  const [paySupplierError, setPaySupplierError] = useState<string | null>(null);
  const [paySupplierSaving, setPaySupplierSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accounting, supplierRows, products] = await Promise.all([
        getAdminAccounting(),
        listSuppliers(),
        listPurchasableProducts(),
      ]);
      setData(accounting);
      setSuppliers(supplierRows);
      setPurchaseProducts(products);
    } catch (err) {
      setError(
        err instanceof AdminAccountingError || err instanceof AdminPurchasingError
          ? err.message
          : "Could not load accounting data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + refresh data fetch
  useEffect(() => { void load(); }, [load]);

  const handleSupplierCreated = useCallback((supplier: Supplier) => {
    setSuppliers((current) => (
      [...current.filter((entry) => entry.id !== supplier.id), supplier]
        .sort((a, b) => a.name.localeCompare(b.name))
    ));
    setPurchaseForm((current) => ({ ...current, supplierId: supplier.id }));
    setPurchaseError(null);
  }, []);

  const openPurchaseDrawer = useCallback(() => {
    setPurchaseForm({
      ...EMPTY_PURCHASE_FORM,
      date: todayLocal(),
      items: [emptyPurchaseItem()],
    });
    setPurchaseError(null);
    setNotice(null);
    setPurchaseOpen(true);
  }, []);

  const closePurchaseDrawer = useCallback(() => {
    setPurchaseOpen(false);
    setPurchaseError(null);
  }, []);

  const changePurchaseItem = useCallback((
    key: string,
    patch: Partial<Omit<PurchaseItemFormState, "key">>,
  ) => {
    setPurchaseError(null);
    setPurchaseForm((current) => ({
      ...current,
      items: current.items.map((item) => item.key === key ? { ...item, ...patch } : item),
    }));
  }, []);

  const addPurchaseItem = useCallback(() => {
    setPurchaseError(null);
    setPurchaseForm((current) => ({ ...current, items: [...current.items, emptyPurchaseItem()] }));
  }, []);

  const removePurchaseItem = useCallback((key: string) => {
    setPurchaseError(null);
    setPurchaseForm((current) => ({
      ...current,
      items: current.items.length > 1
        ? current.items.filter((item) => item.key !== key)
        : current.items,
    }));
  }, []);

  const submitPurchase = useCallback(async () => {
    if (!purchaseForm.supplierId) {
      setPurchaseError("Choose a supplier for the purchase.");
      return;
    }
    if (!suppliers.some((supplier) => supplier.id === purchaseForm.supplierId && supplier.status === "active")) {
      setPurchaseError("That supplier is no longer active. Refresh and choose another supplier.");
      return;
    }
    if (!purchaseForm.date) {
      setPurchaseError("Choose a purchase date.");
      return;
    }
    if (purchaseForm.items.length === 0) {
      setPurchaseError("Add at least one purchase item.");
      return;
    }
    if (purchaseForm.items.length > 200) {
      setPurchaseError("A purchase can contain at most 200 items.");
      return;
    }
    if (purchaseForm.reference.trim().length > 120) {
      setPurchaseError("Purchase reference must be 120 characters or fewer.");
      return;
    }
    if (purchaseForm.notes.trim().length > 2000) {
      setPurchaseError("Purchase notes must be 2,000 characters or fewer.");
      return;
    }

    const items = purchaseForm.items.map((item) => ({
      productId: item.productId,
      quantityKg: Number(item.quantityKg),
      unitCost: Number(item.unitCost),
    }));
    for (const item of items) {
      if (!item.productId || !purchaseProducts.some((product) => product.id === item.productId)) {
        setPurchaseError("Choose a valid finished product for every item.");
        return;
      }
      if (!Number.isFinite(item.quantityKg) || item.quantityKg <= 0) {
        setPurchaseError("Enter a quantity greater than 0 kg for every item.");
        return;
      }
      if (item.quantityKg > 100000) {
        setPurchaseError("Item quantity cannot exceed 100,000 kg.");
        return;
      }
      if (!Number.isFinite(item.unitCost) || item.unitCost < 0) {
        setPurchaseError("Enter a valid cost per kg for every item.");
        return;
      }
      if (item.unitCost > 1000000) {
        setPurchaseError("Item cost cannot exceed 1,000,000 EGP per kg.");
        return;
      }
    }

    setPurchaseSaving(true);
    setPurchaseError(null);
    try {
      const result = await createPurchase({
        supplierId: purchaseForm.supplierId,
        purchaseDate: purchaseForm.date,
        reference: purchaseForm.reference.trim() || null,
        notes: purchaseForm.notes.trim() || null,
        items,
      });
      setPurchaseOpen(false);
      setPurchaseForm(EMPTY_PURCHASE_FORM);
      setActiveTab("purchases");
      setNotice(`Purchase created for ${money(result.totalAmount)} — supplier payable increased. Receive it when the goods arrive.`);
      await load();
    } catch (err) {
      setPurchaseError(
        err instanceof AdminPurchasingError
          ? err.message
          : "Could not create the purchase. Please try again.",
      );
    } finally {
      setPurchaseSaving(false);
    }
  }, [purchaseForm, purchaseProducts, suppliers, load]);

  const handleReceivePurchase = useCallback(async (purchaseId: string) => {
    const purchase = data?.purchases.find((entry) => entry.id === purchaseId) ?? null;
    if (!purchase || purchase.status !== "draft") {
      setError("Only a current draft purchase can be received.");
      return;
    }
    const confirmed = window.confirm(
      `Receive purchase ${purchase.reference || shortDate(purchase.date)} from ${purchase.supplierName}? This will add its quantities to inventory and create FIFO lots.`,
    );
    if (!confirmed) return;

    setReceivingPurchaseId(purchaseId);
    setError(null);
    setNotice(null);
    try {
      const result = await receivePurchase(purchaseId);
      setActiveTab("purchases");
      setNotice(
        `Purchase received — ${result.lotsCreated} inventory ${result.lotsCreated === 1 ? "lot" : "lots"} created and ${result.totalKg} kg added to stock.`,
      );
      await load();
    } catch (err) {
      setError(
        err instanceof AdminPurchasingError
          ? err.message
          : "Could not receive the purchase. Please try again.",
      );
    } finally {
      setReceivingPurchaseId(null);
    }
  }, [data, load]);

  const openExpenseDrawer = useCallback(() => {
    setExpenseForm({ ...EMPTY_EXPENSE_FORM, date: todayLocal() });
    setExpenseError(null);
    setNotice(null);
    setExpenseOpen(true);
  }, []);

  const closeExpenseDrawer = useCallback(() => {
    setExpenseOpen(false);
    setExpenseError(null);
  }, []);

  const submitExpense = useCallback(async () => {
    const amount = Number(expenseForm.amount);
    if (!expenseForm.date) {
      setExpenseError("Choose a date for the expense.");
      return;
    }
    if (!expenseForm.category) {
      setExpenseError("Choose an expense category.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setExpenseError("Enter an amount greater than 0.");
      return;
    }

    setExpenseSaving(true);
    setExpenseError(null);
    try {
      await createExpense({
        expenseDate: expenseForm.date,
        category: expenseForm.category,
        amount,
        paymentMethod: expenseForm.method || null,
        notes: expenseForm.notes || null,
      });
      setExpenseOpen(false);
      setExpenseForm(EMPTY_EXPENSE_FORM);
      setActiveTab("expenses");
      setNotice("Expense saved — accounting refreshed.");
      await load();
    } catch (err) {
      setExpenseError(
        err instanceof AdminPurchasingError
          ? err.message
          : "Could not save the expense. Please try again.",
      );
    } finally {
      setExpenseSaving(false);
    }
  }, [expenseForm, load]);

  const openPaySupplierDrawer = useCallback(() => {
    setPaySupplierForm({ ...EMPTY_PAY_SUPPLIER_FORM, date: todayLocal() });
    setPaySupplierError(null);
    setNotice(null);
    setPaySupplierOpen(true);
  }, []);

  const closePaySupplierDrawer = useCallback(() => {
    setPaySupplierOpen(false);
    setPaySupplierError(null);
  }, []);

  const submitPaySupplier = useCallback(async () => {
    if (!data) return;
    const amount = Math.round(Number(paySupplierForm.amount) * 100) / 100;
    if (!paySupplierForm.supplierId) {
      setPaySupplierError("Choose a supplier to pay.");
      return;
    }
    if (!paySupplierForm.purchaseId) {
      setPaySupplierError("Choose which purchase this payment settles.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaySupplierError("Enter an amount greater than 0.");
      return;
    }
    if (!paySupplierForm.date) {
      setPaySupplierError("Choose the supplier payment date.");
      return;
    }
    const purchase = data.purchases.find((entry) => entry.id === paySupplierForm.purchaseId) ?? null;
    if (
      !purchase ||
      purchase.supplierId !== paySupplierForm.supplierId ||
      purchase.status === "cancelled" ||
      purchase.unpaid <= 0
    ) {
      setPaySupplierError("That purchase is no longer payable. Refresh and try again.");
      return;
    }
    if (amount > purchase.unpaid + 0.01) {
      setPaySupplierError(`Amount can't exceed the ${money(purchase.unpaid)} still owed on this purchase.`);
      return;
    }

    setPaySupplierSaving(true);
    setPaySupplierError(null);
    try {
      const reference = paySupplierForm.reference.trim();
      const noteText = paySupplierForm.notes.trim();
      const composedNotes =
        [reference ? `Ref: ${reference}` : "", noteText].filter(Boolean).join(" — ") || null;
      const result = await recordPurchasePayment({
        purchaseId: paySupplierForm.purchaseId,
        amount,
        method: paySupplierForm.method || null,
        notes: composedNotes,
        paidAt: paySupplierForm.date || null,
      });
      setPaySupplierOpen(false);
      setPaySupplierForm(EMPTY_PAY_SUPPLIER_FORM);
      setActiveTab("suppliers");
      const remaining = Math.max(0, Math.round((result.totalAmount - result.paidAmount) * 100) / 100);
      setNotice(
        remaining > 0
          ? `Supplier payment recorded — ${money(remaining)} remains on this purchase and the payable was reduced.`
          : "Supplier payment recorded — this purchase is fully paid and the supplier payable was reduced.",
      );
      await load();
    } catch (err) {
      setPaySupplierError(
        err instanceof AdminPurchasingError
          ? err.message
          : "Could not record the payment. Please try again.",
      );
    } finally {
      setPaySupplierSaving(false);
    }
  }, [data, paySupplierForm, load]);

  const filteredActivity = useMemo(
    () => (data?.transactions ?? []).filter((t) => activityFilter === "All" || t.direction === activityFilter),
    [data, activityFilter],
  );

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="admin-page-title">
              Accounting
            </h1>
            <StatusPill label="Live data" tone="green" />
          </div>
          <p className="admin-page-subtitle">
            Real revenue, collections, COGS, expenses, and supplier balances from live orders and ledgers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openPurchaseDrawer}
            disabled={!data}
            className="admin-btn admin-btn-primary inline-flex items-center gap-2 !px-3 !py-2 !text-[12px]"
          >
            <Package size={14} /> Add Purchase
          </button>
          <button
            type="button"
            onClick={openExpenseDrawer}
            className="admin-btn admin-btn-primary inline-flex items-center gap-2 !px-3 !py-2 !text-[12px]"
          >
            <Plus size={14} /> Add Expense
          </button>
          <button
            type="button"
            onClick={openPaySupplierDrawer}
            disabled={!data}
            className="admin-btn inline-flex items-center gap-2 !px-3 !py-2 !text-[12px]"
          >
            <CreditCard size={14} /> Pay Supplier
          </button>
          <button type="button" onClick={() => void load()} className="admin-btn inline-flex items-center gap-2 !px-3 !py-2 !text-[12px]">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(227,154,140,0.08)", border: "1px solid rgba(227,154,140,0.24)" }}>
          <span className="flex items-center gap-2 text-[12.5px]" style={{ color: "#e39a8c" }}>
            <AlertTriangle size={14} /> {error}
          </span>
          <button type="button" onClick={() => void load()} className="admin-link flex items-center gap-1.5 !text-[12px]">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(143,207,154,0.08)", border: "1px solid rgba(143,207,154,0.24)" }}>
          <span className="flex items-center gap-2 text-[12.5px]" style={{ color: "#8fcf9a" }}>
            <Check size={14} /> {notice}
          </span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice" className="admin-faint">
            <X size={13} />
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center gap-2 py-16 admin-muted">
          <Loader2 size={16} className="animate-spin" /> Loading real accounting data…
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="Sales (Gross)" value={money(data.salesGross)} caption="Non-cancelled orders, incl. delivery." tone="green" icon={TrendingUp} />
            <KpiCard label="Net Collected" value={money(data.netCollected)} caption="Payments minus refunds." tone="gold" icon={Wallet} />
            <KpiCard
              label="Gross Profit"
              value={money(data.grossProfit)}
              caption={
                data.deliveredIncompleteFlavorCogs > 0
                  ? `Delivered basis · margin ${pct(data.grossMargin)} · includes ${data.deliveredIncompleteFlavorCogs} order(s) with unconfigured flavor cost counted as 0.`
                  : `Delivered basis · margin ${pct(data.grossMargin)}.`
              }
              tone={data.deliveredIncompleteFlavorCogs > 0 ? "amber" : data.grossProfit >= 0 ? "blue" : "red"}
              icon={Calculator}
            />
            <KpiCard
              label="Net Profit"
              value={money(data.netProfit)}
              caption="Gross profit minus operating expenses."
              tone={data.netProfit >= 0 ? "green" : "red"}
              icon={data.netProfit >= 0 ? ArrowUpRight : ArrowDownRight}
            />
            <KpiCard
              label="Supplier Payable"
              value={money(data.supplierPayable)}
              caption="Unpaid purchase balances."
              tone={data.supplierPayable > 0 ? "amber" : "green"}
              icon={CreditCard}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <Note tone="green">Sales exclude cancelled orders; returns never rewrite historical sales.</Note>
            <Note tone={data.deliveredMissingCogs > 0 ? "amber" : "blue"}>
              {data.deliveredMissingCogs > 0
                ? `COGS uses stored delivered-order snapshots only. ${data.deliveredMissingCogs} delivered order(s) have no COGS snapshot and count as 0.`
                : "COGS uses stored delivered-order snapshots only — never recomputed from current stock."}
            </Note>
            <Note tone={data.deliveredIncompleteFlavorCogs > 0 ? "amber" : "blue"}>
              {data.deliveredIncompleteFlavorCogs > 0
                ? `Incomplete COGS: ${data.deliveredIncompleteFlavorCogs} delivered order(s) include a Make Your Flavor line with no configured cost — their gross profit/margin is hidden, not estimated.`
                : "Flavor costs are configured for every delivered order shown here — no incomplete COGS."}
            </Note>
            <Note tone="blue">Purchases are inventory / cost basis, not P&amp;L expenses. Net profit excludes them.</Note>
          </div>

          {!data.hasAnyData && (
            <Surface title="No financial data yet" icon={Landmark}>
              <EmptyState icon={Receipt} message="No orders, payments, expenses, or purchases exist yet. Numbers will populate as real activity is recorded." />
            </Surface>
          )}

          <div
            className="overflow-x-auto rounded-xl p-1.5"
            style={{
              background: "linear-gradient(180deg, var(--admin-border), rgba(255,255,255,0.025))",
              border: "1px solid var(--admin-border)",
            }}
          >
            <div className="flex min-w-max gap-1.5">
              {TABS.map(({ key, label, icon: Icon }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    aria-pressed={active ? "true" : "false"}
                    className="inline-flex min-h-10 flex-shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-all hover:-translate-y-0.5"
                    style={{
                      color: active ? "var(--admin-hazelnut)" : "var(--admin-muted)",
                      background: active
                        ? "linear-gradient(180deg, var(--admin-border-strong), var(--admin-border))"
                        : "rgba(10,7,5,0.34)",
                      border: active ? "1px solid rgba(214,163,115,0.42)" : "1px solid var(--admin-border)",
                      boxShadow: active ? "0 10px 26px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)" : "none",
                    }}
                  >
                    <Icon size={14} className="flex-shrink-0" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === "overview" && <OverviewTab data={data} />}
          {activeTab === "revenue" && <RevenueTab data={data} />}
          {activeTab === "purchases" && (
            <PurchasesTab
              data={data}
              receivingPurchaseId={receivingPurchaseId}
              onAddPurchase={openPurchaseDrawer}
              onReceivePurchase={(purchaseId) => void handleReceivePurchase(purchaseId)}
            />
          )}
          {activeTab === "expenses" && <ExpensesTab data={data} onAddExpense={openExpenseDrawer} />}
          {activeTab === "suppliers" && <SuppliersTab data={data} onPaySupplier={openPaySupplierDrawer} />}
          {activeTab === "activity" && (
            <ActivityTab
              data={data}
              filter={activityFilter}
              onFilter={setActivityFilter}
              rows={filteredActivity}
            />
          )}
        </>
      )}

      <AddPurchaseDrawer
        open={purchaseOpen}
        suppliers={suppliers}
        products={purchaseProducts}
        form={purchaseForm}
        saving={purchaseSaving}
        error={purchaseError}
        onChange={(patch) => {
          setPurchaseError(null);
          setPurchaseForm((current) => ({ ...current, ...patch }));
        }}
        onItemChange={changePurchaseItem}
        onAddItem={addPurchaseItem}
        onRemoveItem={removePurchaseItem}
        onSupplierCreated={handleSupplierCreated}
        onClose={closePurchaseDrawer}
        onSubmit={() => void submitPurchase()}
      />

      <AddExpenseDrawer
        open={expenseOpen}
        form={expenseForm}
        saving={expenseSaving}
        error={expenseError}
        onChange={(patch) => setExpenseForm((current) => ({ ...current, ...patch }))}
        onClose={closeExpenseDrawer}
        onSubmit={() => void submitExpense()}
      />

      <PaySupplierDrawer
        open={paySupplierOpen}
        data={data}
        form={paySupplierForm}
        saving={paySupplierSaving}
        error={paySupplierError}
        onChange={(patch) => {
          setPaySupplierError(null);
          setPaySupplierForm((current) => ({ ...current, ...patch }));
        }}
        onClose={closePaySupplierDrawer}
        onSubmit={() => void submitPaySupplier()}
      />
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: AdminAccountingData }) {
  const plRows: Array<{ label: string; value: number; tone: Tone; sign: string; strong?: boolean }> = [
    { label: "Delivered Net Sales", value: data.deliveredNetSales, tone: "green", sign: "+" },
    { label: "Cost of Goods Sold (COGS)", value: data.cogsTotal, tone: "amber", sign: "-" },
    { label: "Gross Profit", value: data.grossProfit, tone: data.grossProfit >= 0 ? "blue" : "red", sign: "", strong: true },
    { label: "Operating Expenses", value: data.operatingExpenses, tone: "red", sign: "-" },
    { label: "Net Profit", value: data.netProfit, tone: data.netProfit >= 0 ? "green" : "red", sign: "", strong: true },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
      <Surface
        title="Profit & Loss"
        caption="Delivered basis: revenue and COGS share the same delivered-order set. Expenses are period-wide operating costs."
        icon={Calculator}
      >
        <div className="space-y-3 px-5 py-5">
          {plRows.map((row) => {
            const style = TONE_STYLE[row.tone];
            return (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-3"
                style={{
                  background: row.strong ? "var(--admin-border)" : "rgba(255,255,255,0.025)",
                  border: `1px solid ${row.strong ? "var(--admin-border-strong)" : "var(--admin-border)"}`,
                }}
              >
                <span className={`text-[13px] ${row.strong ? "font-bold" : "font-medium"}`} style={{ color: "var(--admin-white-coffee)" }}>
                  {row.label}
                </span>
                <span className={`text-[14px] ${row.strong ? "font-bold" : "font-semibold"}`} style={{ color: style.color }}>
                  {row.sign}
                  {money(row.value)}
                </span>
              </div>
            );
          })}
        </div>
      </Surface>

      <Surface title="Cash & Collections" caption="Real payment and refund ledgers. Profit and cash are tracked separately." icon={Wallet}>
        <div className="grid grid-cols-2 gap-3 px-5 py-5">
          <KpiCard label="Collected" value={money(data.paidTotal)} caption="Sum of order payments." tone="green" icon={Banknote} />
          <KpiCard label="Refunded" value={money(data.refundedTotal)} caption="Reduces cash only." tone={data.refundedTotal > 0 ? "red" : "green"} icon={TrendingDown} />
          <KpiCard label="Net Collected" value={money(data.netCollected)} caption="Payments − refunds." tone="gold" icon={Wallet} />
          <KpiCard label="Receivable" value={money(data.receivable)} caption="Order totals not yet collected." tone={data.receivable > 0 ? "amber" : "green"} icon={CreditCard} />
        </div>
        <div className="px-5 pb-5">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-muted)", opacity: 0.5 }}>
            Collected by method
          </p>
          {data.methodBreakdown.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--admin-muted)", opacity: 0.55 }}>
              No payments recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {data.methodBreakdown.map((method) => (
                <div
                  key={method.key}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--admin-border)" }}
                >
                  <span className="text-[12.5px]" style={{ color: "var(--admin-white-coffee)" }}>
                    {method.label}
                    <span className="ml-2 text-[11px]" style={{ color: "var(--admin-muted)", opacity: 0.55 }}>
                      {method.count} payment{method.count === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="text-[13px] font-semibold" style={{ color: "var(--admin-hazelnut)" }}>
                    {money(method.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}

// ── Revenue ──────────────────────────────────────────────────────────────────

function RevenueTab({ data }: { data: AdminAccountingData }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Sales (Gross)" value={money(data.salesGross)} tone="green" icon={Receipt} />
        <KpiCard label="Net Product Sales" value={money(data.netProductSales)} tone="gold" icon={Banknote} />
        <KpiCard label="Discounts" value={money(data.discountsTotal)} tone="amber" icon={TrendingDown} />
        <KpiCard label="Delivery Fees" value={money(data.deliveryFeesTotal)} tone="blue" icon={Truck} />
        <KpiCard label="Delivered COGS" value={money(data.cogsTotal)} tone="amber" icon={Calculator} />
        <KpiCard label="Gross Margin" value={pct(data.grossMargin)} tone="blue" icon={TrendingUp} />
      </div>

      <Surface title="Monthly Trends" caption={`Last ${data.monthly.length} months: revenue, collections, gross profit, and expenses.`} icon={TrendingUp}>
        <MonthlyTrendChart points={data.monthly} />
      </Surface>

      <Surface
        title="Recent Orders"
        caption="Product revenue = subtotal − discount. COGS/margin shown for delivered orders only. Cancelled orders stay out of totals."
        icon={Receipt}
      >
        {data.orders.length === 0 ? (
          <EmptyState icon={Receipt} message="No orders recorded yet." />
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <div
                className="grid min-w-[1080px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  gridTemplateColumns: "1fr 1.3fr 0.9fr 0.9fr 0.9fr 0.9fr 1fr 0.9fr 0.9fr",
                  color: "var(--admin-muted)",
                  background: "var(--admin-border)",
                  borderBottom: "1px solid var(--admin-border)",
                }}
              >
                <span>Order</span>
                <span>Customer</span>
                <span>Status</span>
                <span className="text-right">Subtotal</span>
                <span className="text-right">Discount</span>
                <span className="text-right">Total</span>
                <span className="text-right">Net Paid</span>
                <span className="text-right">Est. COGS</span>
                <span className="text-right">Margin</span>
              </div>
              {data.orders.map((entry) => (
                <OrderRowDesktop key={entry.id} entry={entry} />
              ))}
            </div>
            <div className="space-y-3 px-4 py-4 xl:hidden">
              {data.orders.map((entry) => (
                <OrderRowMobile key={entry.id} entry={entry} />
              ))}
            </div>
          </>
        )}
      </Surface>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Note tone="amber">COGS comes only from the stored delivered-order snapshot (`orders.cogs_total`); it is never recomputed from current stock costs.</Note>
        <Note tone="red">Refunds reduce cash collected only. Cancelled orders never count as revenue.</Note>
      </div>
    </div>
  );
}

function OrderRowDesktop({ entry }: { entry: AccountingOrderRow }) {
  return (
    <div
      className="grid min-w-[1080px] items-center gap-4 px-5 py-3.5 text-[12.5px]"
      style={{
        gridTemplateColumns: "1fr 1.3fr 0.9fr 0.9fr 0.9fr 0.9fr 1fr 0.9fr 0.9fr",
        color: "var(--admin-white-coffee)",
        borderBottom: "1px solid var(--admin-border)",
      }}
    >
      <span className="font-mono text-[11.5px]" style={{ color: "var(--admin-muted)", opacity: 0.58 }}>
        {entry.code}
      </span>
      <span className="truncate">{entry.customer}</span>
      <StatusPill label={STATUS_LABEL[entry.status]} tone={STATUS_TONE[entry.status]} />
      <span className="text-right">{money(entry.subtotal)}</span>
      <span className="text-right" style={{ color: entry.discount > 0 ? "#e3b673" : "var(--admin-muted)" }}>
        {money(entry.discount)}
      </span>
      <span className="text-right font-semibold" style={{ color: "#8fcf9a" }}>
        <MixedNumeric text={money(entry.total)} />
      </span>
      <span className="text-right" style={{ color: "var(--admin-hazelnut)" }}>
        <MixedNumeric text={money(entry.netPaid)} />
      </span>
      <span className="text-right" style={{ color: entry.cogs === null ? "var(--admin-muted)" : "#e3b673" }}>
        {entry.cogs === null ? "—" : <MixedNumeric text={money(entry.cogs)} />}
      </span>
      <span className="text-right" style={entry.cogsIncomplete ? { color: "#e3b673" } : undefined}>
        {entry.cogsIncomplete ? "Incomplete" : <MixedNumeric text={pct(entry.margin)} />}
      </span>
    </div>
  );
}

function OrderRowMobile({ entry }: { entry: AccountingOrderRow }) {
  return (
    <article className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--admin-border)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11.5px]" style={{ color: "var(--admin-hazelnut)" }}>
            {entry.code}
          </p>
          <p className="text-[13px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>
            {entry.customer}
          </p>
        </div>
        <StatusPill label={STATUS_LABEL[entry.status]} tone={STATUS_TONE[entry.status]} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
        <span style={{ color: "var(--admin-muted)" }}>Total</span>
        <span className="text-right font-semibold" style={{ color: "#8fcf9a" }}>{money(entry.total)}</span>
        <span style={{ color: "var(--admin-muted)" }}>Net paid</span>
        <span className="text-right font-semibold" style={{ color: "var(--admin-hazelnut)" }}>{money(entry.netPaid)}</span>
        <span style={{ color: "var(--admin-muted)" }}>Est. COGS</span>
        <span className="text-right" style={{ color: entry.cogs === null ? "var(--admin-muted)" : "#e3b673" }}>
          {entry.cogs === null ? "—" : money(entry.cogs)}
        </span>
      </div>
      {entry.cogsIncomplete && (
        <p className="mt-2 text-[11px]" style={{ color: "#e3b673" }}>
          Incomplete COGS — unconfigured flavor cost, margin hidden
        </p>
      )}
    </article>
  );
}

// ── Purchases ────────────────────────────────────────────────────────────────

function PurchasesTab({
  data,
  receivingPurchaseId,
  onAddPurchase,
  onReceivePurchase,
}: {
  data: AdminAccountingData;
  receivingPurchaseId: string | null;
  onAddPurchase: () => void;
  onReceivePurchase: (purchaseId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Total Purchases" value={money(data.totalPurchases)} caption="Non-cancelled purchases." tone="blue" icon={Package} />
        <KpiCard label="Paid to Suppliers" value={money(data.paidToSuppliers)} caption="Amount already settled." tone="green" icon={Banknote} />
        <KpiCard label="Supplier Payable" value={money(data.supplierPayable)} caption="Unpaid purchase balances." tone={data.supplierPayable > 0 ? "amber" : "green"} icon={CreditCard} />
      </div>

      <Surface
        title="Inventory Purchases"
        caption="Draft creation establishes the payable; receiving adds stock and lots through the existing backend."
        icon={Package}
        right={
          <button
            type="button"
            onClick={onAddPurchase}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors"
            style={{ color: "var(--admin-surface)", background: "var(--admin-hazelnut)" }}
          >
            <Plus size={14} /> Add Purchase
          </button>
        }
      >
        {data.purchases.length === 0 ? (
          <EmptyState icon={Package} message="No purchases recorded yet. Add the first real supplier purchase here." />
        ) : (
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[1120px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
              style={{
                gridTemplateColumns: "0.8fr 1.3fr 1.1fr 0.8fr 0.8fr 0.85fr 0.85fr 0.85fr 0.9fr",
                color: "var(--admin-muted)",
                background: "var(--admin-border)",
                borderBottom: "1px solid var(--admin-border)",
              }}
            >
              <span>Date</span>
              <span>Supplier</span>
              <span>Reference</span>
              <span>Purchase</span>
              <span>Payment</span>
              <span className="text-right">Total</span>
              <span className="text-right">Paid</span>
              <span className="text-right">Unpaid</span>
              <span className="text-right">Action</span>
            </div>
            {data.purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="grid min-w-[1120px] items-center gap-4 px-5 py-3.5 text-[12.5px]"
                style={{
                  gridTemplateColumns: "0.8fr 1.3fr 1.1fr 0.8fr 0.8fr 0.85fr 0.85fr 0.85fr 0.9fr",
                  color: "var(--admin-white-coffee)",
                  borderBottom: "1px solid var(--admin-border)",
                }}
              >
                <span style={{ color: "var(--admin-muted)", opacity: 0.58 }}>{shortDate(purchase.date)}</span>
                <span className="truncate">{purchase.supplierName}</span>
                <span className="truncate" style={{ color: "var(--admin-muted)", opacity: 0.62 }}>{purchase.reference || "—"}</span>
                <StatusPill
                  label={purchaseStatusLabel(purchase.status)}
                  tone={purchase.status === "received" ? "green" : purchase.status === "cancelled" ? "red" : "amber"}
                />
                <StatusPill
                  label={purchasePaymentStatusLabel(purchase.paymentStatus)}
                  tone={purchase.unpaid > 0 ? (purchase.paid > 0 ? "amber" : "red") : "green"}
                />
                <span className="text-right font-semibold">{money(purchase.total)}</span>
                <span className="text-right" style={{ color: "#e3b673" }}>{money(purchase.paid)}</span>
                <span className="text-right" style={{ color: purchase.unpaid > 0 ? "#e39a8c" : "#8fcf9a" }}>{money(purchase.unpaid)}</span>
                <span className="flex justify-end">
                  {purchase.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => onReceivePurchase(purchase.id)}
                      disabled={receivingPurchaseId !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold disabled:opacity-50"
                      style={{ color: "var(--admin-hazelnut)", border: "1px solid var(--admin-border-strong)" }}
                    >
                      {receivingPurchaseId === purchase.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Truck size={12} />}
                      {receivingPurchaseId === purchase.id ? "Receiving…" : "Receive"}
                    </button>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold"
                      style={{
                        color: purchase.status === "received" ? "#8fcf9a" : "var(--admin-muted)",
                        opacity: purchase.status === "received" ? 1 : 0.58,
                      }}
                    >
                      {purchase.status === "received" && <Check size={12} />}
                      {purchase.status === "received" ? "Received" : "Cancelled"}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <Note tone="blue">Creating a purchase increases supplier payable. Receiving it adds stock and FIFO lots. COGS is only recognized later, at delivery — purchases are not P&amp;L expenses.</Note>
    </div>
  );
}

// ── Expenses ─────────────────────────────────────────────────────────────────

function ExpensesTab({ data, onAddExpense }: { data: AdminAccountingData; onAddExpense: () => void }) {
  const avg = data.expenses.length > 0 ? data.operatingExpenses / data.expenses.length : 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Operating Expenses" value={money(data.operatingExpenses)} caption="Real expenses table only." tone="red" icon={TrendingDown} />
        <KpiCard label="Expense Count" value={String(data.expenses.length)} tone="blue" icon={Receipt} />
        <KpiCard label="Avg per Expense" value={money(avg)} tone="gold" icon={Calculator} />
      </div>

      {data.monthly.some((m) => m.expenses > 0) && (
        <Surface title="Monthly Expenses" caption={`Operating expenses over the last ${data.monthly.length} months.`} icon={TrendingDown}>
          <div className="px-5 py-5">
            <div className="flex items-end gap-3 overflow-x-auto" style={{ height: 140 }}>
              {data.monthly.map((point) => {
                const max = Math.max(1, ...data.monthly.map((m) => m.expenses));
                return (
                  <div key={point.label} className="flex min-w-[54px] flex-1 flex-col items-center gap-2">
                    <div className="flex h-[104px] w-full items-end justify-center">
                      <div
                        className="w-6 rounded-t-sm"
                        style={{ height: `${(point.expenses / max) * 100}%`, background: TONE_STYLE.red.color, opacity: 0.85 }}
                        title={`${point.label}: ${money(point.expenses)}`}
                      />
                    </div>
                    <span className="text-[10.5px]" style={{ color: "var(--admin-muted)", opacity: 0.6 }}>{point.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Surface>
      )}

      <Surface
        title="Operating Expenses"
        caption="Non-COGS costs that reduce net profit. Stock, beans, and packaging belong in Purchases, not here."
        icon={Calculator}
        right={
          <button
            type="button"
            onClick={onAddExpense}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors"
            style={{ color: "var(--admin-surface)", background: "var(--admin-hazelnut)" }}
          >
            <Plus size={14} /> Add Expense
          </button>
        }
      >
        {data.expenses.length === 0 ? (
          <EmptyState icon={Calculator} message="No operating expenses recorded yet." />
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--admin-border)" }}>
            {data.expenses.map((expense) => (
              <div key={expense.id} className="grid grid-cols-1 gap-3 px-5 py-3.5 md:grid-cols-[1fr_1.6fr_0.8fr_0.8fr] md:items-center">
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{expense.category}</p>
                  <p className="text-[11.5px]" style={{ color: "var(--admin-muted)", opacity: 0.55 }}>{shortDate(expense.date)}</p>
                </div>
                <p className="text-[12.5px]" style={{ color: "var(--admin-muted)", opacity: 0.72 }}>{expense.notes || "—"}</p>
                <p className="text-[12.5px]" style={{ color: "var(--admin-muted)", opacity: 0.58 }}>{expense.method || "—"}</p>
                <p className="text-left text-[13px] font-semibold md:text-right" style={{ color: "#e39a8c" }}>-{money(expense.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}

// ── Suppliers ────────────────────────────────────────────────────────────────

function SuppliersTab({ data, onPaySupplier }: { data: AdminAccountingData; onPaySupplier: () => void }) {
  const openSuppliers = data.supplierBalances.filter((s) => s.payable > 0).length;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Supplier Payable" value={money(data.supplierPayable)} tone="amber" icon={CreditCard} />
        <KpiCard label="Total Purchases" value={money(data.totalPurchases)} tone="blue" icon={Package} />
        <KpiCard label="Suppliers With Balance" value={String(openSuppliers)} tone="gold" icon={Landmark} />
      </div>

      <Surface
        title="Supplier Balances"
        caption="Payable = unpaid purchase balances (purchase total − amount paid), from real purchases."
        icon={CreditCard}
        right={
          data.supplierPayable > 0 ? (
            <button
              type="button"
              onClick={onPaySupplier}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors"
              style={{ color: "var(--admin-surface)", background: "var(--admin-hazelnut)" }}
            >
              <CreditCard size={14} /> Pay Supplier
            </button>
          ) : undefined
        }
      >
        {data.supplierBalances.length === 0 ? (
          <EmptyState icon={CreditCard} message="No supplier purchases recorded yet." />
        ) : (
          <div className="grid grid-cols-1 gap-3 px-5 py-5 lg:grid-cols-3">
            {data.supplierBalances.map((supplier) => (
              <article
                key={supplier.supplierId}
                className="rounded-lg p-4"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--admin-border)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{supplier.name}</p>
                    <p className="mt-1 text-[11.5px]" style={{ color: "var(--admin-muted)", opacity: 0.56 }}>
                      {supplier.purchaseCount} purchase{supplier.purchaseCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <StatusPill label={supplier.payable > 0 ? "Open" : "Clear"} tone={supplier.payable > 0 ? "amber" : "green"} />
                </div>
                <div className="mt-4 space-y-2 text-[12px]">
                  <div className="flex justify-between gap-3">
                    <span style={{ color: "var(--admin-muted)", opacity: 0.58 }}>Purchase total</span>
                    <span style={{ color: "var(--admin-white-coffee)" }}>{money(supplier.purchaseTotal)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span style={{ color: "var(--admin-muted)", opacity: 0.58 }}>Paid</span>
                    <span style={{ color: "#8fcf9a" }}>{money(supplier.paid)}</span>
                  </div>
                  <div className="flex justify-between gap-3 pt-2" style={{ borderTop: "1px solid var(--admin-border)" }}>
                    <span className="font-semibold" style={{ color: "var(--admin-white-coffee)" }}>Payable</span>
                    <span className="font-bold" style={{ color: supplier.payable > 0 ? "#e3b673" : "#8fcf9a" }}>{money(supplier.payable)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}

// ── Activity ─────────────────────────────────────────────────────────────────

function ActivityTab({
  data,
  filter,
  onFilter,
  rows,
}: {
  data: AdminAccountingData;
  filter: ActivityFilter;
  onFilter: (value: ActivityFilter) => void;
  rows: AccountingTransaction[];
}) {
  const cashOut = data.refundedTotal + data.operatingExpenses + data.paidToSuppliers;
  const filters: Array<{ key: ActivityFilter; label: string }> = [
    { key: "All", label: "All" },
    { key: "in", label: "Inflow" },
    { key: "out", label: "Outflow" },
    { key: "neutral", label: "Neutral" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <KpiCard label="Collected (In)" value={money(data.paidTotal)} tone="green" icon={ArrowUpRight} />
        <KpiCard label="Cash Out" value={money(cashOut)} caption="Refunds + expenses + supplier payments." tone="red" icon={ArrowDownRight} />
        <KpiCard label="Net Collected" value={money(data.netCollected)} tone="gold" icon={Wallet} />
        <KpiCard label="Returns Logged" value={String(data.returnsCount)} caption={`${fmt(data.restockedKg)} kg restocked.`} tone="blue" icon={Activity} />
      </div>

      <Surface
        title="Recent Transactions"
        caption="Payments, refunds, expenses, purchases, supplier payments, and returns — most recent first. Not a formal journal."
        icon={Activity}
        right={
          <div className="flex flex-wrap gap-2">
            {filters.map((option) => {
              const active = filter === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onFilter(option.key)}
                  aria-pressed={active ? "true" : "false"}
                  className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold"
                  style={{
                    color: active ? "var(--admin-hazelnut)" : "var(--admin-muted)",
                    background: active ? "var(--admin-border)" : "rgba(255,255,255,0.025)",
                    border: active ? "1px solid var(--admin-border-strong)" : "1px solid var(--admin-border)",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        }
      >
        {rows.length === 0 ? (
          <EmptyState icon={Activity} message="No transactions match this filter yet." />
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--admin-border)" }}>
            {rows.map((entry) => {
              const tone = ACTIVITY_TONE[entry.direction];
              const style = TONE_STYLE[tone];
              return (
                <div key={entry.id} className="grid grid-cols-1 gap-3 px-5 py-3.5 md:grid-cols-[0.9fr_1fr_2fr_1fr] md:items-center">
                  <div>
                    <p className="font-mono text-[11.5px]" style={{ color: "var(--admin-muted)", opacity: 0.58 }}>{shortDate(entry.date)}</p>
                    <p className="mt-1"><StatusPill label={KIND_LABEL[entry.kind]} tone={tone} /></p>
                  </div>
                  <p className="text-[12.5px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{entry.label}</p>
                  <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--admin-muted)", opacity: 0.62 }}>{entry.detail}</p>
                  <p className="text-left text-[13px] font-bold md:text-right" style={{ color: style.color }}>
                    {entry.direction === "neutral" ? money(entry.amount) : signedMoney(entry.direction === "in" ? entry.amount : -entry.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Surface>
    </div>
  );
}
