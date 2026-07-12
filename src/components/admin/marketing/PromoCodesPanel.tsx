"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Edit3,
  Percent,
  Plus,
  RefreshCw,
  Save,
  Tag,
  X,
} from "lucide-react";
import {
  deactivatePromoCode,
  listPromoCodes,
  savePromoCode,
  type PromoCodeInput,
} from "@/lib/admin/admin-marketing";
import type {
  PromoCode,
  PromoCodeDiscountType,
  PromoCodeStatus,
} from "@/lib/types/marketing";
import { MixedNumeric } from "@/components/shared/MixedNumeric";

type Filter = "all" | PromoCodeStatus;
type EffectiveStatus = "Active" | "Inactive" | "Scheduled" | "Expired";

const inputClass = "admin-input !text-sm";
const fieldLabelClass = "admin-label mb-1.5 block !text-[10px]";

function money(value: number) {
  return `${new Intl.NumberFormat("en-EG", {
    maximumFractionDigits: 2,
  }).format(value)} EGP`;
}

function effectiveStatus(promo: PromoCode): EffectiveStatus {
  if (promo.status === "inactive") return "Inactive";
  const now = Date.now();
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) {
    return "Scheduled";
  }
  if (promo.endsAt && new Date(promo.endsAt).getTime() <= now) {
    return "Expired";
  }
  return "Active";
}

function statusStyle(status: EffectiveStatus) {
  if (status === "Active") {
    return "border-[#8fcf9a]/25 bg-[#8fcf9a]/10 text-[#8fcf9a]";
  }
  if (status === "Scheduled") {
    return "border-[#b7cbe6]/25 bg-[#b7cbe6]/10 text-[#b7cbe6]";
  }
  if (status === "Expired") {
    return "border-[#e3b673]/25 bg-[#e3b673]/10 text-[#e3b673]";
  }
  return "border-[#6b5744]/30 bg-[#2a2018] text-[#b79b85]";
}

function discountLabel(promo: PromoCode) {
  return promo.discountType === "percentage"
    ? `${promo.value}%`
    : money(promo.value);
}

function dateLabel(value?: string) {
  if (!value) return "No limit";
  return new Intl.DateTimeFormat("en-EG", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function toLocalInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={fieldLabelClass}>
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10px] admin-faint">{hint}</span>}
    </label>
  );
}

