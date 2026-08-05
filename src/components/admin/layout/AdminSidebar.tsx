"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Coffee,
  Sparkles,
  Boxes,
  Users,
  Megaphone,
  Receipt,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { useAdminLanguage } from "./AdminLanguageProvider";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard",        icon: LayoutDashboard, label: "Main Dashboard" },
  { href: "/admin/orders",           icon: ShoppingBag,     label: "Orders" },
  { href: "/admin/products",         icon: Package,         label: "Products" },
  { href: "/admin/espresso-manager", icon: Coffee,          label: "Make Your Espresso" },
  { href: "/admin/flavor-manager",   icon: Sparkles,        label: "Make Your Flavor" },
  { href: "/admin/inventory",        icon: Boxes,           label: "Inventory" },
  { href: "/admin/customers",        icon: Users,           label: "Customers" },
  { href: "/admin/marketing",        icon: Megaphone,       label: "Marketing" },
  { href: "/admin/accounting",       icon: Receipt,         label: "Accounting" },
  { href: "/admin/analytics",        icon: BarChart3,       label: "Analytics" },
  { href: "/admin/cms",              icon: FileText,        label: "CMS" },
  { href: "/admin/settings",         icon: Settings,        label: "Settings" },
];

interface SidebarContentProps {
  collapsed: boolean;
  onClose?: () => void;
  orderCount: number | null;
}

function SidebarContent({ collapsed, onClose, orderCount }: SidebarContentProps) {
  const pathname = usePathname();
  const { dir, t } = useAdminLanguage();

  return (
    <div className="flex flex-col h-full">
      {/* Logo area — sits naturally in the sidebar atmosphere: soft ambient
          glow behind the mark, fade-to-transparent divider (no hard box line) */}
      <div
        className="relative flex items-center px-5 flex-shrink-0"
        style={{ height: collapsed ? 68 : 92 }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-full"
          style={{
            background:
              "radial-gradient(120px 60px at 20% 40%, rgb(198 153 116 / 0.14), transparent 72%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-4 bottom-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgb(182 136 94 / 0.22) 40%, transparent 100%)",
          }}
        />
        {collapsed ? (
          <Image
            src="/site-images/shared/logos/line-coffee-colored.svg"
            alt="Line Coffee"
            width={32}
            height={32}
            className="relative mx-auto"
          />
        ) : (
          <>
            <span className="relative block flex-1" style={{ height: 46 }}>
              <Image
                src="/site-images/shared/logos/line-coffee-white.svg"
                alt="Line Coffee"
                fill
                sizes="176px"
                className={`object-contain ${dir === "rtl" ? "object-right" : "object-left"}`}
              />
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="admin-btn admin-btn-sm relative flex-shrink-0 !p-1.5"
                style={{ marginInlineStart: 8 }}
                aria-label={t("Close sidebar")}
              >
                <ChevronLeft size={14} className={dir === "rtl" ? "rotate-180" : undefined} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto admin-scrollbar py-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? t(item.label) : undefined}
              onClick={onClose}
              className={`admin-nav-item${isActive ? " admin-nav-active" : ""}`}
              style={collapsed ? { justifyContent: "center", padding: "0.6rem 0" } : undefined}
            >
              <Icon size={17} className="flex-shrink-0" />

              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{t(item.label)}</span>

                  {item.href === "/admin/orders" && orderCount != null && orderCount > 0 && (
                    <span className="admin-badge admin-badge-gold flex-shrink-0 !px-1.5 !py-0.5 text-[10px] leading-none">
                      {orderCount}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom store link — medium card: intentional, not tiny, not oversized */}
      {!collapsed && (
        <div className="px-3 pb-2.5 flex-shrink-0">
          <Link
            href="/"
            className="admin-card flex items-center gap-3 rounded-2xl p-2.5"
          >
            <span
              className="relative block h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl"
              style={{ boxShadow: "var(--admin-inset), 0 4px 12px rgb(5 3 2 / 0.4)" }}
            >
              <Image
                src="/site-images/admin/sidebar/roastery-thumbnail.png"
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
              <span
                className="absolute inset-0"
                style={{ background: "linear-gradient(180deg, transparent 40%, rgb(5 3 2 / 0.45) 100%)" }}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block text-[12.5px] font-semibold leading-snug"
                style={{ color: "var(--admin-white-coffee)", fontFamily: "var(--font-playfair)" }}
              >
                {t("Your Daily Ritual")}
              </span>
              <span className="mt-0.5 block text-[10.5px] leading-tight admin-muted">
                {t("Premium blends, real moments")}
              </span>
              <span
                className="mt-1 inline-block text-[10.5px] font-bold leading-tight"
                style={{ color: "var(--admin-hazelnut)" }}
              >
                {t("View Store →")}
              </span>
            </span>
          </Link>
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div
          className="px-5 py-2.5 flex-shrink-0"
          style={{ borderTop: "1px solid var(--admin-border)" }}
        >
          <p className="text-[10px] leading-relaxed admin-faint">
            {t("Line Coffee Admin · v1.0")}
          </p>
        </div>
      )}
    </div>
  );
}

interface AdminSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  orderCount: number | null;
}

export default function AdminSidebar({
  collapsed,
  mobileOpen,
  onMobileClose,
  orderCount,
}: AdminSidebarProps) {
  const { dir } = useAdminLanguage();
  const SIDEBAR_STYLE = {
    background:
      "radial-gradient(560px 420px at -10% 0%, rgb(90 46 18 / 0.16), transparent 62%)," +
      "linear-gradient(175deg, #160f0a 0%, #100b08 55%, #0c0806 100%)",
    borderInlineEnd: "1px solid var(--admin-border)",
  };

  return (
    <>
      {/* Desktop sidebar — collapsible */}
      <aside
        className="hidden lg:flex flex-col h-full flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ ...SIDEBAR_STYLE, width: collapsed ? 64 : 240 }}
      >
        <SidebarContent collapsed={collapsed} orderCount={orderCount} />
      </aside>

      {/* Mobile sidebar — slide-in overlay */}
      <aside
        className={`lg:hidden fixed top-0 h-full z-20 flex flex-col transition-transform duration-300 ease-in-out ${
          dir === "rtl" ? "right-0" : "left-0"
        }`}
        style={{
          ...SIDEBAR_STYLE,
          width: 240,
          transform: mobileOpen
            ? "translateX(0)"
            : `translateX(${dir === "rtl" ? "100%" : "-100%"})`,
        }}
      >
        <SidebarContent
          collapsed={false}
          onClose={onMobileClose}
          orderCount={orderCount}
        />
      </aside>
    </>
  );
}
