"use client";

import { useState, useEffect } from "react";
import {
  X, MessageCircle, Phone, Mail, MapPin, ShoppingBag,
  Star, AlertTriangle, ChevronRight, Clock, Package, Tag,
  Activity, Info, CheckCircle, Copy, Loader2, RefreshCw,
} from "lucide-react";
import {
  getAdminCustomerDetail,
  updateAdminCustomerTags,
  getCustomerSegments,
  getCustomerSegmentReason,
  getSuggestedPromotion,
  getCustomerLifecycleStatus,
  type AdminCustomerDetail,
  type CustomerSegment,
} from "@/lib/admin/admin-customers";
import { ADMIN_ORDER_STATUS_LABELS } from "@/lib/admin/admin-orders";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-EG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeDays(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

function fmt(n: number) {
  return n.toLocaleString();
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  standard: "Standard",
  custom_espresso: "Custom Espresso",
  custom_flavor: "Custom Flavor",
  mixed: "Mixed",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gold)", opacity: 0.55, marginBottom: 10 }}>
      {children}
    </p>
  );
}

function Hr() {
  return <div style={{ height: 1, background: "rgba(182,136,94,0.08)", margin: "16px 0" }} />;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.45, width: 120, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "var(--cream)", flex: 1 }}>{value}</span>
    </div>
  );
}

const TYPE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  registered: { bg: "rgba(96,165,250,0.12)",  color: "#60a5fa", label: "Registered" },
  guest:      { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24", label: "Guest" },
};

const ACCOUNT_STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: "rgba(74,222,128,0.12)",  color: "#4ade80", label: "Active" },
  inactive: { bg: "rgba(156,163,175,0.12)", color: "#9ca3af", label: "Inactive" },
  blocked:  { bg: "rgba(248,113,113,0.12)", color: "#f87171", label: "Blocked" },
};

const LIFECYCLE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: "rgba(74,222,128,0.12)",   color: "#4ade80", label: "Active" },
  inactive: { bg: "rgba(248,113,113,0.12)",  color: "#f87171", label: "Inactive" },
  new:      { bg: "rgba(251,191,36,0.12)",   color: "#fbbf24", label: "New" },
};

const SEGMENT_STYLE: Record<CustomerSegment, { color: string; bg: string; label: string }> = {
  vip:                  { color: "var(--gold)",  bg: "rgba(182,136,94,0.12)", label: "VIP" },
  repeat:               { color: "#4ade80",       bg: "rgba(74,222,128,0.10)", label: "Repeat" },
  new:                  { color: "#fbbf24",       bg: "rgba(251,191,36,0.10)", label: "New" },
  inactive:             { color: "#f87171",       bg: "rgba(248,113,113,0.10)", label: "Inactive" },
  "at-risk":            { color: "#fb923c",       bg: "rgba(251,146,60,0.10)", label: "At Risk" },
  "wholesale-potential":{ color: "#c084fc",       bg: "rgba(192,132,252,0.10)", label: "Wholesale" },
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  pending:   "#fbbf24",
  preparing: "#60a5fa",
  shipped:   "#a78bfa",
  delivered: "#4ade80",
  cancelled: "#f87171",
  returned:  "#9ca3af",
};

const ACTIVITY_DOT: Record<string, string> = {
  pending:   "#fbbf24",
  preparing: "#60a5fa",
  shipped:   "#a78bfa",
  delivered: "#4ade80",
  cancelled: "#f87171",
  returned:  "#9ca3af",
};

const PREDEFINED_TAGS = [
  "VIP", "Repeat Customer", "New Customer", "Inactive",
  "Needs Follow-up", "Wholesale Potential", "Promo Sensitive",
  "High Value", "At Risk", "B2B Potential",
];

type DrawerTab = "overview" | "addresses" | "orders" | "insights" | "tags" | "activity";

const TABS: Array<{ key: DrawerTab; label: string; icon: React.ReactNode }> = [
  { key: "overview",   label: "Overview",   icon: <Info size={12} /> },
  { key: "addresses",  label: "Addresses",  icon: <MapPin size={12} /> },
  { key: "orders",     label: "Orders",     icon: <ShoppingBag size={12} /> },
  { key: "insights",   label: "Insights",   icon: <Activity size={12} /> },
  { key: "tags",       label: "Tags",       icon: <Tag size={12} /> },
  { key: "activity",   label: "Activity",   icon: <Clock size={12} /> },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface CustomerDrawerProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: DrawerTab;
  onCustomerUpdated?: (customerId: string, tags: string[]) => void;
  duplicateOf?: { id: string; name: string } | null;
}

