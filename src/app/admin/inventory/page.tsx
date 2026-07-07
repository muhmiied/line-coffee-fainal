"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Coffee,
  History,
  Layers3,
  Loader2,
  PackagePlus,
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
  type AdminInventoryProduct,
  type InventoryStockStatus,
} from "@/lib/admin/admin-inventory";
import {
  adjustEspressoBeanStock,
  listEspressoBeans,
  type AdminEspressoBean,
} from "@/lib/admin/admin-espresso";
import {
  listInventoryLots,
  listSuppliers,
  type InventoryLot,
  type Supplier,
} from "@/lib/admin/admin-purchasing";

type Tab = "products" | "beans" | "packaging" | "movements" | "lots" | "suppliers";
type StockTarget =
  | { kind: "product"; item: AdminInventoryProduct }
  | { kind: "bean"; item: AdminEspressoBean };

const EMPTY_DATA: AdminInventoryData = { products: [], movements: [] };

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border p-4 md:p-5"
      style={{ borderColor: "rgba(182,136,94,0.14)", background: "rgba(245,230,216,0.02)" }}
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--cream)" }}>
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs" style={{ color: "var(--cream-dim)" }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
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

function StockAdjustmentModal({
  target,
  mode,
  onClose,
  onSaved,
}: {
  target: StockTarget;
  mode: "restock" | "adjust";
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { localize, t } = useAdminLanguage();
  const [quantity, setQuantity] = useState(mode === "restock" ? "1" : "");
  const [unitCost, setUnitCost] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const numericQuantity = Number(quantity);
  const delta = mode === "restock" ? Math.abs(numericQuantity) : numericQuantity;
  const valid = Number.isFinite(delta) && delta !== 0 && note.trim().length > 0;
  const name = localize(
    { en: target.item.nameEn, ar: target.item.nameAr },
    target.item.nameEn,
  );

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      const cost = unitCost.trim() ? Number(unitCost) : undefined;
      if (target.kind === "product") {
        await adjustFinishedProductStock(target.item.id, delta, cost, note);
      } else {
        await adjustEspressoBeanStock(target.item.id, delta, cost, note);
      }
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("Could not update stock."));
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
        aria-label={mode === "restock" ? t("Restock") : t("Adjust stock")}
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 rounded-2xl border p-5 shadow-2xl"
        style={{ borderColor: "rgba(182,136,94,0.22)", background: "#130e09" }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-bold" style={{ color: "var(--cream)" }}>
              {mode === "restock" ? t("Restock") : t("Adjust stock")}
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
              {mode === "restock" ? t("Quantity to add (kg)") : t("Signed quantity (kg)")}
            </span>
            <input
              type="number"
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder={mode === "restock" ? "5" : "-2.5"}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "rgba(182,136,94,0.2)", background: "#0b0806" }}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--cream-dim)" }}>
              {t("Unit cost (optional)")}
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
            {saving ? t("Saving…") : t("Save Changes")}
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
  const [adjustment, setAdjustment] = useState<{
    target: StockTarget;
    mode: "restock" | "adjust";
  } | null>(null);

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
              description={t("Every value below comes from inventory_stock; writes update FIFO lots and inventory_movements atomically.")}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-[#B6885E]/10 text-left text-[10px] uppercase tracking-wider text-[#B79B85]">
                      {[t("Product"), t("Category"), t("Available"), t("Reserved"), t("On hand"), t("Low threshold"), t("Status"), t("Actions")].map((heading) => (
                        <th key={heading} className="px-3 py-3">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b border-[#B6885E]/5">
                        <td className="px-3 py-3">
                          <p className="font-medium text-[#F5E6D8]">{localize({ en: product.nameEn, ar: product.nameAr })}</p>
                          <p className="text-[10px] text-[#B79B85]">{product.slug}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-[#B79B85]">
                          {localize({ en: product.categoryEn, ar: product.categoryAr }, "—")}
                        </td>
                        <td className="px-3 py-3 font-semibold tabular-nums">{formatNumber(product.availableKg)} kg</td>
                        <td className="px-3 py-3 tabular-nums text-[#93c5fd]">{formatNumber(product.reservedKg)} kg</td>
                        <td className="px-3 py-3 tabular-nums">{formatNumber(product.onHandKg)} kg</td>
                        <td className="px-3 py-3 tabular-nums text-[#B79B85]">{formatNumber(product.lowStockThresholdKg)} kg</td>
                        <td className="px-3 py-3"><StatusBadge status={product.status} /></td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setAdjustment({ target: { kind: "product", item: product }, mode: "restock" })} className="rounded-md bg-green-400/10 px-2.5 py-1.5 text-xs text-green-300">
                              {t("Restock")}
                            </button>
                            <button type="button" onClick={() => setAdjustment({ target: { kind: "product", item: product }, mode: "adjust" })} className="rounded-md bg-amber-300/10 px-2.5 py-1.5 text-xs text-amber-200">
                              {t("Adjust")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProducts.length === 0 && <p className="py-10 text-center text-sm text-[#B79B85]">{t("No products found.")}</p>}
              </div>
            </Panel>
          )}

          {tab === "beans" && (
            <Panel
              title={t("Espresso bean stock")}
              description={t("Real raw-bean stock used by Make Your Espresso checkout and FIFO allocation.")}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredBeans.map((bean) => {
                  const status: InventoryStockStatus = !bean.stock || bean.stock.availableKg <= 0
                    ? "out"
                    : bean.stock.availableKg <= bean.stock.lowStockThresholdKg ? "low" : "ok";
                  return (
                    <article key={bean.id} className="rounded-xl border border-[#B6885E]/10 bg-white/[0.02] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-[#F5E6D8]">{localize({ en: bean.nameEn, ar: bean.nameAr })}</h3>
                          <p className="mt-1 text-xs text-[#B79B85]">{localize({ en: bean.originEn, ar: bean.originAr }, bean.family)}</p>
                        </div>
                        <StatusBadge status={status} />
                      </div>
                      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <div><dt className="text-[#B79B85]">{t("Available")}</dt><dd className="mt-1 font-semibold">{formatNumber(bean.stock?.availableKg ?? 0)} kg</dd></div>
                        <div><dt className="text-[#B79B85]">{t("Reserved")}</dt><dd className="mt-1 font-semibold">{formatNumber(bean.stock?.reservedKg ?? 0)} kg</dd></div>
                        <div><dt className="text-[#B79B85]">{t("Threshold")}</dt><dd className="mt-1 font-semibold">{formatNumber(bean.stock?.lowStockThresholdKg ?? 0)} kg</dd></div>
                      </dl>
                      <div className="mt-4 flex gap-2">
                        <button type="button" onClick={() => setAdjustment({ target: { kind: "bean", item: bean }, mode: "restock" })} className="rounded-md bg-green-400/10 px-2.5 py-1.5 text-xs text-green-300">{t("Restock")}</button>
                        <button type="button" onClick={() => setAdjustment({ target: { kind: "bean", item: bean }, mode: "adjust" })} className="rounded-md bg-amber-300/10 px-2.5 py-1.5 text-xs text-amber-200">{t("Adjust")}</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Panel>
          )}

          {tab === "packaging" && <PackagingInventoryPanel />}

          {tab === "movements" && (
            <Panel title={t("Recent stock movements")} description={t("Real inventory_movements ledger; no generated rows.")}>
              <div className="space-y-2">
                {data.movements.map((movement) => (
                  <div key={movement.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-[#B6885E]/8 bg-white/[0.02] px-3 py-3 text-xs">
                    <div className="min-w-52 flex-1">
                      <p className="font-semibold">{localize({ en: movement.productNameEn, ar: movement.productNameAr })}</p>
                      <p className="mt-1 text-[#B79B85]">{formatDate(movement.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                    <span className="rounded-full bg-white/5 px-2 py-1 text-[#D6A373]">{t(movement.movementType.replaceAll("_", " "))}</span>
                    <span className={movement.direction === "in" ? "text-green-300" : movement.direction === "out" ? "text-red-300" : "text-blue-300"}>
                      {movement.direction === "in" ? "+" : movement.direction === "out" ? "−" : ""}{formatNumber(movement.quantityKg)} kg
                    </span>
                    {movement.reason && <p className="w-full text-[#B79B85]">{movement.reason}</p>}
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
            <Panel title={t("Suppliers")} description={t("Real supplier records. Purchasing actions remain in Accounting.")}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {suppliers.map((supplier) => (
                  <article key={supplier.id} className="rounded-xl border border-[#B6885E]/10 bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold">{supplier.name}</h3>
                      <span className={supplier.status === "active" ? "text-xs text-green-300" : "text-xs text-[#B79B85]"}>{t(supplier.status)}</span>
                    </div>
                    <p className="mt-3 text-xs text-[#B79B85]">{supplier.contactName || t("No contact name")}</p>
                    <p className="mt-1 text-xs text-[#B79B85]" dir="ltr">{supplier.phone || supplier.email || t("No contact details")}</p>
                  </article>
                ))}
                {suppliers.length === 0 && <p className="text-sm text-[#B79B85]">{t("No suppliers recorded.")}</p>}
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

      {adjustment && (
        <StockAdjustmentModal
          target={adjustment.target}
          mode={adjustment.mode}
          onClose={() => setAdjustment(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}
