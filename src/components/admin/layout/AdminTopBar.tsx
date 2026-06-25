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
  Monitor,
  ShoppingBag,
  Package,
  Star,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  formatAdminRole,
  getAdminDisplayName,
  getAdminInitials,
  type CurrentAdmin,
} from "@/lib/auth/admin";
import { ADMIN_NOTIFICATIONS, type NotifType } from "@/lib/mock-data/admin/dashboard-mock";

const NOTIF_BG: Record<NotifType, string> = {
  order:     "rgba(182,136,94,0.12)",
  inventory: "rgba(239,68,68,0.12)",
  review:    "rgba(167,139,250,0.12)",
  system:    "rgba(96,165,250,0.12)",
};

const NOTIF_ICON_COLOR: Record<NotifType, string> = {
  order:     "var(--gold)",
  inventory: "#ef4444",
  review:    "#a78bfa",
  system:    "#60a5fa",
};

function NotifIcon({ type }: { type: NotifType }) {
  const color = NOTIF_ICON_COLOR[type];
  if (type === "order")     return <ShoppingBag size={13} style={{ color }} />;
  if (type === "inventory") return <Package     size={13} style={{ color }} />;
  if (type === "review")    return <Star        size={13} style={{ color }} />;
  return                           <Settings    size={13} style={{ color }} />;
}

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
}: {
  admin: CurrentAdmin;
  onMenuToggle: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);

  const unreadCount = ADMIN_NOTIFICATIONS.filter((n) => !n.read).length;

  const pageTitle = PAGE_TITLES[pathname] ?? "Admin Dashboard";

  const adminName = getAdminDisplayName(admin);
  const adminFirstName = adminName.split(" ")[0] || admin.email;
  const adminInitials = getAdminInitials(admin);
  const adminRoleLabel = formatAdminRole(admin.role);

  // Close dropdowns on outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
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

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => { setNotifOpen((p) => !p); setProfileOpen(false); }}
            className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--cream-dim)" }}
            aria-label="Notifications"
            aria-expanded={notifOpen ? "true" : "false"}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[15px] h-[15px] rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  boxShadow: "0 0 0 1.5px var(--coffee-black)",
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-72 rounded-xl overflow-hidden z-50"
              style={{
                background: "#1a1209",
                border: "1px solid rgba(182,136,94,0.15)",
                boxShadow: "0 20px 56px rgba(0,0,0,0.55)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
                  Notifications
                </p>
                {unreadCount > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>

              {/* List */}
              <div>
                {ADMIN_NOTIFICATIONS.map((notif, i) => {
                  const isLast = i === ADMIN_NOTIFICATIONS.length - 1;
                  return (
                    <div
                      key={notif.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                      style={!isLast ? { borderBottom: "1px solid rgba(182,136,94,0.05)" } : undefined}
                    >
                      {/* Type icon */}
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: NOTIF_BG[notif.type] }}
                      >
                        <NotifIcon type={notif.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className="text-[12.5px] font-medium leading-tight"
                            style={{ color: notif.read ? "var(--cream-dim)" : "var(--cream)" }}
                          >
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                              style={{ background: "#ef4444" }}
                            />
                          )}
                        </div>
                        <p
                          className="text-[11px] mt-0.5 truncate"
                          style={{ color: "var(--cream-dim)", opacity: 0.6 }}
                        >
                          {notif.body}
                        </p>
                        <p
                          className="text-[10px] mt-1"
                          style={{ color: "var(--cream-dim)", opacity: 0.4 }}
                        >
                          {notif.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div
                className="px-4 py-2.5 text-center"
                style={{ borderTop: "1px solid rgba(182,136,94,0.08)" }}
              >
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  className="text-[12px] font-medium transition-opacity hover:opacity-75 w-full"
                  style={{ color: "var(--gold)" }}
                >
                  Mark all as read
                </button>
              </div>
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

                {/* Media Studio — coming soon */}
                <div
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] mb-0.5 cursor-not-allowed select-none"
                  style={{ color: "var(--cream-dim)", opacity: 0.45 }}
                >
                  <Monitor size={13} />
                  <span className="flex-1">Media Studio</span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "rgba(182,136,94,0.12)",
                      color: "var(--gold)",
                    }}
                  >
                    SOON
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