// ── Main drawer ────────────────────────────────────────────────────────────────

export default function CustomerDrawer({
  customerId, isOpen, onClose,
  initialTab = "overview",
  onCustomerUpdated,
  duplicateOf,
}: CustomerDrawerProps) {
  const [tab,     setTab]     = useState<DrawerTab>(initialTab);
  const [detail,  setDetail]  = useState<AdminCustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customTag,  setCustomTag]  = useState("");
  const [copied,     setCopied]     = useState<string | null>(null);
  const [tagsSaving, setTagsSaving] = useState(false);
  const [tagsError,  setTagsError]  = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setTab(initialTab); }, [customerId, initialTab]);

  useEffect(() => {
    if (!customerId || !isOpen) return;
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-open reset
    setLoading(true);
    setLoadError(null);
    getAdminCustomerDetail(customerId)
      .then((data) => {
        if (ignore) return;
        setDetail(data);
        if (!data) setLoadError("Customer not found.");
      })
      .catch((err: unknown) => {
        if (ignore) return;
        setLoadError(err instanceof Error ? err.message : "Could not load this customer.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, [customerId, isOpen]);

  async function reload() {
    if (!customerId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getAdminCustomerDetail(customerId);
      setDetail(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load this customer.");
    } finally {
      setLoading(false);
    }
  }

  async function persistTags(nextTags: string[]) {
    if (!detail) return;
    setTagsSaving(true);
    setTagsError(null);
    try {
      const saved = await updateAdminCustomerTags(detail.id, nextTags);
      setDetail((prev) => (prev ? { ...prev, tags: saved } : prev));
      onCustomerUpdated?.(detail.id, saved);
    } catch (err) {
      setTagsError(err instanceof Error ? err.message : "Could not save tags.");
    } finally {
      setTagsSaving(false);
    }
  }

  function handleAddTag(t: string) {
    if (!detail || detail.tags.includes(t)) return;
    void persistTags([...detail.tags, t]);
  }

  function handleRemoveTag(t: string) {
    if (!detail) return;
    void persistTags(detail.tags.filter((x) => x !== t));
  }

  function handleCustomTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && customTag.trim()) {
      handleAddTag(customTag.trim());
      setCustomTag("");
    }
  }

  function handleCopyAddress(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }

  const segs = detail ? getCustomerSegments(detail) : [];
  const lifecycle = detail ? getCustomerLifecycleStatus(detail) : "active";
  const suggestion = detail ? getSuggestedPromotion(detail) : null;
  const typeCfg = detail ? TYPE_BADGE[detail.type] : TYPE_BADGE.guest;
  const accountStatusCfg = detail ? ACCOUNT_STATUS_BADGE[detail.status] : ACCOUNT_STATUS_BADGE.active;
  const lifecycleCfg = LIFECYCLE_BADGE[lifecycle];

  const initials = detail
    ? detail.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "—";
  const avatarBg = detail?.type === "registered"
    ? (segs.includes("vip") ? "linear-gradient(135deg,#a8744e,#d6a373)" : "linear-gradient(135deg,#3b82f6,#60a5fa)")
    : (segs.includes("vip") ? "linear-gradient(135deg,#a8744e,#d6a373)" : "linear-gradient(135deg,#d97706,#fbbf24)");

  const waHref = detail ? `https://wa.me/${detail.whatsapp.replace(/\D/g, "")}` : "#";

  return (
    <>
      {isOpen && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.60)", zIndex: 101 }} />
      )}

      <div
        style={{
          position: "fixed", top: 0, right: 0, height: "100vh",
          width: "clamp(360px,48vw,680px)",
          background: "var(--coffee-dark)",
          borderLeft: "1px solid rgba(182,136,94,0.12)",
          zIndex: 102,
          display: "flex", flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 280ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* ── Sticky Header ────────────────────────────────────────────────────── */}
        <div style={{ padding: "18px 20px 0", borderBottom: "1px solid rgba(182,136,94,0.10)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
              background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, color: "#0b0806",
            }}>
              {initials}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 5 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
                  {detail?.name ?? (loading ? "Loading…" : "—")}
                </span>
                {duplicateOf && <AlertTriangle size={13} style={{ color: "#fbbf24", flexShrink: 0 }} />}
              </div>

              {detail && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: typeCfg.bg, color: typeCfg.color }}>
                    {typeCfg.label}
                  </span>
                  {segs.map((s) => (
                    <span key={s} style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: SEGMENT_STYLE[s].bg, color: SEGMENT_STYLE[s].color }}>
                      {SEGMENT_STYLE[s].label}
                    </span>
                  ))}
                  <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: lifecycleCfg.bg, color: lifecycleCfg.color }}>
                    {lifecycleCfg.label}
                  </span>
                </div>
              )}

              {detail && (
                <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>
                      {fmt(detail.totalSpent)} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--cream-dim)", opacity: 0.5 }}>EGP</span>
                    </p>
                    <p style={{ fontSize: 9.5, color: "var(--cream-dim)", opacity: 0.4 }}>Total spent</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--cream)" }}>{detail.ordersCount}</p>
                    <p style={{ fontSize: 9.5, color: "var(--cream-dim)", opacity: 0.4 }}>Orders</p>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => void reload()}
                title="Refresh"
                style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--cream-dim)" }}
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : undefined} />
              </button>
              {detail && (
                <a
                  href={waHref}
                  target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "rgba(37,211,102,0.12)", color: "#25d366", fontSize: 12, fontWeight: 600, textDecoration: "none", border: "1px solid rgba(37,211,102,0.20)" }}
                >
                  <MessageCircle size={13} /> WA
                </a>
              )}
              <button type="button" onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--cream-dim)" }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {duplicateOf && (
            <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.20)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={13} style={{ color: "#fbbf24", flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: "#fbbf24" }}>
                Possible duplicate — shares a phone number with <strong>{duplicateOf.name}</strong>.
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "10px 13px",
                  fontSize: 11.5, fontWeight: 600,
                  color: tab === t.key ? "var(--gold)" : "var(--cream-dim)",
                  background: "none", border: "none",
                  borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
                  cursor: "pointer", whiteSpace: "nowrap", opacity: tab === t.key ? 1 : 0.55,
                  transition: "all 200ms",
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {loading && !detail && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 8, color: "var(--cream-dim)", opacity: 0.5 }}>
              <Loader2 size={16} className="animate-spin" /> Loading customer…
            </div>
          )}

          {!loading && loadError && !detail && (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <AlertTriangle size={28} style={{ color: "#f87171", opacity: 0.5, margin: "0 auto 10px" }} />
              <p style={{ fontSize: 13, color: "#f87171" }}>{loadError}</p>
              <button type="button" onClick={() => void reload()} style={{ marginTop: 12, fontSize: 12, color: "var(--gold)", background: "none", border: "none", cursor: "pointer" }}>
                Try again
              </button>
            </div>
          )}

          {detail && (
            <>
              {/* ══ OVERVIEW ════════════════════════════════════════════════════════ */}
              {tab === "overview" && (
                <div>
                  <SectionTitle>Contact</SectionTitle>
                  <InfoRow label="Phone" value={
                    detail.phone
                      ? <a href={`tel:${detail.phone}`} style={{ color: "var(--cream)", display: "flex", alignItems: "center", gap: 5 }}>
                          <Phone size={11} style={{ color: "var(--gold)", opacity: 0.7 }} /> {detail.phone}
                        </a>
                      : <span style={{ color: "var(--cream-dim)", opacity: 0.4 }}>Not provided</span>
                  } />
                  <InfoRow label="WhatsApp" value={
                    <a href={waHref} target="_blank" rel="noreferrer" style={{ color: "#25d366", display: "flex", alignItems: "center", gap: 5 }}>
                      <MessageCircle size={11} /> {detail.whatsapp}
                    </a>
                  } />
                  <InfoRow label="Email" value={
                    detail.email
                      ? <a href={`mailto:${detail.email}`} style={{ color: "var(--cream)", display: "flex", alignItems: "center", gap: 5 }}>
                          <Mail size={11} style={{ color: "var(--gold)", opacity: 0.7 }} /> {detail.email}
                        </a>
                      : <span style={{ color: "var(--cream-dim)", opacity: 0.4 }}>Not provided</span>
                  } />

                  <Hr />
                  <SectionTitle>Account</SectionTitle>
                  <InfoRow label="Customer ID" value={<span style={{ fontFamily: "monospace", fontSize: 11 }}>{detail.id}</span>} />
                  <InfoRow label="Type" value={
                    <span style={{ background: typeCfg.bg, color: typeCfg.color, fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 12 }}>
                      {typeCfg.label}
                    </span>
                  } />
                  <InfoRow label="Account Status" value={
                    <span style={{ background: accountStatusCfg.bg, color: accountStatusCfg.color, fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 12 }}>
                      {accountStatusCfg.label}
                    </span>
                  } />
                  <InfoRow label="Joined" value={`${detail.joinedAt} (${relativeDays(detail.daysSinceJoined)})`} />
                  <InfoRow label="Last Order" value={
                    detail.lastOrderDate
                      ? `${formatDate(detail.lastOrderDate)} (${relativeDays(detail.daysSinceLastOrder)})`
                      : <span style={{ color: "var(--cream-dim)", opacity: 0.4 }}>No orders yet</span>
                  } />
                  <InfoRow label="Marketing" value={
                    detail.marketingOptIn
                      ? <span style={{ color: "#4ade80", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={11} /> Opted in</span>
                      : <span style={{ color: "#9ca3af" }}>Not opted in</span>
                  } />

                  {suggestion && (
                    <>
                      <Hr />
                      <SectionTitle>Suggested Action</SectionTitle>
                      <div style={{ background: "rgba(182,136,94,0.07)", border: "1px solid rgba(182,136,94,0.15)", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Star size={13} style={{ color: "var(--gold)", flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, color: "var(--gold)", fontWeight: 600 }}>{suggestion}</span>
                        </div>
                        <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.5, marginTop: 4 }}>
                          Campaign creation available in the Marketing module
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ══ ADDRESSES ════════════════════════════════════════════════════════ */}
              {tab === "addresses" && (
                <div>
                  <SectionTitle>Saved Addresses</SectionTitle>
                  {detail.addresses.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <MapPin size={28} style={{ color: "var(--cream-dim)", opacity: 0.2, margin: "0 auto 10px" }} />
                      <p style={{ fontSize: 13, color: "var(--cream-dim)", opacity: 0.4 }}>No saved addresses</p>
                      <p style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.3, marginTop: 4 }}>
                        {detail.type === "guest" ? "Guest customer — address captured at checkout only" : "No addresses on file"}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {detail.addresses.map((addr) => {
                        const fullText = [addr.building, addr.street, addr.area, addr.city, addr.governorate].filter(Boolean).join(", ");
                        return (
                          <div key={addr.id} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${addr.isDefault ? "rgba(182,136,94,0.22)" : "rgba(182,136,94,0.08)"}`, borderRadius: 10, padding: "14px 16px", borderLeft: addr.isDefault ? "3px solid var(--gold)" : undefined }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cream)" }}>{addr.label}</span>
                                {addr.isDefault && <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: "rgba(182,136,94,0.15)", color: "var(--gold)" }}>Default</span>}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyAddress(fullText)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: copied === fullText ? "#4ade80" : "var(--cream-dim)", opacity: 0.4, display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
                                title="Copy address"
                              >
                                {copied === fullText ? <CheckCircle size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.65, lineHeight: 1.7 }}>
                              {addr.building && <div>{addr.building}</div>}
                              <div>{addr.street}</div>
                              {(addr.floor || addr.apartment) && (
                                <div>{[addr.floor && `Floor ${addr.floor}`, addr.apartment && `Apt ${addr.apartment}`].filter(Boolean).join(" · ")}</div>
                              )}
                              {addr.area && <div>{addr.area}</div>}
                              <div style={{ fontWeight: 500, color: "var(--cream)", opacity: 0.8 }}>{addr.city}, {addr.governorate}</div>
                              {addr.landmark && <div style={{ color: "var(--cream-dim)", opacity: 0.4, fontStyle: "italic", fontSize: 11 }}>{addr.landmark}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ══ ORDERS ═══════════════════════════════════════════════════════════ */}
              {tab === "orders" && (
                <div>
                  <SectionTitle>Order History</SectionTitle>
                  {detail.orders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <Package size={28} style={{ color: "var(--cream-dim)", opacity: 0.2, margin: "0 auto 10px" }} />
                      <p style={{ fontSize: 13, color: "var(--cream-dim)", opacity: 0.4 }}>No orders on record</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {detail.orders.map((order) => {
                        const statusColor = ORDER_STATUS_COLOR[order.status] ?? "#9ca3af";
                        const waMsg = encodeURIComponent(`مرحبًا، بنتواصل مع حضرتك بخصوص طلب Line Coffee رقم ${order.code}.`);
                        const orderWaHref = `${waHref}?text=${waMsg}`;
                        return (
                          <div key={order.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(182,136,94,0.08)", borderRadius: 10, padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gold)", fontFamily: "monospace" }}>{order.code}</span>
                                {order.type !== "standard" && (
                                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 10, background: "rgba(255,255,255,0.05)", color: "#a78bfa" }}>
                                    {ORDER_TYPE_LABEL[order.type] ?? order.type}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: `${statusColor}18`, color: statusColor }}>
                                {ADMIN_ORDER_STATUS_LABELS[order.status] ?? order.status}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.5 }}>
                                {formatDate(order.placedAt)} · {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gold)" }}>{fmt(order.total)} EGP</span>
                                <a
                                  href={orderWaHref}
                                  target="_blank" rel="noreferrer"
                                  style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 6, background: "rgba(37,211,102,0.10)", color: "#25d366", fontSize: 10.5, textDecoration: "none", border: "1px solid rgba(37,211,102,0.15)" }}
                                  title="WhatsApp about this order"
                                >
                                  <MessageCircle size={10} /> WA
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {detail.ordersTruncated && (
                        <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.35, textAlign: "center", marginTop: 4 }}>
                          Showing the most recent orders only.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ══ INSIGHTS ══════════════════════════════════════════════════════════ */}
              {tab === "insights" && (
                <div>
                  <SectionTitle>Lifetime Value Summary</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                    {[
                      { label: "Total Spent",    value: `${fmt(detail.totalSpent)} EGP`, color: "var(--gold)" },
                      { label: "Orders",         value: detail.ordersCount, color: "var(--cream)" },
                      { label: "Total Paid",     value: `${fmt(detail.totalPaid)} EGP`, color: "var(--cream)" },
                      { label: "Total Refunded", value: `${fmt(detail.totalRefunded)} EGP`, color: detail.totalRefunded > 0 ? "#f87171" : "var(--cream)" },
                    ].map((s) => (
                      <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(182,136,94,0.08)", borderRadius: 8, padding: "10px 12px" }}>
                        <p style={{ fontSize: 13.5, fontWeight: 700, color: s.color }}>{s.value}</p>
                        <p style={{ fontSize: 9.5, color: "var(--cream-dim)", opacity: 0.4, marginTop: 2 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {segs.length > 0 && (
                    <>
                      <Hr />
                      <SectionTitle>Segments</SectionTitle>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {segs.map((s) => (
                          <div key={s} style={{ background: SEGMENT_STYLE[s].bg, border: `1px solid ${SEGMENT_STYLE[s].color}22`, borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: SEGMENT_STYLE[s].color, minWidth: 80 }}>{SEGMENT_STYLE[s].label}</span>
                            <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.65 }}>{getCustomerSegmentReason(s, detail)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <Hr />
                  <SectionTitle>Marketing Readiness</SectionTitle>
                  <InfoRow label="Opt-in" value={
                    detail.marketingOptIn
                      ? <span style={{ color: "#4ade80" }}>Opted in</span>
                      : <span style={{ color: "#9ca3af" }}>Not opted in</span>
                  } />
                  {suggestion && (
                    <div style={{ background: "rgba(182,136,94,0.07)", border: "1px solid rgba(182,136,94,0.15)", borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
                      <p style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gold)" }}>{suggestion}</p>
                    </div>
                  )}
                  <p style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.35, marginTop: 14, fontStyle: "italic" }}>
                    Bulk targeting and campaign creation are handled in the Marketing module.
                  </p>
                </div>
              )}

              {/* ══ TAGS ══════════════════════════════════════════════════════════════ */}
              {tab === "tags" && (
                <div>
                  <SectionTitle>Active Tags</SectionTitle>
                  {tagsError && (
                    <p style={{ fontSize: 11.5, color: "#f87171", marginBottom: 10 }}>{tagsError}</p>
                  )}
                  {detail.tags.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: "var(--cream-dim)", opacity: 0.4, marginBottom: 16 }}>No tags — add one below</p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                      {detail.tags.map((t) => (
                        <span key={t} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(182,136,94,0.12)", border: "1px solid rgba(182,136,94,0.20)", color: "var(--gold)", fontSize: 11.5, fontWeight: 600, opacity: tagsSaving ? 0.5 : 1 }}>
                          {t}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            disabled={tagsSaving}
                            style={{ background: "none", border: "none", cursor: tagsSaving ? "default" : "pointer", color: "var(--gold)", opacity: 0.6, padding: 0, display: "flex", alignItems: "center", lineHeight: 1 }}
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <Hr />
                  <SectionTitle>Add Predefined Tags</SectionTitle>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {PREDEFINED_TAGS.filter((t) => !detail.tags.includes(t)).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleAddTag(t)}
                        disabled={tagsSaving}
                        style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)", color: "var(--cream-dim)", fontSize: 11.5, cursor: tagsSaving ? "default" : "pointer", fontWeight: 500, transition: "all 150ms" }}
                      >
                        + {t}
                      </button>
                    ))}
                    {PREDEFINED_TAGS.every((t) => detail.tags.includes(t)) && (
                      <p style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.35 }}>All predefined tags active</p>
                    )}
                  </div>

                  <Hr />
                  <SectionTitle>Custom Tag</SectionTitle>
                  <input
                    type="text"
                    placeholder="Type tag and press Enter…"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={handleCustomTagKeyDown}
                    disabled={tagsSaving}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 12.5,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)",
                      color: "var(--cream)", outline: "none",
                    }}
                  />
                  <p style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.35, marginTop: 6 }}>
                    {'Tags do not override computed segments. Exception: "Wholesale Potential" tag activates that segment. Saved directly to the customer record.'}
                  </p>
                </div>
              )}

              {/* ══ ACTIVITY ══════════════════════════════════════════════════════════ */}
              {tab === "activity" && (
                <div>
                  <SectionTitle>Activity Timeline</SectionTitle>
                  {detail.activity.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <Clock size={28} style={{ color: "var(--cream-dim)", opacity: 0.2, margin: "0 auto 10px" }} />
                      <p style={{ fontSize: 13, color: "var(--cream-dim)", opacity: 0.4 }}>No activity recorded yet</p>
                    </div>
                  ) : (
                    <div style={{ position: "relative" }}>
                      {detail.activity.map((act, i) => {
                        const dotColor = act.kind === "account-created"
                          ? "#4ade80"
                          : ACTIVITY_DOT[act.status ?? ""] ?? "#9ca3af";
                        const title = act.kind === "account-created"
                          ? "Account Created"
                          : `Order ${act.status ? ADMIN_ORDER_STATUS_LABELS[act.status] : act.status}`;
                        const description = act.kind === "account-created"
                          ? `${detail.type === "registered" ? "Registered" : "Identified via guest checkout"} on Line Coffee`
                          : (act.note ?? `Order ${act.orderCode} status changed`);
                        return (
                          <div key={act.id} style={{ display: "flex", gap: 12, paddingBottom: 16, position: "relative" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, marginTop: 4, flexShrink: 0 }} />
                              {i < detail.activity.length - 1 && (
                                <div style={{ width: 1, flex: 1, background: "rgba(182,136,94,0.10)", marginTop: 4, minHeight: 16 }} />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                                <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cream)" }}>{title}</p>
                                <span style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.4, flexShrink: 0 }}>{formatDate(act.occurredAt)}</span>
                              </div>
                              <p style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.55, marginTop: 2 }}>{description}</p>
                              {act.orderCode && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginTop: 4, padding: "2px 7px", borderRadius: 6, background: "rgba(182,136,94,0.08)", color: "var(--gold)", fontSize: 10.5, fontFamily: "monospace" }}>
                                  <ChevronRight size={9} /> {act.orderCode}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
