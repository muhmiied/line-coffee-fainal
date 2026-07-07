"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Coffee,
  History,
  Layers3,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Truck,
  X,
} from "lucide-react";
import PackagingInventoryPanel from "@/components/admin/inventory/PackagingInventoryPanel";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";
import {
  adjustFinishedProductStock,
  getAdminInventory,
  type AdminInventoryData,
  type AdminInventoryMovement,
  type AdminInventoryProduct,
  type InventoryStockStatus,
} from "@/lib/admin/admin-inventory";
import {
  adjustEspressoBeanStock,
  listEspressoBeans,
  type AdminEspressoBean,
} from "@/lib/admin/admin-espresso";
import {
  createSupplier,
  listInventoryLots,
  listSuppliers,
  updateSupplier,
  type InventoryLot,
  type Supplier,
  type SupplierInput,
  type SupplierStatus,
} from "@/lib/admin/admin-purchasing";

type Tab = "products" | "beans" | "packaging" | "movements" | "lots" | "suppliers";
type StockTarget =
  | { kind: "product"; item: AdminInventoryProduct }
  | { kind: "bean"; item: AdminEspressoBean };

const EMPTY_DATA: AdminInventoryData = { products: [], movements: [] };

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border p-4 md:p-5"
      style={{ borderColor: "rgba(182,136,94,0.14)", background: "rgba(245,230,216,0.02)" }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--cream)" }}>
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs" style={{ color: "var(--cream-dim)" }}>
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function beanStatus(bean: AdminEspressoBean): InventoryStockStatus {
  if (!bean.stock || bean.stock.availableKg <= 0) return "out";
  return bean.stock.availableKg <= bean.stock.lowStockThresholdKg ? "low" : "ok";
}

function StatusBadge({ status }: { status: InventoryStockStatus }) {
  const config = {
    ok: { label: "OK", color: "#4ade80", bg: "rgba(74,222,128,0.10)" },
    low: { label: "Low", color: "#fbbf24", bg: "rgba(251,191,36,0.10)" },
    out: { label: "Out", color: "#f87171", bg: "rgba(248,113,113,0.10)" },
  }[status];
  return (
    <span
      className="inline-flex rounded-full px-2 py-1 text-[10px] font-semibold"
      style={{ color: config.color, background: config.bg }}
    >
      {config.label}
    </span>
  );
}

// ── Unified Stock Movement modal ────────────────────────────────────────────
// One action replaces the old separate Restock/Adjust: a signed quantity (kg)
// where positive adds stock and negative removes it. Unit cost is only relevant
// when adding. Reason/notes is required. Backed by the FIFO-safe RPCs.
function StockMovementModal({
  target,
  onClose,
  onSaved,
}: {
  target: StockTarget;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { formatNumber, localize, t } = useAdminLanguage();
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const numericQuantity = Number(quantity);
  const isAdding = Number.isFinite(numericQuantity) && numericQuantity > 0;
  const valid =
    Number.isFinite(numericQuantity) && numericQuantity !== 0 && note.trim().length > 0;
  const name = localize({ en: target.item.nameEn, ar: target.item.nameAr }, target.item.nameEn);
  const currentAvailable =
    target.kind === "product" ? target.item.availableKg : target.item.stock?.availableKg ?? 0;
  const projected = Number.isFinite(numericQuantity)
    ? Math.round((currentAvailable + numericQuantity) * 1000) / 1000
    : currentAvailable;

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      const cost = isAdding && unitCost.trim() ? Number(unitCost) : undefined;
      if (target.kind === "product") {
        await adjustFinishedProductStock(target.item.id, numericQuantity, cost, note);
      } else {
        await adjustEspressoBeanStock(target.item.id, numericQuantity, cost, note);
      }
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("Could not save stock movement."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("Close")}
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Stock movement")}
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 rounded-2xl border p-5 shadow-2xl"
        style={{ borderColor: "rgba(182,136,94,0.22)", background: "#130e09" }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-bold" style={{ color: "var(--cream)" }}>
              {t("Stock movement")}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--cream-dim)" }}>
              {name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2" aria-label={t("Close")}>
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--cream-dim)" }}>
              {t("Quantity (kg) — positive adds, negative removes")}
            </span>
            <input
              type="number"
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="5  /  -2.5"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "rgba(182,136,94,0.2)", background: "#0b0806" }}
            />
          </label>
          {isAdding && (
            <label className="block">
              <span className="mb-1.5 block text-xs" style={{ color: "var(--cream-dim)" }}>
                {t("Unit cost (optional, when adding)")}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "rgba(182,136,94,0.2)", background: "#0b0806" }}
              />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--cream-dim)" }}>
              {t("Reason / notes (required)")}
            </span>
            <textarea
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "rgba(182,136,94,0.2)", background: "#0b0806" }}
            />
          </label>
        </div>

        <p className="mt-4 rounded-lg border border-[#B6885E]/12 bg-white/[0.02] px-3 py-2 text-xs" style={{ color: "var(--cream-dim)" }}>
          {t("Available now")}: <span className="tabular-nums" style={{ color: "var(--cream)" }}>{formatNumber(currentAvailable)} kg</span>
          {" → "}
          <span className="tabular-nums" style={{ color: isAdding ? "#4ade80" : numericQuantity < 0 ? "#fbbf24" : "var(--cream)" }}>
            {formatNumber(projected)} kg
          </span>
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-300" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm">
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!valid || saving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"
            style={{ background: "rgba(182,136,94,0.18)", color: "var(--gold)" }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? t("Saving…") : t("Save movement")}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Supplier add/edit modal ─────────────────────────────────────────────────
