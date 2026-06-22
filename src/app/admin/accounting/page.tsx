"use client";

import { useState } from "react";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import {
  TRANSACTIONS,
  ACCOUNTING_SUMMARY,
  MONTHLY_CHART,
  type TransactionType,
} from "@/lib/mock-data/admin/accounting-mock";

const TYPE_STYLE: Record<TransactionType, { bg: string; text: string; sign: string }> = {
  Sale:     { bg: "rgba(74,222,128,0.10)",  text: "#4ade80",  sign: "+"  },
  Expense:  { bg: "rgba(239,68,68,0.10)",   text: "#ef4444",  sign: "−"  },
  Refund:   { bg: "rgba(251,191,36,0.10)",  text: "#fbbf24",  sign: "−"  },
  Purchase: { bg: "rgba(96,165,250,0.10)",  text: "#60a5fa",  sign: "−"  },
};

const CHART_MAX = Math.max(...MONTHLY_CHART.map((m) => m.revenue));

export default function AccountingPage() {
  const [typeFilter, setTypeFilter] = useState<TransactionType | "All">("All");
  const [showForm, setShowForm]     = useState(false);

  const filtered = TRANSACTIONS.filter((t) => typeFilter === "All" || t.type === typeFilter);

  const profitPct = ACCOUNTING_SUMMARY.revenue > 0
    ? Math.round((ACCOUNTING_SUMMARY.netProfit / ACCOUNTING_SUMMARY.revenue) * 100)
    : 0;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
            Accounting
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
            June 2026 · {TRANSACTIONS.length} transactions recorded
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((p) => !p)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-colors flex-shrink-0"
          style={{ background: "rgba(182,136,94,0.15)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.25)" }}
        >
          <Plus size={14} /> Add Expense
        </button>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Revenue",    value: ACCOUNTING_SUMMARY.revenue.toLocaleString(),    color: "#4ade80",     icon: <TrendingUp size={14} /> },
          { label: "Expenses",   value: ACCOUNTING_SUMMARY.expenses.toLocaleString(),   color: "#ef4444",     icon: <TrendingDown size={14} /> },
          { label: "Net Profit", value: ACCOUNTING_SUMMARY.netProfit.toLocaleString(),  color: "var(--gold)", icon: null },
          { label: "Margin",     value: `${profitPct}%`,                                color: profitPct > 30 ? "#4ade80" : profitPct > 15 ? "#fbbf24" : "#ef4444", icon: null },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="admin-kpi-card py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
                {label}
              </p>
              {icon && <span style={{ color, opacity: 0.6 }}>{icon}</span>}
            </div>
            <p className="text-[19px] font-bold leading-tight" style={{ color }}>
              {value} <span className="text-[10.5px] font-normal" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>EGP</span>
            </p>
          </div>
        ))}
      </div>

      {/* Revenue vs Expenses bar chart */}
      <div className="admin-surface overflow-hidden">
        <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
            6-Month Revenue vs Expenses
          </p>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-end gap-4 h-28">
            {MONTHLY_CHART.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 h-20">
                  <div
                    className="flex-1 rounded-t-sm transition-all"
                    style={{
                      height: `${Math.round((m.revenue / CHART_MAX) * 100)}%`,
                      background: "linear-gradient(to top, rgba(182,136,94,0.4), rgba(182,136,94,0.15))",
                    }}
                    title={`${m.revenue.toLocaleString()} EGP`}
                  />
                  <div
                    className="flex-1 rounded-t-sm transition-all"
                    style={{
                      height: `${Math.round((m.expenses / CHART_MAX) * 100)}%`,
                      background: "linear-gradient(to top, rgba(239,68,68,0.35), rgba(239,68,68,0.12))",
                    }}
                    title={`${m.expenses.toLocaleString()} EGP`}
                  />
                </div>
                <span className="text-[10px]" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>{m.month}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm" style={{ background: "rgba(182,136,94,0.5)" }} />
              <span className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm" style={{ background: "rgba(239,68,68,0.4)" }} />
              <span className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>Expenses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick add expense */}
      {showForm && (
        <div className="admin-surface px-5 py-5 space-y-4">
          <p className="text-[13px] font-semibold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
            Add Expense
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: "desc",     label: "Description",   placeholder: "e.g. Packaging" },
              { key: "amount",   label: "Amount (EGP)",  placeholder: "e.g. 2200"       },
              { key: "category", label: "Category",      placeholder: "e.g. Operations" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
                  {label}
                </label>
                <input
                  type="text"
                  placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(182,136,94,0.15)", color: "var(--cream)" }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold"
              style={{ background: "rgba(182,136,94,0.2)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.3)" }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-white/5"
              style={{ color: "var(--cream-dim)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["All", "Sale", "Expense", "Purchase", "Refund"] as const).map((t) => {
          const active = typeFilter === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: active ? "rgba(182,136,94,0.15)" : "rgba(255,255,255,0.03)",
                color:      active ? "var(--gold)"           : "var(--cream-dim)",
                border:     active ? "1px solid rgba(182,136,94,0.25)" : "1px solid rgba(182,136,94,0.08)",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Transactions */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(182,136,94,0.10)" }}>
        <div
          className="hidden md:grid gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
          style={{ gridTemplateColumns: "1fr 3fr 1.2fr 1fr 1fr", background: "rgba(182,136,94,0.05)", color: "var(--cream-dim)", borderBottom: "1px solid rgba(182,136,94,0.08)" }}
        >
          <span>ID</span><span>Description</span><span>Category</span><span>Date</span><span className="text-right">Amount</span>
        </div>

        {filtered.map((tx, i) => {
          const { bg, text, sign } = TYPE_STYLE[tx.type];
          return (
            <div
              key={tx.id}
              className="hidden md:grid items-center gap-4 px-5 py-3.5 hover:bg-white/[0.015] transition-colors"
              style={{ gridTemplateColumns: "1fr 3fr 1.2fr 1fr 1fr", borderBottom: i < filtered.length - 1 ? "1px solid rgba(182,136,94,0.06)" : undefined }}
            >
              <span className="font-mono text-[11.5px]" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>{tx.id}</span>
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold flex-shrink-0"
                  style={{ background: bg, color: text }}
                >
                  {tx.type}
                </span>
                <span className="text-[13px] truncate" style={{ color: "var(--cream)" }}>{tx.description}</span>
              </div>
              <span className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>{tx.category}</span>
              <span className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>{tx.date}</span>
              <span className="text-right text-[13px] font-semibold" style={{ color: text }}>
                {sign}{Math.abs(tx.amount).toLocaleString()} EGP
              </span>
            </div>
          );
        })}

        {/* Mobile rows */}
        {filtered.map((tx) => {
          const { bg, text, sign } = TYPE_STYLE[tx.type];
          return (
            <div key={`mob-${tx.id}`} className="md:hidden flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid rgba(182,136,94,0.06)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold flex-shrink-0" style={{ background: bg, color: text }}>
                  {tx.type}
                </span>
                <span className="text-[12.5px] truncate" style={{ color: "var(--cream)" }}>{tx.description}</span>
              </div>
              <span className="text-[13px] font-semibold flex-shrink-0 ml-3" style={{ color: text }}>
                {sign}{Math.abs(tx.amount).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
