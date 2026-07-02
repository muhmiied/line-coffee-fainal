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
    <section className="rounded-xl border border-[#B6885E]/12 bg-white/[0.018] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A373]/65">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#B6885E]/15 bg-[#0B0806]/65 px-3 py-2 text-sm text-[#F5E6D8] outline-none placeholder:text-[#D6B79A]/25 focus:border-[#D6A373]/35";

type ReturnDraft = { quantity: string; condition: OrderReturnCondition; notes: string };

export default function OrderFinancePanel({
  order,
  onOrderChanged,
}: {
  order: AdminOrderDetail;
  onOrderChanged: () => void | Promise<void>;
}) {
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
          <p className="text-xs text-red-300">{loadError}</p>
        ) : !financials ? (
          <div className="flex items-center gap-2 py-3 text-xs text-[#D6B79A]/50">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading payment data…
          </div>
        ) : (
          <>
            {order.status === "delivered" && financials.remaining > 0 && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] font-semibold text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Delivered with an outstanding balance — {egp(financials.remaining)} remaining.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat label="Order total" value={egp(financials.total)} />
              <SummaryStat label="Paid" value={egp(financials.paidTotal)} tone="#4ade80" />
              <SummaryStat
                label="Remaining"
                value={egp(financials.remaining)}
                tone={financials.remaining > 0 ? "#fbbf24" : "#4ade80"}
              />
              <SummaryStat
                label="Refunded"
                value={egp(financials.refundedTotal)}
                tone={financials.refundedTotal > 0 ? "#f87171" : undefined}
              />
            </div>
          </>
        )}
      </Panel>

      {canTakePayment && (
        <Panel title="Record Payment" icon={<ArrowDownCircle className="h-3.5 w-3.5 text-emerald-300/70" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-[#D6B79A]/45">Amount (EGP)</span>
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
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-[#D6B79A]/45">Method</span>
              <select
                value={payMethod}
                onChange={(event) => setPayMethod(event.target.value as PaymentMovementMethod)}
                className={inputClass}
                style={{ colorScheme: "dark" }}
              >
                {MOVEMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {ADMIN_PAYMENT_MOVEMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-[#D6B79A]/45">Reference (optional)</span>
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
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-[#D6B79A]/45">Notes (optional)</span>
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
              className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/16 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {paySaving ? "Saving…" : "Record payment"}
            </button>
            {payMsg && (
              <p className="text-xs text-[#D6B79A]/65" role="status">
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
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-[#D6B79A]/45">Amount (EGP)</span>
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
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-[#D6B79A]/45">Method</span>
              <select
                value={refMethod}
                onChange={(event) => setRefMethod(event.target.value as PaymentMovementMethod)}
                className={inputClass}
                style={{ colorScheme: "dark" }}
              >
                {MOVEMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {ADMIN_PAYMENT_MOVEMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-[#D6B79A]/45">Reference (optional)</span>
              <input
                type="text"
                maxLength={160}
                value={refRef}
                onChange={(event) => setRefRef(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-[#D6B79A]/45">Notes (optional)</span>
              <input
                type="text"
                maxLength={1000}
                value={refNotes}
                onChange={(event) => setRefNotes(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-[#D6B79A]/42">
            Refunds move the payment balance only — subtotal, delivery, discount, stock, and COGS are unchanged. A refund is separate from a return.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={refSaving}
              onClick={() => void submitRefund()}
              className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-400/16 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {refSaving ? "Saving…" : "Record refund"}
            </button>
            {refMsg && (
              <p className="text-xs text-[#D6B79A]/65" role="status">
                {refMsg}
              </p>
            )}
          </div>
        </Panel>
      )}

      {canReturn && (
        <Panel title="Create Return" icon={<RotateCcw className="h-3.5 w-3.5 text-[#D6A373]/70" />}>
          {returnableItems.length === 0 ? (
            <p className="text-xs text-[#D6B79A]/45">All lines on this order have been fully returned.</p>
          ) : (
            <>
              <div className="space-y-2.5">
                {returnableItems.map((item) => {
                  const draft = returnDrafts[item.id];
                  const disabled = item.remaining <= 0;
                  return (
                    <div
                      key={item.id}
                      className="grid gap-2 rounded-lg border border-[#B6885E]/10 bg-[#0B0806]/40 p-3 sm:grid-cols-[1fr_80px_150px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[#F5E6D8]/85">{item.nameEn}</p>
                        <p className="text-[10.5px] text-[#D6B79A]/45">
                          {[item.variantSize, item.kind].filter(Boolean).join(" · ")} · {item.remaining} of {item.quantity} returnable
                        </p>
                      </div>
                      <label className="block">
                        <span className="mb-1 block text-[9px] uppercase tracking-wide text-[#D6B79A]/40">Qty</span>
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
                        <span className="mb-1 block text-[9px] uppercase tracking-wide text-[#D6B79A]/40">Condition</span>
                        <select
                          value={draft?.condition ?? "sellable"}
                          disabled={disabled}
                          onChange={(event) =>
                            setDraft(item.id, { condition: event.target.value as OrderReturnCondition })
                          }
                          className={inputClass}
                          style={{ colorScheme: "dark" }}
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
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-[#D6B79A]/45">Return reason (optional)</span>
                <input
                  type="text"
                  maxLength={500}
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                  placeholder="e.g. Customer reported damaged packaging"
                  className={inputClass}
                />
              </label>
              <p className="mt-2 text-[11px] text-[#D6B79A]/42">
                Sellable returns restock through the order&apos;s original FIFO lots (coffee) or bean lots (espresso). Flavor lines and damaged/other conditions never restock. Recording a return does not refund money.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  disabled={returnSaving}
                  onClick={() => void submitReturn()}
                  className="rounded-lg border border-[#D6A373]/25 bg-[#D6A373]/10 px-3 py-2 text-xs font-semibold text-[#D6A373] hover:bg-[#D6A373]/16 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {returnSaving ? "Saving…" : "Record return"}
                </button>
                {returnMsg && (
                  <p className="text-xs text-[#D6B79A]/65" role="status">
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
                      <span className="text-[#D6B79A]/45">
                        {" "}· {ADMIN_PAYMENT_MOVEMENT_METHOD_LABELS[p.method]}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </span>
                      {p.notes && <span className="block text-[#D6B79A]/50">{p.notes}</span>}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-right text-[10.5px] text-[#D6B79A]/42">
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
                      <span className="text-[#D6B79A]/45">
                        {" "}· {ADMIN_PAYMENT_MOVEMENT_METHOD_LABELS[r.method]}
                        {r.reference ? ` · ${r.reference}` : ""}
                      </span>
                      {r.notes && <span className="block text-[#D6B79A]/50">{r.notes}</span>}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-right text-[10.5px] text-[#D6B79A]/42">
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
                      <span className="block text-[#D6B79A]/50">
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
                  <span className="whitespace-nowrap text-right text-[10.5px] text-[#D6B79A]/42">
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
            className="rounded-lg border border-[#B6885E]/20 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-[#D6B79A]/80 hover:border-[#D6A373]/30 hover:text-[#D6A373] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {noteSaving ? "Saving…" : "Save note"}
          </button>
          {noteMsg && (
            <p className="text-xs text-[#D6B79A]/65" role="status">
              {noteMsg}
            </p>
          )}
        </div>
        <p className="mt-2 text-[11px] text-[#D6B79A]/42">
          Item and price editing are intentionally disabled — they would corrupt FIFO, allocations, promo, or COGS. Use returns/refunds instead. Delivery-fee edits are available before delivery.
        </p>
      </Panel>
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-[#B6885E]/10 bg-[#0B0806]/40 p-3">
      <p className="text-[9px] font-bold uppercase tracking-wide text-[#D6B79A]/42">{label}</p>
      <p className="mt-1 text-sm font-bold" style={{ color: tone ?? "#F5E6D8" }}>
        {value}
      </p>
    </div>
  );
}