type SupplierForm = {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  status: SupplierStatus;
};

function SupplierModal({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useAdminLanguage();
  const [form, setForm] = useState<SupplierForm>({
    name: supplier?.name ?? "",
    contactName: supplier?.contactName ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    address: supplier?.address ?? "",
    notes: supplier?.notes ?? "",
    status: supplier?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    if (saving) return;
    if (!form.name.trim()) {
      setError(t("Supplier name is required."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const input: SupplierInput = {
        name: form.name.trim(),
        contactName: form.contactName.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status,
      };
      if (supplier) {
        await updateSupplier(supplier.id, input);
      } else {
        await createSupplier(input);
      }
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("Could not save supplier."));
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
  const fieldStyle = { borderColor: "rgba(182,136,94,0.2)", background: "#0b0806", color: "var(--cream)" };

  return (
    <>
      <button type="button" aria-label={t("Close")} onClick={onClose} className="fixed inset-0 z-40 cursor-default bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={supplier ? t("Edit supplier") : t("Add supplier")}
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 overflow-y-auto rounded-2xl border p-5 shadow-2xl"
        style={{ borderColor: "rgba(182,136,94,0.22)", background: "#130e09", maxHeight: "88vh" }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-serif text-xl font-bold" style={{ color: "var(--cream)" }}>
            {supplier ? t("Edit supplier") : t("Add supplier")}
          </h2>
          <button type="button" onClick={onClose} className="p-2" aria-label={t("Close")}>
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--cream-dim)" }}>{t("Supplier name")}</span>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className={fieldClass} style={fieldStyle} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--cream-dim)" }}>{t("Contact name")}</span>
            <input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} className={fieldClass} style={fieldStyle} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--cream-dim)" }}>{t("Status")}</span>
            <select value={form.status} onChange={(e) => set("status", e.target.value as SupplierStatus)} className={fieldClass} style={fieldStyle}>
              <option value="active">{t("Active")}</option>
              <option value="inactive">{t("Inactive")}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--cream-dim)" }}>{t("Phone")}</span>
            <input dir="ltr" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={fieldClass} style={fieldStyle} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--cream-dim)" }}>{t("Email")}</span>
            <input dir="ltr" value={form.email} onChange={(e) => set("email", e.target.value)} className={fieldClass} style={fieldStyle} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--cream-dim)" }}>{t("Address")}</span>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} className={fieldClass} style={fieldStyle} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--cream-dim)" }}>{t("Notes")}</span>
            <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={`${fieldClass} resize-none`} style={fieldStyle} />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-300" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm">{t("Cancel")}</button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"
            style={{ background: "rgba(182,136,94,0.18)", color: "var(--gold)" }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? t("Saving…") : t("Save supplier")}
          </button>
        </div>
      </div>
    </>
  );
}

