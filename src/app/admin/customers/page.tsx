"use client";

import { useState, useMemo } from "react";
import {
  Search, UserPlus, Download, Users, UserCheck, UserX,
  Repeat2, Star, UserMinus, MessageCircle, ChevronDown,
  AlertTriangle, ShoppingBag,
} from "lucide-react";
import {
  ADMIN_CUSTOMERS, CUSTOMER_SUMMARY,
  getSegments, getStatus,
  type AdminCustomer, type CustomerActivity, type CustomerSegment,
} from "@/lib/mock-data/admin/customers-mock";
import CustomerDrawer from "@/components/admin/customers/CustomerDrawer";
import AddCustomerModal from "@/components/admin/customers/AddCustomerModal";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ANCHOR = "2026-06-21";

function relativeDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const anchor = new Date(ANCHOR).getTime();
  const d      = new Date(dateStr).getTime();
  const days   = Math.floor((anchor - d) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function fmt(n: number) { return n.toLocaleString(); }

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function avatarBg(c: AdminCustomer): string {
  const segs = getSegments(c);
  if (segs.includes("vip"))     return "linear-gradient(135deg,#a8744e,#d6a373)";
  if (c.type === "registered")  return "linear-gradient(135deg,#3b82f6,#60a5fa)";
  if (segs.includes("inactive") || segs.includes("at-risk")) return "linear-gradient(135deg,#4b5563,#6b7280)";
  return "linear-gradient(135deg,#d97706,#fbbf24)";
}

// ── Filter / sort types ────────────────────────────────────────────────────────

type FilterKey = "all" | "registered" | "guest" | "vip" | "repeat" | "new" | "inactive" | "at-risk" | "wholesale";
type SortKey   = "most-spent" | "most-orders" | "recently-active" | "oldest-inactive";

function matchesFilter(c: AdminCustomer, filter: FilterKey): boolean {
  const segs = getSegments(c);
  switch (filter) {
    case "all":         return true;
    case "registered":  return c.type === "registered";
    case "guest":       return c.type === "guest";
    case "vip":         return segs.includes("vip");
    case "repeat":      return c.ordersCount >= 2;
    case "new":         return segs.includes("new");
    case "inactive":    return segs.includes("inactive");
    case "at-risk":     return segs.includes("at-risk");
    case "wholesale":   return segs.includes("wholesale-potential");
  }
}

function sortCustomers(list: AdminCustomer[], sort: SortKey): AdminCustomer[] {
  return [...list].sort((a, b) => {
    switch (sort) {
      case "most-spent":        return b.totalSpent - a.totalSpent;
      case "most-orders":       return b.ordersCount - a.ordersCount;
      case "recently-active":   return new Date(b.lastOrderDate ?? "2000-01-01").getTime() - new Date(a.lastOrderDate ?? "2000-01-01").getTime();
      case "oldest-inactive":   return new Date(a.lastOrderDate ?? "2099-01-01").getTime() - new Date(b.lastOrderDate ?? "2099-01-01").getTime();
    }
  });
}

// ── Segment badge ──────────────────────────────────────────────────────────────

const SEG_STYLE: Record<CustomerSegment, { color: string; bg: string; label: string }> = {
  vip:                   { color: "var(--gold)",  bg: "rgba(182,136,94,0.12)",  label: "VIP" },
  repeat:                { color: "#4ade80",       bg: "rgba(74,222,128,0.10)", label: "Repeat" },
  new:                   { color: "#fbbf24",       bg: "rgba(251,191,36,0.10)", label: "New" },
  inactive:              { color: "#f87171",       bg: "rgba(248,113,113,0.10)", label: "Inactive" },
  "at-risk":             { color: "#fb923c",       bg: "rgba(251,146,60,0.10)", label: "At Risk" },
  "wholesale-potential": { color: "#c084fc",       bg: "rgba(192,132,252,0.10)", label: "Wholesale" },
};

const STATUS_DOT: Record<string, string> = {
  active:   "#4ade80",
  inactive: "#f87171",
  new:      "#fbbf24",
};

const TYPE_CFG: Record<string, { color: string; bg: string; label: string }> = {
  registered: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  label: "Registered" },
  guest:      { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  label: "Guest" },
};

