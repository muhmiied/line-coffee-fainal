"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Check,
  ChevronDown,
  Edit2,
  History,
  PackagePlus,
  Plus,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import {
  adjustPackagingStock,
  listPackagingItems,
  listPackagingMovements,
  savePackagingItem,
  type PackagingItemInput,
} from "@/lib/admin/admin-packaging";
import type {
  PackagingItem,
  PackagingKind,
  PackagingMovement,
} from "@/lib/types/inventory";

type StockStatus = "OK" | "Low" | "Out";
type AdjustmentMode = "restock" | "adjust";

type AdjustmentState = {
  item: PackagingItem;
  mode: AdjustmentMode;
};

type PackagingInventorySummary = {
  itemCount: number;
  totalUnits: number;
  lowCount: number;
  outCount: number;
};

const fieldClass = "w-full rounded-lg px-3 py-2.5 text-sm";
const fieldStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(182,136,94,0.15)",
  color: "var(--cream)",
  outline: "none",
};

function getPackagingStatus(item: PackagingItem): StockStatus {
  if (item.availableQuantity === 0) return "Out";
  if (item.availableQuantity <= item.lowStockThreshold) return "Low";
  return "OK";
}

function statusColor(status: StockStatus) {
  if (status === "Out") return "#f87171";
  if (status === "Low") return "#fbbf24";
  return "#4ade80";
}

function StatusBadge({ status }: { status: StockStatus }) {
  const color = statusColor(status);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: `${color}18`, color }}
    >
      {status !== "OK" && <AlertTriangle size={9} />}
      {status}
    </span>
  );
}

function capacityLabel(item: PackagingItem) {
  if (item.capacityG === 1000) return "1kg";
  if (item.capacityG) return `${item.capacityG}g`;
  return "General";
}