function PromoModal({
  promo,
  onClose,
  onSaved,
}: {
  promo: PromoCode | "new";
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const existing = promo === "new" ? null : promo;
  const [code, setCode] = useState(existing?.code ?? "");
  const [status, setStatus] = useState<PromoCodeStatus>(
    existing?.status ?? "active",
  );
  const [discountType, setDiscountType] =
    useState<PromoCodeDiscountType>(
      existing?.discountType ?? "percentage",
    );
  const [value, setValue] = useState(
    existing?.value == null ? "" : String(existing.value),
  );
  const [minimumSubtotal, setMinimumSubtotal] = useState(
    existing?.minimumSubtotal == null
      ? ""
      : String(existing.minimumSubtotal),
  );
  const [maxDiscount, setMaxDiscount] = useState(
    existing?.maxDiscount == null ? "" : String(existing.maxDiscount),
  );
  const [startsAt, setStartsAt] = useState(toLocalInput(existing?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(existing?.endsAt));
  const [usageLimit, setUsageLimit] = useState(
    existing?.usageLimit == null ? "" : String(existing.usageLimit),
  );
  const [perCustomerLimit, setPerCustomerLimit] = useState(
    existing?.perCustomerLimit == null
      ? ""
      : String(existing.perCustomerLimit),
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const normalizedCode = code.trim().toUpperCase();
  const valueNumber = Number(value);
  const minimumNumber =
    minimumSubtotal === "" ? undefined : Number(minimumSubtotal);
  const maxNumber = maxDiscount === "" ? undefined : Number(maxDiscount);
  const usageNumber = usageLimit === "" ? undefined : Number(usageLimit);
  const perCustomerNumber =
    perCustomerLimit === "" ? undefined : Number(perCustomerLimit);
  const startsIso = startsAt ? new Date(startsAt).getTime() : undefined;
  const endsIso = endsAt ? new Date(endsAt).getTime() : undefined;

  const codeValid = /^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(normalizedCode);
  const valueValid =
    Number.isFinite(valueNumber) &&
    valueNumber > 0 &&
    (discountType !== "percentage" || valueNumber <= 100);
  const minimumValid =
    minimumNumber == null ||
    (Number.isFinite(minimumNumber) && minimumNumber >= 0);
  const maximumValid =
    maxNumber == null || (Number.isFinite(maxNumber) && maxNumber > 0);
  const usageValid =
    usageNumber == null ||
    (Number.isInteger(usageNumber) && usageNumber > 0);
  const customerLimitValid =
    perCustomerNumber == null ||
    (Number.isInteger(perCustomerNumber) && perCustomerNumber > 0);
  const datesValid =
    startsIso == null ||
    endsIso == null ||
    (Number.isFinite(startsIso) &&
      Number.isFinite(endsIso) &&
      endsIso > startsIso);
  const canSave =
    codeValid &&
    valueValid &&
    minimumValid &&
    maximumValid &&
    usageValid &&
    customerLimitValid &&
    datesValid;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    const payload: PromoCodeInput = {
      id: existing?.id,
      code: normalizedCode,
      status,
      discountType,
      value: valueNumber,
      minimumSubtotal: minimumNumber,
      maxDiscount: maxNumber,
      startsAt: toIso(startsAt),
      endsAt: toIso(endsAt),
      usageLimit: usageNumber,
      perCustomerLimit: perCustomerNumber,
      notes: notes.trim() || undefined,
    };
    try {
      await savePromoCode(payload);
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save the promo code.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close promo code dialog"
        className="admin-modal-overlay fixed inset-0 z-[300]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-dialog-title"
        className="admin-modal-surface fixed left-1/2 top-1/2 z-[301] flex max-h-[90vh] w-[94vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl"
      >
        <div className="admin-drawer-header flex items-center justify-between px-5 py-4">
          <div>
            <h2 id="promo-dialog-title" className="text-sm font-semibold" style={{ color: "var(--admin-heading)" }}>
              {existing ? `Edit ${existing.code}` : "Create promo code"}
            </h2>
            <p className="mt-0.5 text-[11px] admin-faint">
              Discounts apply to product subtotal only. Delivery is never discounted.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="admin-btn admin-btn-sm !p-1.5">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="admin-scrollbar grid gap-4 overflow-y-auto p-5 md:grid-cols-2">
            <Field
              label="Promo code"
              hint="2–32 uppercase letters, numbers, hyphens, or underscores."
            >
              <input
                value={code}
                maxLength={32}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="LINE10"
                autoComplete="off"
                className={`${inputClass} font-mono uppercase`}
              />
            </Field>
            <Field
              label="Status"
              hint="Inactive codes are rejected at checkout."
            >
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as PromoCodeStatus)
                }
                className="admin-select !text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Discount type">
              <select
                value={discountType}
                onChange={(event) =>
                  setDiscountType(
                    event.target.value as PromoCodeDiscountType,
                  )
                }
                className="admin-select !text-sm"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed amount</option>
              </select>
            </Field>
            <Field
              label={
                discountType === "percentage"
                  ? "Discount value (%)"
                  : "Discount value (EGP)"
              }
              hint={
                discountType === "percentage"
                  ? "Must be between 0 and 100."
                  : undefined
              }
            >
              <input
                type="number"
                min="0.01"
                max={discountType === "percentage" ? 100 : undefined}
                step="0.01"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label="Minimum product subtotal (EGP)"
              hint="Delivery does not count toward this minimum."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={minimumSubtotal}
                onChange={(event) => setMinimumSubtotal(event.target.value)}
                placeholder="No minimum"
                className={inputClass}
              />
            </Field>
            <Field
              label="Maximum discount (EGP)"
              hint="Optional cap, especially useful for percentage codes."
            >
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={maxDiscount}
                onChange={(event) => setMaxDiscount(event.target.value)}
                placeholder="No cap"
                className={inputClass}
              />
            </Field>
            <Field label="Starts at" hint="Leave blank for immediate availability.">
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className={inputClass}
                style={{ colorScheme: "dark" }}
              />
            </Field>
            <Field label="Expires at" hint="The code stops working at this time.">
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className={inputClass}
                style={{ colorScheme: "dark" }}
              />
            </Field>
            <Field label="Total usage limit" hint="Leave blank for unlimited uses.">
              <input
                type="number"
                min="1"
                step="1"
                value={usageLimit}
                onChange={(event) => setUsageLimit(event.target.value)}
                placeholder="Unlimited"
                className={inputClass}
              />
            </Field>
            <Field
              label="Per-customer limit"
              hint="Leave blank for no per-customer cap."
            >
              <input
                type="number"
                min="1"
                step="1"
                value={perCustomerLimit}
                onChange={(event) => setPerCustomerLimit(event.target.value)}
                placeholder="Unlimited"
                className={inputClass}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Internal notes">
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>

            {!datesValid && (
              <p className="text-xs md:col-span-2" style={{ color: "#e3b673" }}>
                Expiry must be later than the start time.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg px-3 py-2 text-xs md:col-span-2"
                style={{ background: "rgba(227,154,140,0.10)", color: "#eeb4a8" }}
              >
                {error}
              </p>
            )}
          </div>

          <div className="admin-drawer-footer flex justify-end gap-3 px-5 py-4">
            <button type="button" onClick={onClose} className="admin-btn !px-4 !py-2 !text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave || saving}
              className="admin-btn admin-btn-primary inline-flex items-center gap-2 !px-5 !py-2 !text-sm"
            >
              {saving ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              {saving ? "Saving…" : existing ? "Save changes" : "Create code"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function PromoCodesPanel() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<PromoCode | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPromos = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setPromos(await listPromoCodes());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load promo codes.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial authenticated admin fetch; the callback owns request state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPromos();
  }, [loadPromos]);

  const displayed = useMemo(
    () =>
      filter === "all"
        ? promos
        : promos.filter((promo) => promo.status === filter),
    [filter, promos],
  );
  const summary = useMemo(
    () => ({
      active: promos.filter((promo) => effectiveStatus(promo) === "Active")
        .length,
      inactive: promos.filter((promo) => promo.status === "inactive").length,
      redemptions: promos.reduce((sum, promo) => sum + promo.usedCount, 0),
    }),
    [promos],
  );

  async function handleSaved(message: string) {
    await loadPromos(true);
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 3000);
  }

  async function handleToggle(promo: PromoCode) {
    if (busyId) return;
    setBusyId(promo.id);
    setError("");
    try {
      if (promo.status === "active") {
        await deactivatePromoCode(promo.id);
        await handleSaved(`${promo.code} is now inactive.`);
      } else {
        await savePromoCode({
          id: promo.id,
          code: promo.code,
          status: "active",
          discountType: promo.discountType,
          value: promo.value,
          minimumSubtotal: promo.minimumSubtotal,
          maxDiscount: promo.maxDiscount,
          startsAt: promo.startsAt,
          endsAt: promo.endsAt,
          usageLimit: promo.usageLimit,
          perCustomerLimit: promo.perCustomerLimit,
          notes: promo.notes,
        });
        await handleSaved(`${promo.code} is active.`);
      }
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not update the promo code.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function copyCode(code: string) {
    void navigator.clipboard?.writeText(code).catch(() => undefined);
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(null), 1600);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl px-4 py-3" style={{ background: "rgba(143,176,217,0.06)", border: "1px solid rgba(143,176,217,0.20)" }}>
        <div className="flex items-start gap-3">
          <Tag size={16} className="mt-0.5 shrink-0" style={{ color: "#8fb0d9" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--admin-heading)" }}>
              Promo discounts apply to product subtotal only
            </p>
            <p className="mt-1 text-[11px] leading-relaxed admin-muted">
              Delivery fees are calculated separately and are never discounted.
              Inactive, expired, not-yet-started, or exhausted codes are rejected
              by checkout.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Active now", summary.active, "#8fcf9a"],
          ["Inactive", summary.inactive, "var(--admin-muted)"],
          ["Total uses", summary.redemptions, "var(--admin-hazelnut)"],
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
        <div className="admin-tabs">
          {(["all", "active", "inactive"] as Filter[]).map((value) => {
            const active = filter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`admin-chip capitalize${active ? " admin-chip-active" : ""}`}
              >
                {value} (
                {value === "all"
                  ? promos.length
                  : promos.filter((promo) => promo.status === value).length}
                )
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void loadPromos(true)} disabled={refreshing} className="admin-btn inline-flex items-center gap-1.5 !px-3 !py-2 !text-xs">
            <RefreshCw size={12} className={refreshing ? "animate-spin" : undefined} />
            Refresh
          </button>
          <button type="button" onClick={() => setEditing("new")} className="admin-btn admin-btn-primary inline-flex items-center gap-1.5 !px-3 !py-2 !text-xs">
            <Plus size={13} />
            New promo code
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
          <button type="button" onClick={() => void loadPromos()} className="admin-link">
            Try again
          </button>
        </div>
      )}

      <div className="admin-surface overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--admin-border)" }}>
          <Percent size={14} style={{ color: "var(--admin-hazelnut)" }} />
          <h2 className="admin-card-title">Promo codes</h2>
        </div>
        <div className="admin-table-wrap !border-0 !rounded-none !shadow-none overflow-x-auto">
          <table className="admin-table w-full min-w-[920px]">
            <thead>
              <tr>
                {[
                  "Code",
                  "Status",
                  "Discount",
                  "Minimum",
                  "Availability",
                  "Usage",
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
                  <td colSpan={7} className="!py-12 text-center text-xs admin-muted">
                    Loading promo codes…
                  </td>
                </tr>
              ) : (
                displayed.map((promo) => {
                  const availability = effectiveStatus(promo);
                  const usageExhausted =
                    promo.usageLimit != null &&
                    promo.usedCount >= promo.usageLimit;
                  return (
                    <tr key={promo.id}>
                      <td className="admin-td-strong">
                        <p className="font-mono font-bold" style={{ color: "var(--admin-hazelnut)" }}>
                          {promo.code}
                        </p>
                        {promo.notes && (
                          <p className="mt-1 max-w-[220px] truncate text-[10px] admin-faint">
                            {promo.notes}
                          </p>
                        )}
                      </td>
                      <td>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle(
                            availability,
                          )}`}
                        >
                          {availability}
                        </span>
                      </td>
                      <td>
                        <p className="font-semibold admin-text">
                          <MixedNumeric text={discountLabel(promo)} />
                        </p>
                        <p className="mt-0.5 text-[10px] admin-faint">
                          {promo.maxDiscount
                            ? `Cap ${money(promo.maxDiscount)}`
                            : "No discount cap"}
                        </p>
                      </td>
                      <td className="text-xs admin-muted">
                        {promo.minimumSubtotal == null
                          ? "None"
                          : money(promo.minimumSubtotal)}
                      </td>
                      <td className="text-[11px] admin-muted">
                        <p>Starts: {dateLabel(promo.startsAt)}</p>
                        <p className="mt-0.5">Ends: {dateLabel(promo.endsAt)}</p>
                      </td>
                      <td>
                        <p className="text-xs font-semibold" style={{ color: usageExhausted ? "#e3b673" : "var(--admin-white-coffee)" }}>
                          {promo.usedCount}
                          {promo.usageLimit ? ` / ${promo.usageLimit}` : ""}
                        </p>
                        <p className="mt-0.5 text-[10px] admin-faint">
                          {promo.perCustomerLimit
                            ? `${promo.perCustomerLimit} per customer`
                            : "No customer cap"}
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyCode(promo.code)}
                            aria-label={`Copy ${promo.code}`}
                            title="Copy code"
                            className="admin-btn admin-btn-sm !w-7 !h-7 !p-0"
                          >
                            {copiedCode === promo.code ? (
                              <Check size={12} />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(promo)}
                            aria-label={`Edit ${promo.code}`}
                            title="Edit"
                            className="admin-btn admin-btn-sm !w-7 !h-7 !p-0"
                            style={{ color: "#8fb0d9" }}
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggle(promo)}
                            disabled={busyId === promo.id}
                            className="admin-btn admin-btn-sm !px-2.5 !py-1.5 !text-[10px]"
                            style={{ color: promo.status === "active" ? "#e3b673" : "#8fcf9a" }}
                          >
                            {busyId === promo.id
                              ? "Saving…"
                              : promo.status === "active"
                                ? "Disable"
                                : "Enable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && displayed.length === 0 && !error && (
          <div className="admin-empty-state !border-0 !rounded-none">
            <span className="admin-empty-icon"><AlertTriangle size={20} /></span>
            <p className="text-xs admin-muted">
              No promo codes in this view.
            </p>
          </div>
        )}
      </div>

      {editing && (
        <PromoModal
          key={editing === "new" ? "new" : editing.id}
          promo={editing}
          onClose={() => setEditing(null)}
          onSaved={() => handleSaved("Promo code saved.")}
        />
      )}
    </div>
  );
}
