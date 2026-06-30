"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  Bell,
  ChevronDown,
  LayoutDashboard,
  ExternalLink,
  LogOut,
  User,
  Clock3,
  Truck,
  CircleDollarSign,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  formatAdminRole,
  getAdminDisplayName,
  getAdminInitials,
  type CurrentAdmin,
} from "@/lib/auth/admin";
import type { AdminOrderOverview } from "@/lib/admin/admin-orders";

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard":        "Main Dashboard",
  "/admin/orders":           "Orders",
  "/admin/products":         "Products",
  "/admin/espresso-manager": "Make Your Espresso",
  "/admin/flavor-manager":   "Make Your Flavor",
  "/admin/inventory":        "Inventory",
  "/admin/customers":        "Customers",
  "/admin/marketing":        "Marketing & Promotions",
  "/admin/accounting":       "Accounting",
  "/admin/analytics":        "Analytics",
  "/admin/cms":              "CMS",
};

export default function AdminTopBar({
  admin,
  onMenuToggle,
  orderOverview,
}: {
  admin: CurrentAdmin;
  onMenuToggle: () => void;
  orderOverview: AdminOrderOverview | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const pageTitle = PAGE_TITLES[pathname] ?? "Admin Dashboard";

  const adminName = getAdminDisplayName(admin);
  const adminFirstName = adminName.split(" ")[0] || admin.email;
  const adminInitials = getAdminInitials(admin);
  const adminRoleLabel = formatAdminRole(admin.role);
  const activeAlertCount = orderOverview
    ? orderOverview.pending + orderOverview.shipped + orderOverview.deliveredUnpaid
    : 0;
  const alerts = orderOverview
    ? [
        {
          key: "pending",
          count: orderOverview.pending,
          Icon: Clock3,
          color: "#fbbf24",
          label: `${orderOverview.pending} pending ${orderOverview.pending === 1 ? "order needs" : "orders need"} review`,
        },
        {
          key: "delivered-unpaid",
          count: orderOverview.deliveredUnpaid,
          Icon: CircleDollarSign,
          color: "#f87171",
          label: `${orderOverview.deliveredUnpaid} delivered ${orderOverview.deliveredUnpaid === 1 ? "order is" : "orders are"} still unpaid`,
        },
        {
          key: "shipped",
          count: orderOverview.shipped,
          Icon: Truck,
          color: "#a78bfa",
          label: `${orderOverview.shipped} shipped ${orderOverview.shipped === 1 ? "order is" : "orders are"} awaiting delivery confirmation`,
        },
      ].filter((alert) => alert.count > 0)
    : [];

  // Close dropdowns on outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  return (
    <header
      className="flex items-center h-[60px] px-4 gap-3 flex-shrink-0"
      style={{ background: "var(--coffee-black)" }}
    >
      {/* Hamburger / collapse toggle */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="p-2 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
        style={{ color: "var(--cream-dim)" }}
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>

      {/* Page title */}
      <h2
        className="flex-1 min-w-0 text-base font-semibold truncate"
        style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
      >
        {pageTitle}
      </h2>

      {/* Right-side actions */}
      <div className="flex items-center gap-2">
        <div className="admin-topbar-divider hidden sm:block" />

        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setProfileOpen(false);
            }}
            className="relative rounded-lg p-2 text-[#B79B85] transition-colors hover:bg-white/5 hover:text-[#F5E6D8]"
            aria-label="Operational notifications"
            aria-expanded={notificationsOpen ? "true" : "false"}
          >
            <Bell size={17} />
            {activeAlertCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white shadow-[0_0_0_1.5px_var(--coffee-black)]">
                {activeAlertCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#B6885E]/15 bg-[#1A1209] shadow-[0_20px_56px_rgba(0,0,0,0.55)]">
              <div className="border-b border-[#B6885E]/10 px-4 py-3">
                <p className="font-serif text-sm font-semibold text-[#F5E6D8]">
                  Operational notifications
                </p>
                <p className="mt-0.5 text-[10px] text-[#B79B85]/50">
                  Live order alerts from Supabase
                </p>
              </div>

              {orderOverview == null ? (
                <p className="px-4 py-6 text-center text-xs text-[#B79B85]/55">
                  Notifications are temporarily unavailable.
                </p>
              ) : alerts.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-[#B79B85]/55">
                  No active notifications
                </p>
              ) : (
                <div className="divide-y divide-[#B6885E]/[0.07]">
                  {alerts.map(({ key, Icon, color, label }) => (
                    <Link
                      key={key}
                      href="/admin/orders"
                      onClick={() => setNotificationsOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]"
                    >
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: `${color}18`, color }}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="pt-1 text-xs leading-relaxed text-[#F5E6D8]/85">
                        {label}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="admin-topbar-divider" />

        {/* Profile button + dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Open profile menu"
            aria-expanded={profileOpen ? "true" : "false"}
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 select-none"
              style={{
                background: "linear-gradient(135deg, #a8744e, #d6a373)",
                color: "var(--coffee-black)",
              }}
            >
              {adminInitials}
            </div>

            <span
              className="hidden sm:block text-[13px] truncate max-w-[96px]"
              style={{ color: "var(--cream)" }}
            >
              {adminFirstName}
            </span>

            <ChevronDown
              size={13}
              className={`hidden sm:block transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
              style={{ color: "var(--cream-dim)" }}
            />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-xl py-1.5 z-50 overflow-hidden"
              style={{
                background: "#1a1209",
                border: "1px solid rgba(182,136,94,0.15)",
                boxShadow: "0 20px 56px rgba(0,0,0,0.55)",
              }}
            >
              {/* User info */}
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}
              >
                <p
                  className="text-sm font-medium leading-tight truncate"
                  style={{ color: "var(--cream)" }}
                >
                  {adminName}
                </p>
                <p
                  className="text-[11px] truncate mt-0.5"
                  style={{ color: "var(--cream-dim)" }}
                >
                  {admin.email}
                </p>
                <span
                  className="inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    background: "rgba(182,136,94,0.12)",
                    color: "var(--gold)",
                  }}
                >
                  {adminRoleLabel}
                </span>
              </div>

              {/* Workspace switcher */}
              <div className="px-3 pt-2.5 pb-1">
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest px-1 mb-1.5"
                  style={{ color: "var(--cream-dim)", opacity: 0.5 }}
                >
                  Switch Workspace
                </p>

                {/* Admin Dashboard — active */}
                <div
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] mb-0.5"
                  style={{
                    background: "rgba(182,136,94,0.08)",
                    color: "var(--cream)",
                  }}
                >
                  <LayoutDashboard size={13} style={{ color: "var(--gold)" }} />
                  <span className="flex-1">Admin Dashboard</span>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: "var(--gold)" }}
                  >
                    ✓
                  </span>
                </div>

                {/* Website Preview */}
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] hover:bg-white/5 transition-colors"
                  style={{ color: "var(--cream-dim)" }}
                >
                  <ExternalLink size={13} />
                  <span className="flex-1">Website Preview</span>
                </Link>
              </div>

              {/* Divider */}
              <div
                className="mx-3 my-1.5"
                style={{ height: "1px", background: "rgba(182,136,94,0.08)" }}
              />

              {/* My Account */}
              <button
                type="button"
                onClick={() => {
                  router.push("/account/profile");
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] hover:bg-white/5 transition-colors text-left"
                style={{ color: "var(--cream-dim)" }}
              >
                <User size={13} />
                My Account
              </button>

              {/* Sign out */}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] hover:bg-white/5 transition-colors text-left"
                style={{ color: "#ef4444" }}
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
