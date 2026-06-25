"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Package, Boxes, AlertTriangle, TrendingDown, ArrowUp, ArrowDown,
  Plus, X, Check, ChevronDown, Phone, MessageCircle, Star, RefreshCw,
  History, ShoppingCart, Settings2, Flame, RotateCcw, MinusCircle,
  Edit2, Archive, Save, Leaf, PackagePlus,
} from "lucide-react";
import {
  FINISHED_PRODUCTS, ESPRESSO_BEANS, PACKAGING_ITEMS, SUPPLIERS, STOCK_MOVEMENTS,
  getStatus, productWorstStatus, productValue, beanValue, CATEGORY_LABEL,
  type FinishedProduct, type EspressoBean, type PackagingItem, type Supplier,
  type StockMovement, type MovementType, type ItemType, type StockStatus,
} from "@/lib/mock-data/admin/inventory-mock";
import { getAdminDisplayName } from "@/lib/auth/admin";
import { useCurrentAdmin } from "@/lib/hooks/useCurrentAdmin";

// ── Types ─────────────────────────────────────────────────────────────────────

type RestockTarget =
  | { kind: "finished";  product: FinishedProduct }
  | { kind: "bean";      bean: EspressoBean }
  | { kind: "packaging"; item: PackagingItem };

type AdjustTarget =
  | { kind: "finished";  product: FinishedProduct }
  | { kind: "bean";      bean: EspressoBean }
  | { kind: "packaging"; item: PackagingItem };

type MovItemFilter = { itemType: ItemType; itemSlug: string; itemName: string };

type LowStockEntry =
  | { kind: "finished";  product: FinishedProduct; size: "250g" | "500g" | "1kg"; current: number; threshold: number }
  | { kind: "bean";      bean: EspressoBean }
  | { kind: "packaging"; item: PackagingItem };

// ── Constants ─────────────────────────────────────────────────────────────────

type Tab = "Finished Products" | "Espresso Beans" | "Packaging" | "Suppliers" | "Stock Movements";
const TABS: Tab[] = ["Finished Products", "Espresso Beans", "Packaging", "Suppliers", "Stock Movements"];

const CAT_OPTIONS = ["All", ...Object.keys(CATEGORY_LABEL)] as const;

const ADJUST_REASONS = ["Manual Count Correction", "Damaged", "Lost", "Customer Return", "Supplier Return", "Other"] as const;
type AdjustReason = typeof ADJUST_REASONS[number];

const MOV_CFG: Record<MovementType, { label: string; color: string; Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }> = {
  "restock":         { label: "Restock",         color: "#4ade80", Icon: PackagePlus },
  "order-deducted":  { label: "Order Deducted",  color: "#60a5fa", Icon: ShoppingCart },
  "manual-adjust":   { label: "Manual Adjust",   color: "#fbbf24", Icon: Settings2 },
  "damaged":         { label: "Damaged",         color: "#f87171", Icon: Flame },
  "lost":            { label: "Lost",            color: "#fb923c", Icon: MinusCircle },
  "customer-return": { label: "Customer Return", color: "#2dd4bf", Icon: RotateCcw },
  "supplier-return": { label: "Supplier Return", color: "#f97316", Icon: MinusCircle },
};

// ── Shared helpers ────────────────────────────────────────────────────────────

function stockColor(status: StockStatus) {
  if (status === "Out of Stock") return "#f87171";
  if (status === "Low Stock")    return "#fbbf24";
  return "var(--cream)";
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StockStatus }) {
  const cfg: Record<StockStatus, { bg: string; color: string }> = {
    "In Stock":     { bg: "rgba(74,222,128,0.12)",  color: "#4ade80" },
    "Low Stock":    { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24" },
    "Out of Stock": { bg: "rgba(248,113,113,0.15)", color: "#f87171" },
  };
  const { bg, color } = cfg[status];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ background: bg, color }}>
      {status === "Low Stock" && <AlertTriangle size={8} />}
      {status}
    </span>
  );
}

// ── KPICard ───────────────────────────────────────────────────────────────────

function KPICard({ label, value, unit, icon: Icon, color }: {
  label: string; value: string | number; unit?: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string;
}) {
  return (
    <div className="admin-kpi-card flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--cream-dim)" }}>{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-[22px] font-bold tabular-nums leading-none" style={{ color: "var(--cream)" }}>{value}</span>
        {unit && <span className="text-[11px] mb-0.5" style={{ color: "var(--cream-dim)" }}>{unit}</span>}
      </div>
    </div>
  );
}

// ── SupplierCombobox ──────────────────────────────────────────────────────────