function kindLabel(kind: PackagingKind) {
  if (kind === "canister") return "Canister";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function movementLabel(type: PackagingMovement["movementType"]) {
  if (type === "order_deduction") return "Order used";
  if (type === "adjustment_in") return "Stock added";
  if (type === "adjustment_out") return "Stock removed";
  return "Opening stock";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--cream-dim)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function AdjustmentModal({
  state,
  onClose,
  onSaved,
}: {
  state: AdjustmentState;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [direction, setDirection] = useState<"increase" | "decrease">(
    state.mode === "restock" ? "increase" : "decrease",
  );
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState(
    state.item.costPerUnit == null ? "" : String(state.item.costPerUnit),
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentItem = state.item;
  const quantityNumber = Number(quantity);
  const unitCostNumber = unitCost === "" ? undefined : Number(unitCost);
  const validQuantity = Number.isInteger(quantityNumber) && quantityNumber > 0;
  const delta = direction === "increase" ? quantityNumber : -quantityNumber;
  const exceedsStock =
    direction === "decrease" &&
    validQuantity &&
    quantityNumber > currentItem.availableQuantity;
  const noteRequired = state.mode === "adjust";
  const validUnitCost =
    direction !== "increase" ||
    unitCostNumber == null ||
    (Number.isFinite(unitCostNumber) && unitCostNumber >= 0);
  const canSave =
    validQuantity &&
    validUnitCost &&
    !exceedsStock &&
    (!noteRequired || note.trim().length > 0);

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    try {
      await adjustPackagingStock(
        currentItem.id,
        delta,
        direction === "increase" ? unitCostNumber : undefined,
        note,
      );
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update packaging stock.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close packaging stock dialog"
        className="fixed inset-0 z-[300]"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="packaging-adjust-title"
        className="fixed left-1/2 top-1/2 z-[301] w-[90vw] max-w-[440px] rounded-2xl"
        style={{
          background: "var(--coffee-surface)",
          border: "1px solid rgba(182,136,94,0.15)",
          transform: "translate(-50%,-50%)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}
        >
          <div>
            <h2
              id="packaging-adjust-title"
              className="text-sm font-semibold"
              style={{ color: "var(--cream)" }}
            >
              {state.mode === "restock"
                ? "Restock packaging"
                : "Adjust packaging stock"}
            </h2>
            <p
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--cream-dim)" }}
            >
              {state.item.name} · {state.item.availableQuantity} units current
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={16} style={{ color: "var(--cream-dim)" }} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {state.mode === "adjust" && (
            <div className="grid grid-cols-2 gap-2">
              {(["increase", "decrease"] as const).map((value) => {
                const selected = direction === value;
                const color = value === "increase" ? "#4ade80" : "#f87171";
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDirection(value)}
                    aria-pressed={selected ? "true" : "false"}
                    className="rounded-lg py-2 text-sm font-medium capitalize"
                    style={{
                      background: selected
                        ? `${color}18`
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${
                        selected ? `${color}44` : "rgba(182,136,94,0.08)"
                      }`,
                      color: selected ? color : "var(--cream-dim)",
                    }}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          )}

          <Field label="Quantity (units)">
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={fieldClass}
              style={fieldStyle}
            />
          </Field>

          {direction === "increase" && (
            <Field label="Cost per unit (EGP, optional)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                className={fieldClass}
                style={fieldStyle}
              />
            </Field>
          )}

          <Field label={noteRequired ? "Reason / note (required)" : "Note (optional)"}>
            <textarea
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                state.mode === "restock"
                  ? "Supplier or invoice reference"
                  : "Count correction, damage, loss, or other reason"
              }
              className={`${fieldClass} resize-none`}
              style={fieldStyle}
            />
          </Field>

          {exceedsStock && (
            <p className="text-xs" style={{ color: "#f87171" }}>
              You cannot remove more than the current packaging stock.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                background: "rgba(248,113,113,0.08)",
                color: "#f87171",
              }}
            >
              {error}
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-3 px-5 py-4"
          style={{ borderTop: "1px solid rgba(182,136,94,0.08)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm"
            style={{ color: "var(--cream-dim)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold"
            style={{
              background: "rgba(182,136,94,0.18)",
              color: "var(--gold)",
              opacity: !canSave || saving ? 0.45 : 1,
            }}
          >
            {saving ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : state.mode === "restock" ? (
              <PackagePlus size={13} />
            ) : (
              <Save size={13} />
            )}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}

function ItemModal({
  item,
  onClose,
  onSaved,
}: {
  item: PackagingItem | "new";
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const existing = item !== "new" ? item : null;
  const [operationalKey, setOperationalKey] = useState(
    existing?.operationalKey ?? "",
  );
  const [name, setName] = useState(existing?.name ?? "");
  const [sku, setSku] = useState(existing?.sku ?? "");
  const [kind, setKind] = useState<PackagingKind>(
    existing?.packagingKind ?? "bag",
  );
  const [capacity, setCapacity] = useState(
    existing?.capacityG ? String(existing.capacityG) : "",
  );
  const [threshold, setThreshold] = useState(
    String(existing?.lowStockThreshold ?? 0),
  );
  const [cost, setCost] = useState(
    existing?.costPerUnit == null ? "" : String(existing.costPerUnit),
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [active, setActive] = useState(existing?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const keyValid = /^[a-z0-9_]{2,64}$/.test(operationalKey);
  const thresholdNumber = Number(threshold);
  const capacityNumber = capacity === "" ? undefined : Number(capacity);
  const costNumber = cost === "" ? undefined : Number(cost);
  const canSave =
    name.trim().length > 0 &&
    keyValid &&
    Number.isInteger(thresholdNumber) &&
    thresholdNumber >= 0 &&
    (capacityNumber == null ||
      (Number.isInteger(capacityNumber) && capacityNumber > 0)) &&
    (costNumber == null || (Number.isFinite(costNumber) && costNumber >= 0));

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    const payload: PackagingItemInput = {
      id: existing?.id,
      operationalKey,
      name: name.trim(),
      sku: sku.trim() || undefined,
      packagingKind: kind,
      capacityG: capacityNumber,
      lowStockThreshold: thresholdNumber,
      active,
      costPerUnit: costNumber,
      notes: notes.trim() || undefined,
    };
    try {
      await savePackagingItem(payload);
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save the packaging item.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close packaging item dialog"
        className="fixed inset-0 z-[300]"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="packaging-item-title"
        className="fixed left-1/2 top-1/2 z-[301] max-h-[90vh] w-[92vw] max-w-[520px] overflow-y-auto rounded-2xl"
        style={{
          background: "var(--coffee-surface)",
          border: "1px solid rgba(182,136,94,0.15)",
          transform: "translate(-50%,-50%)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}
        >
          <h2
            id="packaging-item-title"
            className="text-sm font-semibold"
            style={{ color: "var(--cream)" }}
          >
            {existing ? `Edit ${existing.name}` : "Add packaging item"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={16} style={{ color: "var(--cream-dim)" }} />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Item name">
              <input
                value={name}
                maxLength={160}
                onChange={(event) => setName(event.target.value)}
                className={fieldClass}
                style={fieldStyle}
              />
            </Field>
          </div>
          <Field label="Operational key">
            <input
              value={operationalKey}
              maxLength={64}
              disabled={Boolean(existing)}
              onChange={(event) =>
                setOperationalKey(event.target.value.toLowerCase())
              }
              placeholder="bag_250g"
              className={fieldClass}
              style={{ ...fieldStyle, opacity: existing ? 0.6 : 1 }}
            />
            {existing && (
              <span
                className="mt-1 block text-[10px]"
                style={{ color: "var(--cream-dim)" }}
              >
                Fixed after creation to protect checkout mappings.
              </span>
            )}
          </Field>
          <Field label="SKU (optional)">
            <input
              value={sku}
              maxLength={80}
              onChange={(event) => setSku(event.target.value)}
              className={fieldClass}
              style={fieldStyle}
            />
          </Field>
          <Field label="Type">
            <div className="relative">
              <select
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as PackagingKind)
                }
                className={`${fieldClass} appearance-none pr-8`}
                style={{ ...fieldStyle, colorScheme: "dark" }}
              >
                <option value="bag">Bag</option>
                <option value="jar">Jar</option>
                <option value="canister">Canister</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--cream-dim)" }}
              />
            </div>
          </Field>
          <Field label="Size / capacity (grams)">
            <input
              type="number"
              min="1"
              step="1"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              placeholder="250"
              className={fieldClass}
              style={fieldStyle}
            />
          </Field>
          <Field label="Low stock threshold">
            <input
              type="number"
              min="0"
              step="1"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              className={fieldClass}
              style={fieldStyle}
            />
          </Field>
          <Field label="Default unit cost (EGP)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              className={fieldClass}
              style={fieldStyle}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes (optional)">
              <textarea
                rows={3}
                maxLength={2000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={`${fieldClass} resize-none`}
                style={fieldStyle}
              />
            </Field>
          </div>
          <label
            className="flex items-center justify-between rounded-lg px-3 py-2.5 sm:col-span-2"
            style={{
              background: "rgba(182,136,94,0.05)",
              border: "1px solid rgba(182,136,94,0.10)",
              color: "var(--cream)",
            }}
          >
            <span className="text-sm">Active packaging item</span>
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="h-4 w-4 accent-[#b6885e]"
            />
          </label>

          {!keyValid && operationalKey.length > 0 && (
            <p className="text-xs sm:col-span-2" style={{ color: "#fbbf24" }}>
              Use 2–64 lowercase letters, numbers, and underscores.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg px-3 py-2 text-xs sm:col-span-2"
              style={{
                background: "rgba(248,113,113,0.08)",
                color: "#f87171",
              }}
            >
              {error}
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-3 px-5 py-4"
          style={{ borderTop: "1px solid rgba(182,136,94,0.08)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm"
            style={{ color: "var(--cream-dim)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold"
            style={{
              background: "rgba(182,136,94,0.18)",
              color: "var(--gold)",
              opacity: !canSave || saving ? 0.45 : 1,
            }}
          >
            {saving ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}
            {saving ? "Saving…" : "Save item"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function PackagingInventoryPanel() {
  const [items, setItems] = useState<PackagingItem[]>([]);
  const [movements, setMovements] = useState<PackagingMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adjustment, setAdjustment] = useState<AdjustmentState | null>(null);
  const [editing, setEditing] = useState<PackagingItem | "new" | null>(null);

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const [nextItems, nextMovements] = await Promise.all([
        listPackagingItems(),
        listPackagingMovements(),
      ]);
      setItems(nextItems);
      setMovements(nextMovements);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load packaging inventory.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial client-side admin fetch; the callback owns loading/error state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const activeItems = useMemo(
    () => items.filter((item) => item.active),
    [items],
  );
  const summary = useMemo<PackagingInventorySummary>(
    () => ({
      itemCount: activeItems.length,
      totalUnits: activeItems.reduce(
        (total, item) => total + item.availableQuantity,
        0,
      ),
      lowCount: activeItems.filter(
        (item) => getPackagingStatus(item) === "Low",
      ).length,
      outCount: activeItems.filter(
        (item) => getPackagingStatus(item) === "Out",
      ).length,
    }),
    [activeItems],
  );

  const itemNames = useMemo(
    () => new Map(items.map((item) => [item.id, item.name])),
    [items],
  );
  const recentMovements = movements.slice(0, 20);

  async function handleSaved(message: string) {
    await loadData(true);
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 3000);
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className="rounded-xl px-4 py-3"
        style={{
          background: "rgba(96,165,250,0.05)",
          border: "1px solid rgba(96,165,250,0.12)",
        }}
      >
        <div className="flex items-start gap-3">
          <Boxes size={17} className="mt-0.5 shrink-0" style={{ color: "#93c5fd" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--cream)" }}>
              Packaging inventory is counted in units
            </p>
            <p
              className="mt-1 text-[11px] leading-relaxed"
              style={{ color: "var(--cream-dim)" }}
            >
              This stock is separate from coffee inventory measured in KG.
              Packaging is consumed independently at checkout; shortage remains
              an operational alert and does not block an order.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Active items", summary.itemCount, "var(--gold)"],
          ["Units available", summary.totalUnits.toLocaleString(), "#93c5fd"],
          ["Low stock", summary.lowCount, "#fbbf24"],
          ["Out of stock", summary.outCount, "#f87171"],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="admin-kpi-card p-4">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--cream-dim)" }}
            >
              {label}
            </p>
            <p
              className="mt-2 text-xl font-bold tabular-nums"
              style={{ color: String(color) }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--cream)" }}>
            Packaging stock
          </h2>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--cream-dim)" }}>
            Live count-based stock and low-stock thresholds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(182,136,94,0.10)",
              color: "var(--cream-dim)",
            }}
          >
            <RefreshCw
              size={12}
              className={refreshing ? "animate-spin" : undefined}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold"
            style={{
              background: "rgba(182,136,94,0.14)",
              border: "1px solid rgba(182,136,94,0.20)",
              color: "var(--gold)",
            }}
          >
            <Plus size={13} />
            Add item
          </button>
        </div>
      </div>

      {success && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ background: "rgba(74,222,128,0.08)", color: "#4ade80" }}
        >
          <Check size={13} />
          {success}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs"
          style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}
        >
          <span>{error}</span>
          <button type="button" onClick={() => void loadData()}>
            Try again
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(182,136,94,0.10)" }}>
              {[
                "Item",
                "Size / type",
                "Current stock",
                "Low threshold",
                "Status",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--cream-dim)" }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-10 text-center text-sm"
                  style={{ color: "var(--cream-dim)" }}
                >
                  Loading packaging stock…
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const status = getPackagingStatus(item);
                return (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{
                      borderBottom: "1px solid rgba(182,136,94,0.05)",
                      opacity: item.active ? 1 : 0.55,
                    }}
                  >
                    <td className="px-3 py-3">
                      <p className="font-medium" style={{ color: "var(--cream)" }}>
                        {item.name}
                      </p>
                      <p
                        className="mt-0.5 text-[10px]"
                        style={{ color: "var(--cream-dim)" }}
                      >
                        {item.sku ?? item.operationalKey}
                        {!item.active && " · Inactive"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="rounded px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            background: "rgba(96,165,250,0.10)",
                            color: "#93c5fd",
                          }}
                        >
                          {capacityLabel(item)}
                        </span>
                        <span
                          className="text-[11px]"
                          style={{ color: "var(--cream-dim)" }}
                        >
                          {kindLabel(item.packagingKind)}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-3 py-3 font-bold tabular-nums"
                      style={{ color: statusColor(status) }}
                    >
                      {item.availableQuantity.toLocaleString()} units
                    </td>
                    <td
                      className="px-3 py-3 text-[11px] tabular-nums"
                      style={{ color: "var(--cream-dim)" }}
                    >
                      {item.lowStockThreshold.toLocaleString()} units
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setAdjustment({ item, mode: "restock" })
                          }
                          title="Restock packaging"
                          aria-label={`Restock ${item.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/[0.08]"
                          style={{ color: "#4ade80" }}
                        >
                          <PackagePlus size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAdjustment({ item, mode: "adjust" })
                          }
                          title="Adjust packaging stock"
                          aria-label={`Adjust ${item.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/[0.08]"
                          style={{ color: "#fbbf24" }}
                        >
                          <RefreshCw size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(item)}
                          title="Edit packaging item"
                          aria-label={`Edit ${item.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/[0.08]"
                          style={{ color: "#93c5fd" }}
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {!loading && items.length === 0 && !error && (
          <div className="py-12 text-center">
            <Boxes size={24} className="mx-auto" style={{ color: "var(--gold)" }} />
            <p className="mt-2 text-sm" style={{ color: "var(--cream)" }}>
              No packaging items yet
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--cream-dim)" }}>
              Add the first item, then record its opening stock with Restock.
            </p>
          </div>
        )}
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <History size={14} style={{ color: "var(--gold)" }} />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--cream)" }}>
              Recent packaging movements
            </h2>
            <p className="text-[10px]" style={{ color: "var(--cream-dim)" }}>
              Restocks, manual adjustments, and order usage
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {recentMovements.map((movement) => {
            const incoming = movement.quantityDelta > 0;
            return (
              <div
                key={movement.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg px-3 py-2.5"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(182,136,94,0.07)",
                }}
              >
                <div className="min-w-[180px] flex-1">
                  <p className="text-xs font-medium" style={{ color: "var(--cream)" }}>
                    {itemNames.get(movement.packagingItemId) ??
                      "Packaging item"}
                  </p>
                  <p
                    className="mt-0.5 text-[10px]"
                    style={{ color: "var(--cream-dim)" }}
                  >
                    {movementLabel(movement.movementType)} ·{" "}
                    {formatDate(movement.createdAt)}
                  </p>
                </div>
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color: incoming ? "#4ade80" : "#f87171" }}
                >
                  {incoming ? "+" : ""}
                  {movement.quantityDelta.toLocaleString()} units
                </span>
                {movement.note && (
                  <span
                    className="w-full text-[11px] italic"
                    style={{ color: "var(--cream-dim)" }}
                  >
                    “{movement.note}”
                  </span>
                )}
              </div>
            );
          })}
          {!loading && recentMovements.length === 0 && (
            <p
              className="rounded-lg px-3 py-8 text-center text-sm"
              style={{
                background: "rgba(255,255,255,0.02)",
                color: "var(--cream-dim)",
              }}
            >
              No packaging movements recorded yet.
            </p>
          )}
        </div>
      </section>

      {adjustment && (
        <AdjustmentModal
          key={`${adjustment.item.id}-${adjustment.mode}`}
          state={adjustment}
          onClose={() => setAdjustment(null)}
          onSaved={() => handleSaved("Packaging stock updated.")}
        />
      )}
      {editing && (
        <ItemModal
          key={editing === "new" ? "new" : editing.id}
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => handleSaved("Packaging item saved.")}
        />
      )}
    </div>
  );
}