// ── Module-level sub-components ────────────────────────────────────────────────

function TableHeader() {
  return (
    <div
      className="hidden lg:grid"
      style={{
        gridTemplateColumns: "2.8fr 1.4fr 1fr 1.2fr 0.8fr 1fr 0.9fr 0.9fr 0.8fr 1.1fr",
        padding: "10px 16px",
        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
        color: "var(--cream-dim)", opacity: 0.45,
        background: "rgba(182,136,94,0.04)",
        borderBottom: "1px solid rgba(182,136,94,0.08)",
      }}
    >
      <span>Customer</span>
      <span>Phone / WA</span>
      <span>Type</span>
      <span>Segments</span>
      <span>Orders</span>
      <span>Spent</span>
      <span>Avg. Order</span>
      <span>Last Order</span>
      <span>Status</span>
      <span>Actions</span>
    </div>
  );
}

interface TableRowProps {
  customer:    AdminCustomer;
  isDuplicate: boolean;
  onOpen:      (id: string, tab?: string) => void;
}

function TableRow({ customer, isDuplicate, onOpen }: TableRowProps) {
  const segs   = getSegments(customer);
  const status = getStatus(customer);
  const tc     = TYPE_CFG[customer.type];
  const visibleSegs = segs.slice(0, 2);
  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(customer.id, "overview");
    }
  };

  return (
    <>
      {/* Desktop row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(customer.id, "overview")}
        onKeyDown={handleRowKeyDown}
        className="hidden lg:grid w-full text-left hover:bg-white/[0.02] transition-colors"
        style={{
          gridTemplateColumns: "2.8fr 1.4fr 1fr 1.2fr 0.8fr 1fr 0.9fr 0.9fr 0.8fr 1.1fr",
          padding: "13px 16px", alignItems: "center", gap: 0,
          background: "none", border: "none", cursor: "pointer",
        }}
      >
        {/* Customer */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: avatarBg(customer), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#0b0806", flexShrink: 0 }}>
            {initials(customer.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {isDuplicate && <AlertTriangle size={11} style={{ color: "#fbbf24", flexShrink: 0 }} aria-label="Possible duplicate customer" />}
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cream)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{customer.name}</span>
            </div>
            <span style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.4, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {customer.email ?? "No email"}
            </span>
          </div>
        </div>

        {/* Phone */}
        <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.6, fontFamily: "monospace" }}>{customer.phone}</span>

        {/* Type */}
        <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: tc.bg, color: tc.color, display: "inline-block" }}>
          {tc.label}
        </span>

        {/* Segments */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {visibleSegs.map(s => (
            <span key={s} style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 6px", borderRadius: 10, background: SEG_STYLE[s].bg, color: SEG_STYLE[s].color }}>
              {SEG_STYLE[s].label}
            </span>
          ))}
          {segs.length > 2 && <span style={{ fontSize: 9.5, color: "var(--cream-dim)", opacity: 0.35 }}>+{segs.length - 2}</span>}
          {segs.length === 0 && <span style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.25 }}>—</span>}
        </div>

        {/* Orders */}
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--cream)", tabularNums: true } as React.CSSProperties}>{customer.ordersCount}</span>

        {/* Spent */}
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gold)" }}>
          {customer.totalSpent > 0 ? `${fmt(customer.totalSpent)}` : <span style={{ opacity: 0.3 }}>—</span>}
          {customer.totalSpent > 0 && <span style={{ fontSize: 9.5, fontWeight: 400, color: "var(--cream-dim)", opacity: 0.5, marginLeft: 2 }}>EGP</span>}
        </span>

        {/* Avg order */}
        <span style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.65 }}>
          {customer.ordersCount > 0 ? `${fmt(customer.averageOrderValue)} EGP` : <span style={{ opacity: 0.35 }}>—</span>}
        </span>

        {/* Last order */}
        <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.5 }}>
          {customer.lastOrderDate ? relativeDate(customer.lastOrderDate) : <span style={{ opacity: 0.35, fontStyle: "italic" }}>No orders</span>}
        </span>

        {/* Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_DOT[status], flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, color: STATUS_DOT[status], fontWeight: 500, textTransform: "capitalize" }}>{status}</span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onOpen(customer.id, "overview")}
            style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, background: "rgba(182,136,94,0.08)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.15)", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Profile
          </button>
          <a
            href={`https://wa.me/${customer.whatsapp.replace(/\D/g, "")}`}
            target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", padding: "4px 6px", borderRadius: 6, background: "rgba(37,211,102,0.08)", color: "#25d366", border: "1px solid rgba(37,211,102,0.15)" }}
            title="WhatsApp"
          >
            <MessageCircle size={12} />
          </a>
          <button
            type="button"
            onClick={() => onOpen(customer.id, "orders")}
            style={{ display: "flex", alignItems: "center", padding: "4px 6px", borderRadius: 6, background: "rgba(96,165,250,0.08)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.15)", cursor: "pointer" }}
            title="View Orders"
          >
            <ShoppingBag size={12} />
          </button>
        </div>
      </div>

      {/* Mobile card */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(customer.id, "overview")}
        onKeyDown={handleRowKeyDown}
        className="lg:hidden w-full text-left flex items-center gap-3 px-4 py-4 hover:bg-white/[0.02] transition-colors"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarBg(customer), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#0b0806", flexShrink: 0 }}>
          {initials(customer.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--cream)" }}>{customer.name}</span>
            {isDuplicate && <AlertTriangle size={11} style={{ color: "#fbbf24" }} />}
            {segs.slice(0, 1).map(s => (
              <span key={s} style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 6px", borderRadius: 10, background: SEG_STYLE[s].bg, color: SEG_STYLE[s].color }}>
                {SEG_STYLE[s].label}
              </span>
            ))}
          </div>
          <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.45 }}>
            {customer.ordersCount} orders · {customer.totalSpent > 0 ? `${fmt(customer.totalSpent)} EGP` : "No orders yet"} · {tc.label}
          </span>
        </div>
        <a
          href={`https://wa.me/${customer.whatsapp.replace(/\D/g, "")}`}
          target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ color: "#25d366", flexShrink: 0, padding: 4 }}
        >
          <MessageCircle size={16} />
        </a>
      </div>
    </>
  );
}