function SupplierCombobox({ value, onChange, suppliers, onAddNew }: {
  value: string; onChange: (id: string) => void;
  suppliers: Supplier[]; onAddNew?: () => void;
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered  = suppliers.filter(s => s.name.includes(query) || s.phone.includes(query));
  const selected  = suppliers.find(s => s.id === value);
  const showQuery = open && query !== "";

  return (
    <div ref={ref} className="relative">
      <div className="relative" onClick={() => setOpen(o => !o)}>
        <input
          value={open ? query : (selected?.name ?? "")}
          onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
          placeholder="اختر مورد…"
          className="w-full rounded-lg px-3 py-2.5 text-sm cursor-pointer"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.15)", color: "var(--cream)", outline: "none" }}
        />
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--cream-dim)", transition: "transform 200ms", transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)` }} />
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 z-[500] mt-1 rounded-xl overflow-hidden"
          style={{ background: "var(--coffee-surface)", border: "1px solid rgba(182,136,94,0.18)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
          <div className="max-h-[180px] overflow-y-auto">
            {(showQuery ? filtered : suppliers).map(s => (
              <div key={s.id}
                onClick={() => { onChange(s.id); setQuery(""); setOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/[0.04] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium" style={{ color: "var(--cream)" }}>{s.name}</span>
                    {s.preferred && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(182,136,94,0.15)", color: "var(--gold)" }}>★ Preferred</span>}
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--cream-dim)" }}>{s.phone}</p>
                </div>
                {value === s.id && <Check size={12} style={{ color: "var(--gold)" }} />}
              </div>
            ))}
            {showQuery && filtered.length === 0 && (
              <p className="px-3 py-2.5 text-sm" style={{ color: "var(--cream-dim)" }}>لا يوجد</p>
            )}
          </div>
          {onAddNew && (
            <div onClick={() => { setOpen(false); onAddNew(); }}
              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-white/[0.04] transition-colors text-sm font-medium"
              style={{ borderTop: "1px solid rgba(182,136,94,0.10)", color: "var(--gold)" }}>
              <Plus size={13} /> Add new supplier
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--cream-dim)" }}>{label}</p>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm";
const inputSty: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.15)", color: "var(--cream)", outline: "none" };

// ── RestockDrawer ─────────────────────────────────────────────────────────────

function RestockDrawer({ target, suppliers, onClose, onSave }: {
  target: RestockTarget | null;
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (target: RestockTarget, payload: Record<string, number | string>) => void;
}) {
  const [q250,  setQ250]  = useState("0");
  const [q500,  setQ500]  = useState("0");
  const [q1kg,  setQ1kg]  = useState("0");
  const [c250,  setC250]  = useState("0");
  const [c500,  setC500]  = useState("0");
  const [c1kg,  setC1kg]  = useState("0");
  const [kgQty, setKgQty] = useState("0");
  const [cpkg,  setCpkg]  = useState("0");
  const [uqty,  setUqty]  = useState("0");
  const [ucost, setUcost] = useState("0");
  const [supId, setSupId] = useState("");
  const [date,  setDate]  = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!target) return;
    const today = new Date().toISOString().split("T")[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(false); setNotes(""); setQ250("0"); setQ500("0"); setQ1kg("0");
    if (target.kind === "finished") {
      setSupId(target.product.supplierId);
      setC250(String(target.product.cost250g));
      setC500(String(target.product.cost500g));
      setC1kg(String(target.product.cost1kg));
    } else if (target.kind === "bean") {
      setSupId(target.bean.supplierId);
      setCpkg(String(target.bean.costPerKg));
      setKgQty("0");
    } else {
      setSupId("sup-003");
      setUcost(String(target.item.costPerUnit));
      setUqty("0");
    }
    setDate(today);
  }, [target]);

  const isOpen = target !== null;

  const totalCost = useMemo(() => {
    if (!target) return 0;
    if (target.kind === "finished") {
      return Math.round((parseFloat(q250)||0)*(parseFloat(c250)||0) + (parseFloat(q500)||0)*(parseFloat(c500)||0) + (parseFloat(q1kg)||0)*(parseFloat(c1kg)||0));
    }
    if (target.kind === "bean")      return Math.round((parseFloat(kgQty)||0) * (parseFloat(cpkg)||0));
    return Math.round((parseFloat(uqty)||0) * (parseFloat(ucost)||0));
  }, [target, q250, q500, q1kg, c250, c500, c1kg, kgQty, cpkg, uqty, ucost]);

  function handleSave() {
    if (!target) return;
    const payload: Record<string, number | string> = { supplierId: supId, date, notes, totalCost };
    if (target.kind === "finished") {
      Object.assign(payload, { q250: parseFloat(q250)||0, q500: parseFloat(q500)||0, q1kg: parseFloat(q1kg)||0,
        c250: parseFloat(c250)||0, c500: parseFloat(c500)||0, c1kg: parseFloat(c1kg)||0 });
    } else if (target.kind === "bean") {
      Object.assign(payload, { kgQty: parseFloat(kgQty)||0, cpkg: parseFloat(cpkg)||0 });
    } else {
      Object.assign(payload, { uqty: parseFloat(uqty)||0, ucost: parseFloat(ucost)||0 });
    }
    onSave(target, payload);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1100);
  }

  const canSave = target && (
    (target.kind === "finished" && ((parseFloat(q250)||0) + (parseFloat(q500)||0) + (parseFloat(q1kg)||0)) > 0) ||
    (target.kind === "bean"     && (parseFloat(kgQty)||0) > 0) ||
    (target.kind === "packaging" && (parseFloat(uqty)||0) > 0)
  );

  const title    = !target ? "" : target.kind === "finished" ? target.product.nameEn : target.kind === "bean" ? target.bean.nameEn : target.item.name;
  const subtitle = !target ? "" : target.kind === "finished" ? "Finished Product" : target.kind === "bean" ? "Espresso Bean" : "Packaging";

  return (
    <>
      <div className="fixed inset-0 z-[200]"
        style={{ background: "rgba(0,0,0,0.55)", opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none", transition: "opacity 260ms" }}
        onClick={onClose} />
      <aside className="fixed top-0 right-0 h-full z-[201] flex flex-col"
        style={{ width: "clamp(300px,40vw,520px)", background: "var(--coffee-dark)", borderLeft: "1px solid rgba(182,136,94,0.15)", transform: isOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 290ms cubic-bezier(0.22,1,0.36,1)" }}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(182,136,94,0.10)" }}>
          <div>
            <div className="flex items-center gap-2">
              <PackagePlus size={14} style={{ color: "var(--gold)" }} />
              <span className="font-semibold text-sm" style={{ color: "var(--cream)" }}>Add Stock</span>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--cream-dim)" }}>{title} · {subtitle}</p>
          </div>
          <button type="button" onClick={onClose}><X size={16} style={{ color: "var(--cream-dim)" }} /></button>
        </div>

        {target && (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

            {/* Current stock info */}
            {target.kind === "finished" && (
              <div className="rounded-lg p-3 grid grid-cols-3 gap-2" style={{ background: "rgba(182,136,94,0.05)", border: "1px solid rgba(182,136,94,0.09)" }}>
                {([["250g", target.product.stock250g, target.product.threshold250g], ["500g", target.product.stock500g, target.product.threshold500g], ["1kg", target.product.stock1kg, target.product.threshold1kg]] as [string, number, number][]).map(([sz, st, th]) => (
                  <div key={sz} className="text-center">
                    <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--cream-dim)" }}>{sz}</p>
                    <p className="font-bold tabular-nums text-sm" style={{ color: stockColor(getStatus(st, th)) }}>{st}</p>
                  </div>
                ))}
              </div>
            )}
            {target.kind === "bean" && (
              <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: "rgba(182,136,94,0.05)", border: "1px solid rgba(182,136,94,0.09)" }}>
                <div>
                  <p className="text-[10px]" style={{ color: "var(--cream-dim)" }}>Current Stock</p>
                  <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color: stockColor(getStatus(target.bean.stockKg, target.bean.lowStockKg)) }}>{target.bean.stockKg} KG</p>
                </div>
                <StatusBadge status={getStatus(target.bean.stockKg, target.bean.lowStockKg)} />
              </div>
            )}
            {target.kind === "packaging" && (
              <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: "rgba(182,136,94,0.05)", border: "1px solid rgba(182,136,94,0.09)" }}>
                <div>
                  <p className="text-[10px]" style={{ color: "var(--cream-dim)" }}>Current Quantity</p>
                  <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color: stockColor(getStatus(target.item.quantity, target.item.threshold)) }}>{target.item.quantity.toLocaleString()} units</p>
                </div>
                <StatusBadge status={getStatus(target.item.quantity, target.item.threshold)} />
              </div>
            )}

            {/* Form fields */}
            {target.kind === "finished" && (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--cream-dim)" }}>Add Units</p>
                {([["250g", q250, setQ250, c250, setC250] as const, ["500g", q500, setQ500, c500, setC500] as const, ["1kg", q1kg, setQ1kg, c1kg, setC1kg] as const]).map(([sz, qty, setQty, cost, setCost]) => (
                  <div key={sz} className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] mb-1" style={{ color: "var(--cream-dim)" }}>{sz} Qty</p>
                      <input type="number" min="0" step="1" value={qty} onChange={e => setQty(e.target.value)} className={inputCls} style={inputSty} />
                    </div>
                    <div>
                      <p className="text-[10px] mb-1" style={{ color: "var(--cream-dim)" }}>{sz} Cost (EGP)</p>
                      <input type="number" min="0" step="0.5" value={cost} onChange={e => setCost(e.target.value)} className={inputCls} style={inputSty} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {target.kind === "bean" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="KG Purchased">
                  <input type="number" min="0" step="0.5" value={kgQty} onChange={e => setKgQty(e.target.value)} className={inputCls} style={inputSty} />
                </Field>
                <Field label="Cost per KG (EGP)">
                  <input type="number" min="0" step="5" value={cpkg} onChange={e => setCpkg(e.target.value)} className={inputCls} style={inputSty} />
                </Field>
              </div>
            )}
            {target.kind === "packaging" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity">
                  <input type="number" min="0" step="1" value={uqty} onChange={e => setUqty(e.target.value)} className={inputCls} style={inputSty} />
                </Field>
                <Field label="Cost per Unit (EGP)">
                  <input type="number" min="0" step="0.1" value={ucost} onChange={e => setUcost(e.target.value)} className={inputCls} style={inputSty} />
                </Field>
              </div>
            )}

            {/* Total cost */}
            {totalCost > 0 && (
              <div className="rounded-lg p-3" style={{ background: "rgba(182,136,94,0.06)", border: "1px solid rgba(182,136,94,0.10)" }}>
                <p className="text-[10px]" style={{ color: "var(--cream-dim)" }}>Total Cost</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5" style={{ color: "var(--gold)" }}>{totalCost.toLocaleString()} <span className="text-sm font-normal">EGP</span></p>
              </div>
            )}

            <Field label="Supplier">
              <SupplierCombobox value={supId} onChange={setSupId} suppliers={suppliers} />
            </Field>

            <Field label="Date">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} style={inputSty} />
            </Field>

            <Field label="Notes">
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Invoice ref, batch number…"
                className="w-full rounded-lg px-3 py-2.5 text-sm resize-none" style={inputSty} />
            </Field>

          </div>
        )}

        <div className="flex items-center justify-end gap-3 px-5 py-4" style={{ borderTop: "1px solid rgba(182,136,94,0.08)" }}>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--cream-dim)" }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={!canSave}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: saved ? "rgba(74,222,128,0.15)" : "rgba(182,136,94,0.20)", color: saved ? "#4ade80" : "var(--gold)", opacity: !canSave ? 0.4 : 1 }}>
            {saved ? <><Check size={14} /> Added!</> : <><PackagePlus size={14} /> Add to Stock</>}
          </button>
        </div>
      </aside>
    </>
  );
}

// ── AdjustModal ───────────────────────────────────────────────────────────────