export default function InventoryPage() {
  const { formatDate, formatNumber, localize, t } = useAdminLanguage();
  const [tab, setTab] = useState<Tab>("products");
  const [data, setData] = useState<AdminInventoryData>(EMPTY_DATA);
  const [beans, setBeans] = useState<AdminEspressoBean[]>([]);
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [movement, setMovement] = useState<StockTarget | null>(null);
  const [supplierModal, setSupplierModal] = useState<{ supplier: Supplier | null } | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [inventory, nextBeans, nextLots, nextSuppliers] = await Promise.all([
        getAdminInventory(),
        listEspressoBeans(),
        listInventoryLots(),
        listSuppliers(),
      ]);
      setData(inventory);
      setBeans(nextBeans);
      setLots(nextLots);
      setSuppliers(nextSuppliers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("Could not load inventory."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    // Initial client-side admin fetch; load owns its loading/error state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const summary = useMemo(
    () => ({
      available: data.products.reduce((total, product) => total + product.availableKg, 0),
      reserved: data.products.reduce((total, product) => total + product.reservedKg, 0),
      low: data.products.filter((product) => product.status !== "ok").length,
      tracked: data.products.length,
    }),
    [data.products],
  );

  // Latest movement per product (data.movements is already newest-first) — a small
  // "recent movement" hint on each product card.
  const latestMovementByProduct = useMemo(() => {
    const map = new Map<string, AdminInventoryMovement>();
    for (const mv of data.movements) {
      if (!map.has(mv.productId)) map.set(mv.productId, mv);
    }
    return map;
  }, [data.movements]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = data.products.filter((product) =>
    `${product.nameEn} ${product.nameAr} ${product.categoryEn ?? ""} ${product.categoryAr ?? ""}`
      .toLowerCase()
      .includes(normalizedSearch),
  );
  const filteredBeans = beans.filter((bean) =>
    `${bean.nameEn} ${bean.nameAr} ${bean.originEn ?? ""} ${bean.originAr ?? ""}`
      .toLowerCase()
      .includes(normalizedSearch),
  );
  const productById = new Map(data.products.map((product) => [product.id, product]));
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

  const tabs: Array<{ id: Tab; label: string; icon: ReactNode }> = [
    { id: "products", label: t("Finished Products"), icon: <Boxes size={14} /> },
    { id: "beans", label: t("Espresso Beans"), icon: <Coffee size={14} /> },
    { id: "packaging", label: t("Packaging"), icon: <Layers3 size={14} /> },
    { id: "movements", label: t("Stock Movements"), icon: <History size={14} /> },
    { id: "lots", label: t("FIFO Lots"), icon: <PackagePlus size={14} /> },
    { id: "suppliers", label: t("Suppliers"), icon: <Truck size={14} /> },
  ];

  async function saved() {
    await load(true);
    setSuccess(t("Stock updated and persisted."));
    window.setTimeout(() => setSuccess(""), 3000);
  }

  async function supplierSaved() {
    await load(true);
    setSuccess(t("Supplier saved."));
    window.setTimeout(() => setSuccess(""), 3000);
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--gold)" }}>
            {t("Operations")}
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold md:text-3xl" style={{ color: "var(--cream)" }}>
            {t("Inventory")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--cream-dim)" }}>
            {t("Live Supabase stock, FIFO lots, movements, beans, packaging, and suppliers.")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
          style={{ borderColor: "rgba(182,136,94,0.16)", color: "var(--cream-dim)" }}
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : undefined} />
          {t("Refresh")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [t("KG available"), formatNumber(Math.round(summary.available * 1000) / 1000), "#4ade80"],
          [t("KG reserved"), formatNumber(Math.round(summary.reserved * 1000) / 1000), "#93c5fd"],
          [t("Low / out"), formatNumber(summary.low), "#fbbf24"],
          [t("Products tracked"), formatNumber(summary.tracked), "var(--gold)"],
        ].map(([label, value, color]) => (
          <div key={label} className="admin-kpi-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)" }}>
              {label}
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className="flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
            style={{
              borderColor: tab === item.id ? "rgba(182,136,94,0.32)" : "rgba(182,136,94,0.10)",
              background: tab === item.id ? "rgba(182,136,94,0.12)" : "transparent",
              color: tab === item.id ? "var(--gold)" : "var(--cream-dim)",
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {success && (
        <p className="flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2 text-xs text-green-300" role="status">
          <CheckCircle2 size={14} />
          {success}
        </p>
      )}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-300" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void load()}>{t("Try again")}</button>
        </div>
      )}

      {(tab === "products" || tab === "beans") && (
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--cream-dim)" }} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Search inventory")}
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
            style={{ borderColor: "rgba(182,136,94,0.14)", background: "rgba(255,255,255,0.025)" }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex min-h-56 items-center justify-center">
          <Loader2 className="animate-spin" style={{ color: "var(--gold)" }} />
        </div>
      ) : (
        <>
          {tab === "products" && (
            <Panel
              title={t("Finished-product stock")}
              description={t("Every value below comes from inventory_stock; movements update FIFO lots and inventory_movements atomically.")}
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => {
                  const recent = latestMovementByProduct.get(product.id);
                  return (
                    <article key={product.id} className="flex flex-col rounded-xl border border-[#B6885E]/12 bg-white/[0.02] p-4">
                      <div className="flex items-start gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg" style={{ background: "rgba(182,136,94,0.07)" }}>
                          <Image src={product.imageUrl} alt={product.nameEn} fill sizes="56px" className="object-contain p-1.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-[#F5E6D8]">{localize({ en: product.nameEn, ar: product.nameAr })}</h3>
                          <p className="mt-0.5 truncate text-[11px] text-[#B79B85]">
                            {localize({ en: product.categoryEn, ar: product.categoryAr }, "—")}
                          </p>
                        </div>
                        <StatusBadge status={product.status} />
                      </div>

                      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <div><dt className="text-[#B79B85]">{t("Available")}</dt><dd className="mt-1 font-semibold tabular-nums">{formatNumber(product.availableKg)} kg</dd></div>
                        <div><dt className="text-[#B79B85]">{t("Reserved")}</dt><dd className="mt-1 font-semibold tabular-nums text-[#93c5fd]">{formatNumber(product.reservedKg)} kg</dd></div>
                        <div><dt className="text-[#B79B85]">{t("Threshold")}</dt><dd className="mt-1 font-semibold tabular-nums">{formatNumber(product.lowStockThresholdKg)} kg</dd></div>
                      </dl>

                      {recent && (
                        <p className="mt-3 truncate text-[10.5px] text-[#B79B85]">
                          {t("Last")}: {t(recent.movementType.replaceAll("_", " "))} · {recent.direction === "in" ? "+" : recent.direction === "out" ? "−" : ""}{formatNumber(recent.quantityKg)} kg · {formatDate(recent.createdAt, { dateStyle: "medium" })}
                        </p>
                      )}

                      <div className="mt-4 flex-1" />
                      <button
                        type="button"
                        onClick={() => setMovement({ kind: "product", item: product })}
                        className="flex items-center justify-center gap-2 rounded-lg bg-[#B6885E]/12 px-3 py-2 text-xs font-semibold text-[#D6A373]"
                      >
                        <PackagePlus size={13} /> {t("Stock movement")}
                      </button>
                    </article>
                  );
                })}
              </div>
              {filteredProducts.length === 0 && <p className="py-10 text-center text-sm text-[#B79B85]">{t("No products found.")}</p>}
            </Panel>
          )}

          {tab === "beans" && (
            <Panel
              title={t("Espresso bean stock")}
              description={t("Real raw-bean stock used by Make Your Espresso checkout and FIFO allocation.")}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredBeans.map((bean) => (
                  <article key={bean.id} className="rounded-xl border border-[#B6885E]/10 bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-[#F5E6D8]">{localize({ en: bean.nameEn, ar: bean.nameAr })}</h3>
                        <p className="mt-1 text-xs text-[#B79B85]">{localize({ en: bean.originEn, ar: bean.originAr }, bean.family)}</p>
                      </div>
                      <StatusBadge status={beanStatus(bean)} />
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div><dt className="text-[#B79B85]">{t("Available")}</dt><dd className="mt-1 font-semibold">{formatNumber(bean.stock?.availableKg ?? 0)} kg</dd></div>
                      <div><dt className="text-[#B79B85]">{t("Reserved")}</dt><dd className="mt-1 font-semibold">{formatNumber(bean.stock?.reservedKg ?? 0)} kg</dd></div>
                      <div><dt className="text-[#B79B85]">{t("Threshold")}</dt><dd className="mt-1 font-semibold">{formatNumber(bean.stock?.lowStockThresholdKg ?? 0)} kg</dd></div>
                    </dl>
                    <div className="mt-4">
                      <button type="button" onClick={() => setMovement({ kind: "bean", item: bean })} className="flex items-center justify-center gap-2 rounded-lg bg-[#B6885E]/12 px-3 py-2 text-xs font-semibold text-[#D6A373]">
                        <PackagePlus size={13} /> {t("Stock movement")}
                      </button>
                    </div>
                  </article>
                ))}
                {filteredBeans.length === 0 && <p className="py-10 text-center text-sm text-[#B79B85]">{t("No beans found.")}</p>}
              </div>
            </Panel>
          )}

          {tab === "packaging" && <PackagingInventoryPanel />}

          {tab === "movements" && (
            <Panel title={t("Recent stock movements")} description={t("Real inventory_movements ledger; no generated rows.")}>
              <div className="space-y-2">
                {data.movements.map((mv) => (
                  <div key={mv.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-[#B6885E]/8 bg-white/[0.02] px-3 py-3 text-xs">
                    <div className="min-w-52 flex-1">
                      <p className="font-semibold">{localize({ en: mv.productNameEn, ar: mv.productNameAr })}</p>
                      <p className="mt-1 text-[#B79B85]">{formatDate(mv.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                    <span className="rounded-full bg-white/5 px-2 py-1 text-[#D6A373]">{t(mv.movementType.replaceAll("_", " "))}</span>
                    <span className={mv.direction === "in" ? "text-green-300" : mv.direction === "out" ? "text-red-300" : "text-blue-300"}>
                      {mv.direction === "in" ? "+" : mv.direction === "out" ? "−" : ""}{formatNumber(mv.quantityKg)} kg
                    </span>
                    {mv.reason && <p className="w-full text-[#B79B85]">{mv.reason}</p>}
                  </div>
                ))}
                {data.movements.length === 0 && <p className="py-10 text-center text-sm text-[#B79B85]">{t("No movements recorded.")}</p>}
              </div>
            </Panel>
          )}

          {tab === "lots" && (
            <Panel title={t("FIFO lots")} description={t("Real inventory_lots balances. Cost data remains admin-only.")}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-sm">
                  <thead><tr className="border-b border-[#B6885E]/10 text-left text-[10px] uppercase tracking-wider text-[#B79B85]">
                    {[t("Product"), t("Received"), t("Remaining"), t("Reserved"), t("Available"), t("Source"), t("Supplier"), t("Date")].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}
                  </tr></thead>
                  <tbody>
                    {lots.slice().reverse().slice(0, 200).map((lot) => {
                      const product = productById.get(lot.productId);
                      return (
                        <tr key={lot.id} className="border-b border-[#B6885E]/5">
                          <td className="px-3 py-3">{product ? localize({ en: product.nameEn, ar: product.nameAr }) : t("Product")}</td>
                          <td className="px-3 py-3 tabular-nums">{formatNumber(lot.receivedQtyKg)} kg</td>
                          <td className="px-3 py-3 tabular-nums">{formatNumber(lot.remainingQtyKg)} kg</td>
                          <td className="px-3 py-3 tabular-nums">{formatNumber(lot.reservedQtyKg)} kg</td>
                          <td className="px-3 py-3 tabular-nums text-green-300">{formatNumber(lot.availableQtyKg)} kg</td>
                          <td className="px-3 py-3 text-[#B79B85]">{t(lot.source)}</td>
                          <td className="px-3 py-3 text-[#B79B85]">{lot.supplierId ? supplierById.get(lot.supplierId)?.name ?? "—" : "—"}</td>
                          <td className="px-3 py-3 text-[#B79B85]">{formatDate(lot.receivedDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {tab === "suppliers" && (
            <Panel
              title={t("Suppliers")}
              description={t("Real supplier records. Purchases and payments stay in Accounting.")}
              action={
                <button
                  type="button"
                  onClick={() => setSupplierModal({ supplier: null })}
                  className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
                  style={{ background: "rgba(182,136,94,0.15)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.3)" }}
                >
                  <Plus size={13} /> {t("Add supplier")}
                </button>
              }
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {suppliers.map((supplier) => (
                  <article key={supplier.id} className="rounded-xl border border-[#B6885E]/10 bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold">{supplier.name}</h3>
                      <span className={supplier.status === "active" ? "text-xs text-green-300" : "text-xs text-[#B79B85]"}>{supplier.status === "active" ? t("Active") : t("Inactive")}</span>
                    </div>
                    <p className="mt-3 text-xs text-[#B79B85]">{supplier.contactName || t("No contact name")}</p>
                    <p className="mt-1 text-xs text-[#B79B85]" dir="ltr">{supplier.phone || supplier.email || t("No contact details")}</p>
                    <button
                      type="button"
                      onClick={() => setSupplierModal({ supplier })}
                      className="mt-4 flex items-center gap-2 rounded-lg bg-[#B6885E]/10 px-3 py-1.5 text-xs font-semibold text-[#D6A373]"
                    >
                      <Pencil size={12} /> {t("Edit")}
                    </button>
                  </article>
                ))}
                {suppliers.length === 0 && (
                  <p className="text-sm text-[#B79B85]">{t("No suppliers yet. Add your first supplier to start tracking purchases.")}</p>
                )}
              </div>
            </Panel>
          )}
        </>
      )}

      {summary.low > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300/15 bg-amber-300/5 px-4 py-3 text-xs text-amber-100">
          <AlertTriangle size={16} />
          {t("Low-stock status is calculated from each real threshold and available balance.")}
        </div>
      )}

      {movement && (
        <StockMovementModal
          target={movement}
          onClose={() => setMovement(null)}
          onSaved={saved}
        />
      )}

      {supplierModal && (
        <SupplierModal
          supplier={supplierModal.supplier}
          onClose={() => setSupplierModal(null)}
          onSaved={supplierSaved}
        />
      )}
    </div>
  );
}