// ── Page component ─────────────────────────────────────────────────────────────

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all",        label: "All" },
  { key: "registered", label: "Registered" },
  { key: "guest",      label: "Guest" },
  { key: "vip",        label: "VIP" },
  { key: "repeat",     label: "Repeat" },
  { key: "new",        label: "New" },
  { key: "inactive",   label: "Inactive" },
  { key: "at-risk",    label: "At Risk" },
  { key: "wholesale",  label: "Wholesale" },
];

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "most-spent",      label: "Most Spent" },
  { key: "most-orders",     label: "Most Orders" },
  { key: "recently-active", label: "Recently Active" },
  { key: "oldest-inactive", label: "Oldest Inactive" },
];

export default function CustomersPage() {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [search,         setSearch]         = useState("");
  const [activeFilter,   setActiveFilter]   = useState<FilterKey>("all");
  const [sort,           setSort]           = useState<SortKey>("most-spent");
  const [sortOpen,       setSortOpen]       = useState(false);
  const [drawerCustomerId, setDrawerCustomerId] = useState<string | null>(null);
  const [drawerInitTab,  setDrawerInitTab]  = useState<string>("overview");
  const [modalOpen,      setModalOpen]      = useState(false);
  const [exportFeedback, setExportFeedback] = useState(false);

  // ── Override maps (survive drawer close/reopen) ─────────────────────────────
  const [addedCustomers,    setAddedCustomers]    = useState<AdminCustomer[]>([]);
  const [tagOverrides,      setTagOverrides]      = useState<Record<string, string[]>>({});
  const [noteOverrides,     setNoteOverrides]     = useState<Record<string, string>>({});
  const [activityOverrides, setActivityOverrides] = useState<Record<string, CustomerActivity[]>>({});

  // ── Display list ────────────────────────────────────────────────────────────
  const allCustomers = useMemo(
    () => [...ADMIN_CUSTOMERS, ...addedCustomers],
    [addedCustomers]
  );

  // Build duplicate lookup set
  const duplicateIds = useMemo(() => {
    const ids = new Set<string>();
    allCustomers.forEach(c => { if (c.possibleDuplicateOf) { ids.add(c.id); ids.add(c.possibleDuplicateOf); } });
    return ids;
  }, [allCustomers]);

  // Search filter
  const searchFiltered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allCustomers;
    return allCustomers.filter(c => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.whatsapp.includes(q) ||
        (c.email?.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q) ||
        c.recentOrders.some(o => o.orderId.toLowerCase().includes(q))
      );
    });
  }, [allCustomers, search]);

  // KPI counts use searchFiltered (before filter tab)
  const kpiCounts = useMemo(() => ({
    total:      searchFiltered.length,
    registered: searchFiltered.filter(c => c.type === "registered").length,
    guest:      searchFiltered.filter(c => c.type === "guest").length,
    repeat:     searchFiltered.filter(c => c.ordersCount >= 2 && !getSegments(c).includes("vip")).length,
    vip:        searchFiltered.filter(c => getSegments(c).includes("vip")).length,
    inactive:   searchFiltered.filter(c => getSegments(c).includes("inactive")).length,
  }), [searchFiltered]);

  // Filter tab + sort
  const filtered = useMemo(() => {
    const f = searchFiltered.filter(c => matchesFilter(c, activeFilter));
    return sortCustomers(f, sort);
  }, [searchFiltered, activeFilter, sort]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = { all: 0, registered: 0, guest: 0, vip: 0, repeat: 0, new: 0, inactive: 0, "at-risk": 0, wholesale: 0 };
    searchFiltered.forEach(c => {
      FILTERS.forEach(f => { if (matchesFilter(c, f.key)) counts[f.key]++; });
    });
    return counts;
  }, [searchFiltered]);

  // ── Drawer customer ─────────────────────────────────────────────────────────
  const drawerCustomer = drawerCustomerId
    ? allCustomers.find(c => c.id === drawerCustomerId) ?? null
    : null;
  const drawerTags = drawerCustomerId
    ? (tagOverrides[drawerCustomerId] ?? drawerCustomer?.tags ?? [])
    : [];
  const drawerNote = drawerCustomerId
    ? (noteOverrides[drawerCustomerId] ?? drawerCustomer?.notes ?? "")
    : "";
  const drawerActivity = drawerCustomerId ? (activityOverrides[drawerCustomerId] ?? []) : [];

  // ── Handlers ────────────────────────────────────────────────────────────────

  function openDrawer(id: string, tab = "overview") {
    setDrawerCustomerId(id);
    setDrawerInitTab(tab);
  }

  function handleTagsChange(id: string, newTags: string[]) {
    setTagOverrides(prev => ({ ...prev, [id]: newTags }));
  }

  function handleNoteSave(id: string, note: string, entry: CustomerActivity) {
    setNoteOverrides(prev => ({ ...prev, [id]: note }));
    setActivityOverrides(prev => ({ ...prev, [id]: [entry, ...(prev[id] ?? [])] }));
  }

  function handleAddCustomer(c: AdminCustomer) {
    setAddedCustomers(prev => [c, ...prev]);
  }

  function handleExport() {
    setExportFeedback(true);
    setTimeout(() => setExportFeedback(false), 2000);
  }

  function nextCustomerId() {
    const allIds = allCustomers.map(c => parseInt(c.id.replace("C-", ""), 10)).filter(n => !isNaN(n));
    const max = allIds.length > 0 ? Math.max(...allIds) : 20;
    return `C-${String(max + 1).padStart(3, "0")}`;
  }

  // ── KPI cards config ────────────────────────────────────────────────────────
  const KPI_CARDS: Array<{ label: string; value: number; color: string; icon: React.ReactNode; filter: FilterKey }> = [
    { label: "Total Customers", value: kpiCounts.total,      color: "var(--cream)",  icon: <Users size={16} />,      filter: "all" },
    { label: "Registered",      value: kpiCounts.registered, color: "#60a5fa",       icon: <UserCheck size={16} />,  filter: "registered" },
    { label: "Guest",           value: kpiCounts.guest,      color: "#fbbf24",       icon: <UserX size={16} />,      filter: "guest" },
    { label: "Repeat Customers",value: kpiCounts.repeat,     color: "#4ade80",       icon: <Repeat2 size={16} />,    filter: "repeat" },
    { label: "VIP",             value: kpiCounts.vip,        color: "var(--gold)",   icon: <Star size={16} />,       filter: "vip" },
    { label: "Inactive (>90d)", value: kpiCounts.inactive,   color: "#f87171",       icon: <UserMinus size={16} />,  filter: "inactive" },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--cream)", fontFamily: "var(--font-playfair)", margin: 0 }}>
            Customers
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--cream-dim)", opacity: 0.5, marginTop: 3 }}>
            Customer intelligence, order history, and marketing readiness ·{" "}
            <span style={{ color: "var(--gold)" }}>{fmt(CUSTOMER_SUMMARY.totalRevenue)} EGP</span> lifetime revenue
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleExport}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, fontSize: 12.5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)", color: exportFeedback ? "#4ade80" : "var(--cream-dim)", cursor: "pointer", transition: "all 200ms" }}
          >
            <Download size={13} /> {exportFeedback ? "Export ready" : "Export"}
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, background: "rgba(182,136,94,0.12)", border: "1px solid rgba(182,136,94,0.22)", color: "var(--gold)", cursor: "pointer" }}
          >
            <UserPlus size={13} /> Add Customer
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_CARDS.map(card => {
          const active = activeFilter === card.filter;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => setActiveFilter(card.filter)}
              className="admin-kpi-card text-left"
              style={{
                padding: "14px 16px", cursor: "pointer",
                border: active ? `1px solid ${card.color}40` : "1px solid rgba(182,136,94,0.08)",
                outline: "none", background: active ? `${card.color}08` : undefined,
                transform: active ? "scale(1.01)" : undefined,
                transition: "all 200ms",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ color: card.color, opacity: 0.7 }}>{card.icon}</span>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: card.color, lineHeight: 1 }}>{card.value}</p>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--cream-dim)", opacity: 0.4, marginTop: 4 }}>
                {card.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Search + Sort ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--cream-dim)", opacity: 0.35, pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search by name, phone, email, ID or order…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", paddingLeft: 34, paddingRight: 14, paddingTop: 10, paddingBottom: 10,
              borderRadius: 10, fontSize: 12.5,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)",
              color: "var(--cream)", outline: "none",
            }}
          />
        </div>

        {/* Sort dropdown */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setSortOpen(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 10, fontSize: 12.5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)", color: "var(--cream-dim)", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {SORT_OPTIONS.find(s => s.key === sort)?.label ?? "Sort"}
            <ChevronDown size={12} style={{ opacity: 0.5, transform: sortOpen ? "rotate(180deg)" : undefined, transition: "transform 150ms" }} />
          </button>
          {sortOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--coffee-surface)", border: "1px solid rgba(182,136,94,0.15)", borderRadius: 10, padding: "6px 0", zIndex: 50, minWidth: 170, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => { setSort(opt.key); setSortOpen(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 12.5, background: sort === opt.key ? "rgba(182,136,94,0.08)" : "none", color: sort === opt.key ? "var(--gold)" : "var(--cream-dim)", border: "none", cursor: "pointer" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Tabs ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
        {FILTERS.map(f => {
          const active = activeFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 20,
                fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", cursor: "pointer",
                background: active ? "rgba(182,136,94,0.12)" : "rgba(255,255,255,0.03)",
                color:      active ? "var(--gold)" : "var(--cream-dim)",
                border:     active ? "1px solid rgba(182,136,94,0.22)" : "1px solid rgba(182,136,94,0.06)",
                transition: "all 150ms",
              }}
            >
              {f.label}
              <span style={{ fontSize: 10.5, opacity: 0.7, fontWeight: 600 }}>{tabCounts[f.key]}</span>
            </button>
          );
        })}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(182,136,94,0.10)" }}>
        <TableHeader />
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <Users size={32} style={{ color: "var(--cream-dim)", opacity: 0.15, margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, color: "var(--cream-dim)", opacity: 0.35 }}>No customers match your search</p>
            <button type="button" onClick={() => { setSearch(""); setActiveFilter("all"); }} style={{ marginTop: 10, fontSize: 12, color: "var(--gold)", background: "none", border: "none", cursor: "pointer", opacity: 0.7 }}>
              Clear filters
            </button>
          </div>
        ) : (
          filtered.map((c, i) => (
            <div key={c.id} style={i < filtered.length - 1 ? { borderBottom: "1px solid rgba(182,136,94,0.06)" } : undefined}>
              <TableRow
                customer={c}
                isDuplicate={duplicateIds.has(c.id)}
                onOpen={openDrawer}
              />
            </div>
          ))
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(182,136,94,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.35 }}>
              Showing {filtered.length} of {allCustomers.length} customers
            </span>
            {activeFilter !== "all" || search ? (
              <button type="button" onClick={() => { setSearch(""); setActiveFilter("all"); }} style={{ fontSize: 11, color: "var(--gold)", background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}>
                · Clear filters
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Duplicate note ───────────────────────────────────────────────────── */}
      {duplicateIds.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
          <AlertTriangle size={12} style={{ color: "#fbbf24", flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, color: "#fbbf24" }}>
            {duplicateIds.size / 2 | 0} possible duplicate pair{(duplicateIds.size / 2 | 0) > 1 ? "s" : ""} detected — marked with{" "}
            <AlertTriangle size={10} style={{ display: "inline", verticalAlign: "middle" }} /> in the table.
          </span>
        </div>
      )}

      {/* ── CustomerDrawer ───────────────────────────────────────────────────── */}
      <CustomerDrawer
        customer={drawerCustomer}
        isOpen={drawerCustomerId !== null}
        onClose={() => setDrawerCustomerId(null)}
        allCustomers={allCustomers}
        tags={drawerTags}
        note={drawerNote}
        activityExtra={drawerActivity}
        onTagsChange={handleTagsChange}
        onNoteSave={handleNoteSave}
        initialTab={drawerInitTab as "overview" | "addresses" | "orders" | "insights" | "tags" | "notes" | "activity"}
        key={`${drawerCustomerId}-${drawerInitTab}`}
      />

      {/* ── AddCustomerModal ─────────────────────────────────────────────────── */}
      <AddCustomerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddCustomer}
        nextId={nextCustomerId()}
      />

      {/* Click-outside for sort dropdown */}
      {sortOpen && (
        <div
          onClick={() => setSortOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
        />
      )}
    </div>
  );
}
