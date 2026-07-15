"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Users, UserCheck, UserX,
  Repeat2, Star, UserMinus, MessageCircle, ChevronDown,
  ChevronLeft, ChevronRight,
  AlertTriangle, ShoppingBag, RefreshCw, Loader2,
} from "lucide-react";
import {
  getAdminCustomersPage,
  getCustomerSegments,
  getCustomerLifecycleStatus,
  type AdminCustomerSummary,
  type AdminCustomersKpis,
  type AdminCustomersSort,
  type CustomerSegment,
} from "@/lib/admin/admin-customers";
import CustomerDrawer from "@/components/admin/customers/CustomerDrawer";

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeDays(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function fmt(n: number) { return n.toLocaleString(); }

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function avatarBg(c: AdminCustomerSummary, segs: CustomerSegment[]): string {
  if (segs.includes("vip"))     return "linear-gradient(135deg,#a8744e,var(--admin-hazelnut))";
  if (c.type === "registered")  return "linear-gradient(135deg,#8fb0d9,#8fb0d9)";
  if (segs.includes("inactive") || segs.includes("at-risk")) return "linear-gradient(135deg,#4b5563,#a8927e)";
  return "linear-gradient(135deg,#d97706,#e3b673)";
}

// ── Filter / sort types ────────────────────────────────────────────────────────

type FilterKey = "all" | "registered" | "guest" | "vip" | "repeat" | "new" | "inactive" | "at-risk" | "wholesale";
type SortKey   = AdminCustomersSort;

/** Maps a filter tab to the RPC's {type, segment} parameters (Phase 2: the
 * classification itself now runs in SQL over the complete dataset). */
function filterToRpcParams(filter: FilterKey): { type: "registered" | "guest" | null; segment: CustomerSegment | null } {
  switch (filter) {
    case "all":        return { type: null, segment: null };
    case "registered": return { type: "registered", segment: null };
    case "guest":      return { type: "guest", segment: null };
    case "wholesale":  return { type: null, segment: "wholesale-potential" };
    default:           return { type: null, segment: filter };
  }
}

// ── Segment badge ──────────────────────────────────────────────────────────────

const SEG_STYLE: Record<CustomerSegment, { color: string; bg: string; label: string }> = {
  vip:                   { color: "var(--admin-hazelnut)",  bg: "var(--admin-border)",  label: "VIP" },
  repeat:                { color: "#8fcf9a",       bg: "rgba(74,222,128,0.10)", label: "Repeat" },
  new:                   { color: "#e3b673",       bg: "rgba(251,191,36,0.10)", label: "New" },
  inactive:              { color: "#e39a8c",       bg: "rgba(248,113,113,0.10)", label: "Inactive" },
  "at-risk":             { color: "#fb923c",       bg: "rgba(251,146,60,0.10)", label: "At Risk" },
  "wholesale-potential": { color: "#c084fc",       bg: "rgba(192,132,252,0.10)", label: "Wholesale" },
};

const STATUS_DOT: Record<string, string> = {
  active:   "#8fcf9a",
  inactive: "#e39a8c",
  new:      "#e3b673",
};

const TYPE_CFG: Record<string, { color: string; bg: string; label: string }> = {
  registered: { color: "#8fb0d9", bg: "rgba(96,165,250,0.12)",  label: "Registered" },
  guest:      { color: "#e3b673", bg: "rgba(251,191,36,0.12)",  label: "Guest" },
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
        color: "var(--admin-muted)", opacity: 0.45,
        background: "var(--admin-border)",
        borderBottom: "1px solid var(--admin-border)",
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
  customer:    AdminCustomerSummary;
  isDuplicate: boolean;
  onOpen:      (id: string) => void;
}

function TableRow({ customer, isDuplicate, onOpen }: TableRowProps) {
  const segs   = getCustomerSegments(customer);
  const status = getCustomerLifecycleStatus(customer);
  const tc     = TYPE_CFG[customer.type];
  const visibleSegs = segs.slice(0, 2);
  const avgOrder = customer.ordersCount > 0 ? Math.round(customer.totalSpent / customer.ordersCount) : 0;
  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(customer.id);
    }
  };

  return (
    <>
      {/* Desktop row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(customer.id)}
        onKeyDown={handleRowKeyDown}
        className="hidden lg:grid w-full text-left hover:bg-[rgb(227_210_184_/_0.035)] transition-colors"
        style={{
          gridTemplateColumns: "2.8fr 1.4fr 1fr 1.2fr 0.8fr 1fr 0.9fr 0.9fr 0.8fr 1.1fr",
          padding: "13px 16px", alignItems: "center", gap: 0,
          background: "none", border: "none", cursor: "pointer",
        }}
      >
        {/* Customer */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: avatarBg(customer, segs), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#0b0806", flexShrink: 0 }}>
            {initials(customer.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {isDuplicate && <AlertTriangle size={11} style={{ color: "#e3b673", flexShrink: 0 }} aria-label="Possible duplicate customer" />}
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--admin-white-coffee)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{customer.name}</span>
            </div>
            <span style={{ fontSize: 11, color: "var(--admin-muted)", opacity: 0.4, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {customer.email ?? "No email"}
            </span>
          </div>
        </div>

        {/* Phone */}
        <span style={{ fontSize: 11.5, color: "var(--admin-muted)", opacity: 0.6, fontFamily: "monospace" }}>{customer.phone ?? "—"}</span>

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
          {segs.length > 2 && <span style={{ fontSize: 9.5, color: "var(--admin-muted)", opacity: 0.35 }}>+{segs.length - 2}</span>}
          {segs.length === 0 && <span style={{ fontSize: 11, color: "var(--admin-muted)", opacity: 0.25 }}>—</span>}
        </div>

        {/* Orders */}
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--admin-white-coffee)" }}>{customer.ordersCount}</span>

        {/* Spent */}
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--admin-hazelnut)" }}>
          {customer.totalSpent > 0 ? `${fmt(customer.totalSpent)}` : <span style={{ opacity: 0.3 }}>—</span>}
          {customer.totalSpent > 0 && <span style={{ fontSize: 9.5, fontWeight: 400, color: "var(--admin-muted)", opacity: 0.5, marginLeft: 2 }}>EGP</span>}
        </span>

        {/* Avg order */}
        <span style={{ fontSize: 12, color: "var(--admin-muted)", opacity: 0.65 }}>
          {customer.ordersCount > 0 ? `${fmt(avgOrder)} EGP` : <span style={{ opacity: 0.35 }}>—</span>}
        </span>

        {/* Last order */}
        <span style={{ fontSize: 11.5, color: "var(--admin-muted)", opacity: 0.5 }}>
          {customer.lastOrderDate ? relativeDays(customer.daysSinceLastOrder) : <span style={{ opacity: 0.35, fontStyle: "italic" }}>No orders</span>}
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
            onClick={() => onOpen(customer.id)}
            className="admin-btn admin-btn-sm !whitespace-nowrap"
          >
            Profile
          </button>
          <a
            href={`https://wa.me/${customer.whatsapp.replace(/\D/g, "")}`}
            target="_blank" rel="noreferrer"
            className="admin-btn admin-btn-sm !p-1.5"
            style={{ color: "#25d366" }}
            title="WhatsApp"
          >
            <MessageCircle size={12} />
          </a>
          <button
            type="button"
            onClick={() => onOpen(customer.id)}
            className="admin-btn admin-btn-sm !p-1.5"
            style={{ color: "#8fb0d9" }}
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
        onClick={() => onOpen(customer.id)}
        onKeyDown={handleRowKeyDown}
        className="lg:hidden w-full text-left flex items-center gap-3 px-4 py-4 hover:bg-[rgb(227_210_184_/_0.035)] transition-colors"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarBg(customer, segs), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#0b0806", flexShrink: 0 }}>
          {initials(customer.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-white-coffee)" }}>{customer.name}</span>
            {isDuplicate && <AlertTriangle size={11} style={{ color: "#e3b673" }} />}
            {segs.slice(0, 1).map(s => (
              <span key={s} style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 6px", borderRadius: 10, background: SEG_STYLE[s].bg, color: SEG_STYLE[s].color }}>
                {SEG_STYLE[s].label}
              </span>
            ))}
          </div>
          <span style={{ fontSize: 11.5, color: "var(--admin-muted)", opacity: 0.45 }}>
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

const EMPTY_KPIS: AdminCustomersKpis = {
  total: 0, registered: 0, guest: 0, repeat: 0, vip: 0, inactive: 0, new: 0, atRisk: 0, wholesale: 0,
};

export default function CustomersPage() {
  // ── Data state (Phase 2: server-paginated — see admin-customers.ts) ────────
  const [customers, setCustomers] = useState<AdminCustomerSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalSpend, setTotalSpend] = useState(0);
  const [kpis, setKpis] = useState<AdminCustomersKpis>(EMPTY_KPIS);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);

  // ── Core state ──────────────────────────────────────────────────────────────
  const [searchInput,    setSearchInput]    = useState("");
  const [search,         setSearch]         = useState("");
  const [activeFilter,   setActiveFilter]   = useState<FilterKey>("all");
  const [sort,           setSort]           = useState<SortKey>("most-spent");
  const [sortOpen,       setSortOpen]       = useState(false);
  const [page,           setPage]           = useState(1);
  const [drawerCustomerId, setDrawerCustomerId] = useState<string | null>(null);

  // Debounce the search box so every keystroke doesn't fire a request. Page
  // resets to 1 here too (inside the timer callback), and again directly in
  // the filter/sort selectors below — never in a standalone effect body.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function selectFilter(filter: FilterKey) {
    setActiveFilter(filter);
    setPage(1);
  }

  function selectSort(nextSort: SortKey) {
    setSort(nextSort);
    setPage(1);
  }

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { type, segment } = filterToRpcParams(activeFilter);
      const result = await getAdminCustomersPage({
        search: search || undefined,
        type,
        segment,
        sort,
        page,
        pageSize: PAGE_SIZE,
      });
      setCustomers(result.rows);
      setTotalCount(result.totalCount);
      setTotalSpend(result.totalSpend);
      setKpis(result.kpis);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load customers.");
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter, sort, page]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch driven by filter/sort/page state
  useEffect(() => { void loadCustomers(); }, [loadCustomers]);

  function handleCustomerUpdated() {
    // A tags edit can change segment membership (e.g. "Wholesale Potential"),
    // so re-run the same query rather than patching potentially-stale state.
    void loadCustomers();
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Duplicate lookup is scoped to the customers currently on screen (a
  // whole-dataset duplicate scan is a separate, documented follow-up — see
  // the Phase 2 report).
  const duplicateIds = useMemo(() => {
    const byPhone = new Map<string, string[]>();
    customers.forEach(c => {
      if (!c.phone) return;
      const key = c.phone.replace(/\D/g, "");
      if (!key) return;
      const list = byPhone.get(key) ?? [];
      list.push(c.id);
      byPhone.set(key, list);
    });
    const ids = new Set<string>();
    byPhone.forEach(list => { if (list.length > 1) list.forEach(id => ids.add(id)); });
    return ids;
  }, [customers]);

  const filtered = customers;
  const tabCounts: Record<FilterKey, number> = {
    all: kpis.total,
    registered: kpis.registered,
    guest: kpis.guest,
    vip: kpis.vip,
    repeat: kpis.repeat,
    new: kpis.new,
    inactive: kpis.inactive,
    "at-risk": kpis.atRisk,
    wholesale: kpis.wholesale,
  };
  const kpiCounts = {
    total: kpis.total,
    registered: kpis.registered,
    guest: kpis.guest,
    repeat: kpis.repeat,
    vip: kpis.vip,
    inactive: kpis.inactive,
  };
  const totalRevenue = totalSpend;

  const duplicateOf = useMemo(() => {
    if (!drawerCustomerId) return null;
    if (!duplicateIds.has(drawerCustomerId)) return null;
    const current = customers.find(c => c.id === drawerCustomerId);
    if (!current?.phone) return null;
    const key = current.phone.replace(/\D/g, "");
    const other = customers.find(c => c.id !== drawerCustomerId && c.phone?.replace(/\D/g, "") === key);
    return other ? { id: other.id, name: other.name } : null;
  }, [drawerCustomerId, duplicateIds, customers]);

  // ── KPI cards config ────────────────────────────────────────────────────────
  const KPI_CARDS: Array<{ label: string; value: number; color: string; icon: React.ReactNode; filter: FilterKey }> = [
    { label: "Total Customers", value: kpiCounts.total,      color: "var(--admin-white-coffee)",  icon: <Users size={16} />,      filter: "all" },
    { label: "Registered",      value: kpiCounts.registered, color: "#8fb0d9",       icon: <UserCheck size={16} />,  filter: "registered" },
    { label: "Guest",           value: kpiCounts.guest,      color: "#e3b673",       icon: <UserX size={16} />,      filter: "guest" },
    { label: "Repeat Customers",value: kpiCounts.repeat,     color: "#8fcf9a",       icon: <Repeat2 size={16} />,    filter: "repeat" },
    { label: "VIP",             value: kpiCounts.vip,        color: "var(--admin-hazelnut)",   icon: <Star size={16} />,       filter: "vip" },
    { label: "Inactive (>90d)", value: kpiCounts.inactive,   color: "#e39a8c",       icon: <UserMinus size={16} />,  filter: "inactive" },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="admin-page-header !mb-0">
        <div>
          <h1 className="admin-page-title !text-[20px]">
            Customers
          </h1>
          <p className="admin-page-subtitle">
            Real customer + order data ·{" "}
            <span style={{ color: "var(--admin-hazelnut)" }}>{fmt(totalRevenue)} EGP</span> lifetime revenue
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCustomers()}
          disabled={loading}
          className="admin-btn flex items-center gap-1.5 !px-3.5 !py-2 !text-[12.5px] flex-shrink-0"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
        </button>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg px-3.5 py-2.5" style={{ background: "rgba(227,154,140,0.08)", border: "1px solid rgba(227,154,140,0.24)" }}>
          <AlertTriangle size={14} style={{ color: "#e39a8c", flexShrink: 0 }} />
          <span className="text-[12.5px]" style={{ color: "#e39a8c" }}>{loadError}</span>
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_CARDS.map(card => {
          const active = activeFilter === card.filter;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => selectFilter(card.filter)}
              className="admin-kpi-card text-left"
              style={{
                padding: "14px 16px", cursor: "pointer",
                border: active ? `1px solid ${card.color}40` : "1px solid var(--admin-border)",
                outline: "none", background: active ? `${card.color}08` : undefined,
                transform: active ? "scale(1.01)" : undefined,
                transition: "all 200ms",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ color: card.color, opacity: 0.7 }}>{card.icon}</span>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: card.color, lineHeight: 1 }}>{card.value}</p>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--admin-muted)", opacity: 0.4, marginTop: 4 }}>
                {card.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Search + Sort ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={13} className="admin-faint" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search by name, phone, email, or WhatsApp…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="admin-input !pl-9 !pr-3.5 !py-2.5 !rounded-xl !text-[12.5px]"
          />
        </div>

        {/* Sort dropdown */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setSortOpen(v => !v)}
            className="admin-btn flex items-center gap-1.5 !px-3.5 !py-2.5 !rounded-xl !text-[12.5px] !whitespace-nowrap"
          >
            {SORT_OPTIONS.find(s => s.key === sort)?.label ?? "Sort"}
            <ChevronDown size={12} style={{ opacity: 0.5, transform: sortOpen ? "rotate(180deg)" : undefined, transition: "transform 150ms" }} />
          </button>
          {sortOpen && (
            <div className="admin-drawer-surface" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, borderRadius: 10, padding: "6px 0", zIndex: 50, minWidth: 170 }}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => { selectSort(opt.key); setSortOpen(false); }}
                  className="block w-full text-left px-3.5 py-2 text-[12.5px] transition-colors hover:bg-[rgb(227_210_184_/_0.05)]"
                  style={{ background: sort === opt.key ? "rgb(227 210 184 / 0.06)" : "none", color: sort === opt.key ? "var(--admin-hazelnut)" : "var(--admin-muted)" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Tabs ──────────────────────────────────────────────────────── */}
      <div className="admin-tabs overflow-x-auto flex-nowrap pb-0.5">
        {FILTERS.map(f => {
          const active = activeFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => selectFilter(f.key)}
              className={`admin-chip${active ? " admin-chip-active" : ""}`}
            >
              {f.label}
              <span style={{ fontSize: 10.5, opacity: 0.7, fontWeight: 600 }}>{tabCounts[f.key]}</span>
            </button>
          );
        })}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="admin-table-wrap">
        <TableHeader />
        {loading && customers.length === 0 ? (
          <div className="flex items-center justify-center gap-2 admin-muted" style={{ padding: "48px 20px" }}>
            <Loader2 size={16} className="animate-spin" /> Loading customers…
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty-state !border-0 !rounded-none">
            <span className="admin-empty-icon"><Users size={26} /></span>
            <p className="text-sm admin-muted">No customers match your search</p>
            <button type="button" onClick={() => { setSearchInput(""); setSearch(""); selectFilter("all"); }} className="admin-link mt-1 !text-xs">
              Clear filters
            </button>
          </div>
        ) : (
          filtered.map((c, i) => (
            <div key={c.id} style={i < filtered.length - 1 ? { borderBottom: "1px solid var(--admin-border)" } : undefined}>
              <TableRow
                customer={c}
                isDuplicate={duplicateIds.has(c.id)}
                onOpen={setDrawerCustomerId}
              />
            </div>
          ))
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5" style={{ borderTop: "1px solid var(--admin-border)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] admin-faint">
                Page {page} of {totalPages} · {totalCount} matching customer{totalCount === 1 ? "" : "s"}
              </span>
              {activeFilter !== "all" || search ? (
                <button type="button" onClick={() => { setSearchInput(""); setSearch(""); selectFilter("all"); }} className="admin-link !text-[11px]">
                  · Clear filters
                </button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="admin-btn admin-btn-sm flex items-center gap-1"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-sm flex items-center gap-1"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Duplicate note ───────────────────────────────────────────────────── */}
      {duplicateIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(227,182,115,0.06)", border: "1px solid rgba(227,182,115,0.20)" }}>
          <AlertTriangle size={12} style={{ color: "#e3b673", flexShrink: 0 }} />
          <span className="text-[11.5px]" style={{ color: "#e3b673" }}>
            {customers.filter(c => duplicateIds.has(c.id)).length} customer record{customers.filter(c => duplicateIds.has(c.id)).length > 1 ? "s" : ""} share a phone number with another record — marked with{" "}
            <AlertTriangle size={10} style={{ display: "inline", verticalAlign: "middle" }} /> in the table.
          </span>
        </div>
      )}

      {/* ── CustomerDrawer ───────────────────────────────────────────────────── */}
      <CustomerDrawer
        customerId={drawerCustomerId}
        isOpen={drawerCustomerId !== null}
        onClose={() => setDrawerCustomerId(null)}
        onCustomerUpdated={handleCustomerUpdated}
        duplicateOf={duplicateOf}
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
