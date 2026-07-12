"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  RotateCcw,
  StickyNote,
} from "lucide-react";
import {
  ADMIN_PAYMENT_MOVEMENT_METHOD_LABELS,
  RETURN_CONDITION_LABELS,
  getAdminOrderFinancials,
  recordOrderPayment,
  recordOrderRefund,
  recordOrderReturn,
  updateAdminOrderNote,
  type AdminOrderDetail,
  type OrderFinancials,
  type OrderReturnCondition,
  type OrderReturnInput,
  type PaymentMovementMethod,
} from "@/lib/admin/admin-orders";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

const MOVEMENT_METHODS: PaymentMovementMethod[] = [
  "cash",
  "bank_transfer",
  "mobile_wallet",
  "other",
];
const RETURN_CONDITIONS: OrderReturnCondition[] = ["sellable", "damaged", "other"];
const RETURNABLE_KINDS = new Set(["product", "custom_espresso", "custom_flavor"]);

function egp(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-EG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="admin-surface p-4">
      <h3 className="admin-label mb-3 flex items-center gap-2 !text-[10px]" style={{ color: "var(--admin-hazelnut)" }}>
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

const inputClass = "admin-input !text-sm";
const fieldLabelClass = "admin-label mb-1 block !text-[10px] !normal-case !tracking-wide";

type ReturnDraft = { quantity: string; condition: OrderReturnCondition; notes: string };

export default function OrderFinancePanel({
  order,
  onOrderChanged,
}: {
  order: AdminOrderDetail;
  onOrderChanged: () => void | Promise<void>;
}) {
  const { language } = useAdminLanguage();
  const [financials, setFinancials] = useState<OrderFinancials | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMovementMethod>("cash");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [payMsg, setPayMsg] = useState<string | null>(null);

  const [refAmount, setRefAmount] = useState("");
  const [refMethod, setRefMethod] = useState<PaymentMovementMethod>("cash");
  const [refRef, setRefRef] = useState("");
  const [refNotes, setRefNotes] = useState("");
  const [refSaving, setRefSaving] = useState(false);
  const [refMsg, setRefMsg] = useState<string | null>(null);

  const [returnReason, setReturnReason] = useState("");
  const [returnDrafts, setReturnDrafts] = useState<Record<string, ReturnDraft>>({});
  const [returnSaving, setReturnSaving] = useState(false);
  const [returnMsg, setReturnMsg] = useState<string | null>(null);

  const [noteDraft, setNoteDraft] = useState(order.adminNote ?? "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteMsg, setNoteMsg] = useState<string | null>(null);

  const reloadFinancials = useCallback(() => {
    let cancelled = false;
    getAdminOrderFinancials(order.id, order.total)
      .then((data) => {
        if (!cancelled) {
          setFinancials(data);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load payment data.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [order.id, order.total]);

  useEffect(() => reloadFinancials(), [reloadFinancials]);

  const returnableItems = useMemo(
    () =>
      order.items
        .filter((item) => RETURNABLE_KINDS.has(item.kind))
        .map((item) => ({ ...item, remaining: item.quantity - item.returnedQuantity })),
    [order.items],
  );

  async function afterMutation() {
    reloadFinancials();
    await onOrderChanged();
  }

  async function submitPayment() {
    if (paySaving) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayMsg("Enter a payment amount greater than zero.");
      return;
    }
    setPaySaving(true);
    setPayMsg(null);
    try {
      const result = await recordOrderPayment(order.id, amount, payMethod, payRef, payNotes);
      setPayAmount("");
      setPayRef("");
      setPayNotes("");
      setPayMsg(`Recorded. Paid ${egp(result.netPaid)} · remaining ${egp(result.remaining)}.`);
      await afterMutation();
    } catch (error) {
      setPayMsg(error instanceof Error ? error.message : "Could not record the payment.");
    } finally {
      setPaySaving(false);
    }
  }

  async function submitRefund() {
    if (refSaving) return;
    const amount = Number(refAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setRefMsg("Enter a refund amount greater than zero.");
      return;
    }
    setRefSaving(true);
    setRefMsg(null);
    try {
      const result = await recordOrderRefund(order.id, amount, refMethod, refRef, refNotes);
      setRefAmount("");
      setRefRef("");
      setRefNotes("");
      setRefMsg(`Refunded. Total refunded ${egp(result.refundedTotal)} · net paid ${egp(result.netPaid)}.`);
      await afterMutation();
    } catch (error) {
      setRefMsg(error instanceof Error ? error.message : "Could not record the refund.");
    } finally {
      setRefSaving(false);
    }
  }

  function setDraft(itemId: string, patch: Partial<ReturnDraft>) {
    setReturnDrafts((current) => ({
      ...current,
      [itemId]: {
        quantity: current[itemId]?.quantity ?? "0",
        condition: current[itemId]?.condition ?? "sellable",
        notes: current[itemId]?.notes ?? "",
        ...patch,
      },
    }));
  }

  async function submitReturn() {
    if (returnSaving) return;
    const items: OrderReturnInput[] = [];
    for (const item of returnableItems) {
      const draft = returnDrafts[item.id];
      const qty = Number(draft?.quantity ?? "0");
      if (!draft || !Number.isFinite(qty) || qty <= 0) continue;
      if (qty > item.remaining) {
        setReturnMsg(`"${item.nameEn}" only has ${item.remaining} unit(s) left to return.`);
        return;
      }
      items.push({
        orderItemId: item.id,
        quantity: qty,
        condition: draft.condition,
        notes: draft.notes,
      });
    }
    if (items.length === 0) {
      setReturnMsg("Set a quantity greater than zero on at least one line.");
      return;
    }
    setReturnSaving(true);
    setReturnMsg(null);
    try {
      const result = await recordOrderReturn(order.id, returnReason, undefined, items);
      setReturnDrafts({});
      setReturnReason("");
      setReturnMsg(
        result.totalRestockedKg > 0
          ? `Return recorded. Restocked ${result.totalRestockedKg} kg of sellable stock.`
          : "Return recorded. No stock was restocked (damaged/other or flavor line).",
      );
      await afterMutation();
    } catch (error) {
      setReturnMsg(error instanceof Error ? error.message : "Could not record the return.");
    } finally {
      setReturnSaving(false);
    }
  }

  async function submitNote() {
    if (noteSaving) return;
    setNoteSaving(true);
    setNoteMsg(null);
    try {
      await updateAdminOrderNote(order.id, noteDraft);
      setNoteMsg("Admin note saved.");
      await onOrderChanged();
    } catch (error) {
      setNoteMsg(error instanceof Error ? error.message : "Could not save the note.");
    } finally {
      setNoteSaving(false);
    }
  }

  const canTakePayment = order.status !== "cancelled";
  const canRefund = (financials?.paidTotal ?? 0) > 0;
  const canReturn = order.status === "delivered" || order.status === "returned";

  return (
    <div className="space-y-4">
      <Panel title="Payment Summary">
        {loadError ? (
          <p className="text-xs" style={{ color: "#eeb4a8" }}>{loadError}</p>
        ) : !financials ? (
          <div className="flex items-center gap-2 py-3 text-xs admin-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading payment data…
          </div>
        ) : (
          <>
            {order.status === "delivered" && financials.remaining > 0 && (
              <div className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold" style={{ background: "rgba(227,182,115,0.10)", border: "1px solid rgba(227,182,115,0.30)", color: "#e3b673" }}>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Delivered with an outstanding balance — {egp(financials.remaining)} remaining.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat label="Order total" value={egp(financials.total)} />
              <SummaryStat label="Paid" value={egp(financials.paidTotal)} tone="#8fcf9a" />
              <SummaryStat
                label="Remaining"
                value={egp(financials.remaining)}
                tone={financials.remaining > 0 ? "#e3b673" : "#8fcf9a"}
              />
              <SummaryStat
                label="Refunded"
                value={egp(financials.refundedTotal)}
                tone={financials.refundedTotal > 0 ? "#e39a8c" : undefined}
              />
            </div>
          </>
        )}
      </Panel>

      {canTakePayment && (
        <Panel title="Record Payment" icon={<ArrowDownCircle className="h-3.5 w-3.5 text-emerald-300/70" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={fieldLabelClass}>Amount (EGP)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={payAmount}
                onChange={(event) => setPayAmount(event.target.value)}
                placeholder={financials ? String(financials.remaining) : "0"}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={fieldLabelClass}>Method</span>
              <select
                value={payMethod}
                onChange={(event) => setPayMethod(event.target.value as PaymentMovementMethod)}
                className="admin-select !text-sm"
              >
                {MOVEMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {ADMIN_PAYMENT_MOVEMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={fieldLabelClass}>Reference (optional)</span>
              <input
                type="text"
                maxLength={160}
                value={payRef}
                onChange={(event) => setPayRef(event.target.value)}
                placeholder="Transfer id / receipt no."
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={fieldLabelClass}>Notes (optional)</span>
              <input
                type="text"
                maxLength={1000}
                value={payNotes}
                onChange={(event) => setPayNotes(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={paySaving}
              onClick={() => void submitPayment()}
              className="admin-btn !px-3 !py-2 !text-xs"
              style={{ color: "#8fcf9a", background: "rgba(143,207,154,0.10)", borderColor: "rgba(143,207,154,0.30)" }}
            >
              {paySaving ? "Saving…" : "Record payment"}
            </button>
            {payMsg && (
              <p className="text-xs admin-faint" role="status">
                {payMsg}
              </p>
            )}
          </div>
        </Panel>
      )}

      {canRefund && (
        <Panel title="Record Refund" icon={<ArrowUpCircle className="h-3.5 w-3.5 text-red-300/70" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={fieldLabelClass}>Amount (EGP)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={refAmount}
                onChange={(event) => setRefAmount(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={fieldLabelClass}>Method</span>
              <select
                value={refMethod}
                onChange={(event) => setRefMethod(event.target.value as PaymentMovementMethod)}
                className="admin-select !text-sm"
              >
                {MOVEMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {ADMIN_PAYMENT_MOVEMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={fieldLabelClass}>Reference (optional)</span>
              <input
                type="text"
                maxLength={160}
                value={refRef}
                onChange={(event) => setRefRef(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={fieldLabelClass}>Notes (optional)</span>
              <input
                type="text"
                maxLength={1000}
                value={refNotes}
                onChange={(event) => setRefNotes(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <p className="mt-2 text-[11px] admin-faint">
            Refunds move the payment balance only — subtotal, delivery, discount, stock, and COGS are unchanged. A refund is separate from a return.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={refSaving}
              onClick={() => void submitRefund()}
              className="admin-btn admin-btn-danger !px-3 !py-2 !text-xs"
            >
              {refSaving ? "Saving…" : "Record refund"}
            </button>
            {refMsg && (
              <p className="text-xs admin-faint" role="status">
                {refMsg}
              </p>
            )}
          </div>
        </Panel>
      )}

      {canReturn && (
        <Panel title="Create Return" icon={<RotateCcw className="h-3.5 w-3.5 text-[#D6A373]/70" />}>
          {returnableItems.length === 0 ? (
            <p className="text-xs text-[#D6B79A]/65">All lines on this order have been fully returned.</p>
          ) : (
            <>
              <div className="space-y-2.5">
                {returnableItems.map((item) => {
                  const draft = returnDrafts[item.id];
                  const disabled = item.remaining <= 0;
                  return (
                    <div
                      key={item.id}
                      className="admin-surface !shadow-none grid gap-2 p-3 sm:grid-cols-[1fr_80px_150px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold admin-text" data-admin-no-translate>
                          {language === "ar" ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
                        </p>
                        <p className="text-[10.5px] admin-faint">
                          {[item.variantSize, item.kind].filter(Boolean).join(" · ")} · {item.remaining} of {item.quantity} returnable
                        </p>
                      </div>
                      <label className="block">
                        <span className={`${fieldLabelClass} !text-[9px]`}>Qty</span>
                        <input
                          type="number"
                          min={0}
                          max={item.remaining}
                          step={1}
                          disabled={disabled}
                          value={draft?.quantity ?? ""}
                          onChange={(event) => setDraft(item.id, { quantity: event.target.value })}
                          placeholder="0"
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className={`${fieldLabelClass} !text-[9px]`}>Condition</span>
                        <select
                          value={draft?.condition ?? "sellable"}
                          disabled={disabled}
                          onChange={(event) =>
                            setDraft(item.id, { condition: event.target.value as OrderReturnCondition })
                          }
                          className="admin-select !text-sm"
                        >
                          {RETURN_CONDITIONS.map((condition) => (
                            <option key={condition} value={condition}>
                              {RETURN_CONDITION_LABELS[condition]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  );
                })}
              </div>
              <label className="mt-3 block">
                <span className={fieldLabelClass}>Return reason (optional)</span>
                <input
                  type="text"
                  maxLength={500}
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                  placeholder="e.g. Customer reported damaged packaging"
                  className={inputClass}
                />
              </label>
              <p className="mt-2 text-[11px] admin-faint">
                Sellable returns restock through the order&apos;s original FIFO lots (coffee) or bean lots (espresso). Flavor lines and damaged/other conditions never restock. Recording a return does not refund money.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  disabled={returnSaving}
                  onClick={() => void submitReturn()}
                  className="admin-btn admin-btn-primary !px-3 !py-2 !text-xs"
                >
                  {returnSaving ? "Saving…" : "Record return"}
                </button>
                {returnMsg && (
                  <p className="text-xs admin-faint" role="status">
                    {returnMsg}
                  </p>
                )}
              </div>
            </>
          )}
        </Panel>
      )}

      {financials &&
        (financials.payments.length > 0 ||
          financials.refunds.length > 0 ||
          financials.returns.length > 0) && (
          <Panel title="Payment, Refund & Return History">
            <ul className="space-y-2.5">
              {financials.payments.map((p) => (
                <li key={`pay-${p.id}`} className="flex items-start justify-between gap-4 text-xs">
                  <span className="flex items-start gap-2">
                    <ArrowDownCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300/70" />
                    <span>
                      <span className="font-semibold text-emerald-300">Payment</span>{" "}
                      <span className="text-[#F5E6D8]/72">{egp(p.amount)}</span>
                      <span className="text-[#D6B79A]/65">
                        {" "}· {ADMIN_PAYMENT_MOVEMENT_METHOD_LABELS[p.method]}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </span>
                      {p.notes && <span className="block text-[#D6B79A]/65">{p.notes}</span>}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-right text-[10.5px] text-[#D6B79A]/65">
                    {formatDateTime(p.paidAt)}
                    {p.createdBy ? ` · ${p.createdBy}` : ""}
                  </span>
                </li>
              ))}
              {financials.refunds.map((r) => (
                <li key={`ref-${r.id}`} className="flex items-start justify-between gap-4 text-xs">
                  <span className="flex items-start gap-2">
                    <ArrowUpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300/70" />
                    <span>
                      <span className="font-semibold text-red-300">Refund</span>{" "}
                      <span className="text-[#F5E6D8]/72">{egp(r.amount)}</span>
                      <span className="text-[#D6B79A]/65">
                        {" "}· {ADMIN_PAYMENT_MOVEMENT_METHOD_LABELS[r.method]}
                        {r.reference ? ` · ${r.reference}` : ""}
                      </span>
                      {r.notes && <span className="block text-[#D6B79A]/65">{r.notes}</span>}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-right text-[10.5px] text-[#D6B79A]/65">
                    {formatDateTime(r.refundedAt)}
                    {r.createdBy ? ` · ${r.createdBy}` : ""}
                  </span>
                </li>
              ))}
              {financials.returns.map((ret) => (
                <li key={`ret-${ret.id}`} className="flex items-start justify-between gap-4 text-xs">
                  <span className="flex items-start gap-2">
                    <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D6A373]/70" />
                    <span>
                      <span className="font-semibold text-[#D6A373]">Return</span>{" "}
                      <span className="text-[#F5E6D8]/72">
                        {ret.items.reduce((sum, i) => sum + i.quantity, 0)} unit(s)
                      </span>
                      {ret.restockedKg > 0 && (
                        <span className="text-emerald-300/70"> · restocked {ret.restockedKg} kg</span>
                      )}
                      <span className="block text-[#D6B79A]/65">
                        {ret.items
                          .map((i) => {
                            const conditionLabel =
                              i.kind === "custom_flavor" &&
                              i.condition === "sellable" &&
                              !i.restocked
                                ? "Sellable — no stock movement (flavor)"
                                : RETURN_CONDITION_LABELS[i.condition];
                            return `${i.quantity}× ${conditionLabel}`;
                          })
                          .join(", ")}
                        {ret.reason ? ` — ${ret.reason}` : ""}
                      </span>
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-right text-[10.5px] text-[#D6B79A]/65">
                    {formatDateTime(ret.createdAt)}
                    {ret.createdBy ? ` · ${ret.createdBy}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

      <Panel title="Admin Note (safe edit)" icon={<StickyNote className="h-3.5 w-3.5 text-[#D6A373]/70" />}>
        <textarea
          value={noteDraft}
          onChange={(event) => setNoteDraft(event.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Internal note — never shown to the customer."
          className={`${inputClass} resize-none`}
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            disabled={noteSaving || noteDraft === (order.adminNote ?? "")}
            onClick={() => void submitNote()}
            className="admin-btn !px-3 !py-2 !text-xs"
          >
            {noteSaving ? "Saving…" : "Save note"}
          </button>
          {noteMsg && (
            <p className="text-xs admin-faint" role="status">
              {noteMsg}
            </p>
          )}
        </div>
        <p className="mt-2 text-[11px] admin-faint">
          Item and price editing are intentionally disabled — they would corrupt FIFO, allocations, promo, or COGS. Use returns/refunds instead. Delivery-fee edits are available before delivery.
        </p>
      </Panel>
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="admin-surface !shadow-none p-3">
      <p className="admin-label !text-[9px]">{label}</p>
      <p className="mt-1 text-sm font-bold" style={{ color: tone ?? "var(--admin-heading)" }}>
        {value}
      </p>
    </div>
  );
}