function AdjustModal({ target, suppliers, onClose, onSave }: {
  target: AdjustTarget | null;
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (target: AdjustTarget, payload: Record<string, number | string>) => void;
}) {
  const [size,      setSize]      = useState<"250g" | "500g" | "1kg">("250g");
  const [dir,       setDir]       = useState<"increase" | "decrease">("decrease");
  const [qty,       setQty]       = useState("1");
  const [reason,    setReason]    = useState<AdjustReason>(ADJUST_REASONS[0]);
  const [notes,     setNotes]     = useState("");
  const [orderRef,  setOrderRef]  = useState("");
  const [adjSupId,  setAdjSupId]  = useState("");
  const [saved,     setSaved]     = useState(false);

  useEffect(() => {
    if (!target) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSize("250g"); setDir("decrease"); setQty("1"); setReason(ADJUST_REASONS[0]); setNotes(""); setOrderRef(""); setAdjSupId(""); setSaved(false);
  }, [target]);

  if (!target) return null;

  function handleReasonChange(r: AdjustReason) {
    setReason(r);
    if (r === "Customer Return") setDir("increase");
    if (r === "Supplier Return") setDir("decrease");
  }

  const qtyNum = parseFloat(qty) || 0;
  let currentStock = 0;
  if (target.kind === "finished") {
    currentStock = size === "250g" ? target.product.stock250g : size === "500g" ? target.product.stock500g : target.product.stock1kg;
  } else if (target.kind === "bean") {
    currentStock = target.bean.stockKg;
  } else {
    currentStock = target.item.quantity;
  }
  const newStock = dir === "increase" ? Math.round((currentStock + qtyNum) * 10) / 10 : Math.max(0, Math.round((currentStock - qtyNum) * 10) / 10);
  const unit = target.kind === "bean" ? "KG" : target.kind === "packaging" ? "units" : size;
  const label = target.kind === "finished" ? target.product.nameEn : target.kind === "bean" ? target.bean.nameEn : target.item.name;

  const isCustomerReturn = reason === "Customer Return";
  const isSupplierReturn = reason === "Supplier Return";

  function handleSave() {
    if (!target || !qtyNum) return;
    onSave(target, { size, dir, qty: qtyNum, reason, notes, orderRef, adjSupId });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1100);
  }

  return (
    <>
      <div className="fixed inset-0 z-[300]" style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[301] w-[90vw] max-w-[420px] rounded-2xl"
        style={{ background: "var(--coffee-surface)", border: "1px solid rgba(182,136,94,0.15)", transform: "translate(-50%,-50%)" }}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}>
          <div>
            <span className="font-semibold text-sm" style={{ color: "var(--cream)" }}>Adjust Stock</span>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--cream-dim)" }}>{label} · {currentStock} {unit} current</p>
          </div>
          <button type="button" onClick={onClose}><X size={15} style={{ color: "var(--cream-dim)" }} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Size selector for finished products */}
          {target.kind === "finished" && (
            <div className="grid grid-cols-3 gap-2">
              {(["250g", "500g", "1kg"] as const).map(sz => (
                <button key={sz} type="button" onClick={() => setSize(sz)}
                  aria-pressed={size === sz ? "true" : "false"}
                  className="py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: size === sz ? "rgba(182,136,94,0.18)" : "rgba(255,255,255,0.03)", color: size === sz ? "var(--gold)" : "var(--cream-dim)", border: `1px solid ${size === sz ? "rgba(182,136,94,0.25)" : "rgba(182,136,94,0.07)"}` }}>
                  {sz}
                </button>
              ))}
            </div>
          )}

          {/* Direction */}
          <div className="grid grid-cols-2 gap-2">
            {(["increase", "decrease"] as const).map(d => (
              <button key={d} type="button" onClick={() => setDir(d)} aria-pressed={dir === d ? "true" : "false"}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: dir === d ? (d === "increase" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)") : "rgba(255,255,255,0.03)",
                  border: `1px solid ${dir === d ? (d === "increase" ? "rgba(74,222,128,0.28)" : "rgba(248,113,113,0.28)") : "rgba(182,136,94,0.08)"}`,
                  color: dir === d ? (d === "increase" ? "#4ade80" : "#f87171") : "var(--cream-dim)",
                }}>
                {d === "increase" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                {d === "increase" ? "Increase" : "Decrease"}
              </button>
            ))}
          </div>

          <Field label={`Quantity (${unit})`}>
            <input type="number" min="0.1" step={target.kind === "bean" ? "0.5" : "1"} value={qty}
              onChange={e => setQty(e.target.value)} className={inputCls} style={inputSty} />
            <p className="text-[11px] mt-1.5" style={{ color: dir === "increase" ? "#4ade80" : "#f87171" }}>
              New stock: <strong>{newStock} {unit}</strong>
            </p>
          </Field>

          <Field label="Reason">
            <div className="relative">
              <select value={reason} onChange={e => handleReasonChange(e.target.value as AdjustReason)}
                className={`${inputCls} appearance-none pr-8`}
                style={{ ...inputSty, colorScheme: "dark" }}>
                {ADJUST_REASONS.map(r => <option key={r} value={r} style={{ background: "#1b140f", color: "var(--cream)" }}>{r}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--cream-dim)" }} />
            </div>
          </Field>

          {/* Customer Return — order reference */}
          {isCustomerReturn && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#2dd4bf" }}>Order Reference</p>
              <p className="text-[10px] mb-1.5" style={{ color: "var(--cream-dim)" }}>
                Stock increases when customer returns sealed/resellable item.
              </p>
              <input
                value={orderRef}
                onChange={e => setOrderRef(e.target.value)}
                placeholder="e.g. LC-1092 (optional)"
                className={inputCls}
                style={{ ...inputSty, borderColor: "rgba(45,212,191,0.25)" }}
              />
            </div>
          )}

          {/* Supplier Return — supplier selector */}
          {isSupplierReturn && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#f97316" }}>Supplier</p>
              <p className="text-[10px] mb-1.5" style={{ color: "var(--cream-dim)" }}>
                Stock decreases — item returned back to supplier.
              </p>
              <SupplierCombobox value={adjSupId} onChange={setAdjSupId} suppliers={suppliers} />
            </div>
          )}

          <Field label={isCustomerReturn || isSupplierReturn ? "Notes (required)" : "Notes (optional)"}>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={isCustomerReturn ? "Condition, reason for return…" : isSupplierReturn ? "Batch issue, reason for supplier return…" : ""}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none" style={{ ...inputSty, borderColor: (isCustomerReturn || isSupplierReturn) && !notes ? "rgba(251,191,36,0.28)" : inputSty.border as string }} />
            {(isCustomerReturn || isSupplierReturn) && !notes && (
              <p className="text-[10px] mt-1" style={{ color: "#fbbf24" }}>Notes strongly recommended for return records.</p>
            )}
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3" style={{ borderTop: "1px solid rgba(182,136,94,0.08)" }}>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--cream-dim)" }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={!qtyNum}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: saved ? "rgba(74,222,128,0.15)" : "rgba(182,136,94,0.18)", color: saved ? "#4ade80" : "var(--gold)", opacity: !qtyNum ? 0.4 : 1 }}>
            {saved ? <><Check size={13} /> Saved!</> : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── LowStockPanel ─────────────────────────────────────────────────────────────

function LowStockPanel({ entries, isOpen, onClose, onRestock }: {
  entries: LowStockEntry[]; isOpen: boolean; onClose: () => void;
  onRestock: (t: RestockTarget) => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[200]"
        style={{ background: "rgba(0,0,0,0.55)", opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none", transition: "opacity 260ms" }}
        onClick={onClose} />
      <aside className="fixed top-0 right-0 h-full z-[201] flex flex-col"
        style={{ width: "clamp(280px,34vw,440px)", background: "var(--coffee-dark)", borderLeft: "1px solid rgba(182,136,94,0.15)", transform: isOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 280ms cubic-bezier(0.22,1,0.36,1)" }}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(182,136,94,0.10)" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: "#fbbf24" }} />
            <span className="font-semibold text-sm" style={{ color: "var(--cream)" }}>Low Stock Alerts</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>{entries.length}</span>
          </div>
          <button type="button" onClick={onClose}><X size={16} style={{ color: "var(--cream-dim)" }} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Check size={28} style={{ color: "#4ade80" }} />
              <p className="text-sm" style={{ color: "var(--cream)" }}>All levels healthy</p>
            </div>
          ) : entries.map((e, i) => {
            const isOut = e.kind === "finished"
              ? e.current === 0
              : e.kind === "bean"
              ? e.bean.stockKg === 0
              : e.item.quantity === 0;

            const name = e.kind === "finished"
              ? `${e.product.nameEn} — ${e.size}`
              : e.kind === "bean"
              ? e.bean.nameEn
              : e.item.name;

            const typeLabel = e.kind === "finished" ? "Product" : e.kind === "bean" ? "Bean" : "Packaging";

            const current = e.kind === "finished" ? e.current : e.kind === "bean" ? `${e.bean.stockKg} KG` : e.item.quantity;
            const threshold = e.kind === "finished" ? e.threshold : e.kind === "bean" ? `${e.bean.lowStockKg} KG` : e.item.threshold;
            const recommend = e.kind === "finished"
              ? Math.max(e.threshold * 3 - e.current, e.threshold)
              : e.kind === "bean"
              ? `~${Math.max(e.bean.lowStockKg * 3 - e.bean.stockKg, e.bean.lowStockKg)} KG`
              : Math.max(e.item.threshold * 3 - e.item.quantity, e.item.threshold);

            function openRestock() {
              onClose();
              if (e.kind === "finished") onRestock({ kind: "finished", product: e.product });
              else if (e.kind === "bean") onRestock({ kind: "bean", bean: e.bean });
              else onRestock({ kind: "packaging", item: e.item });
            }

            return (
              <div key={i} className="rounded-xl p-3.5 flex items-center gap-3"
                style={{ background: "rgba(182,136,94,0.04)", border: `1px solid ${isOut ? "rgba(248,113,113,0.18)" : "rgba(251,191,36,0.14)"}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(255,255,255,0.05)", color: "var(--cream-dim)" }}>{typeLabel}</span>
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: "var(--cream)" }}>{name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: isOut ? "#f87171" : "#fbbf24" }}>
                    {current} <span style={{ color: "var(--cream-dim)" }}>/ threshold {threshold}</span>
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--cream-dim)" }}>Restock ~{recommend}</p>
                </div>
                <button type="button" onClick={openRestock}
                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                  style={{ background: "rgba(182,136,94,0.14)", color: "var(--gold)" }}>
                  <Plus size={11} /> Buy
                </button>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}

// ── SupplierDrawer ────────────────────────────────────────────────────────────

function SupplierDrawer({ supplier, movements, onClose, onSave }: {
  supplier: Supplier | null; movements: StockMovement[];
  onClose: () => void; onSave: (id: string, patch: Partial<Supplier>) => void;
}) {
  const [name,      setName]      = useState("");
  const [contact,   setContact]   = useState("");
  const [phone,     setPhone]     = useState("");
  const [wa,        setWa]        = useState("");
  const [email,     setEmail]     = useState("");
  const [preferred, setPreferred] = useState(false);
  const [notes,     setNotes]     = useState("");
  const [saved,     setSaved]     = useState(false);

  useEffect(() => {
    if (!supplier) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(supplier.name); setContact(supplier.contactPerson); setPhone(supplier.phone);
    setWa(supplier.whatsapp); setEmail(supplier.email ?? ""); setPreferred(supplier.preferred);
    setNotes(supplier.notes); setSaved(false);
  }, [supplier?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOpen   = supplier !== null;
  const supMoves = isOpen ? movements.filter(m => m.supplierId === supplier!.id).slice(0, 5) : [];

  function handleSave() {
    if (!supplier) return;
    onSave(supplier.id, { name, contactPerson: contact, phone, whatsapp: wa, email: email || undefined, preferred, notes });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <>
      <div className="fixed inset-0 z-[200]"
        style={{ background: "rgba(0,0,0,0.55)", opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none", transition: "opacity 260ms" }}
        onClick={onClose} />
      <aside className="fixed top-0 right-0 h-full z-[201] flex flex-col"
        style={{ width: "clamp(300px,38vw,500px)", background: "var(--coffee-dark)", borderLeft: "1px solid rgba(182,136,94,0.15)", transform: isOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 290ms cubic-bezier(0.22,1,0.36,1)" }}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(182,136,94,0.10)" }}>
          <div className="flex items-center gap-2">
            <Star size={14} style={{ color: "var(--gold)" }} />
            <span className="font-semibold text-sm" style={{ color: "var(--cream)" }}>{supplier?.name ?? "Supplier"}</span>
          </div>
          <button type="button" onClick={onClose}><X size={16} style={{ color: "var(--cream-dim)" }} /></button>
        </div>

        {supplier && (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">

            {/* General */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--gold)" }}>General</p>
              <div className="flex flex-col gap-3">
                <Field label="Supplier Name"><input value={name} onChange={e => setName(e.target.value)} className={inputCls} style={inputSty} /></Field>
                <Field label="Contact Person"><input value={contact} onChange={e => setContact(e.target.value)} className={inputCls} style={inputSty} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone"><input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} style={inputSty} /></Field>
                  <Field label="WhatsApp"><input value={wa} onChange={e => setWa(e.target.value)} className={inputCls} style={inputSty} /></Field>
                </div>
                <Field label="Email (optional)"><input value={email} onChange={e => setEmail(e.target.value)} className={inputCls} style={inputSty} /></Field>
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(182,136,94,0.05)", border: "1px solid rgba(182,136,94,0.10)" }}>
                  <span className="text-sm" style={{ color: "var(--cream)" }}>Preferred Supplier</span>
                  <button type="button" onClick={() => setPreferred(p => !p)}
                    aria-pressed={preferred ? "true" : "false"}
                    className="w-11 h-6 rounded-full transition-all relative"
                    style={{ background: preferred ? "var(--gold)" : "rgba(255,255,255,0.08)" }}>
                    <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                      style={{ background: preferred ? "#0b0806" : "rgba(255,255,255,0.4)", left: preferred ? "calc(100% - 22px)" : "2px" }} />
                  </button>
                </div>
              </div>
            </section>

            {/* Supplies */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--gold)" }}>Supplies</p>
              <div className="flex flex-wrap gap-1.5">
                {supplier.categories.map(c => (
                  <span key={c} className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: "rgba(182,136,94,0.08)", border: "1px solid rgba(182,136,94,0.14)", color: "var(--cream-dim)" }}>{c}</span>
                ))}
              </div>
            </section>

            {/* Purchases */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--gold)" }}>Purchases</p>
              <div className="rounded-lg p-3 flex items-center justify-between mb-3" style={{ background: "rgba(182,136,94,0.05)", border: "1px solid rgba(182,136,94,0.09)" }}>
                <div>
                  <p className="text-[10px]" style={{ color: "var(--cream-dim)" }}>Total Purchases</p>
                  <p className="font-bold tabular-nums" style={{ color: "var(--gold)" }}>{supplier.totalPurchasesEGP.toLocaleString()} EGP</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px]" style={{ color: "var(--cream-dim)" }}>Last Purchase</p>
                  <p className="text-[11px] tabular-nums" style={{ color: "var(--cream-dim)" }}>{supplier.lastPurchaseDate}</p>
                </div>
              </div>
              {supMoves.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {supMoves.map(m => (
                    <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <span className="text-[10px]" style={{ color: "var(--cream-dim)", minWidth: 70 }}>{m.date}</span>
                      <span className="text-[11px] flex-1 truncate" style={{ color: "var(--cream)" }}>{m.itemName}</span>
                      <span className="text-[11px] font-semibold tabular-nums" style={{ color: "#4ade80" }}>{m.change}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Notes */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--gold)" }}>Notes</p>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm resize-none" style={inputSty} />
            </section>

            {/* WhatsApp action */}
            <a href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.18)", color: "#4ade80" }}>
              <MessageCircle size={14} /> Open WhatsApp
            </a>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 px-5 py-4" style={{ borderTop: "1px solid rgba(182,136,94,0.08)" }}>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--cream-dim)" }}>Cancel</button>
          <button type="button" onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: saved ? "rgba(74,222,128,0.15)" : "rgba(182,136,94,0.20)", color: saved ? "#4ade80" : "var(--gold)" }}>
            {saved ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save</>}
          </button>
        </div>
      </aside>
    </>
  );
}

// ── PackagingFormModal ────────────────────────────────────────────────────────

function PackagingFormModal({ item, onClose, onSave }: {
  item: PackagingItem | "new" | null;
  onClose: () => void;
  onSave: (data: Omit<PackagingItem, "archived">) => void;
}) {
  const isNew = item === "new";
  const base  = isNew ? null : (item as PackagingItem);
  const [name, setName]   = useState(base?.name ?? "");
  const [type, setType]   = useState<PackagingItem["type"]>(base?.type ?? "Bag");
  const [qty,  setQty]    = useState(String(base?.quantity ?? 0));
  const [thr,  setThr]    = useState(String(base?.threshold ?? 50));
  const [cost, setCost]   = useState(String(base?.costPerUnit ?? 0));
  const [saved, setSaved] = useState(false);

  if (!item) return null;

  function handleSave() {
    const slug = isNew ? `pkg-${Date.now()}` : (base?.slug ?? `pkg-${Date.now()}`);
    onSave({ slug, name, type, quantity: parseFloat(qty)||0, threshold: parseFloat(thr)||0, costPerUnit: parseFloat(cost)||0 });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1100);
  }

  return (
    <>
      <div className="fixed inset-0 z-[300]" style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[301] w-[90vw] max-w-[420px] rounded-2xl"
        style={{ background: "var(--coffee-surface)", border: "1px solid rgba(182,136,94,0.15)", transform: "translate(-50%,-50%)" }}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}>
          <span className="font-semibold text-sm" style={{ color: "var(--cream)" }}>{isNew ? "Add Packaging Item" : `Edit: ${base?.name}`}</span>
          <button type="button" onClick={onClose}><X size={15} style={{ color: "var(--cream-dim)" }} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <Field label="Item Name"><input value={name} onChange={e => setName(e.target.value)} className={inputCls} style={inputSty} /></Field>
          <Field label="Type">
            <div className="relative">
              <select value={type} onChange={e => setType(e.target.value as PackagingItem["type"])} className={`${inputCls} appearance-none pr-8`} style={inputSty}>
                {["Bag", "Sticker", "Valve", "Box"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--cream-dim)" }} />
            </div>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Quantity"><input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} className={inputCls} style={inputSty} /></Field>
            <Field label="Threshold"><input type="number" min="0" value={thr} onChange={e => setThr(e.target.value)} className={inputCls} style={inputSty} /></Field>
            <Field label="Cost/Unit"><input type="number" min="0" step="0.1" value={cost} onChange={e => setCost(e.target.value)} className={inputCls} style={inputSty} /></Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3" style={{ borderTop: "1px solid rgba(182,136,94,0.08)" }}>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--cream-dim)" }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={!name}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ background: saved ? "rgba(74,222,128,0.15)" : "rgba(182,136,94,0.18)", color: saved ? "#4ade80" : "var(--gold)", opacity: !name ? 0.4 : 1 }}>
            {saved ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ── FinishedProductsTab ───────────────────────────────────────────────────────

function FinishedProductsTab({ products, catFilter, onCatChange, onRestock, onAdjust, onViewMovements }: {
  products: FinishedProduct[]; catFilter: string; onCatChange: (c: string) => void;
  onRestock: (p: FinishedProduct) => void; onAdjust: (p: FinishedProduct) => void;
  onViewMovements: (slug: string, name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const visible = products.filter(p => {
    const matchCat = catFilter === "All" || p.category === catFilter;
    const matchSearch = !search || p.nameEn.toLowerCase().includes(search.toLowerCase()) || p.nameAr.includes(search);
    return matchCat && matchSearch;
  });

  const catCounts = useMemo(() => {
    const c: Record<string, number> = { All: products.length };
    products.forEach(p => { c[p.category] = (c[p.category] ?? 0) + 1; });
    return c;
  }, [products]);

  return (
    <div>
      {/* Deduction rule info */}
      <div className="mb-4 px-3 py-2.5 rounded-lg text-[11px] leading-relaxed" style={{ background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.10)", color: "#93c5fd" }}>
        Stock is deducted when order status → <strong>Delivered</strong>. Returned orders: admin decides manually.
      </div>

      {/* Search */}
      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
          className="w-full rounded-lg px-3 py-2 text-sm max-w-xs"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)", color: "var(--cream)", outline: "none" }} />
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {CAT_OPTIONS.map(cat => (
          <button key={cat} type="button" onClick={() => onCatChange(cat)}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
            style={{ background: catFilter === cat ? "var(--gold)" : "rgba(255,255,255,0.04)", color: catFilter === cat ? "#0b0806" : "var(--cream-dim)", border: `1px solid ${catFilter === cat ? "transparent" : "rgba(182,136,94,0.10)"}` }}>
            {cat === "All" ? "All" : CATEGORY_LABEL[cat] ?? cat}
            <span className="ml-1.5 opacity-60">{catCounts[cat] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(182,136,94,0.10)" }}>
              {["", "Product", "Category", "250g", "500g", "1kg", "Threshold", "Value", "Status", ""].map((h, i) => (
                <th key={i} className="text-left px-3 py-3 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: "var(--cream-dim)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(p => {
              const worst = productWorstStatus(p);
              const val   = productValue(p);
              return (
                <tr key={p.slug} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(182,136,94,0.05)" }}>
                  <td className="px-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--coffee-deep)" }}>
                      <Image src={p.image} alt={p.nameEn} width={32} height={32} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-sm leading-tight" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>{p.nameEn}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--cream-dim)" }}>{p.nameAr}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: "rgba(182,136,94,0.08)", color: "var(--cream-dim)" }}>
                      {CATEGORY_LABEL[p.category] ?? p.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-bold tabular-nums" style={{ color: stockColor(getStatus(p.stock250g, p.threshold250g)) }}>{p.stock250g}</td>
                  <td className="px-3 py-2.5 font-bold tabular-nums" style={{ color: stockColor(getStatus(p.stock500g, p.threshold500g)) }}>{p.stock500g}</td>
                  <td className="px-3 py-2.5 font-bold tabular-nums" style={{ color: stockColor(getStatus(p.stock1kg, p.threshold1kg)) }}>{p.stock1kg}</td>
                  <td className="px-3 py-2.5 text-[11px] tabular-nums" style={{ color: "var(--cream-dim)" }}>
                    {p.threshold250g}/{p.threshold500g}/{p.threshold1kg}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] tabular-nums" style={{ color: "var(--cream-dim)" }}>{val.toLocaleString()}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={worst} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => onRestock(p)} title="Restock"
                        className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                        style={{ color: "#4ade80" }}><Plus size={12} /></button>
                      <button type="button" onClick={() => onAdjust(p)} title="Adjust"
                        className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                        style={{ color: "#fbbf24" }}><RefreshCw size={11} /></button>
                      <button type="button" onClick={() => onViewMovements(p.slug, p.nameEn)} title="View Movements"
                        className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                        style={{ color: "#93c5fd" }}><History size={11} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="text-center py-10 text-sm" style={{ color: "var(--cream-dim)" }}>No products found.</p>
        )}
      </div>
    </div>
  );
}

// ── EspressoBeansTab ──────────────────────────────────────────────────────────

function EspressoBeansTab({ beans, onRestock, onAdjust }: {
  beans: EspressoBean[];
  onRestock: (b: EspressoBean) => void;
  onAdjust: (b: EspressoBean) => void;
}) {
  const [beanType, setBeanType] = useState<"all" | "arabica" | "robusta">("all");
  const visible = beanType === "all" ? beans : beans.filter(b => b.beanType === beanType);

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        {(["all", "arabica", "robusta"] as const).map(t => (
          <button key={t} type="button" onClick={() => setBeanType(t)}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all capitalize"
            style={{ background: beanType === t ? "var(--gold)" : "rgba(255,255,255,0.04)", color: beanType === t ? "#0b0806" : "var(--cream-dim)", border: `1px solid ${beanType === t ? "transparent" : "rgba(182,136,94,0.10)"}` }}>
            {t === "all" ? "All Beans" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(182,136,94,0.10)" }}>
              {["Bean", "Type", "Stock KG", "Cost/KG", "Threshold", "Value", "Status", ""].map(h => (
                <th key={h} className="text-left px-3 py-3 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: "var(--cream-dim)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(b => {
              const status = getStatus(b.stockKg, b.lowStockKg);
              const val    = beanValue(b);
              return (
                <tr key={b.slug} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(182,136,94,0.05)" }}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: b.beanType === "arabica" ? "rgba(182,136,94,0.12)" : "rgba(74,222,128,0.10)" }}>
                        <Leaf size={11} style={{ color: b.beanType === "arabica" ? "var(--gold)" : "#4ade80" }} />
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: "var(--cream)" }}>{b.nameEn}</p>
                        <p className="text-[10px]" style={{ color: "var(--cream-dim)" }}>{b.nameAr}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: b.beanType === "arabica" ? "rgba(182,136,94,0.12)" : "rgba(74,222,128,0.10)", color: b.beanType === "arabica" ? "var(--gold)" : "#4ade80" }}>
                      {b.beanType === "arabica" ? "Arabica" : "Robusta"}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-bold tabular-nums" style={{ color: stockColor(status) }}>{b.stockKg} KG</td>
                  <td className="px-3 py-3 text-[11px] tabular-nums" style={{ color: "var(--cream-dim)" }}>{b.costPerKg} EGP</td>
                  <td className="px-3 py-3 text-[11px] tabular-nums" style={{ color: "var(--cream-dim)" }}>{b.lowStockKg} KG</td>
                  <td className="px-3 py-3 text-[11px] tabular-nums" style={{ color: "var(--cream-dim)" }}>{val.toLocaleString()} EGP</td>
                  <td className="px-3 py-3"><StatusBadge status={status} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => onRestock(b)} title="Restock"
                        className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/[0.08]" style={{ color: "#4ade80" }}><Plus size={12} /></button>
                      <button type="button" onClick={() => onAdjust(b)} title="Adjust"
                        className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/[0.08]" style={{ color: "#fbbf24" }}><RefreshCw size={11} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── PackagingTab ──────────────────────────────────────────────────────────────

function PackagingTab({ items, onRestock, onAdjust, onEdit, onArchive, onAddNew }: {
  items: PackagingItem[];
  onRestock: (i: PackagingItem) => void; onAdjust: (i: PackagingItem) => void;
  onEdit: (i: PackagingItem) => void; onArchive: (slug: string) => void;
  onAddNew: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px]" style={{ color: "var(--cream-dim)" }}>{items.length} items</p>
        <button type="button" onClick={onAddNew}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "rgba(182,136,94,0.14)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.20)" }}>
          <Plus size={13} /> Add Item
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(182,136,94,0.10)" }}>
              {["Item", "Type", "Quantity", "Unit Cost", "Threshold", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-3 py-3 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: "var(--cream-dim)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const status = getStatus(item.quantity, item.threshold);
              return (
                <tr key={item.slug} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(182,136,94,0.05)" }}>
                  <td className="px-3 py-3 font-medium" style={{ color: "var(--cream)" }}>{item.name}</td>
                  <td className="px-3 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: "rgba(96,165,250,0.10)", color: "#93c5fd" }}>{item.type}</span></td>
                  <td className="px-3 py-3 font-bold tabular-nums" style={{ color: stockColor(status) }}>{item.quantity.toLocaleString()}</td>
                  <td className="px-3 py-3 text-[11px] tabular-nums" style={{ color: "var(--cream-dim)" }}>{item.costPerUnit} EGP</td>
                  <td className="px-3 py-3 text-[11px] tabular-nums" style={{ color: "var(--cream-dim)" }}>{item.threshold}</td>
                  <td className="px-3 py-3"><StatusBadge status={status} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => onRestock(item)} title="Restock" className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/[0.08]" style={{ color: "#4ade80" }}><Plus size={12} /></button>
                      <button type="button" onClick={() => onAdjust(item)} title="Adjust" className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/[0.08]" style={{ color: "#fbbf24" }}><RefreshCw size={11} /></button>
                      <button type="button" onClick={() => onEdit(item)} title="Edit" className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/[0.08]" style={{ color: "#93c5fd" }}><Edit2 size={11} /></button>
                      <button type="button" onClick={() => onArchive(item.slug)} title="Archive" className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/[0.08]" style={{ color: "var(--cream-dim)" }}><Archive size={11} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── SuppliersTab ──────────────────────────────────────────────────────────────

function SuppliersTab({ suppliers, onOpen, onAddNew }: {
  suppliers: Supplier[]; onOpen: (s: Supplier) => void; onAddNew: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px]" style={{ color: "var(--cream-dim)" }}>{suppliers.length} suppliers</p>
        <button type="button" onClick={onAddNew}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "rgba(182,136,94,0.14)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.20)" }}>
          <Plus size={13} /> Add Supplier
        </button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(s => (
          <button key={s.id} type="button" onClick={() => onOpen(s)} className="text-left rounded-xl p-5 flex flex-col gap-3 transition-all hover:scale-[1.01]"
            style={{ background: "rgba(182,136,94,0.04)", border: `1px solid ${s.preferred ? "rgba(182,136,94,0.22)" : "rgba(182,136,94,0.09)"}`, cursor: "pointer" }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--cream)" }}>{s.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--cream-dim)" }}>{s.contactPerson}</p>
              </div>
              {s.preferred && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0" style={{ background: "rgba(182,136,94,0.15)", color: "var(--gold)" }}>
                  <Star size={9} /> Preferred
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--cream-dim)" }}><Phone size={11} /> {s.phone}</span>
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#4ade80" }}><MessageCircle size={11} /> WhatsApp</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {s.categories.map(c => <span key={c} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "rgba(255,255,255,0.04)", color: "var(--cream-dim)" }}>{c}</span>)}
            </div>
            <div style={{ borderTop: "1px solid rgba(182,136,94,0.07)", paddingTop: 10 }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "var(--cream-dim)" }}>Total Purchases</span>
                <span className="font-semibold text-sm tabular-nums" style={{ color: "var(--gold)" }}>{s.totalPurchasesEGP.toLocaleString()} EGP</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px]" style={{ color: "var(--cream-dim)" }}>Last Purchase</span>
                <span className="text-[11px]" style={{ color: "var(--cream-dim)" }}>{s.lastPurchaseDate}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── MovementsTab (activity log) ───────────────────────────────────────────────

const MOV_FILTER_OPTIONS: Array<{ label: string; value: MovementType | "all" }> = [
  { label: "All",             value: "all" },
  { label: "Restock",         value: "restock" },
  { label: "Orders",          value: "order-deducted" },
  { label: "Adjustments",     value: "manual-adjust" },
  { label: "Damaged",         value: "damaged" },
  { label: "Lost",            value: "lost" },
  { label: "Cust. Return",    value: "customer-return" },
  { label: "Sup. Return",     value: "supplier-return" },
];

function MovementsTab({ movements, typeFilter, onTypeFilter, itemFilter, onClearItemFilter }: {
  movements: StockMovement[]; typeFilter: MovementType | "all";
  onTypeFilter: (t: MovementType | "all") => void;
  itemFilter: MovItemFilter | null; onClearItemFilter: () => void;
}) {
  const isIn = (change: string) => change.includes("+");

  return (
    <div>
      {/* Order integration rule */}
      <div className="mb-4 rounded-lg px-3 py-2.5 text-[11px]" style={{ background: "rgba(182,136,94,0.04)", border: "1px solid rgba(182,136,94,0.09)", color: "var(--cream-dim)" }}>
        <span style={{ color: "var(--cream)", fontWeight: 600 }}>Deduction rules: </span>
        New / Preparing / Shipped → no deduction &nbsp;·&nbsp; Delivered → stock deducted &nbsp;·&nbsp; Cancelled → no deduction &nbsp;·&nbsp; Returned → admin decides
      </div>

      {/* Item filter chip */}
      {itemFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[11px]" style={{ color: "var(--cream-dim)" }}>Showing movements for:</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: "rgba(182,136,94,0.12)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.20)" }}>
            {itemFilter.itemName}
            <button type="button" onClick={onClearItemFilter} className="hover:opacity-70"><X size={11} /></button>
          </span>
        </div>
      )}

      {/* Type filter pills */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {MOV_FILTER_OPTIONS.map(o => (
          <button key={o.value} type="button" onClick={() => onTypeFilter(o.value)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: typeFilter === o.value ? "rgba(182,136,94,0.18)" : "rgba(255,255,255,0.03)", color: typeFilter === o.value ? "var(--gold)" : "var(--cream-dim)", border: `1px solid ${typeFilter === o.value ? "rgba(182,136,94,0.25)" : "rgba(182,136,94,0.07)"}` }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Activity log */}
      <div className="flex flex-col gap-2.5">
        {movements.length === 0 ? (
          <p className="text-center py-10 text-sm" style={{ color: "var(--cream-dim)" }}>No movements found.</p>
        ) : movements.map(m => {
          const cfg      = MOV_CFG[m.type];
          const isInFlow = isIn(m.change);
          const sup      = m.supplierId ? SUPPLIERS.find(s => s.id === m.supplierId) : undefined;
          const itemTypeLbl = m.itemType === "bean" ? "Espresso Bean" : m.itemType === "packaging" ? "Packaging" : "Product";
          return (
            <div key={m.id} className="flex gap-3 rounded-xl p-4 transition-colors hover:bg-white/[0.015]"
              style={{ border: "1px solid rgba(182,136,94,0.07)", background: "rgba(182,136,94,0.02)" }}>
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${cfg.color}18` }}>
                  <cfg.Icon size={14} style={{ color: cfg.color }} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${cfg.color}18`, color: cfg.color }}>{cfg.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "var(--cream-dim)" }}>{itemTypeLbl}</span>
                    </div>
                    <p className="font-semibold text-sm" style={{ color: "var(--cream)" }}>{m.itemName}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: isInFlow ? "#4ade80" : "#f87171" }}>{m.change}</p>
                  </div>
                  <span className="text-[11px] tabular-nums flex-shrink-0" style={{ color: "var(--cream-dim)" }}>{m.date}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--cream-dim)" }}>
                  <span className="tabular-nums">{m.before} → {m.after}</span>
                  {sup && <span style={{ color: "var(--gold)" }}>{sup.name}</span>}
                  {m.orderRef && <span style={{ color: "#60a5fa" }}>Ref: {m.orderRef}</span>}
                  {m.reason && <span>{m.reason}</span>}
                  {m.notes && <span className="italic">&ldquo;{m.notes}&rdquo;</span>}
                  <span style={{ opacity: 0.6 }}>by {m.adminName}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { admin } = useCurrentAdmin();
  const currentAdminName = admin ? getAdminDisplayName(admin) : "";

  const [activeTab,       setActiveTab]       = useState<Tab>("Finished Products");
  const [catFilter,       setCatFilter]       = useState("All");
  const [movTypeFilter,   setMovTypeFilter]   = useState<MovementType | "all">("all");
  const [movItemFilter,   setMovItemFilter]   = useState<MovItemFilter | null>(null);
  const [restockTarget,   setRestockTarget]   = useState<RestockTarget | null>(null);
  const [adjustTarget,    setAdjustTarget]    = useState<AdjustTarget | null>(null);
  const [supplierOpen,    setSupplierOpen]    = useState<Supplier | null>(null);
  const [packagingForm,   setPackagingForm]   = useState<PackagingItem | "new" | null>(null);
  const [lowStockOpen,    setLowStockOpen]    = useState(false);

  // Local overrides (mock — no persistence)
  const [finishedOv, setFinishedOv] = useState<Record<string, { stock250g: number; stock500g: number; stock1kg: number }>>({});
  const [beanOv,     setBeanOv]     = useState<Record<string, number>>({});
  const [packOv,     setPackOv]     = useState<Record<string, Partial<PackagingItem>>>({});
  const [addedPack,  setAddedPack]  = useState<PackagingItem[]>([]);
  const [supOv,      setSupOv]      = useState<Record<string, Partial<Supplier>>>({});
  const [addedSups,  setAddedSups]  = useState<Supplier[]>([]);
  const [movements,  setMovements]  = useState<StockMovement[]>(STOCK_MOVEMENTS);

  // Merged display data
  const displayFinished = useMemo(() =>
    FINISHED_PRODUCTS.map(p => finishedOv[p.slug] ? { ...p, ...finishedOv[p.slug] } : p)
  , [finishedOv]);

  const displayBeans = useMemo(() =>
    ESPRESSO_BEANS.map(b => beanOv[b.slug] !== undefined ? { ...b, stockKg: beanOv[b.slug] } : b)
  , [beanOv]);

  const displayPackaging = useMemo(() => {
    const base = PACKAGING_ITEMS.map(i => packOv[i.slug] ? { ...i, ...packOv[i.slug] } : i);
    return [...addedPack, ...base].filter(i => !i.archived);
  }, [packOv, addedPack]);

  const displaySuppliers = useMemo(() => {
    const base = SUPPLIERS.map(s => supOv[s.id] ? { ...s, ...supOv[s.id] } : s);
    return [...addedSups, ...base];
  }, [supOv, addedSups]);

  // KPIs
  const kpis = useMemo(() => {
    const fv = displayFinished.reduce((s, p) => s + productValue(p), 0);
    const bv = displayBeans.reduce((s, b) => s + beanValue(b), 0);
    const pv = displayPackaging.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);
    return {
      totalValue:      Math.round(fv + bv + pv),
      finishedUnits:   displayFinished.reduce((s, p) => s + p.stock250g + p.stock500g + p.stock1kg, 0),
      beanKg:          Math.round(displayBeans.reduce((s, b) => s + b.stockKg, 0) * 10) / 10,
      lowStockCount:   displayFinished.filter(p => productWorstStatus(p) === "Low Stock").length
                     + displayBeans.filter(b => getStatus(b.stockKg, b.lowStockKg) === "Low Stock").length
                     + displayPackaging.filter(i => getStatus(i.quantity, i.threshold) === "Low Stock").length,
      outOfStockCount: displayFinished.filter(p => productWorstStatus(p) === "Out of Stock").length
                     + displayBeans.filter(b => b.stockKg === 0).length
                     + displayPackaging.filter(i => i.quantity === 0).length,
    };
  }, [displayFinished, displayBeans, displayPackaging]);

  // Low stock entries (per-size for finished products)
  const lowStockEntries = useMemo((): LowStockEntry[] => {
    const out: LowStockEntry[] = [];
    for (const p of displayFinished) {
      if (getStatus(p.stock250g, p.threshold250g) !== "In Stock") out.push({ kind: "finished", product: p, size: "250g", current: p.stock250g, threshold: p.threshold250g });
      if (getStatus(p.stock500g, p.threshold500g) !== "In Stock") out.push({ kind: "finished", product: p, size: "500g", current: p.stock500g, threshold: p.threshold500g });
      if (getStatus(p.stock1kg,  p.threshold1kg)  !== "In Stock") out.push({ kind: "finished", product: p, size: "1kg",  current: p.stock1kg,  threshold: p.threshold1kg });
    }
    for (const b of displayBeans)    if (getStatus(b.stockKg, b.lowStockKg) !== "In Stock") out.push({ kind: "bean", bean: b });
    for (const i of displayPackaging) if (getStatus(i.quantity, i.threshold) !== "In Stock") out.push({ kind: "packaging", item: i });
    return out;
  }, [displayFinished, displayBeans, displayPackaging]);

  // Filtered movements
  const movementsFiltered = useMemo(() => {
    let m = movements;
    if (movTypeFilter !== "all") m = m.filter(x => x.type === movTypeFilter);
    if (movItemFilter) m = m.filter(x => x.itemType === movItemFilter.itemType && x.itemSlug === movItemFilter.itemSlug);
    return m;
  }, [movements, movTypeFilter, movItemFilter]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleViewMovements(slug: string, name: string) {
    const item = displayFinished.find(p => p.slug === slug);
    if (!item) return;
    setMovItemFilter({ itemType: "finished", itemSlug: slug, itemName: name });
    setMovTypeFilter("all");
    setActiveTab("Stock Movements");
  }

  function handleRestock(target: RestockTarget, payload: Record<string, number | string>) {
    const supId = String(payload.supplierId);
    const date  = String(payload.date);
    const notes = String(payload.notes);
    const sup   = displaySuppliers.find(s => s.id === supId);

    if (target.kind === "finished") {
      const p   = target.product;
      const q250 = Number(payload.q250), q500 = Number(payload.q500), q1kg = Number(payload.q1kg);
      const cur  = finishedOv[p.slug] ?? { stock250g: p.stock250g, stock500g: p.stock500g, stock1kg: p.stock1kg };
      const next = { stock250g: cur.stock250g + q250, stock500g: cur.stock500g + q500, stock1kg: cur.stock1kg + q1kg };
      setFinishedOv(prev => ({ ...prev, [p.slug]: next }));
      const parts: string[] = [];
      if (q250) parts.push(`250g +${q250}`);
      if (q500) parts.push(`500g +${q500}`);
      if (q1kg) parts.push(`1kg +${q1kg}`);
      setMovements(prev => [{
        id: `mv-${Date.now()}`, date, type: "restock", itemType: "finished", itemSlug: p.slug, itemName: p.nameEn,
        change: parts.join(" / "),
        before: `250g:${cur.stock250g} / 500g:${cur.stock500g} / 1kg:${cur.stock1kg}`,
        after:  `250g:${next.stock250g} / 500g:${next.stock500g} / 1kg:${next.stock1kg}`,
        supplierId: supId, notes, adminName: currentAdminName,
      }, ...prev]);
    } else if (target.kind === "bean") {
      const b    = target.bean;
      const kgQty = Number(payload.kgQty);
      const cur   = beanOv[b.slug] ?? b.stockKg;
      const next  = Math.round((cur + kgQty) * 10) / 10;
      setBeanOv(prev => ({ ...prev, [b.slug]: next }));
      setMovements(prev => [{
        id: `mv-${Date.now()}`, date, type: "restock", itemType: "bean", itemSlug: b.slug, itemName: b.nameEn,
        change: `+${kgQty} KG`, before: `${cur} KG`, after: `${next} KG`,
        supplierId: supId, notes: notes || (sup ? sup.name : ""), adminName: currentAdminName,
      }, ...prev]);
    } else {
      const item  = target.item;
      const uqty  = Number(payload.uqty);
      const cur   = (packOv[item.slug]?.quantity ?? item.quantity);
      const next  = cur + uqty;
      setPackOv(prev => ({ ...prev, [item.slug]: { ...(prev[item.slug] ?? {}), quantity: next } }));
      setMovements(prev => [{
        id: `mv-${Date.now()}`, date, type: "restock", itemType: "packaging", itemSlug: item.slug, itemName: item.name,
        change: `+${uqty} units`, before: `${cur} units`, after: `${next} units`,
        supplierId: supId, notes, adminName: currentAdminName,
      }, ...prev]);
    }
    setRestockTarget(null);
  }

  function handleAdjust(target: AdjustTarget, payload: Record<string, number | string>) {
    const dir       = String(payload.dir) as "increase" | "decrease";
    const qty       = Number(payload.qty);
    const reason    = String(payload.reason);
    const notes     = String(payload.notes);
    const size      = String(payload.size) as "250g" | "500g" | "1kg";
    const orderRef  = String(payload.orderRef || "");
    const adjSupId  = String(payload.adjSupId || "");
    const movType: MovementType =
      reason === "Damaged"          ? "damaged"
      : reason === "Lost"           ? "lost"
      : reason === "Customer Return" ? "customer-return"
      : reason === "Supplier Return" ? "supplier-return"
      : "manual-adjust";
    const dateStr = new Date().toISOString().split("T")[0];
    const sup = adjSupId ? displaySuppliers.find(s => s.id === adjSupId) : undefined;

    if (target.kind === "finished") {
      const p   = target.product;
      const cur = finishedOv[p.slug] ?? { stock250g: p.stock250g, stock500g: p.stock500g, stock1kg: p.stock1kg };
      const key = size === "250g" ? "stock250g" : size === "500g" ? "stock500g" : "stock1kg";
      const old = cur[key];
      const nxt = dir === "increase" ? old + qty : Math.max(0, old - qty);
      const next = { ...cur, [key]: nxt };
      setFinishedOv(prev => ({ ...prev, [p.slug]: next }));
      setMovements(prev => [{
        id: `mv-adj-${Date.now()}`, date: dateStr, type: movType, itemType: "finished", itemSlug: p.slug, itemName: p.nameEn,
        change: `${size} ${dir === "increase" ? "+" : "-"}${qty}`,
        before: `${size}:${old}`, after: `${size}:${nxt}`,
        orderRef: orderRef || undefined,
        supplierId: adjSupId || (sup ? adjSupId : undefined),
        reason: reason !== "Customer Return" && reason !== "Supplier Return" ? reason : undefined,
        notes, adminName: currentAdminName,
      }, ...prev]);
    } else if (target.kind === "bean") {
      const b   = target.bean;
      const cur = beanOv[b.slug] ?? b.stockKg;
      const nxt = dir === "increase" ? Math.round((cur + qty) * 10) / 10 : Math.max(0, Math.round((cur - qty) * 10) / 10);
      setBeanOv(prev => ({ ...prev, [b.slug]: nxt }));
      setMovements(prev => [{
        id: `mv-adj-${Date.now()}`, date: dateStr, type: movType, itemType: "bean", itemSlug: b.slug, itemName: b.nameEn,
        change: `${dir === "increase" ? "+" : "-"}${qty} KG`, before: `${cur} KG`, after: `${nxt} KG`,
        orderRef: orderRef || undefined,
        supplierId: adjSupId || undefined,
        reason: reason !== "Customer Return" && reason !== "Supplier Return" ? reason : undefined,
        notes, adminName: currentAdminName,
      }, ...prev]);
    } else {
      const item = target.item;
      const cur  = packOv[item.slug]?.quantity ?? item.quantity;
      const nxt  = dir === "increase" ? cur + qty : Math.max(0, cur - qty);
      setPackOv(prev => ({ ...prev, [item.slug]: { ...(prev[item.slug] ?? {}), quantity: nxt } }));
      setMovements(prev => [{
        id: `mv-adj-${Date.now()}`, date: dateStr, type: movType, itemType: "packaging", itemSlug: item.slug, itemName: item.name,
        change: `${dir === "increase" ? "+" : "-"}${qty} units`, before: `${cur} units`, after: `${nxt} units`,
        orderRef: orderRef || undefined,
        supplierId: adjSupId || undefined,
        reason: reason !== "Customer Return" && reason !== "Supplier Return" ? reason : undefined,
        notes, adminName: currentAdminName,
      }, ...prev]);
    }
    setAdjustTarget(null);
  }

  function handleSupplierSave(id: string, patch: Partial<Supplier>) {
    setSupOv(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
  }

  function handleAddSupplier() {
    const newSup: Supplier = {
      id: `sup-new-${Date.now()}`, name: "New Supplier", contactPerson: "", phone: "", whatsapp: "",
      preferred: false, categories: [], totalPurchasesEGP: 0, lastPurchaseDate: "", notes: "",
    };
    setAddedSups(prev => [newSup, ...prev]);
    setSupplierOpen(newSup);
  }

  function handlePackagingSave(data: Omit<PackagingItem, "archived">) {
    const existing = PACKAGING_ITEMS.find(i => i.slug === data.slug) || addedPack.find(i => i.slug === data.slug);
    if (existing) {
      setPackOv(prev => ({ ...prev, [data.slug]: { ...data, archived: false } }));
    } else {
      setAddedPack(prev => [{ ...data, archived: false }, ...prev.filter(i => i.slug !== data.slug)]);
    }
    setPackagingForm(null);
  }

  function handleArchive(slug: string) {
    setPackOv(prev => ({ ...prev, [slug]: { ...(prev[slug] ?? {}), archived: true } }));
  }

  const totalAlert = kpis.lowStockCount + kpis.outOfStockCount;

  if (!admin) {
    return (
      <div className="admin-surface p-6 text-sm text-[#b79b85]">
        Loading admin session...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6" style={{ minHeight: "100vh", background: "var(--coffee-black)" }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>Inventory</h1>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--cream-dim)" }}>
            {FINISHED_PRODUCTS.length} products · {ESPRESSO_BEANS.length} bean origins · {displayPackaging.length} packaging items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setLowStockOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: totalAlert > 0 ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)", color: totalAlert > 0 ? "#fbbf24" : "var(--cream-dim)", border: `1px solid ${totalAlert > 0 ? "rgba(251,191,36,0.22)" : "rgba(182,136,94,0.08)"}` }}>
            <AlertTriangle size={13} />
            Low Stock
            {totalAlert > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(251,191,36,0.20)", color: "#fbbf24" }}>{totalAlert}</span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Inventory Value"   value={kpis.totalValue.toLocaleString()}  unit="EGP"      icon={Boxes}         color="var(--gold)" />
        <KPICard label="Finished Units"    value={kpis.finishedUnits.toLocaleString()} unit="units"   icon={Package}       color="#93c5fd" />
        <KPICard label="Espresso Beans"    value={kpis.beanKg}                          unit="KG"      icon={Leaf}          color="#4ade80" />
        <KPICard label="Low Stock"         value={kpis.lowStockCount}                   unit="items"   icon={AlertTriangle} color="#fbbf24" />
        <KPICard label="Out of Stock"      value={kpis.outOfStockCount}                 unit="items"   icon={TrendingDown}  color="#f87171" />
      </div>

      {/* Tabs */}
      <div>
        <div className="flex items-center gap-1 overflow-x-auto pb-px" style={{ borderBottom: "1px solid rgba(182,136,94,0.10)" }}>
          {TABS.map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              className="px-4 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={{ background: activeTab === tab ? "rgba(182,136,94,0.10)" : "transparent", color: activeTab === tab ? "var(--gold)" : "var(--cream-dim)", borderBottom: activeTab === tab ? "2px solid var(--gold)" : "2px solid transparent" }}>
              {tab}
              {tab === "Stock Movements" && movItemFilter && (
                <span className="ml-1.5 w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#60a5fa", verticalAlign: "middle" }} />
              )}
            </button>
          ))}
        </div>

        <div className="pt-5">
          {activeTab === "Finished Products" && (
            <FinishedProductsTab
              products={displayFinished}
              catFilter={catFilter}
              onCatChange={setCatFilter}
              onRestock={p  => setRestockTarget({ kind: "finished", product: p })}
              onAdjust={p   => setAdjustTarget({ kind: "finished", product: p })}
              onViewMovements={handleViewMovements}
            />
          )}
          {activeTab === "Espresso Beans" && (
            <EspressoBeansTab
              beans={displayBeans}
              onRestock={b => setRestockTarget({ kind: "bean", bean: b })}
              onAdjust={b  => setAdjustTarget({ kind: "bean", bean: b })}
            />
          )}
          {activeTab === "Packaging" && (
            <PackagingTab
              items={displayPackaging}
              onRestock={i   => setRestockTarget({ kind: "packaging", item: i })}
              onAdjust={i    => setAdjustTarget({ kind: "packaging", item: i })}
              onEdit={i      => setPackagingForm(i)}
              onArchive={handleArchive}
              onAddNew={() => setPackagingForm("new")}
            />
          )}
          {activeTab === "Suppliers" && (
            <SuppliersTab
              suppliers={displaySuppliers}
              onOpen={s  => setSupplierOpen(s)}
              onAddNew={handleAddSupplier}
            />
          )}
          {activeTab === "Stock Movements" && (
            <MovementsTab
              movements={movementsFiltered}
              typeFilter={movTypeFilter}
              onTypeFilter={setMovTypeFilter}
              itemFilter={movItemFilter}
              onClearItemFilter={() => setMovItemFilter(null)}
            />
          )}
        </div>
      </div>

      {/* Drawers / Modals */}
      <RestockDrawer
        target={restockTarget}
        suppliers={displaySuppliers}
        onClose={() => setRestockTarget(null)}
        onSave={handleRestock}
      />
      <AdjustModal
        target={adjustTarget}
        suppliers={displaySuppliers}
        onClose={() => setAdjustTarget(null)}
        onSave={handleAdjust}
      />
      <LowStockPanel
        entries={lowStockEntries}
        isOpen={lowStockOpen}
        onClose={() => setLowStockOpen(false)}
        onRestock={t => { setLowStockOpen(false); setRestockTarget(t); }}
      />
      <SupplierDrawer
        supplier={supplierOpen}
        movements={movements}
        onClose={() => setSupplierOpen(null)}
        onSave={handleSupplierSave}
      />
      <PackagingFormModal
        item={packagingForm}
        onClose={() => setPackagingForm(null)}
        onSave={handlePackagingSave}
      />
    </div>
  );
}
