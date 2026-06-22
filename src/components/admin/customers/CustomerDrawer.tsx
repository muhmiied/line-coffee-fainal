"use client";

import { useState, useEffect } from "react";
import {
  X, MessageCircle, Phone, Mail, MapPin, ShoppingBag, Sparkles,
  Star, AlertTriangle, ChevronRight, Clock, Package, Tag,
  FileText, Activity, Info, CheckCircle, Copy,
} from "lucide-react";
import {
  type AdminCustomer, type CustomerActivity, type CustomerSegment,
  getSegments, getSegmentReason, getSuggestedPromotion, getStatus,
} from "@/lib/mock-data/admin/customers-mock";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ANCHOR = "2026-06-21";

function relativeDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const anchor = new Date(ANCHOR).getTime();
  const d      = new Date(dateStr).getTime();
  const days   = Math.floor((anchor - d) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? "s" : ""} ago`;
}

function fmt(n: number) {
  return n.toLocaleString();
}

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

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.45, width: 120, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "var(--cream)", fontFamily: mono ? "monospace" : undefined, flex: 1 }}>{value}</span>
    </div>
  );
}

const TYPE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  registered: { bg: "rgba(96,165,250,0.12)",  color: "#60a5fa", label: "Registered" },
  guest:      { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24", label: "Guest" },
};

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  active:   { bg: "rgba(74,222,128,0.12)",   color: "#4ade80" },
  inactive: { bg: "rgba(248,113,113,0.12)",  color: "#f87171" },
  new:      { bg: "rgba(251,191,36,0.12)",   color: "#fbbf24" },
};

const SEGMENT_STYLE: Record<CustomerSegment, { color: string; bg: string; label: string }> = {
  vip:                  { color: "var(--gold)",  bg: "rgba(182,136,94,0.12)", label: "VIP" },
  repeat:               { color: "#4ade80",       bg: "rgba(74,222,128,0.10)", label: "Repeat" },
  new:                  { color: "#fbbf24",       bg: "rgba(251,191,36,0.10)", label: "New" },
  inactive:             { color: "#f87171",       bg: "rgba(248,113,113,0.10)", label: "Inactive" },
  "at-risk":            { color: "#fb923c",       bg: "rgba(251,146,60,0.10)", label: "At Risk" },
  "wholesale-potential":{ color: "#c084fc",       bg: "rgba(192,132,252,0.10)", label: "Wholesale" },
};

const ACTIVITY_DOT: Record<string, string> = {
  "order-created":   "#fbbf24",
  "order-delivered": "#4ade80",
  "order-returned":  "#f87171",
  "review-submitted":"#a78bfa",
  "promo-used":      "#60a5fa",
  "customer-note":   "var(--gold)",
  "profile-updated": "#9ca3af",
  "customer-created":"#4ade80",
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  New:       "#fbbf24",
  Preparing: "#60a5fa",
  Shipped:   "#a78bfa",
  Delivered: "#4ade80",
  Cancelled: "#f87171",
  Returned:  "#9ca3af",
};

const ORDER_TYPE_ICON = {
  "standard":     <ShoppingBag size={12} />,
  "make-espresso":<Sparkles size={12} />,
  "make-flavor":  <Sparkles size={12} />,
};

const PREDEFINED_TAGS = [
  "VIP", "Repeat Customer", "New Customer", "Inactive",
  "Needs Follow-up", "Wholesale Potential", "Promo Sensitive",
  "High Value", "At Risk", "B2B Potential",
];

type DrawerTab = "overview" | "addresses" | "orders" | "insights" | "tags" | "notes" | "activity";

const TABS: Array<{ key: DrawerTab; label: string; icon: React.ReactNode }> = [
  { key: "overview",   label: "Overview",   icon: <Info size={12} /> },
  { key: "addresses",  label: "Addresses",  icon: <MapPin size={12} /> },
  { key: "orders",     label: "Orders",     icon: <ShoppingBag size={12} /> },
  { key: "insights",   label: "Insights",   icon: <Activity size={12} /> },
  { key: "tags",       label: "Tags",       icon: <Tag size={12} /> },
  { key: "notes",      label: "Notes",      icon: <FileText size={12} /> },
  { key: "activity",   label: "Activity",   icon: <Clock size={12} /> },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface CustomerDrawerProps {
  customer:          AdminCustomer | null;
  isOpen:            boolean;
  onClose:           () => void;
  allCustomers:      AdminCustomer[];
  tags:              string[];                               // merged tags for this customer
  note:              string;                                 // merged note for this customer
  activityExtra:     CustomerActivity[];                     // prepend to base activity
  onTagsChange:      (id: string, tags: string[]) => void;
  onNoteSave:        (id: string, note: string, entry: CustomerActivity) => void;
  initialTab?:       DrawerTab;
}

// ── Main drawer ────────────────────────────────────────────────────────────────

export default function CustomerDrawer({
  customer, isOpen, onClose, allCustomers,
  tags, note, activityExtra,
  onTagsChange, onNoteSave,
  initialTab = "overview",
}: CustomerDrawerProps) {
  const [tab,        setTab]        = useState<DrawerTab>(initialTab);
  const [noteText,   setNoteText]   = useState("");
  const [noteSaved,  setNoteSaved]  = useState(false);
  const [customTag,  setCustomTag]  = useState("");
  const [copied,     setCopied]     = useState<string | null>(null);

  // Sync note text on customer/note change — single setState call per effect
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setNoteText(note); setNoteSaved(false); }, [customer?.id, note]);

  if (!customer) return null;

  const segs    = getSegments(customer);
  const status  = getStatus(customer);
  const typeCfg = TYPE_BADGE[customer.type];
  const statusCfg = STATUS_BADGE[status];
  const suggestion = getSuggestedPromotion(customer);
  const dupOf   = customer.possibleDuplicateOf
    ? allCustomers.find(c => c.id === customer.possibleDuplicateOf)
    : null;

  const allActivity: CustomerActivity[] = [
    ...activityExtra,
    ...customer.activity,
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleRemoveTag(t: string) {
    onTagsChange(customer!.id, tags.filter(x => x !== t));
  }

  function handleAddTag(t: string) {
    if (!tags.includes(t)) onTagsChange(customer!.id, [...tags, t]);
  }

  function handleCustomTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && customTag.trim()) {
      handleAddTag(customTag.trim());
      setCustomTag("");
    }
  }

  function handleSaveNote() {
    const entry: CustomerActivity = {
      id:          `ACT-note-${Date.now()}`,
      date:        ANCHOR,
      type:        "customer-note",
      title:       "Admin Note Added",
      description: noteText.trim() ? `Note: "${noteText.slice(0, 60)}${noteText.length > 60 ? "…" : ""}"` : "Note cleared",
    };
    onNoteSave(customer!.id, noteText, entry);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  function handleCopyAddress(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }

  // ── Avatar ────────────────────────────────────────────────────────────────────

  const initials = customer.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const avatarBg = customer.type === "registered"
    ? (segs.includes("vip") ? "linear-gradient(135deg,#a8744e,#d6a373)" : "linear-gradient(135deg,#3b82f6,#60a5fa)")
    : (segs.includes("vip") ? "linear-gradient(135deg,#a8744e,#d6a373)" : "linear-gradient(135deg,#d97706,#fbbf24)");

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.60)", zIndex: 101 }}
        />
      )}

      {/* Drawer */}
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

          {/* Top row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
            {/* Avatar */}
            <div style={{
              width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
              background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, color: "#0b0806",
            }}>
              {initials}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 5 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
                  {customer.name}
                </span>
                {dupOf && (
                  <AlertTriangle size={13} style={{ color: "#fbbf24", flexShrink: 0 }} />
                )}
              </div>

              {/* Badges row */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: typeCfg.bg, color: typeCfg.color }}>
                  {typeCfg.label}
                </span>
                {segs.map(s => (
                  <span key={s} style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: SEGMENT_STYLE[s].bg, color: SEGMENT_STYLE[s].color }}>
                    {SEGMENT_STYLE[s].label}
                  </span>
                ))}
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: statusCfg.bg, color: statusCfg.color }}>
                  {status === "active" ? "Active" : status === "new" ? "New" : "Inactive"}
                </span>
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>
                    {fmt(customer.totalSpent)} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--cream-dim)", opacity: 0.5 }}>EGP</span>
                  </p>
                  <p style={{ fontSize: 9.5, color: "var(--cream-dim)", opacity: 0.4 }}>Lifetime value</p>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--cream)" }}>{customer.ordersCount}</p>
                  <p style={{ fontSize: 9.5, color: "var(--cream-dim)", opacity: 0.4 }}>Orders</p>
                </div>
              </div>
            </div>

            {/* Right controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <a
                href={`https://wa.me/${customer.whatsapp.replace(/\D/g, "")}`}
                target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "rgba(37,211,102,0.12)", color: "#25d366", fontSize: 12, fontWeight: 600, textDecoration: "none", border: "1px solid rgba(37,211,102,0.20)" }}
              >
                <MessageCircle size={13} /> WA
              </a>
              <button type="button" onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--cream-dim)" }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Duplicate warning banner */}
          {dupOf && (
            <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.20)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={13} style={{ color: "#fbbf24", flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: "#fbbf24" }}>
                Possible duplicate — shares phone/WhatsApp with <strong>{dupOf.name}</strong>. Merge functionality coming soon.
              </span>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            {TABS.map(t => (
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

          {/* ══ OVERVIEW ════════════════════════════════════════════════════════ */}
          {tab === "overview" && (
            <div>
              <SectionTitle>Contact</SectionTitle>
              <InfoRow label="Phone" value={
                <a href={`tel:${customer.phone}`} style={{ color: "var(--cream)", display: "flex", alignItems: "center", gap: 5 }}>
                  <Phone size={11} style={{ color: "var(--gold)", opacity: 0.7 }} /> {customer.phone}
                </a>
              } />
              <InfoRow label="WhatsApp" value={
                <a href={`https://wa.me/${customer.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ color: "#25d366", display: "flex", alignItems: "center", gap: 5 }}>
                  <MessageCircle size={11} /> {customer.whatsapp}
                </a>
              } />
              <InfoRow label="Email" value={
                customer.email
                  ? <a href={`mailto:${customer.email}`} style={{ color: "var(--cream)", display: "flex", alignItems: "center", gap: 5 }}>
                      <Mail size={11} style={{ color: "var(--gold)", opacity: 0.7 }} /> {customer.email}
                    </a>
                  : <span style={{ color: "var(--cream-dim)", opacity: 0.4 }}>Not provided</span>
              } />

              <Hr />
              <SectionTitle>Account</SectionTitle>
              <InfoRow label="Customer ID" value={customer.id} mono />
              <InfoRow label="Type" value={
                <span style={{ background: typeCfg.bg, color: typeCfg.color, fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 12 }}>
                  {typeCfg.label}
                </span>
              } />
              <InfoRow label="Joined" value={customer.joinedAt ? `${customer.joinedAt} (${relativeDate(customer.joinedAt)})` : "—"} />
              <InfoRow label="Last Order" value={customer.lastOrderDate ? `${customer.lastOrderDate} (${relativeDate(customer.lastOrderDate)})` : <span style={{ color: "var(--cream-dim)", opacity: 0.4 }}>No orders yet</span>} />
              <InfoRow label="Marketing" value={
                customer.marketingOptIn
                  ? <span style={{ color: "#4ade80", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={11} /> Opted in</span>
                  : <span style={{ color: "#9ca3af" }}>Not opted in</span>
              } />

              <Hr />
              <SectionTitle>Promo History</SectionTitle>
              <InfoRow label="Promo uses" value={customer.promoUsageCount ?? 0} />
              <InfoRow label="Last promo" value={customer.lastPromoUsed
                ? <span style={{ background: "rgba(96,165,250,0.10)", color: "#60a5fa", fontFamily: "monospace", fontSize: 11.5, padding: "2px 7px", borderRadius: 6 }}>{customer.lastPromoUsed}</span>
                : <span style={{ color: "var(--cream-dim)", opacity: 0.4 }}>—</span>
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
                      Campaign creation available in Marketing module (coming soon)
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
              {customer.addresses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <MapPin size={28} style={{ color: "var(--cream-dim)", opacity: 0.2, margin: "0 auto 10px" }} />
                  <p style={{ fontSize: 13, color: "var(--cream-dim)", opacity: 0.4 }}>No saved addresses</p>
                  <p style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.3, marginTop: 4 }}>
                    {customer.type === "guest" ? "Guest customer — address captured at checkout only" : "No addresses on file"}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {customer.addresses.map(addr => {
                    const fullText = [addr.buildingName, addr.streetAddress, addr.area, addr.city, addr.governorate].filter(Boolean).join(", ");
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
                          {addr.buildingName && <div>{addr.buildingName}</div>}
                          <div>{addr.streetAddress}</div>
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
              {customer.recentOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <Package size={28} style={{ color: "var(--cream-dim)", opacity: 0.2, margin: "0 auto 10px" }} />
                  <p style={{ fontSize: 13, color: "var(--cream-dim)", opacity: 0.4 }}>No orders on record</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...customer.recentOrders].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => {
                    const statusColor = ORDER_STATUS_COLOR[order.status] ?? "#9ca3af";
                    const waMsg = encodeURIComponent(`مرحبًا، بنتواصل مع حضرتك بخصوص طلب Line Coffee رقم ${order.orderId}.`);
                    const waHref = `https://wa.me/${customer.whatsapp.replace(/\D/g,"")}?text=${waMsg}`;
                    return (
                      <div key={order.orderId} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(182,136,94,0.08)", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gold)", fontFamily: "monospace" }}>{order.orderId}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 6px", borderRadius: 10, background: "rgba(255,255,255,0.05)", color: order.orderType === "standard" ? "var(--cream-dim)" : "#a78bfa" }}>
                              {ORDER_TYPE_ICON[order.orderType]}
                              {order.orderType === "standard" ? "Standard" : order.orderType === "make-espresso" ? "Espresso" : "Flavor"}
                            </span>
                          </div>
                          <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: `${statusColor}18`, color: statusColor }}>
                            {order.status}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.5 }}>
                            {order.date} · {order.itemsCount} item{order.itemsCount !== 1 ? "s" : ""}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gold)" }}>{fmt(order.total)} EGP</span>
                            <a
                              href={waHref}
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
                </div>
              )}
            </div>
          )}

          {/* ══ INSIGHTS ══════════════════════════════════════════════════════════ */}
          {tab === "insights" && (
            <div>
              {/* LTV Summary */}
              <SectionTitle>Lifetime Value Summary</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "Total Spent",  value: `${fmt(customer.totalSpent)} EGP`, color: "var(--gold)" },
                  { label: "Orders",       value: customer.ordersCount, color: "var(--cream)" },
                  { label: "Avg. Order",   value: customer.ordersCount > 0 ? `${fmt(customer.averageOrderValue)} EGP` : "—", color: "var(--cream)" },
                ].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(182,136,94,0.08)", borderRadius: 8, padding: "10px 12px" }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: s.color }}>{s.value}</p>
                    <p style={{ fontSize: 9.5, color: "var(--cream-dim)", opacity: 0.4, marginTop: 2 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Segments */}
              {segs.length > 0 && (
                <>
                  <Hr />
                  <SectionTitle>Segments</SectionTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {segs.map(s => (
                      <div key={s} style={{ background: SEGMENT_STYLE[s].bg, border: `1px solid ${SEGMENT_STYLE[s].color}22`, borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: SEGMENT_STYLE[s].color, minWidth: 80 }}>{SEGMENT_STYLE[s].label}</span>
                        <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.65 }}>{getSegmentReason(s, customer)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Favorites */}
              {(customer.favoriteCategory || (customer.favoriteProducts && customer.favoriteProducts.length > 0)) && (
                <>
                  <Hr />
                  <SectionTitle>Purchase Preferences</SectionTitle>
                  {customer.favoriteCategory && <InfoRow label="Fav. Category" value={customer.favoriteCategory} />}
                  {customer.favoriteProducts && customer.favoriteProducts.length > 0 && (
                    <InfoRow label="Top Products" value={
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {customer.favoriteProducts.map(p => (
                          <span key={p} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 10, background: "rgba(182,136,94,0.10)", color: "var(--gold)" }}>{p}</span>
                        ))}
                      </div>
                    } />
                  )}
                  {customer.lastOrderDate && (
                    <InfoRow label="Last Purchase" value={relativeDate(customer.lastOrderDate)} />
                  )}
                  {customer.recentOrders.length > 0 && (() => {
                    const typeCount: Record<string, number> = {};
                    customer.recentOrders.forEach(o => { typeCount[o.orderType] = (typeCount[o.orderType] ?? 0) + 1; });
                    const mostCommon = Object.entries(typeCount).sort((a,b) => b[1]-a[1])[0];
                    const labels: Record<string, string> = { standard: "Standard", "make-espresso": "Custom Espresso", "make-flavor": "Custom Flavor Mix" };
                    return <InfoRow label="Order Type" value={labels[mostCommon[0]] ?? mostCommon[0]} />;
                  })()}
                </>
              )}

              {/* Marketing Readiness */}
              <Hr />
              <SectionTitle>Marketing Readiness</SectionTitle>
              <InfoRow label="Opt-in" value={
                customer.marketingOptIn
                  ? <span style={{ color: "#4ade80" }}>✓ Opted in</span>
                  : <span style={{ color: "#9ca3af" }}>Not opted in</span>
              } />
              {suggestion && (
                <div style={{ background: "rgba(182,136,94,0.07)", border: "1px solid rgba(182,136,94,0.15)", borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
                  <p style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gold)" }}>💡 {suggestion}</p>
                </div>
              )}
              <p style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.35, marginTop: 14, fontStyle: "italic" }}>
                Bulk targeting and campaign creation will be handled in Marketing module later.
              </p>
            </div>
          )}

          {/* ══ TAGS ══════════════════════════════════════════════════════════════ */}
          {tab === "tags" && (
            <div>
              <SectionTitle>Active Tags</SectionTitle>
              {tags.length === 0 ? (
                <p style={{ fontSize: 12.5, color: "var(--cream-dim)", opacity: 0.4, marginBottom: 16 }}>No tags — add one below</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {tags.map(t => (
                    <span key={t} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px 4px 10px", borderRadius: 20, background: "rgba(182,136,94,0.12)", border: "1px solid rgba(182,136,94,0.20)", color: "var(--gold)", fontSize: 11.5, fontWeight: 600 }}>
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gold)", opacity: 0.6, padding: 0, display: "flex", alignItems: "center", lineHeight: 1 }}
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
                {PREDEFINED_TAGS.filter(t => !tags.includes(t)).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleAddTag(t)}
                    style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)", color: "var(--cream-dim)", fontSize: 11.5, cursor: "pointer", fontWeight: 500, transition: "all 150ms" }}
                  >
                    + {t}
                  </button>
                ))}
                {PREDEFINED_TAGS.every(t => tags.includes(t)) && (
                  <p style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.35 }}>All predefined tags active</p>
                )}
              </div>

              <Hr />
              <SectionTitle>Custom Tag</SectionTitle>
              <input
                type="text"
                placeholder="Type tag and press Enter…"
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
                onKeyDown={handleCustomTagKeyDown}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 12.5,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)",
                  color: "var(--cream)", outline: "none",
                }}
              />
              <p style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.35, marginTop: 6 }}>
                {'Note: Tags do not override computed segments (VIP, Repeat, etc.). Exception: "Wholesale Potential" tag activates that segment.'}
              </p>
            </div>
          )}

          {/* ══ NOTES ════════════════════════════════════════════════════════════ */}
          {tab === "notes" && (
            <div>
              <SectionTitle>Internal Admin Notes</SectionTitle>
              <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.4, marginBottom: 12 }}>
                Notes are internal only. Not visible to the customer. Lost on page refresh (mock only).
              </p>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={7}
                maxLength={500}
                placeholder="Add internal notes about this customer…"
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 12.5,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)",
                  color: "var(--cream)", outline: "none", resize: "vertical", lineHeight: 1.6,
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.35 }}>{noteText.length} / 500</span>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  style={{
                    padding: "7px 18px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    background: noteSaved ? "rgba(74,222,128,0.15)" : "rgba(182,136,94,0.15)",
                    color: noteSaved ? "#4ade80" : "var(--gold)",
                    border: noteSaved ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(182,136,94,0.25)",
                    transition: "all 200ms",
                  }}
                >
                  {noteSaved ? "✓ Saved" : "Save Note"}
                </button>
              </div>
            </div>
          )}

          {/* ══ ACTIVITY ══════════════════════════════════════════════════════════ */}
          {tab === "activity" && (
            <div>
              <SectionTitle>Activity Timeline</SectionTitle>
              {allActivity.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <Clock size={28} style={{ color: "var(--cream-dim)", opacity: 0.2, margin: "0 auto 10px" }} />
                  <p style={{ fontSize: 13, color: "var(--cream-dim)", opacity: 0.4 }}>No activity recorded yet</p>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  {allActivity.map((act, i) => (
                    <div key={act.id} style={{ display: "flex", gap: 12, paddingBottom: 16, position: "relative" }}>
                      {/* Dot + line */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACTIVITY_DOT[act.type] ?? "#9ca3af", marginTop: 4, flexShrink: 0 }} />
                        {i < allActivity.length - 1 && (
                          <div style={{ width: 1, flex: 1, background: "rgba(182,136,94,0.10)", marginTop: 4, minHeight: 16 }} />
                        )}
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                          <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cream)" }}>{act.title}</p>
                          <span style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.4, flexShrink: 0 }}>{relativeDate(act.date)}</span>
                        </div>
                        <p style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.55, marginTop: 2 }}>{act.description}</p>
                        {act.reference && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginTop: 4, padding: "2px 7px", borderRadius: 6, background: "rgba(182,136,94,0.08)", color: "var(--gold)", fontSize: 10.5, fontFamily: "monospace" }}>
                            <ChevronRight size={9} /> {act.reference}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
