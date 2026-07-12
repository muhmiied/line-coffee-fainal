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
const fieldLabelClass = "admin-label mb-1.5 block !text-[11px] !normal-case !tracking-normal";

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
    <section className="admin-surface p-4 md:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="admin-card-title">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs admin-muted">
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
    ok: { label: "OK", color: "#8fcf9a", bg: "rgba(74,222,128,0.10)" },
    low: { label: "Low", color: "#e3b673", bg: "rgba(251,191,36,0.10)" },
    out: { label: "Out", color: "#e39a8c", bg: "rgba(248,113,113,0.10)" },
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
        className="admin-modal-overlay fixed inset-0 z-40 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Stock movement")}
        className="admin-modal-surface fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 rounded-2xl p-5"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-bold" style={{ color: "var(--admin-heading)" }}>
              {t("Stock movement")}
            </h2>
            <p className="mt-1 text-sm admin-muted">
              {name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="admin-btn admin-btn-sm !p-2" aria-label={t("Close")}>
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={fieldLabelClass}>
              {t("Quantity (kg) — positive adds, negative removes")}
            </span>
            <input
              type="number"
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="5  /  -2.5"
              className="admin-input !text-sm"
            />
          </label>
          {isAdding && (
            <label className="block">
              <span className={fieldLabelClass}>
                {t("Unit cost (optional, when adding)")}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                className="admin-input !text-sm"
              />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className={fieldLabelClass}>
              {t("Reason / notes (required)")}
            </span>
            <textarea
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="admin-textarea !resize-none !text-sm"
            />
          </label>
        </div>

        <p className="admin-surface !shadow-none mt-4 px-3 py-2 text-xs admin-muted">
          {t("Available now")}: <span className="tabular-nums" style={{ color: "var(--admin-white-coffee)" }}>{formatNumber(currentAvailable)} kg</span>
          {" → "}
          <span className="tabular-nums" style={{ color: isAdding ? "#8fcf9a" : numericQuantity < 0 ? "#e3b673" : "var(--admin-white-coffee)" }}>
            {formatNumber(projected)} kg
          </span>
        </p>

        {error && (
          <p className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(227,154,140,0.10)", color: "#eeb4a8" }} role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="admin-btn !px-4 !py-2 !text-sm">
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!valid || saving}
            className="admin-btn admin-btn-primary flex items-center gap-2 !px-4 !py-2 !text-sm"
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

  return (
    <>
      <button type="button" aria-label={t("Close")} onClick={onClose} className="admin-modal-overlay fixed inset-0 z-40 cursor-default" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={supplier ? t("Edit supplier") : t("Add supplier")}
        className="admin-modal-surface fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 overflow-y-auto rounded-2xl p-5"
        style={{ maxHeight: "88vh" }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-serif text-xl font-bold" style={{ color: "var(--admin-heading)" }}>
            {supplier ? t("Edit supplier") : t("Add supplier")}
          </h2>
          <button type="button" onClick={onClose} className="admin-btn admin-btn-sm !p-2" aria-label={t("Close")}>
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={fieldLabelClass}>{t("Supplier name")}</span>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className="admin-input !text-sm" />
          </label>
          <label className="block">
            <span className={fieldLabelClass}>{t("Contact name")}</span>
            <input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} className="admin-input !text-sm" />
          </label>
          <label className="block">
            <span className={fieldLabelClass}>{t("Status")}</span>
            <select value={form.status} onChange={(e) => set("status", e.target.value as SupplierStatus)} className="admin-select !text-sm">
              <option value="active">{t("Active")}</option>
              <option value="inactive">{t("Inactive")}</option>
            </select>
          </label>
          <label className="block">
            <span className={fieldLabelClass}>{t("Phone")}</span>
            <input dir="ltr" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="admin-input !text-sm" />
          </label>
          <label className="block">
            <span className={fieldLabelClass}>{t("Email")}</span>
            <input dir="ltr" value={form.email} onChange={(e) => set("email", e.target.value)} className="admin-input !text-sm" />
          </label>
          <label className="block sm:col-span-2">
            <span className={fieldLabelClass}>{t("Address")}</span>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} className="admin-input !text-sm" />
          </label>
          <label className="block sm:col-span-2">
            <span className={fieldLabelClass}>{t("Notes")}</span>
            <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="admin-textarea !resize-none !text-sm" />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(227,154,140,0.10)", color: "#eeb4a8" }} role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="admin-btn !px-4 !py-2 !text-sm">{t("Cancel")}</button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="admin-btn admin-btn-primary flex items-center gap-2 !px-4 !py-2 !text-sm"
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
          <p className="admin-label !text-[11px]" style={{ color: "var(--admin-hazelnut)" }}>
            {t("Operations")}
          </p>
          <h1 className="admin-page-title mt-1 !text-2xl md:!text-3xl">
            {t("Inventory")}
          </h1>
          <p className="admin-page-subtitle">
            {t("Live Supabase stock, FIFO lots, movements, beans, packaging, and suppliers.")}
          </p>
        </div>
        <button type="button" onClick={() => void load(true)} disabled={refreshing} className="admin-btn flex items-center gap-2 !px-3 !py-2 !text-xs">
          <RefreshCw size={13} className={refreshing ? "animate-spin" : undefined} />
          {t("Refresh")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [t("KG available"), formatNumber(Math.round(summary.available * 1000) / 1000), "#8fcf9a"],
          [t("KG reserved"), formatNumber(Math.round(summary.reserved * 1000) / 1000), "#b7cbe6"],
          [t("Low / out"), formatNumber(summary.low), "#e3b673"],
          [t("Products tracked"), formatNumber(summary.tracked), "var(--admin-hazelnut)"],
        ].map(([label, value, color]) => (
          <div key={label} className="admin-kpi-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-muted)" }}>
              {label}
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="admin-tabs overflow-x-auto pb-1 flex-nowrap">
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`admin-tab shrink-0 !px-3 !py-2 !text-xs${active ? " admin-tab-active" : ""}`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {success && (
        <p className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(143,207,154,0.10)", color: "#8fcf9a" }} role="status">
          <CheckCircle2 size={14} />
          {success}
        </p>
      )}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(227,154,140,0.10)", color: "#eeb4a8" }} role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="admin-link">{t("Try again")}</button>
        </div>
      )}

      {(tab === "products" || tab === "beans") && (
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 admin-faint" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Search inventory")}
            className="admin-input w-full !py-2 !pl-9 !pr-3 !text-sm"
          />
        </div>
      )}

      {loading ? (
        <div className="flex min-h-56 items-center justify-center">
          <Loader2 className="animate-spin" style={{ color: "var(--admin-hazelnut)" }} />
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
                    <article key={product.id} className="admin-card flex flex-col !p-4">
                      <div className="flex items-start gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg" style={{ background: "var(--admin-border)" }}>
                          <Image src={product.imageUrl} alt={product.nameEn} fill sizes="56px" className="object-contain p-1.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold admin-text">{localize({ en: product.nameEn, ar: product.nameAr })}</h3>
                          <p className="mt-0.5 truncate text-[11px] admin-faint">
                            {localize({ en: product.categoryEn, ar: product.categoryAr }, "—")}
                          </p>
                        </div>
                        <StatusBadge status={product.status} />
                      </div>

                      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <div><dt className="admin-faint">{t("Available")}</dt><dd className="mt-1 font-semibold tabular-nums admin-text">{formatNumber(product.availableKg)} kg</dd></div>
                        <div><dt className="admin-faint">{t("Reserved")}</dt><dd className="mt-1 font-semibold tabular-nums" style={{ color: "#8fb0d9" }}>{formatNumber(product.reservedKg)} kg</dd></div>
                        <div><dt className="admin-faint">{t("Threshold")}</dt><dd className="mt-1 font-semibold tabular-nums admin-text">{formatNumber(product.lowStockThresholdKg)} kg</dd></div>
                      </dl>

                      {recent && (
                        <p className="mt-3 truncate text-[10.5px] admin-faint">
                          {t("Last")}: {t(recent.movementType.replaceAll("_", " "))} · {recent.direction === "in" ? "+" : recent.direction === "out" ? "−" : ""}{formatNumber(recent.quantityKg)} kg · {formatDate(recent.createdAt, { dateStyle: "medium" })}
                        </p>
                      )}

                      <div className="mt-4 flex-1" />
                      <button
                        type="button"
                        onClick={() => setMovement({ kind: "product", item: product })}
                        className="admin-btn admin-btn-primary flex items-center justify-center gap-2 !py-2 !text-xs"
                      >
                        <PackagePlus size={13} /> {t("Stock movement")}
                      </button>
                    </article>
                  );
                })}
              </div>
              {filteredProducts.length === 0 && (
                <div className="admin-empty-state">
                  <p className="text-sm admin-muted">{t("No products found.")}</p>
                </div>
              )}
            </Panel>
          )}

          {tab === "beans" && (
            <Panel
              title={t("Espresso bean stock")}
              description={t("Real raw-bean stock used by Make Your Espresso checkout and FIFO allocation.")}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredBeans.map((bean) => (
                  <article key={bean.id} className="admin-card !p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold admin-text">{localize({ en: bean.nameEn, ar: bean.nameAr })}</h3>
                        <p className="mt-1 text-xs admin-faint">{localize({ en: bean.originEn, ar: bean.originAr }, bean.family)}</p>
                      </div>
                      <StatusBadge status={beanStatus(bean)} />
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div><dt className="admin-faint">{t("Available")}</dt><dd className="mt-1 font-semibold admin-text">{formatNumber(bean.stock?.availableKg ?? 0)} kg</dd></div>
                      <div><dt className="admin-faint">{t("Reserved")}</dt><dd className="mt-1 font-semibold admin-text">{formatNumber(bean.stock?.reservedKg ?? 0)} kg</dd></div>
                      <div><dt className="admin-faint">{t("Threshold")}</dt><dd className="mt-1 font-semibold admin-text">{formatNumber(bean.stock?.lowStockThresholdKg ?? 0)} kg</dd></div>
                    </dl>
                    <div className="mt-4">
                      <button type="button" onClick={() => setMovement({ kind: "bean", item: bean })} className="admin-btn admin-btn-primary flex items-center justify-center gap-2 !py-2 !text-xs">
                        <PackagePlus size={13} /> {t("Stock movement")}
                      </button>
                    </div>
                  </article>
                ))}
                {filteredBeans.length === 0 && (
                  <div className="admin-empty-state col-span-full">
                    <p className="text-sm admin-muted">{t("No beans found.")}</p>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {tab === "packaging" && <PackagingInventoryPanel />}

          {tab === "movements" && (
            <Panel title={t("Recent stock movements")} description={t("Real inventory_movements ledger; no generated rows.")}>
              <div className="space-y-2">
                {data.movements.map((mv) => (
                  <div key={mv.id} className="admin-surface !shadow-none flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 text-xs">
                    <div className="min-w-52 flex-1">
                      <p className="font-semibold admin-text">{localize({ en: mv.productNameEn, ar: mv.productNameAr })}</p>
                      <p className="mt-1 admin-faint">{formatDate(mv.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                    <span className="admin-badge admin-badge-neutral">{t(mv.movementType.replaceAll("_", " "))}</span>
                    <span style={{ color: mv.direction === "in" ? "#8fcf9a" : mv.direction === "out" ? "#e39a8c" : "#8fb0d9" }}>
                      {mv.direction === "in" ? "+" : mv.direction === "out" ? "−" : ""}{formatNumber(mv.quantityKg)} kg
                    </span>
                    {mv.reason && <p className="w-full admin-faint">{mv.reason}</p>}
                  </div>
                ))}
                {data.movements.length === 0 && (
                  <div className="admin-empty-state">
                    <p className="text-sm admin-muted">{t("No movements recorded.")}</p>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {tab === "lots" && (
            <Panel title={t("FIFO lots")} description={t("Real inventory_lots balances. Cost data remains admin-only.")}>
              <div className="admin-table-wrap overflow-x-auto">
                <table className="admin-table w-full min-w-[850px]">
                  <thead><tr>
                    {[t("Product"), t("Received"), t("Remaining"), t("Reserved"), t("Available"), t("Source"), t("Supplier"), t("Date")].map((heading) => <th key={heading}>{heading}</th>)}
                  </tr></thead>
                  <tbody>
                    {lots.slice().reverse().slice(0, 200).map((lot) => {
                      const product = productById.get(lot.productId);
                      return (
                        <tr key={lot.id}>
                          <td className="admin-td-strong">{product ? localize({ en: product.nameEn, ar: product.nameAr }) : t("Product")}</td>
                          <td className="admin-table-numeric">{formatNumber(lot.receivedQtyKg)} kg</td>
                          <td className="admin-table-numeric">{formatNumber(lot.remainingQtyKg)} kg</td>
                          <td className="admin-table-numeric">{formatNumber(lot.reservedQtyKg)} kg</td>
                          <td className="admin-table-numeric" style={{ color: "#8fcf9a" }}>{formatNumber(lot.availableQtyKg)} kg</td>
                          <td className="admin-faint">{t(lot.source)}</td>
                          <td className="admin-faint">{lot.supplierId ? supplierById.get(lot.supplierId)?.name ?? "—" : "—"}</td>
                          <td className="admin-faint">{formatDate(lot.receivedDate)}</td>
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
                  className="admin-btn admin-btn-primary flex shrink-0 items-center gap-2 !px-3 !py-2 !text-xs"
                >
                  <Plus size={13} /> {t("Add supplier")}
                </button>
              }
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {suppliers.map((supplier) => (
                  <article key={supplier.id} className="admin-card !p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold admin-text">{supplier.name}</h3>
                      <span className="admin-badge" style={supplier.status === "active" ? { color: "#8fcf9a", background: "rgba(143,207,154,0.12)" } : { color: "var(--admin-faint)", background: "rgb(227 210 184 / 0.06)" }}>
                        {supplier.status === "active" ? t("Active") : t("Inactive")}
                      </span>
                    </div>
                    <p className="mt-3 text-xs admin-faint">{supplier.contactName || t("No contact name")}</p>
                    <p className="mt-1 text-xs admin-faint" dir="ltr">{supplier.phone || supplier.email || t("No contact details")}</p>
                    <button
                      type="button"
                      onClick={() => setSupplierModal({ supplier })}
                      className="admin-btn admin-btn-sm mt-4 flex items-center gap-2"
                    >
                      <Pencil size={12} /> {t("Edit")}
                    </button>
                  </article>
                ))}
                {suppliers.length === 0 && (
                  <div className="admin-empty-state col-span-full">
                    <p className="text-sm admin-muted">{t("No suppliers yet. Add your first supplier to start tracking purchases.")}</p>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </>
      )}

      {summary.low > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(227,182,115,0.08)", border: "1px solid rgba(227,182,115,0.24)", color: "#e3b673" }}>
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
