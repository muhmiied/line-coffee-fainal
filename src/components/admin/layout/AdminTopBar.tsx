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
  Settings,
  Clock3,
  Truck,
  CircleDollarSign,
  PackageX,
  Languages,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  formatAdminRole,
  getAdminDisplayName,
  getAdminInitials,
  type CurrentAdmin,
} from "@/lib/auth/admin";
import type { AdminOrderOverview } from "@/lib/admin/admin-orders";
import type { AdminLowStockAlert } from "@/lib/admin/admin-inventory";
import { useAdminLanguage } from "./AdminLanguageProvider";

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
  "/admin/settings":         "Settings",
};

export default function AdminTopBar({
  admin,
  onMenuToggle,
  orderOverview,
  lowStock,
}: {
  admin: CurrentAdmin;
  onMenuToggle: () => void;
  orderOverview: AdminOrderOverview | null;
  lowStock: AdminLowStockAlert | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const { language, dir, t, toggleLanguage } = useAdminLanguage();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const pageTitle = t(PAGE_TITLES[pathname] ?? "Admin Dashboard");

  const adminName = getAdminDisplayName(admin);
  const adminFirstName = adminName.split(" ")[0] || admin.email;
  const adminInitials = getAdminInitials(admin);
  const adminRoleLabel = formatAdminRole(admin.role);
  const lowStockCount = lowStock?.count ?? 0;
  const orderAlerts = orderOverview
    ? [
        {
          key: "pending",
          count: orderOverview.pending,
          Icon: Clock3,
          color: "#fbbf24",
          href: "/admin/orders",
          label:
            language === "ar"
              ? `${orderOverview.pending} ${orderOverview.pending === 1 ? "طلب قيد الانتظار يحتاج" : "طلبات قيد الانتظار تحتاج"} إلى المراجعة`
              : `${orderOverview.pending} pending ${orderOverview.pending === 1 ? "order needs" : "orders need"} review`,
        },
        {
          key: "delivered-unpaid",
          count: orderOverview.deliveredUnpaid,
          Icon: CircleDollarSign,
          color: "#f87171",
          href: "/admin/orders",
          label:
            language === "ar"
              ? `${orderOverview.deliveredUnpaid} ${orderOverview.deliveredUnpaid === 1 ? "طلب تم توصيله وما زال غير مدفوع" : "طلبات تم توصيلها وما زالت غير مدفوعة"}`
              : `${orderOverview.deliveredUnpaid} delivered ${orderOverview.deliveredUnpaid === 1 ? "order is" : "orders are"} still unpaid`,
        },
        {
          key: "shipped",
          count: orderOverview.shipped,
          Icon: Truck,
          color: "#a78bfa",
          href: "/admin/orders",
          label:
            language === "ar"
              ? `${orderOverview.shipped} ${orderOverview.shipped === 1 ? "طلب مشحون ينتظر" : "طلبات مشحونة تنتظر"} تأكيد التوصيل`
              : `${orderOverview.shipped} shipped ${orderOverview.shipped === 1 ? "order is" : "orders are"} awaiting delivery confirmation`,
        },
      ].filter((alert) => alert.count > 0)
    : [];
  const lowStockAlerts =
    lowStockCount > 0
      ? [
          {
            key: "low-stock",
            count: lowStockCount,
            Icon: PackageX,
            color: "#f97316",
            href: "/admin/inventory",
            label:
              language === "ar"
                ? `${lowStockCount} ${lowStockCount === 1 ? "منتج وصل إلى حد المخزون المنخفض" : "منتجات وصلت إلى حد المخزون المنخفض"}`
                : `${lowStockCount} ${lowStockCount === 1 ? "product is" : "products are"} at or below the low-stock threshold`,
          },
        ]
      : [];
  const alerts = [...orderAlerts, ...lowStockAlerts];
  const activeAlertCount = alerts.reduce((sum, alert) => sum + alert.count, 0);
  // Notifications are "unavailable" only when neither real source could load.
  const notificationsUnavailable = orderOverview == null && lowStock == null;

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

        <button
          type="button"
          onClick={toggleLanguage}
          className="flex min-h-9 items-center gap-1.5 rounded-lg border border-[#B6885E]/15 px-2.5 text-[11px] font-semibold text-[#D6B79A] transition-colors hover:border-[#B6885E]/30 hover:bg-white/5 hover:text-[#F5E6D8]"
          aria-label={t(language === "en" ? "Switch to Arabic" : "Switch to English")}
          title={t(language === "en" ? "Switch to Arabic" : "Switch to English")}
        >
          <Languages size={15} aria-hidden="true" />
          <span>{language === "en" ? "العربية" : "English"}</span>
        </button>

        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setProfileOpen(false);
            }}
            className="relative rounded-lg p-2 text-[#B79B85] transition-colors hover:bg-white/5 hover:text-[#F5E6D8]"
            aria-label={t("Operational notifications")}
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
            <div className={`absolute top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#B6885E]/15 bg-[#1A1209] shadow-[0_20px_56px_rgba(0,0,0,0.55)] ${
              dir === "rtl" ? "left-0" : "right-0"
            }`}>
              <div className="border-b border-[#B6885E]/10 px-4 py-3">
                <p className="font-serif text-sm font-semibold text-[#F5E6D8]">
                  {t("Operational notifications")}
                </p>
                <p className="mt-0.5 text-[10px] text-[#B79B85]/50">
                  {t("Live order alerts from Supabase")}
                </p>
              </div>

              {notificationsUnavailable ? (
                <p className="px-4 py-6 text-center text-xs text-[#B79B85]/55">
                  {t("Notifications are temporarily unavailable.")}
                </p>
              ) : alerts.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-[#B79B85]/55">
                  {t("No active notifications")}
                </p>
              ) : (
                <div className="divide-y divide-[#B6885E]/[0.07]">
                  {alerts.map(({ key, Icon, color, label, href }) => (
                    <Link
                      key={key}
                      href={href}
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
            aria-label={t("Open profile menu")}
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
              data-admin-no-translate
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
              className={`absolute top-full mt-2 w-56 rounded-xl py-1.5 z-50 overflow-hidden ${
                dir === "rtl" ? "left-0" : "right-0"
              }`}
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
                  data-admin-no-translate
                >
                  {adminName}
                </p>
                <p
                  className="text-[11px] truncate mt-0.5"
                  style={{ color: "var(--cream-dim)" }}
                  data-admin-no-translate
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
                  {t(adminRoleLabel)}
                </span>
              </div>

              {/* Quick links — honest navigation, no fake workspace switching */}
              <div className="px-3 pt-2.5 pb-1">
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest px-1 mb-1.5"
                  style={{ color: "var(--cream-dim)", opacity: 0.5 }}
                >
                  {t("Quick Links")}
                </p>

                {/* Dashboard */}
                <Link
                  href="/admin/dashboard"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] hover:bg-white/5 transition-colors"
                  style={{ color: "var(--cream-dim)" }}
                >
                  <LayoutDashboard size={13} />
                  <span className="flex-1">{t("Dashboard")}</span>
                </Link>

                {/* Settings */}
                <Link
                  href="/admin/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] hover:bg-white/5 transition-colors"
                  style={{ color: "var(--cream-dim)" }}
                >
                  <Settings size={13} />
                  <span className="flex-1">{t("Settings")}</span>
                </Link>

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
                  <span className="flex-1">{t("Website Preview")}</span>
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
                {t("My Account")}
              </button>

              {/* Sign out */}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] hover:bg-white/5 transition-colors text-left"
                style={{ color: "#ef4444" }}
              >
                <LogOut size={13} />
                {t("Sign Out")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
