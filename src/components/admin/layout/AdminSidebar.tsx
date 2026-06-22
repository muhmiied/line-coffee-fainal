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
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  alert?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard",        icon: LayoutDashboard, label: "Main Dashboard" },
  { href: "/admin/orders",           icon: ShoppingBag,     label: "Orders",               badge: 4 },
  { href: "/admin/products",         icon: Package,         label: "Products" },
  { href: "/admin/espresso-manager", icon: Coffee,          label: "Make Your Espresso" },
  { href: "/admin/flavor-manager",   icon: Sparkles,        label: "Make Your Flavor" },
  { href: "/admin/inventory",        icon: Boxes,           label: "Inventory",             alert: true },
  { href: "/admin/customers",        icon: Users,           label: "Customers" },
  { href: "/admin/marketing",        icon: Megaphone,       label: "Marketing" },
  { href: "/admin/accounting",       icon: Receipt,         label: "Accounting" },
  { href: "/admin/analytics",        icon: BarChart3,       label: "Analytics" },
  { href: "/admin/cms",              icon: FileText,        label: "CMS" },
];

interface SidebarContentProps {
  collapsed: boolean;
  onClose?: () => void;
}

function SidebarContent({ collapsed, onClose }: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div
        className="flex items-center px-4 flex-shrink-0"
        style={{
          height: collapsed ? 64 : 88,
          borderBottom: "1px solid rgba(182,136,94,0.10)",
          background: "rgba(182,136,94,0.03)",
        }}
      >
        {collapsed ? (
          <Image
            src="/brand/logo-colored.svg"
            alt="Line Coffee"
            width={30}
            height={30}
            className="mx-auto"
          />
        ) : (
          <>
            <span className="relative block flex-1" style={{ height: 56 }}>
              <Image
                src="/brand/logo-white.svg"
                alt="Line Coffee"
                fill
                sizes="176px"
                className="object-contain object-left"
              />
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-white/5 transition-colors flex-shrink-0 ml-2"
                style={{ color: "var(--cream-dim)" }}
                aria-label="Close sidebar"
              >
                <ChevronLeft size={14} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto admin-scrollbar py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={onClose}
              className={`admin-nav-item${isActive ? " admin-nav-active" : ""}`}
              style={collapsed ? { justifyContent: "center", padding: "0.6rem 0" } : undefined}
            >
              <Icon size={17} className="flex-shrink-0" />

              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>

                  {item.badge != null && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0"
                      style={{
                        background: "rgba(251,191,36,0.14)",
                        color: "#fbbf24",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}

                  {item.alert && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom promotional card */}
      {!collapsed && (
        <div className="px-3 pb-3 flex-shrink-0">
          <div
            className="relative overflow-hidden rounded-xl"
            style={{ border: "1px solid rgba(182,136,94,0.12)" }}
          >
            <div className="relative h-[80px]">
              <Image
                src="/assets/story/roastery.png"
                alt=""
                fill
                sizes="216px"
                className="object-cover"
                style={{ opacity: 0.6 }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(13,9,7,0.96) 18%, rgba(13,9,7,0.15) 100%)",
                }}
              />
            </div>
            <div
              className="px-3 py-2.5"
              style={{ background: "#0D0907" }}
            >
              <p
                className="text-[12px] font-semibold mb-0.5 leading-tight"
                style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
              >
                Your Daily Ritual
              </p>
              <p
                className="text-[10.5px] mb-2 leading-relaxed"
                style={{ color: "var(--cream-dim)", opacity: 0.55 }}
              >
                Premium blends for real moments.
              </p>
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10.5px] font-semibold transition-opacity hover:opacity-75"
                style={{ color: "var(--gold)" }}
              >
                View Store →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div
          className="px-5 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(182,136,94,0.08)" }}
        >
          <p
            className="text-[10px] leading-relaxed"
            style={{ color: "var(--cream-dim)", opacity: 0.5 }}
          >
            Line Coffee Admin · v1.0
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
}

export default function AdminSidebar({
  collapsed,
  mobileOpen,
  onMobileClose,
}: AdminSidebarProps) {
  const SIDEBAR_STYLE = {
    background: "#0D0907",
    borderRight: "1px solid rgba(182,136,94,0.08)",
  };

  return (
    <>
      {/* Desktop sidebar — collapsible */}
      <aside
        className="hidden lg:flex flex-col h-full flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ ...SIDEBAR_STYLE, width: collapsed ? 64 : 240 }}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile sidebar — slide-in overlay */}
      <aside
        className="lg:hidden fixed top-0 left-0 h-full z-20 flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          ...SIDEBAR_STYLE,
          width: 240,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <SidebarContent collapsed={false} onClose={onMobileClose} />
      </aside>
    </>
  );
}
