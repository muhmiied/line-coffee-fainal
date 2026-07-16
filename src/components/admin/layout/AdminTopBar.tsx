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
  Globe,
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
          color: "#e3b673",
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
          color: "#e39a8c",
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
          color: "#9db3cf",
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
            color: "#d9905a",
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
      className="flex items-center h-[64px] px-4 gap-3 flex-shrink-0"
      style={{
        background: "var(--admin-bg)",
        borderBottom: "1px solid var(--admin-border)",
      }}
    >
      {/* Hamburger / collapse toggle */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="admin-btn admin-btn-ghost !p-2 flex-shrink-0"
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>

      {/* Page title */}
      <h2 className="admin-page-title flex-1 min-w-0 !text-base truncate">
        {pageTitle}
      </h2>

      {/* Right-side actions */}
      <div className="flex items-center gap-2">
        <div className="admin-topbar-divider hidden sm:block" />

        <button
          type="button"
          onClick={toggleLanguage}
          className="admin-lang-pill"
          aria-label={t(language === "en" ? "Switch to Arabic" : "Switch to English")}
          title={t(language === "en" ? "Switch to Arabic" : "Switch to English")}
        >
          <Globe size={14} aria-hidden="true" />
          <span>{language === "en" ? "AR" : "EN"}</span>
        </button>

        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setProfileOpen(false);
            }}
            className="admin-btn admin-btn-ghost relative !p-2"
            aria-label={t("Operational notifications")}
            aria-expanded={notificationsOpen ? "true" : "false"}
          >
            <Bell size={17} />
            {activeAlertCount > 0 && (
              <span
                className="absolute right-0.5 top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-white"
                style={{
                  background: "linear-gradient(150deg, #e39a8c, #c4574a)",
                  boxShadow: "0 0 0 2px var(--admin-bg)",
                }}
              >
                {activeAlertCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className={`admin-drawer-surface absolute top-full z-50 mt-2 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl ${
                dir === "rtl" ? "left-0" : "right-0"
              }`}
            >
              <div className="admin-drawer-header px-4 py-3">
                <p className="admin-card-title font-serif !text-sm">
                  {t("Operational notifications")}
                </p>
                <p className="mt-0.5 admin-caption !text-[10px]">
                  {t("Live order alerts from Supabase")}
                </p>
              </div>

              {notificationsUnavailable ? (
                <p className="px-4 py-6 text-center text-xs admin-muted">
                  {t("Notifications are temporarily unavailable.")}
                </p>
              ) : alerts.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs admin-muted">
                  {t("No active notifications")}
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--admin-border)" }}>
                  {alerts.map(({ key, Icon, color, label, href }) => (
                    <Link
                      key={key}
                      href={href}
                      onClick={() => setNotificationsOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[rgb(227_210_184_/_0.04)]"
                    >
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="pt-1 text-xs leading-relaxed admin-text">
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
            className="admin-btn admin-btn-ghost flex items-center gap-2 !px-2 !py-1.5"
            aria-label={t("Open profile menu")}
            aria-expanded={profileOpen ? "true" : "false"}
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 select-none"
              style={{
                background: "linear-gradient(150deg, #dcab7b, #a16e41)",
                color: "var(--admin-button-text)",
                boxShadow: "0 3px 8px rgb(5 3 2 / 0.4)",
              }}
            >
              {adminInitials}
            </div>

            <span
              className="hidden sm:block text-[13px] truncate max-w-[96px] admin-text"
              data-admin-no-translate
            >
              {adminFirstName}
            </span>

            <ChevronDown
              size={13}
              className={`hidden sm:block transition-transform duration-200 admin-faint ${profileOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div
              className={`admin-drawer-surface absolute top-full mt-2 w-56 rounded-2xl py-1.5 z-50 overflow-hidden ${
                dir === "rtl" ? "left-0" : "right-0"
              }`}
            >
              {/* User info */}
              <div className="admin-drawer-header px-4 py-3">
                <p
                  className="text-sm font-semibold leading-tight truncate admin-text"
                  style={{ color: "var(--admin-heading)" }}
                  data-admin-no-translate
                >
                  {adminName}
                </p>
                <p
                  className="text-[11px] truncate mt-0.5 admin-muted"
                  data-admin-no-translate
                >
                  {admin.email}
                </p>
                <span className="admin-badge admin-badge-gold mt-2">
                  {t(adminRoleLabel)}
                </span>
              </div>

              {/* Quick links — honest navigation, no fake workspace switching */}
              <div className="px-3 pt-2.5 pb-1">
                <p className="admin-label px-1 mb-1.5">
                  {t("Quick Links")}
                </p>

                {/* Dashboard */}
                <Link
                  href="/admin/dashboard"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] admin-muted transition-colors hover:bg-[rgb(227_210_184_/_0.05)] hover:text-[var(--admin-white-coffee)]"
                >
                  <LayoutDashboard size={13} />
                  <span className="flex-1">{t("Dashboard")}</span>
                </Link>

                {/* Settings */}
                <Link
                  href="/admin/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] admin-muted transition-colors hover:bg-[rgb(227_210_184_/_0.05)] hover:text-[var(--admin-white-coffee)]"
                >
                  <Settings size={13} />
                  <span className="flex-1">{t("Settings")}</span>
                </Link>

                {/* Website Preview — same tab, same session, matching the
                    sidebar's "View Store" link (no duplicate-tab navigation
                    away from the admin session). */}
                <Link
                  href="/"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] admin-muted transition-colors hover:bg-[rgb(227_210_184_/_0.05)] hover:text-[var(--admin-white-coffee)]"
                >
                  <ExternalLink size={13} />
                  <span className="flex-1">{t("Website Preview")}</span>
                </Link>
              </div>

              {/* Divider */}
              <div className="mx-3 my-1.5 admin-divider" />

              {/* My Account */}
              <button
                type="button"
                onClick={() => {
                  router.push("/account/profile");
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] admin-muted transition-colors hover:bg-[rgb(227_210_184_/_0.05)] hover:text-[var(--admin-white-coffee)] text-left"
              >
                <User size={13} />
                {t("My Account")}
              </button>

              {/* Sign out */}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] transition-colors hover:bg-[rgb(227_154_140_/_0.08)] text-left"
                style={{ color: "#e07a63" }}
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
