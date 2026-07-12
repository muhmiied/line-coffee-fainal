"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Check,
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

const fieldClass = "admin-input !text-sm";

function getPackagingStatus(item: PackagingItem): StockStatus {
  if (item.availableQuantity === 0) return "Out";
  if (item.availableQuantity <= item.lowStockThreshold) return "Low";
  return "OK";
}

function statusColor(status: StockStatus) {
  if (status === "Out") return "#e39a8c";
  if (status === "Low") return "#e3b673";
  return "#8fcf9a";
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
        style={{ color: "var(--admin-muted)" }}
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
        className="admin-modal-overlay fixed inset-0 z-[300]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="packaging-adjust-title"
        className="admin-modal-surface fixed left-1/2 top-1/2 z-[301] w-[90vw] max-w-[440px] rounded-2xl"
        style={{ transform: "translate(-50%,-50%)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--admin-border)" }}
        >
          <div>
            <h2
              id="packaging-adjust-title"
              className="text-sm font-semibold"
              style={{ color: "var(--admin-white-coffee)" }}
            >
              {state.mode === "restock"
                ? "Restock packaging"
                : "Adjust packaging stock"}
            </h2>
            <p
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--admin-muted)" }}
            >
              {state.item.name} · {state.item.availableQuantity} units current
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="admin-btn admin-btn-sm !p-1.5">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {state.mode === "adjust" && (
            <div className="grid grid-cols-2 gap-2">
              {(["increase", "decrease"] as const).map((value) => {
                const selected = direction === value;
                const color = value === "increase" ? "#8fcf9a" : "#e39a8c";
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
                        selected ? `${color}44` : "var(--admin-border)"
                      }`,
                      color: selected ? color : "var(--admin-muted)",
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
              className={fieldClass}            />
          </Field>

          {direction === "increase" && (
            <Field label="Cost per unit (EGP, optional)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                className={fieldClass}              />
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
              className={`${fieldClass} resize-none`}            />
          </Field>

          {exceedsStock && (
            <p className="text-xs" style={{ color: "#e39a8c" }}>
              You cannot remove more than the current packaging stock.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                background: "rgba(248,113,113,0.08)",
                color: "#e39a8c",
              }}
            >
              {error}
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-3 px-5 py-4"
          style={{ borderTop: "1px solid var(--admin-border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="admin-btn !px-4 !py-2 !text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="admin-btn admin-btn-primary flex items-center gap-2 !px-5 !py-2 !text-sm"
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
        className="admin-modal-overlay fixed inset-0 z-[300]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="packaging-item-title"
        className="admin-modal-surface fixed left-1/2 top-1/2 z-[301] max-h-[90vh] w-[92vw] max-w-[520px] overflow-y-auto rounded-2xl"
        style={{ transform: "translate(-50%,-50%)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--admin-border)" }}
        >
          <h2
            id="packaging-item-title"
            className="text-sm font-semibold"
            style={{ color: "var(--admin-white-coffee)" }}
          >
            {existing ? `Edit ${existing.name}` : "Add packaging item"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="admin-btn admin-btn-sm !p-1.5">
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Item name">
              <input
                value={name}
                maxLength={160}
                onChange={(event) => setName(event.target.value)}
                className={fieldClass}              />
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
              style={{ opacity: existing ? 0.6 : 1 }}
            />
            {existing && (
              <span
                className="mt-1 block text-[10px]"
                style={{ color: "var(--admin-muted)" }}
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
              className={fieldClass}            />
          </Field>
          <Field label="Type">
            <select
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as PackagingKind)
              }
              className="admin-select !text-sm"
            >
              <option value="bag">Bag</option>
              <option value="jar">Jar</option>
              <option value="canister">Canister</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Size / capacity (grams)">
            <input
              type="number"
              min="1"
              step="1"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              placeholder="250"
              className={fieldClass}            />
          </Field>
          <Field label="Low stock threshold">
            <input
              type="number"
              min="0"
              step="1"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              className={fieldClass}            />
          </Field>
          <Field label="Default unit cost (EGP)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              className={fieldClass}            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes (optional)">
              <textarea
                rows={3}
                maxLength={2000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={`${fieldClass} resize-none`}              />
            </Field>
          </div>
          <label className="admin-surface !shadow-none flex items-center justify-between px-3 py-2.5 sm:col-span-2 admin-text">
            <span className="text-sm">Active packaging item</span>
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="h-4 w-4 accent-[#b6885e]"
            />
          </label>

          {!keyValid && operationalKey.length > 0 && (
            <p className="text-xs sm:col-span-2" style={{ color: "#e3b673" }}>
              Use 2–64 lowercase letters, numbers, and underscores.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg px-3 py-2 text-xs sm:col-span-2"
              style={{
                background: "rgba(248,113,113,0.08)",
                color: "#e39a8c",
              }}
            >
              {error}
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-3 px-5 py-4"
          style={{ borderTop: "1px solid var(--admin-border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="admin-btn !px-4 !py-2 !text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="admin-btn admin-btn-primary flex items-center gap-2 !px-5 !py-2 !text-sm"
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
      <div className="rounded-xl px-4 py-3" style={{ background: "rgba(143,176,217,0.06)", border: "1px solid rgba(143,176,217,0.20)" }}>
        <div className="flex items-start gap-3">
          <Boxes size={17} className="mt-0.5 shrink-0" style={{ color: "#8fb0d9" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--admin-heading)" }}>
              Packaging inventory is counted in units
            </p>
            <p className="mt-1 text-[11px] leading-relaxed admin-muted">
              This stock is separate from coffee inventory measured in KG.
              Packaging is consumed independently at checkout; shortage remains
              an operational alert and does not block an order.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Active items", summary.itemCount, "var(--admin-hazelnut)"],
          ["Units available", summary.totalUnits.toLocaleString(), "#8fb0d9"],
          ["Low stock", summary.lowCount, "#e3b673"],
          ["Out of stock", summary.outCount, "#e39a8c"],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="admin-kpi-card">
            <p className="admin-label">
              {label}
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums" style={{ color: String(color) }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="admin-card-title">
            Packaging stock
          </h2>
          <p className="mt-0.5 text-[11px] admin-faint">
            Live count-based stock and low-stock thresholds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void loadData(true)} disabled={refreshing} className="admin-btn flex items-center gap-1.5 !px-3 !py-2 !text-xs">
            <RefreshCw size={12} className={refreshing ? "animate-spin" : undefined} />
            Refresh
          </button>
          <button type="button" onClick={() => setEditing("new")} className="admin-btn admin-btn-primary flex items-center gap-1.5 !px-3.5 !py-2 !text-xs">
            <Plus size={13} />
            Add item
          </button>
        </div>
      </div>

      {success && (
        <p role="status" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(143,207,154,0.10)", color: "#8fcf9a" }}>
          <Check size={13} />
          {success}
        </p>
      )}
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(227,154,140,0.10)", color: "#eeb4a8" }}>
          <span>{error}</span>
          <button type="button" onClick={() => void loadData()} className="admin-link">
            Try again
          </button>
        </div>
      )}

      <div className="admin-table-wrap overflow-x-auto">
        <table className="admin-table w-full min-w-[820px]">
          <thead>
            <tr>
              {[
                "Item",
                "Size / type",
                "Current stock",
                "Low threshold",
                "Status",
                "Actions",
              ].map((heading) => (
                <th key={heading}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="!py-10 text-center text-sm admin-muted">
                  Loading packaging stock…
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const status = getPackagingStatus(item);
                return (
                  <tr key={item.id} style={{ opacity: item.active ? 1 : 0.55 }}>
                    <td className="admin-td-strong">
                      <p className="font-medium">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-[10px] admin-faint">
                        {item.sku ?? item.operationalKey}
                        {!item.active && " · Inactive"}
                      </p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="admin-badge" style={{ background: "rgba(143,176,217,0.12)", color: "#8fb0d9" }}>
                          {capacityLabel(item)}
                        </span>
                        <span className="text-[11px] admin-muted">
                          {kindLabel(item.packagingKind)}
                        </span>
                      </div>
                    </td>
                    <td className="admin-table-numeric font-bold" style={{ color: statusColor(status) }}>
                      {item.availableQuantity.toLocaleString()} units
                    </td>
                    <td className="admin-table-numeric text-[11px] admin-muted">
                      {item.lowStockThreshold.toLocaleString()} units
                    </td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setAdjustment({ item, mode: "restock" })}
                          title="Restock packaging"
                          aria-label={`Restock ${item.name}`}
                          className="admin-btn admin-btn-sm !w-7 !h-7 !p-0"
                          style={{ color: "#8fcf9a" }}
                        >
                          <PackagePlus size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustment({ item, mode: "adjust" })}
                          title="Adjust packaging stock"
                          aria-label={`Adjust ${item.name}`}
                          className="admin-btn admin-btn-sm !w-7 !h-7 !p-0"
                          style={{ color: "#e3b673" }}
                        >
                          <RefreshCw size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(item)}
                          title="Edit packaging item"
                          aria-label={`Edit ${item.name}`}
                          className="admin-btn admin-btn-sm !w-7 !h-7 !p-0"
                          style={{ color: "#8fb0d9" }}
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
          <div className="admin-empty-state !border-0 !rounded-none">
            <span className="admin-empty-icon"><Boxes size={22} /></span>
            <p className="text-sm admin-text">
              No packaging items yet
            </p>
            <p className="text-xs admin-muted">
              Add the first item, then record its opening stock with Restock.
            </p>
          </div>
        )}
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <History size={14} style={{ color: "var(--admin-hazelnut)" }} />
          <div>
            <h2 className="admin-card-title">
              Recent packaging movements
            </h2>
            <p className="text-[10px] admin-faint">
              Restocks, manual adjustments, and order usage
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {recentMovements.map((movement) => {
            const incoming = movement.quantityDelta > 0;
            return (
              <div key={movement.id} className="admin-surface !shadow-none flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
                <div className="min-w-[180px] flex-1">
                  <p className="text-xs font-medium admin-text">
                    {itemNames.get(movement.packagingItemId) ??
                      "Packaging item"}
                  </p>
                  <p className="mt-0.5 text-[10px] admin-faint">
                    {movementLabel(movement.movementType)} ·{" "}
                    {formatDate(movement.createdAt)}
                  </p>
                </div>
                <span className="text-xs font-bold tabular-nums" style={{ color: incoming ? "#8fcf9a" : "#e39a8c" }}>
                  {incoming ? "+" : ""}
                  {movement.quantityDelta.toLocaleString()} units
                </span>
                {movement.note && (
                  <span className="w-full text-[11px] italic admin-faint">
                    “{movement.note}”
                  </span>
                )}
              </div>
            );
          })}
          {!loading && recentMovements.length === 0 && (
            <div className="admin-empty-state">
              <p className="text-sm admin-muted">No packaging movements recorded yet.</p>
            </div>
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
