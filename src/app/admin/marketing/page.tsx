"use client";

import { useState } from "react";
import {
  Plus, Copy, Check, Tag, Megaphone, BarChart2,
  ImageIcon, AlertTriangle, Zap, X,
} from "lucide-react";
import {
  OFFERS, PROMO_CODES, WEBSITE_BANNERS, ANNOUNCEMENT_MESSAGES, MARKETING_SUMMARY,
  type Offer, type PromoCode, type OfferStatus, type PromoStatus,
  type TargetSegment, type BannerPosition,
} from "@/lib/mock-data/admin/marketing-mock";
import { CUSTOMER_SUMMARY } from "@/lib/mock-data/admin/customers-mock";

// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = "Offers" | "Promo Codes" | "Customer Targeting" | "Website Banners" | "Performance";
const TABS: Tab[] = ["Offers", "Promo Codes", "Customer Targeting", "Website Banners", "Performance"];

const OFFER_STATUS_STYLE: Record<OfferStatus, { bg: string; color: string }> = {
  Active:    { bg: "rgba(74,222,128,0.12)",  color: "#4ade80" },
  Scheduled: { bg: "rgba(96,165,250,0.12)",  color: "#60a5fa" },
  Paused:    { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
  Expired:   { bg: "rgba(156,163,175,0.12)", color: "#9ca3af" },
};

const PROMO_STATUS_STYLE: Record<PromoStatus, { bg: string; color: string }> = {
  Active:    { bg: "rgba(74,222,128,0.12)",  color: "#4ade80" },
  Scheduled: { bg: "rgba(96,165,250,0.12)",  color: "#60a5fa" },
  Paused:    { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
  Expired:   { bg: "rgba(156,163,175,0.12)", color: "#9ca3af" },
};

const OFFER_TYPE_LABEL: Record<string, string> = {
  percentage:    "% Discount",
  fixed:         "Fixed EGP",
  "free-shipping": "Free Shipping",
  bundle:        "Bundle",
};
const OFFER_TYPE_COLOR: Record<string, string> = {
  percentage:    "#a78bfa",
  fixed:         "#60a5fa",
  "free-shipping": "#34d399",
  bundle:        "#f97316",
};

const SEGMENT_STYLE: Record<TargetSegment, { color: string; bg: string; label: string }> = {
  all:                  { color: "var(--cream-dim)", bg: "rgba(255,255,255,0.07)", label: "All Customers" },
  vip:                  { color: "var(--gold)",       bg: "rgba(182,136,94,0.12)",  label: "VIP" },
  repeat:               { color: "#4ade80",            bg: "rgba(74,222,128,0.10)",  label: "Repeat" },
  new:                  { color: "#fbbf24",            bg: "rgba(251,191,36,0.10)",  label: "New" },
  inactive:             { color: "#f87171",            bg: "rgba(248,113,113,0.10)", label: "Inactive" },
  "at-risk":            { color: "#fb923c",            bg: "rgba(251,146,60,0.10)",  label: "At Risk" },
  "wholesale-potential":{ color: "#c084fc",            bg: "rgba(192,132,252,0.10)", label: "Wholesale" },
};

const BANNER_POSITION_STYLE: Record<BannerPosition, { bg: string; color: string; label: string }> = {
  hero:         { bg: "rgba(182,136,94,0.12)", color: "var(--gold)",  label: "Hero" },
  announcement: { bg: "rgba(96,165,250,0.12)", color: "#60a5fa",      label: "Announcement" },
  section:      { bg: "rgba(167,139,250,0.12)",color: "#a78bfa",      label: "Section" },
};

const SEGMENT_INFO: { key: TargetSegment; label: string; desc: string; count: number; color: string }[] = [
  { key: "vip",                   label: "VIP",             desc: "Spent 5000+ EGP or 8+ orders",       count: CUSTOMER_SUMMARY.vip,      color: "var(--gold)"  },
  { key: "repeat",                label: "Repeat",          desc: "2+ orders, non-VIP",                  count: CUSTOMER_SUMMARY.repeat,   color: "#4ade80"      },
  { key: "new",                   label: "New",             desc: "1 order or less, joined in 30 days",  count: 3,                          color: "#fbbf24"      },
  { key: "inactive",              label: "Inactive",        desc: "Last order 90+ days ago",             count: CUSTOMER_SUMMARY.inactive, color: "#f87171"      },
  { key: "at-risk",               label: "At Risk",         desc: "2+ orders, silent 60–90 days",        count: 2,                          color: "#fb923c"      },
  { key: "wholesale-potential",   label: "Wholesale",       desc: "Manually tagged wholesale prospects",  count: 1,                          color: "#c084fc"      },
];

// ─── Small shared sub-components ─────────────────────────────────────────────

function StatusBadge({ status, map }: { status: string; map: Record<string, { bg: string; color: string }> }) {
  const s = map[status] ?? { bg: "rgba(255,255,255,0.07)", color: "var(--cream-dim)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

function SegmentChips({ segments }: { segments: TargetSegment[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {segments.map((seg) => {
        const s = SEGMENT_STYLE[seg];
        return (
          <span
            key={seg}
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{ background: s.bg, color: s.color }}
          >
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; label: string }) {
  return (
    <div
      className="flex items-center gap-2 px-5 py-3.5"
      style={{ borderBottom: "1px solid rgba(182,136,94,0.08)", background: "rgba(182,136,94,0.02)" }}
    >
      <Icon size={13} style={{ color: "var(--gold)", opacity: 0.7 }} />
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
        {label}
      </p>
    </div>
  );
}

function InputField({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(182,136,94,0.15)", color: "var(--cream)" }}
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[10.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
        style={{ background: "#1a1209", border: "1px solid rgba(182,136,94,0.15)", color: "var(--cream)" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#1a1209" }}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function FormFooter({ onSave, onCancel, saveLabel = "Save" }: { onSave: () => void; onCancel: () => void; saveLabel?: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button" onClick={onSave}
        className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors"
        style={{ background: "rgba(182,136,94,0.2)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.3)" }}
      >
        {saveLabel}
      </button>
      <button
        type="button" onClick={onCancel}
        className="px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-white/5 transition-colors"
        style={{ color: "var(--cream-dim)" }}
      >
        Cancel
      </button>
    </div>
  );
}

// ─── Offers Tab ───────────────────────────────────────────────────────────────

type OfferFilter = "All" | OfferStatus;
const OFFER_FILTERS: OfferFilter[] = ["All", "Active", "Scheduled", "Paused", "Expired"];

interface OfferFormState {
  titleEn: string; titleAr: string; descEn: string; descAr: string;
  offerType: string; value: string; minOrder: string; maxDiscount: string;
  segments: string; startDate: string; endDate: string;
}
const EMPTY_OFFER_FORM: OfferFormState = {
  titleEn: "", titleAr: "", descEn: "", descAr: "",
  offerType: "percentage", value: "", minOrder: "", maxDiscount: "",
  segments: "all", startDate: "", endDate: "",
};

function OffersTab({
  offers, offerOverrides, onPause, onActivate,
}: {
  offers: Offer[];
  offerOverrides: Record<string, Partial<Offer>>;
  onPause: (id: string) => void;
  onActivate: (id: string) => void;
}) {
  const [filter, setFilter] = useState<OfferFilter>("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OfferFormState>(EMPTY_OFFER_FORM);
  const [savedId, setSavedId] = useState<string | null>(null);

  const displayOffers = offers.map((o) => ({ ...o, ...(offerOverrides[o.id] ?? {}) }));
  const filtered = filter === "All" ? displayOffers : displayOffers.filter((o) => o.status === filter);

  const handleSave = () => {
    setShowForm(false);
    setForm(EMPTY_OFFER_FORM);
    setSavedId("new");
    setTimeout(() => setSavedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {OFFER_FILTERS.map((f) => {
            const active = filter === f;
            const count = f === "All" ? displayOffers.length : displayOffers.filter((o) => o.status === f).length;
            return (
              <button
                key={f} type="button" onClick={() => setFilter(f)}
                className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-all"
                style={{
                  background: active ? "rgba(182,136,94,0.15)" : "rgba(255,255,255,0.03)",
                  color: active ? "var(--gold)" : "var(--cream-dim)",
                  border: active ? "1px solid rgba(182,136,94,0.25)" : "1px solid rgba(182,136,94,0.08)",
                }}
              >
                {f} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {savedId && (
            <span className="flex items-center gap-1 text-[12px]" style={{ color: "#4ade80" }}>
              <Check size={12} /> Offer saved
            </span>
          )}
          <button
            type="button" onClick={() => setShowForm((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-colors"
            style={{ background: "rgba(182,136,94,0.15)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.25)" }}
          >
            <Plus size={13} /> New Offer
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="admin-surface px-5 py-5 space-y-4">
          <p className="text-[13px] font-semibold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
            New Offer
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField label="Title (EN)" value={form.titleEn} onChange={(v) => setForm((p) => ({ ...p, titleEn: v }))} placeholder="e.g. 10% Off Espresso" />
            <InputField label="Title (AR)" value={form.titleAr} onChange={(v) => setForm((p) => ({ ...p, titleAr: v }))} placeholder="مثال: خصم ١٠٪ على الإسبريسو" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SelectField
              label="Offer Type" value={form.offerType} onChange={(v) => setForm((p) => ({ ...p, offerType: v }))}
              options={[
                { value: "percentage",     label: "Percentage (%)" },
                { value: "fixed",          label: "Fixed (EGP)" },
                { value: "free-shipping",  label: "Free Shipping" },
                { value: "bundle",         label: "Bundle" },
              ]}
            />
            <InputField label="Value" value={form.value} onChange={(v) => setForm((p) => ({ ...p, value: v }))} placeholder="e.g. 10" />
            <InputField label="Min Order (EGP)" value={form.minOrder} onChange={(v) => setForm((p) => ({ ...p, minOrder: v }))} placeholder="e.g. 400" />
            <InputField label="Max Discount (EGP)" value={form.maxDiscount} onChange={(v) => setForm((p) => ({ ...p, maxDiscount: v }))} placeholder="e.g. 120" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SelectField
              label="Target Segments" value={form.segments} onChange={(v) => setForm((p) => ({ ...p, segments: v }))}
              options={[
                { value: "all",                   label: "All Customers" },
                { value: "vip",                   label: "VIP" },
                { value: "repeat",                label: "Repeat" },
                { value: "new",                   label: "New" },
                { value: "inactive",              label: "Inactive" },
                { value: "at-risk",               label: "At Risk" },
                { value: "wholesale-potential",   label: "Wholesale" },
              ]}
            />
            <InputField label="Start Date" value={form.startDate} onChange={(v) => setForm((p) => ({ ...p, startDate: v }))} type="date" />
            <InputField label="End Date" value={form.endDate} onChange={(v) => setForm((p) => ({ ...p, endDate: v }))} type="date" />
          </div>
          <FormFooter onSave={handleSave} onCancel={() => { setShowForm(false); setForm(EMPTY_OFFER_FORM); }} saveLabel="Create Offer" />
        </div>
      )}

      {/* Offers table */}
      <div className="admin-surface overflow-hidden">
        <SectionHeader icon={Zap} label={`Offers — ${filtered.length} shown`} />

        {/* Desktop header */}
        <div
          className="hidden lg:grid gap-3 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider"
          style={{ gridTemplateColumns: "2fr 110px 140px 80px 90px 90px 90px 110px", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(182,136,94,0.06)", color: "var(--cream-dim)" }}
        >
          <span>Offer</span>
          <span>Type</span>
          <span>Segments</span>
          <span>Used</span>
          <span>Orders</span>
          <span>Revenue</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px]" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>No offers match this filter.</p>
          </div>
        )}

        {filtered.map((offer, i) => (
          <div key={offer.id} style={i < filtered.length - 1 ? { borderBottom: "1px solid rgba(182,136,94,0.06)" } : undefined}>
            {/* Desktop */}
            <div
              className="hidden lg:grid items-center gap-3 px-5 py-4"
              style={{ gridTemplateColumns: "2fr 110px 140px 80px 90px 90px 90px 110px" }}
            >
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{offer.title.en}</p>
                {offer.description && (
                  <p className="text-[11.5px] mt-0.5 leading-snug" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
                    {offer.description.en}
                  </p>
                )}
                <p className="text-[11px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.35 }}>
                  {offer.startDate} → {offer.endDate}
                </p>
              </div>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold w-fit"
                style={{ background: `${OFFER_TYPE_COLOR[offer.offerType]}18`, color: OFFER_TYPE_COLOR[offer.offerType] }}
              >
                {offer.offerType === "percentage" ? `${offer.value}%` : offer.offerType === "fixed" ? `${offer.value} EGP` : OFFER_TYPE_LABEL[offer.offerType]}
              </span>
              <SegmentChips segments={offer.targetSegments} />
              <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--cream)" }}>{offer.usedCount}</span>
              <span className="text-[13px] tabular-nums" style={{ color: "var(--cream-dim)" }}>{offer.ordersGenerated}</span>
              <span className="text-[12.5px] tabular-nums" style={{ color: "#4ade80" }}>
                {offer.revenueGenerated > 0 ? `${offer.revenueGenerated.toLocaleString()} EGP` : "—"}
              </span>
              <StatusBadge status={offer.status} map={OFFER_STATUS_STYLE} />
              <div className="flex items-center gap-2">
                {offer.status === "Active" && (
                  <button
                    type="button" onClick={() => onPause(offer.id)}
                    className="text-[11px] px-2.5 py-1 rounded-lg transition-colors hover:bg-white/5"
                    style={{ color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}
                  >
                    Pause
                  </button>
                )}
                {offer.status === "Paused" && (
                  <button
                    type="button" onClick={() => onActivate(offer.id)}
                    className="text-[11px] px-2.5 py-1 rounded-lg transition-colors hover:bg-white/5"
                    style={{ color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}
                  >
                    Activate
                  </button>
                )}
                {(offer.status === "Expired" || offer.status === "Scheduled") && (
                  <span className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.3 }}>—</span>
                )}
              </div>
            </div>

            {/* Mobile */}
            <div className="lg:hidden px-4 py-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{offer.title.en}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
                    {offer.startDate} → {offer.endDate}
                  </p>
                </div>
                <StatusBadge status={offer.status} map={OFFER_STATUS_STYLE} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded text-[10.5px] font-semibold"
                  style={{ background: `${OFFER_TYPE_COLOR[offer.offerType]}18`, color: OFFER_TYPE_COLOR[offer.offerType] }}
                >
                  {OFFER_TYPE_LABEL[offer.offerType]}
                  {offer.offerType === "percentage" ? ` ${offer.value}%` : offer.offerType === "fixed" ? ` ${offer.value} EGP` : ""}
                </span>
                <SegmentChips segments={offer.targetSegments} />
              </div>
              <p className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
                Used {offer.usedCount} · {offer.ordersGenerated} orders · {offer.revenueGenerated > 0 ? `${offer.revenueGenerated.toLocaleString()} EGP revenue` : "No revenue yet"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Promo Codes Tab ──────────────────────────────────────────────────────────

type CodeFilter = "All" | PromoStatus;
const CODE_FILTERS: CodeFilter[] = ["All", "Active", "Scheduled", "Paused", "Expired"];

interface CodeFormState {
  code: string; type: string; value: string; minOrder: string; maxDiscount: string;
  perCustomerLimit: string; maxUses: string; segments: string; expiresAt: string;
}
const EMPTY_CODE_FORM: CodeFormState = {
  code: "", type: "percentage", value: "", minOrder: "", maxDiscount: "",
  perCustomerLimit: "1", maxUses: "", segments: "all", expiresAt: "",
};

function PromoCodesTab({ codes, codeOverrides, onCopy, copiedCode }: {
  codes: PromoCode[];
  codeOverrides: Record<string, Partial<PromoCode>>;
  onCopy: (code: string) => void;
  copiedCode: string | null;
}) {
  const [filter, setFilter] = useState<CodeFilter>("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CodeFormState>(EMPTY_CODE_FORM);
  const [saved, setSaved] = useState(false);

  const displayCodes = codes.map((c) => ({ ...c, ...(codeOverrides[c.id] ?? {}) }));
  const filtered = filter === "All" ? displayCodes : displayCodes.filter((c) => c.status === filter);

  const handleSave = () => {
    setShowForm(false);
    setForm(EMPTY_CODE_FORM);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {CODE_FILTERS.map((f) => {
            const active = filter === f;
            const count = f === "All" ? displayCodes.length : displayCodes.filter((c) => c.status === f).length;
            return (
              <button
                key={f} type="button" onClick={() => setFilter(f)}
                className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-all"
                style={{
                  background: active ? "rgba(182,136,94,0.15)" : "rgba(255,255,255,0.03)",
                  color: active ? "var(--gold)" : "var(--cream-dim)",
                  border: active ? "1px solid rgba(182,136,94,0.25)" : "1px solid rgba(182,136,94,0.08)",
                }}
              >
                {f} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-[12px]" style={{ color: "#4ade80" }}>
              <Check size={12} /> Code created
            </span>
          )}
          <button
            type="button" onClick={() => setShowForm((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold"
            style={{ background: "rgba(182,136,94,0.15)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.25)" }}
          >
            <Plus size={13} /> New Code
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="admin-surface px-5 py-5 space-y-4">
          <p className="text-[13px] font-semibold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
            New Promo Code
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InputField label="Code" value={form.code} onChange={(v) => setForm((p) => ({ ...p, code: v.toUpperCase() }))} placeholder="e.g. SAVE20" />
            <SelectField
              label="Type" value={form.type} onChange={(v) => setForm((p) => ({ ...p, type: v }))}
              options={[{ value: "percentage", label: "Percentage (%)" }, { value: "fixed", label: "Fixed (EGP)" }]}
            />
            <InputField label="Value" value={form.value} onChange={(v) => setForm((p) => ({ ...p, value: v }))} placeholder="e.g. 15" />
            <InputField label="Min Order (EGP)" value={form.minOrder} onChange={(v) => setForm((p) => ({ ...p, minOrder: v }))} placeholder="e.g. 300" />
            <InputField label="Max Discount (EGP)" value={form.maxDiscount} onChange={(v) => setForm((p) => ({ ...p, maxDiscount: v }))} placeholder="optional cap" />
            <InputField label="Per Customer Limit" value={form.perCustomerLimit} onChange={(v) => setForm((p) => ({ ...p, perCustomerLimit: v }))} placeholder="1" />
            <InputField label="Max Total Uses" value={form.maxUses} onChange={(v) => setForm((p) => ({ ...p, maxUses: v }))} placeholder="e.g. 100" />
            <InputField label="Expires" value={form.expiresAt} onChange={(v) => setForm((p) => ({ ...p, expiresAt: v }))} type="date" />
          </div>
          <SelectField
            label="Target Segments" value={form.segments} onChange={(v) => setForm((p) => ({ ...p, segments: v }))}
            options={[
              { value: "all",                   label: "All Customers" },
              { value: "vip",                   label: "VIP only" },
              { value: "repeat",                label: "Repeat only" },
              { value: "new",                   label: "New customers only" },
              { value: "inactive",              label: "Inactive only" },
              { value: "at-risk",               label: "At Risk only" },
              { value: "wholesale-potential",   label: "Wholesale only" },
            ]}
          />
          <FormFooter onSave={handleSave} onCancel={() => { setShowForm(false); setForm(EMPTY_CODE_FORM); }} saveLabel="Create Code" />
        </div>
      )}

      {/* Table */}
      <div className="admin-surface overflow-hidden">
        <SectionHeader icon={Tag} label={`Promo Codes — ${filtered.length} shown`} />
        <div
          className="hidden lg:grid gap-3 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider"
          style={{ gridTemplateColumns: "130px 90px 100px 90px 100px 110px 90px auto", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(182,136,94,0.06)", color: "var(--cream-dim)" }}
        >
          <span>Code</span>
          <span>Discount</span>
          <span>Min Order</span>
          <span>Limit/Customer</span>
          <span>Usage</span>
          <span>Segments</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px]" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>No codes match this filter.</p>
          </div>
        )}

        {filtered.map((promo, i) => (
          <div key={promo.id} style={i < filtered.length - 1 ? { borderBottom: "1px solid rgba(182,136,94,0.06)" } : undefined}>
            {/* Desktop */}
            <div
              className="hidden lg:grid items-center gap-3 px-5 py-4"
              style={{ gridTemplateColumns: "130px 90px 100px 90px 100px 110px 90px auto" }}
            >
              <div>
                <span className="font-bold font-mono text-[13px]" style={{ color: "var(--gold)" }}>{promo.code}</span>
                {promo.linkedOfferId && (
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>linked to offer</p>
                )}
              </div>
              <span className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>
                {promo.type === "percentage" ? `${promo.value}%` : `${promo.value} EGP`}
                {promo.maxDiscount ? <span className="text-[10.5px] ml-1 opacity-40">max {promo.maxDiscount}</span> : null}
              </span>
              <span className="text-[12.5px]" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>{promo.minOrder} EGP</span>
              <span className="text-[12.5px]" style={{ color: "var(--cream-dim)" }}>{promo.perCustomerLimit}×</span>
              <div>
                <span className="text-[12.5px]" style={{ color: "var(--cream)" }}>{promo.usedCount}</span>
                <span className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>/{promo.maxUses}</span>
                <div className="mt-1 rounded-full overflow-hidden" style={{ height: 3, background: "rgba(255,255,255,0.07)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.round((promo.usedCount / promo.maxUses) * 100))}%`, background: "var(--gold)", opacity: 0.6 }}
                  />
                </div>
              </div>
              <SegmentChips segments={promo.targetSegments} />
              <StatusBadge status={promo.status} map={PROMO_STATUS_STYLE} />
              <button
                type="button" onClick={() => onCopy(promo.code)}
                className="flex items-center gap-1 text-[11.5px] font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5 w-fit"
                style={{ color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.12)" }}
              >
                {copiedCode === promo.code ? <Check size={11} style={{ color: "#4ade80" }} /> : <Copy size={11} />}
                {copiedCode === promo.code ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Mobile */}
            <div className="lg:hidden flex items-center justify-between px-4 py-4 gap-3">
              <div>
                <p className="font-bold font-mono text-[13px]" style={{ color: "var(--gold)" }}>{promo.code}</p>
                <p className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
                  {promo.type === "percentage" ? `${promo.value}%` : `${promo.value} EGP`} off · used {promo.usedCount}/{promo.maxUses} · min {promo.minOrder} EGP
                </p>
              </div>
              <StatusBadge status={promo.status} map={PROMO_STATUS_STYLE} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Customer Targeting Tab ───────────────────────────────────────────────────

function CustomerTargetingTab({
  codes, offers,
}: {
  codes: PromoCode[];
  offers: Offer[];
}) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const activeCodes = codes.filter((c) => c.status === "Active");
  const activeOffers = offers.filter((o) => o.status === "Active");

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-xl"
        style={{ background: "rgba(96,165,250,0.07)", border: "1px solid rgba(96,165,250,0.15)" }}
      >
        <AlertTriangle size={14} style={{ color: "#60a5fa", flexShrink: 0, marginTop: 2 }} />
        <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.75 }}>
          Assign active offers and codes to specific customer segments. Targeting is informational —
          codes remain manually entered at checkout. Segment-specific landing pages and email triggers are a future feature.
        </p>
      </div>

      {/* Segment cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {SEGMENT_INFO.map((seg) => {
          const assignedOffers = activeOffers.filter((o) =>
            o.targetSegments.includes("all") || o.targetSegments.includes(seg.key)
          );
          const assignedCodes = activeCodes.filter((c) =>
            c.targetSegments.includes("all") || c.targetSegments.includes(seg.key)
          );
          const s = SEGMENT_STYLE[seg.key];

          return (
            <div
              key={seg.key}
              className="admin-surface px-5 py-4 space-y-3"
              style={{ borderLeft: `3px solid ${seg.color}` }}
            >
              {/* Segment header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {seg.label}
                  </span>
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: "var(--cream)" }}>
                    {seg.count}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>customers</span>
                </div>
              </div>
              <p className="text-[11.5px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>{seg.desc}</p>

              {/* Active offers for this segment */}
              {assignedOffers.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>
                    Active Offers
                  </p>
                  <div className="space-y-1">
                    {assignedOffers.map((o) => (
                      <div key={o.id} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#4ade80" }} />
                        <span className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.65 }}>{o.title.en}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active codes for this segment */}
              {assignedCodes.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>
                    Active Codes
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {assignedCodes.map((c) => (
                      <span
                        key={c.id}
                        className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded"
                        style={{ background: "rgba(182,136,94,0.1)", color: "var(--gold)" }}
                      >
                        {c.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {assignedOffers.length === 0 && assignedCodes.length === 0 && (
                <p className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.35 }}>No active promotions for this segment.</p>
              )}

              {/* Assign a code dropdown */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>
                  Quick-assign code
                </label>
                <div className="flex gap-2">
                  <select
                    value={assignments[seg.key] ?? ""}
                    onChange={(e) => setAssignments((p) => ({ ...p, [seg.key]: e.target.value }))}
                    className="flex-1 px-2 py-1.5 rounded-lg text-[12px] outline-none"
                    style={{ background: "#1a1209", border: "1px solid rgba(182,136,94,0.12)", color: "var(--cream)" }}
                  >
                    <option value="" style={{ background: "#1a1209" }}>Choose code…</option>
                    {activeCodes.map((c) => (
                      <option key={c.id} value={c.code} style={{ background: "#1a1209" }}>{c.code} — {c.type === "percentage" ? `${c.value}%` : `${c.value} EGP`}</option>
                    ))}
                  </select>
                  {assignments[seg.key] && (
                    <button
                      type="button"
                      onClick={() => setAssignments((p) => ({ ...p, [seg.key]: "" }))}
                      className="px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                      style={{ color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.1)" }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                {assignments[seg.key] && (
                  <p className="text-[11px] mt-1" style={{ color: "#4ade80", opacity: 0.8 }}>
                    ✓ {assignments[seg.key]} noted for this segment
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Website Banners Tab ──────────────────────────────────────────────────────

function WebsiteBannersTab({
  banners, bannerActive, onToggle,
}: {
  banners: typeof WEBSITE_BANNERS;
  bannerActive: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titleEn: "", titleAr: "", subtitleEn: "", ctaEn: "", position: "hero", startDate: "", endDate: "" });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
          {Object.values(bannerActive).filter(Boolean).length} of {banners.length} banners active
        </p>
        <div className="flex items-center gap-2">
          {saved && <span className="flex items-center gap-1 text-[12px]" style={{ color: "#4ade80" }}><Check size={12} /> Banner saved</span>}
          <button
            type="button" onClick={() => setShowForm((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold"
            style={{ background: "rgba(182,136,94,0.15)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.25)" }}
          >
            <Plus size={13} /> Add Banner
          </button>
        </div>
      </div>

      {showForm && (
        <div className="admin-surface px-5 py-5 space-y-4">
          <p className="text-[13px] font-semibold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>New Banner</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField label="Title (EN)" value={form.titleEn} onChange={(v) => setForm((p) => ({ ...p, titleEn: v }))} placeholder="e.g. Shop Espresso Blends" />
            <InputField label="Title (AR)" value={form.titleAr} onChange={(v) => setForm((p) => ({ ...p, titleAr: v }))} placeholder="مثال: تسوق خلطات الإسبريسو" />
            <InputField label="Subtitle (EN)" value={form.subtitleEn} onChange={(v) => setForm((p) => ({ ...p, subtitleEn: v }))} placeholder="optional subtitle or offer detail" />
            <InputField label="CTA Button (EN)" value={form.ctaEn} onChange={(v) => setForm((p) => ({ ...p, ctaEn: v }))} placeholder="e.g. Shop Now" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SelectField
              label="Position" value={form.position} onChange={(v) => setForm((p) => ({ ...p, position: v }))}
              options={[{ value: "hero", label: "Hero Banner" }, { value: "announcement", label: "Announcement Bar" }, { value: "section", label: "Section Banner" }]}
            />
            <InputField label="Start Date" value={form.startDate} onChange={(v) => setForm((p) => ({ ...p, startDate: v }))} type="date" />
            <InputField label="End Date" value={form.endDate} onChange={(v) => setForm((p) => ({ ...p, endDate: v }))} type="date" />
          </div>
          <FormFooter onSave={handleSave} onCancel={() => setShowForm(false)} saveLabel="Create Banner" />
        </div>
      )}

      <div className="admin-surface overflow-hidden">
        <SectionHeader icon={ImageIcon} label="Website Banners" />
        <div className="divide-y" style={{ borderColor: "rgba(182,136,94,0.06)" }}>
          {banners.map((banner) => {
            const pos = BANNER_POSITION_STYLE[banner.position];
            const isActive = bannerActive[banner.id] ?? banner.active;
            return (
              <div key={banner.id} className="flex items-start gap-4 px-5 py-4">
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => onToggle(banner.id)}
                  className="w-9 h-5 rounded-full flex-shrink-0 mt-1 transition-colors relative"
                  style={{ background: isActive ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.07)" }}
                  aria-pressed={isActive ? "true" : "false"}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                    style={{
                      left: isActive ? "calc(100% - 18px)" : "2px",
                      background: isActive ? "#4ade80" : "rgba(255,255,255,0.3)",
                    }}
                  />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold" style={{ color: isActive ? "var(--cream)" : "var(--cream-dim)", opacity: isActive ? 1 : 0.55 }}>
                      {banner.title.en}
                    </p>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{ background: pos.bg, color: pos.color }}
                    >
                      {pos.label}
                    </span>
                    {!isActive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: "rgba(156,163,175,0.12)", color: "#9ca3af" }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  {banner.subtitle && (
                    <p className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>{banner.subtitle.en}</p>
                  )}
                  <p className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.35 }}>
                    {banner.startDate} → {banner.endDate}
                    {banner.linkedOfferId && " · linked to offer"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Announcement Bar section */}
      <div className="admin-surface overflow-hidden">
        <SectionHeader icon={Megaphone} label="Header Announcement Bar Messages" />
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(182,136,94,0.06)" }}>
          <p className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
            These 3 messages rotate every 3.8s in the public header. Toggle each on or off.
          </p>
        </div>
        <div className="divide-y" style={{ borderColor: "rgba(182,136,94,0.06)" }}>
          {/* Announcement messages managed from parent via annActive */}
          {ANNOUNCEMENT_MESSAGES.map((msg) => (
            <div key={msg.id} className="flex items-start gap-4 px-5 py-4">
              <div className="w-9 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ background: "rgba(74,222,128,0.25)", position: "relative" }}>
                <span className="absolute top-0.5 w-4 h-4 rounded-full" style={{ left: "calc(100% - 18px)", background: "#4ade80" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px]" style={{ color: "var(--cream)" }}>{msg.text.en}</p>
                <p className="text-[12px] mt-0.5" dir="rtl" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>{msg.text.ar}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Performance Tab ──────────────────────────────────────────────────────────

type PerfView = "By Offer" | "By Promo Code";

function PerformanceTab({ offers, codes }: { offers: Offer[]; codes: PromoCode[] }) {
  const [view, setView] = useState<PerfView>("By Offer");

  const offerRows = [...offers].sort((a, b) => b.revenueGenerated - a.revenueGenerated);
  const codeRows = [...codes].sort((a, b) => b.revenueGenerated - a.revenueGenerated);

  const totalRevenue = offerRows.reduce((s, o) => s + o.revenueGenerated, 0);
  const totalDiscount = offerRows.reduce((s, o) => s + o.discountGiven, 0);
  const totalCodeDiscount = codeRows.reduce((s, c) => s + c.discountGiven, 0);

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex gap-1.5">
        {(["By Offer", "By Promo Code"] as PerfView[]).map((v) => {
          const active = view === v;
          return (
            <button
              key={v} type="button" onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: active ? "rgba(182,136,94,0.15)" : "rgba(255,255,255,0.03)",
                color: active ? "var(--gold)" : "var(--cream-dim)",
                border: active ? "1px solid rgba(182,136,94,0.25)" : "1px solid rgba(182,136,94,0.08)",
              }}
            >
              {v}
            </button>
          );
        })}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {view === "By Offer" ? (
          <>
            <div className="admin-kpi-card py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>Campaign Revenue</p>
              <p className="text-[18px] font-bold" style={{ color: "#4ade80" }}>{totalRevenue.toLocaleString()} EGP</p>
            </div>
            <div className="admin-kpi-card py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>Discount Given</p>
              <p className="text-[18px] font-bold" style={{ color: "#f87171" }}>{totalDiscount.toLocaleString()} EGP</p>
            </div>
            <div className="admin-kpi-card py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>ROI</p>
              <p className="text-[18px] font-bold" style={{ color: "var(--gold)" }}>
                {totalDiscount > 0 ? `${Math.round((totalRevenue / totalDiscount) * 10) / 10}×` : "—"}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="admin-kpi-card py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>Total Code Revenue</p>
              <p className="text-[18px] font-bold" style={{ color: "#4ade80" }}>{codeRows.reduce((s, c) => s + c.revenueGenerated, 0).toLocaleString()} EGP</p>
            </div>
            <div className="admin-kpi-card py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>Discount Given</p>
              <p className="text-[18px] font-bold" style={{ color: "#f87171" }}>{totalCodeDiscount.toLocaleString()} EGP</p>
            </div>
            <div className="admin-kpi-card py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>Total Uses</p>
              <p className="text-[18px] font-bold" style={{ color: "var(--gold)" }}>{codeRows.reduce((s, c) => s + c.usedCount, 0)}</p>
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="admin-surface overflow-hidden">
        <SectionHeader icon={BarChart2} label={view === "By Offer" ? "Offer Performance" : "Code Performance"} />

        {view === "By Offer" ? (
          <>
            <div
              className="hidden lg:grid gap-3 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider"
              style={{ gridTemplateColumns: "2fr 90px 80px 100px 100px 90px 90px", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(182,136,94,0.06)", color: "var(--cream-dim)" }}
            >
              <span>Offer</span>
              <span>Status</span>
              <span>Used</span>
              <span>Orders</span>
              <span>Revenue</span>
              <span>Discount</span>
              <span>Best Segment</span>
            </div>
            {offerRows.map((offer, i) => {
              const bestSeg = offer.targetSegments[0];
              const conv = offer.usedCount > 0 ? `${Math.round((offer.ordersGenerated / offer.usedCount) * 100)}%` : "—";
              return (
                <div
                  key={offer.id}
                  className="hidden lg:grid items-center gap-3 px-5 py-4"
                  style={{ gridTemplateColumns: "2fr 90px 80px 100px 100px 90px 90px", borderBottom: i < offerRows.length - 1 ? "1px solid rgba(182,136,94,0.06)" : undefined }}
                >
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: "var(--cream)" }}>{offer.title.en}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>{offer.startDate} → {offer.endDate}</p>
                  </div>
                  <StatusBadge status={offer.status} map={OFFER_STATUS_STYLE} />
                  <span className="text-[13px] tabular-nums" style={{ color: "var(--cream)" }}>{offer.usedCount}</span>
                  <span className="text-[12.5px] tabular-nums" style={{ color: "var(--cream-dim)" }}>{offer.ordersGenerated} <span className="text-[10.5px] opacity-50">({conv})</span></span>
                  <span className="text-[13px] tabular-nums font-semibold" style={{ color: offer.revenueGenerated > 0 ? "#4ade80" : "var(--cream-dim)" }}>
                    {offer.revenueGenerated > 0 ? `${offer.revenueGenerated.toLocaleString()} EGP` : "—"}
                  </span>
                  <span className="text-[12.5px] tabular-nums" style={{ color: offer.discountGiven > 0 ? "#f87171" : "var(--cream-dim)", opacity: offer.discountGiven > 0 ? 1 : 0.4 }}>
                    {offer.discountGiven > 0 ? `${offer.discountGiven.toLocaleString()} EGP` : "—"}
                  </span>
                  {bestSeg && bestSeg !== "all" ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold w-fit" style={{ background: SEGMENT_STYLE[bestSeg].bg, color: SEGMENT_STYLE[bestSeg].color }}>
                      {SEGMENT_STYLE[bestSeg].label}
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>All</span>
                  )}
                </div>
              );
            })}
            {/* Mobile fallback */}
            {offerRows.map((offer, i) => (
              <div key={`m-${offer.id}`} className="lg:hidden px-4 py-4" style={{ borderBottom: i < offerRows.length - 1 ? "1px solid rgba(182,136,94,0.06)" : undefined }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] font-medium" style={{ color: "var(--cream)" }}>{offer.title.en}</p>
                  <StatusBadge status={offer.status} map={OFFER_STATUS_STYLE} />
                </div>
                <p className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
                  Used {offer.usedCount} · {offer.ordersGenerated} orders · {offer.revenueGenerated > 0 ? `${offer.revenueGenerated.toLocaleString()} EGP` : "no revenue"} · {offer.discountGiven > 0 ? `${offer.discountGiven.toLocaleString()} EGP discount` : ""}
                </p>
              </div>
            ))}
          </>
        ) : (
          <>
            <div
              className="hidden lg:grid gap-3 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider"
              style={{ gridTemplateColumns: "130px 90px 90px 90px 100px 100px 90px", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(182,136,94,0.06)", color: "var(--cream-dim)" }}
            >
              <span>Code</span>
              <span>Status</span>
              <span>Used</span>
              <span>Conv.</span>
              <span>Orders</span>
              <span>Revenue</span>
              <span>Discount</span>
            </div>
            {codeRows.map((code, i) => {
              const conv = code.usedCount > 0 ? `${Math.round((code.ordersGenerated / code.usedCount) * 100)}%` : "—";
              return (
                <div
                  key={code.id}
                  className="hidden lg:grid items-center gap-3 px-5 py-4"
                  style={{ gridTemplateColumns: "130px 90px 90px 90px 100px 100px 90px", borderBottom: i < codeRows.length - 1 ? "1px solid rgba(182,136,94,0.06)" : undefined }}
                >
                  <span className="font-mono font-bold text-[13px]" style={{ color: "var(--gold)" }}>{code.code}</span>
                  <StatusBadge status={code.status} map={PROMO_STATUS_STYLE} />
                  <span className="text-[13px] tabular-nums" style={{ color: "var(--cream)" }}>{code.usedCount}</span>
                  <span className="text-[12.5px] tabular-nums" style={{ color: "var(--cream-dim)", opacity: 0.7 }}>{conv}</span>
                  <span className="text-[12.5px] tabular-nums" style={{ color: "var(--cream-dim)" }}>{code.ordersGenerated}</span>
                  <span className="text-[13px] tabular-nums font-semibold" style={{ color: code.revenueGenerated > 0 ? "#4ade80" : "var(--cream-dim)" }}>
                    {code.revenueGenerated > 0 ? `${code.revenueGenerated.toLocaleString()} EGP` : "—"}
                  </span>
                  <span className="text-[12.5px] tabular-nums" style={{ color: code.discountGiven > 0 ? "#f87171" : "var(--cream-dim)", opacity: code.discountGiven > 0 ? 1 : 0.4 }}>
                    {code.discountGiven > 0 ? `${code.discountGiven.toLocaleString()} EGP` : "—"}
                  </span>
                </div>
              );
            })}
            {/* Mobile */}
            {codeRows.map((code, i) => (
              <div key={`m-${code.id}`} className="lg:hidden flex items-center justify-between px-4 py-4" style={{ borderBottom: i < codeRows.length - 1 ? "1px solid rgba(182,136,94,0.06)" : undefined }}>
                <div>
                  <p className="font-mono font-bold text-[13px]" style={{ color: "var(--gold)" }}>{code.code}</p>
                  <p className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
                    Used {code.usedCount} · {code.revenueGenerated > 0 ? `${code.revenueGenerated.toLocaleString()} EGP` : "no revenue"}
                  </p>
                </div>
                <StatusBadge status={code.status} map={PROMO_STATUS_STYLE} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Offers");

  // Offer state
  const [offerOverrides, setOfferOverrides] = useState<Record<string, Partial<Offer>>>({});
  const handlePauseOffer = (id: string) => setOfferOverrides((p) => ({ ...p, [id]: { ...p[id], status: "Paused" } }));
  const handleActivateOffer = (id: string) => setOfferOverrides((p) => ({ ...p, [id]: { ...p[id], status: "Active" } }));

  // Code copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const handleCopy = (code: string) => { setCopiedCode(code); setTimeout(() => setCopiedCode(null), 1800); };

  // Code overrides (unused but preserved for future)
  const [codeOverrides] = useState<Record<string, Partial<PromoCode>>>({});

  // Banner toggles
  const [bannerActive, setBannerActive] = useState<Record<string, boolean>>(
    Object.fromEntries(WEBSITE_BANNERS.map((b) => [b.id, b.active]))
  );
  const handleBannerToggle = (id: string) => setBannerActive((p) => ({ ...p, [id]: !p[id] }));

  const KPI_CARDS = [
    { label: "Active Offers",    value: MARKETING_SUMMARY.activeOffers,                      color: "#4ade80"       },
    { label: "Active Codes",     value: MARKETING_SUMMARY.activeCodes,                       color: "#4ade80"       },
    { label: "Total Usage",      value: MARKETING_SUMMARY.totalUsage,                        color: "var(--cream)"  },
    { label: "Discount Given",   value: `${(MARKETING_SUMMARY.totalDiscountGiven / 1000).toFixed(1)}k EGP`, color: "#f87171" },
    { label: "Campaign Revenue", value: `${Math.round(MARKETING_SUMMARY.totalCampaignRevenue / 1000)}k EGP`, color: "#4ade80" },
    {
      label: "Expiring Soon",
      value: MARKETING_SUMMARY.expiringSoon,
      color: MARKETING_SUMMARY.expiringSoon > 0 ? "#fbbf24" : "var(--cream-dim)",
    },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
            Marketing &amp; Promotions
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
            {MARKETING_SUMMARY.activeOffers} active offers · {MARKETING_SUMMARY.activeCodes} active codes ·{" "}
            <span style={{ color: "var(--gold)" }}>
              {MARKETING_SUMMARY.totalCampaignRevenue.toLocaleString()} EGP
            </span>{" "}
            campaign revenue
          </p>
        </div>
        {MARKETING_SUMMARY.expiringSoon > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold"
            style={{ background: "rgba(251,191,36,0.10)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}
          >
            <AlertTriangle size={13} />
            {MARKETING_SUMMARY.expiringSoon} expiring within 14 days
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_CARDS.map(({ label, value, color }) => (
          <div key={label} className="admin-kpi-card py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
              {label}
            </p>
            <p className="text-[20px] font-bold tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 overflow-x-auto" style={{ borderBottom: "1px solid rgba(182,136,94,0.10)" }}>
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors relative flex-shrink-0"
              style={{ color: active ? "var(--gold)" : "var(--cream-dim)", opacity: active ? 1 : 0.55 }}
            >
              {tab}
              {active && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: "var(--gold)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "Offers" && (
        <OffersTab
          offers={OFFERS}
          offerOverrides={offerOverrides}
          onPause={handlePauseOffer}
          onActivate={handleActivateOffer}
        />
      )}
      {activeTab === "Promo Codes" && (
        <PromoCodesTab
          codes={PROMO_CODES}
          codeOverrides={codeOverrides}
          onCopy={handleCopy}
          copiedCode={copiedCode}
        />
      )}
      {activeTab === "Customer Targeting" && (
        <CustomerTargetingTab codes={PROMO_CODES} offers={OFFERS} />
      )}
      {activeTab === "Website Banners" && (
        <WebsiteBannersTab
          banners={WEBSITE_BANNERS}
          bannerActive={bannerActive}
          onToggle={handleBannerToggle}
        />
      )}
      {activeTab === "Performance" && (
        <PerformanceTab offers={OFFERS} codes={PROMO_CODES} />
      )}
    </div>
  );
}
