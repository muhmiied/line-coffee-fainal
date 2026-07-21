"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, LogOut, ShieldX } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";
import { useCurrentAdmin } from "@/lib/hooks/useCurrentAdmin";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  ADMIN_ORDERS_CHANGED_EVENT,
  getAdminOrderOverview,
  type AdminOrderOverview,
} from "@/lib/admin/admin-orders";
import { getAdminLowStockAlert, type AdminLowStockAlert } from "@/lib/admin/admin-inventory";
import { useAdminLanguage } from "./AdminLanguageProvider";

function GateScreen({ children }: { children: React.ReactNode }) {
  const { dir } = useAdminLanguage();

  return (
    <div
      className="admin-language-root admin-shell-bg fixed inset-0 z-[9999] flex items-center justify-center px-4"
      dir={dir}
    >
      <div className="admin-drawer-surface w-full max-w-sm rounded-2xl px-6 py-7 text-center">
        {children}
      </div>
    </div>
  );
}

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, status, error, isAdmin, refresh } = useCurrentAdmin();
  const { signOut } = useAuth();
  const { dir } = useAdminLanguage();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [orderOverview, setOrderOverview] = useState<AdminOrderOverview | null>(null);
  const [lowStock, setLowStock] = useState<AdminLowStockAlert | null>(null);

  // No session → bounce to login, preserving where the admin was headed.
  useEffect(() => {
    if (status === "signed_out") {
      const next = encodeURIComponent(pathname || "/admin/dashboard");
      router.replace(`/auth/login?next=${next}`);
    }
  }, [status, pathname, router]);

  useEffect(() => {
    if (status !== "authorized" || !isAdmin || !admin) return;
    let cancelled = false;

    const loadOverview = () => {
      void getAdminOrderOverview()
        .then((overview) => {
          if (!cancelled) setOrderOverview(overview);
        })
        .catch(() => {
          // Keep the last valid snapshot; initial failures show no fake counts.
        });
      void getAdminLowStockAlert()
        .then((alert) => {
          if (!cancelled) setLowStock(alert);
        })
        .catch(() => {
          // Low-stock is a best-effort bell add-on; failures leave it absent.
        });
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadOverview();
    };

    loadOverview();
    window.addEventListener("focus", loadOverview);
    window.addEventListener(ADMIN_ORDERS_CHANGED_EVENT, loadOverview);
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = window.setInterval(loadOverview, 30_000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", loadOverview);
      window.removeEventListener(ADMIN_ORDERS_CHANGED_EVENT, loadOverview);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(interval);
    };
  }, [admin, isAdmin, status]);

  const handleMenuToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setSignOutError(null);
    try {
      await signOut();
      router.replace("/auth/login");
    } catch {
      // A failed sign-out must leave the admin visibly authenticated — stay
      // on this screen and surface a retry message.
      setSignOutError("Could not sign out. Please try again.");
    }
  };

  // ── Gate: every non-authorized status resolves to a concrete screen, so the
  // shell can never sit on an endless spinner. ──────────────────────────────
  if (status === "loading") {
    return (
      <GateScreen>
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" style={{ color: "var(--admin-hazelnut)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--admin-heading)" }}>Loading admin workspace…</p>
        <p className="mt-1 text-xs admin-faint">Verifying your Supabase session.</p>
      </GateScreen>
    );
  }

  if (status === "signed_out") {
    return (
      <GateScreen>
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" style={{ color: "var(--admin-hazelnut)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--admin-heading)" }}>Redirecting to sign in…</p>
      </GateScreen>
    );
  }

  if (status === "error") {
    return (
      <GateScreen>
        <AlertTriangle className="mx-auto mb-3 h-8 w-8" style={{ color: "#e3b673" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--admin-heading)" }}>Couldn’t verify admin access</p>
        <p className="mt-1.5 text-xs leading-relaxed admin-muted">
          {error || "Something went wrong while checking your admin account."}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="admin-btn admin-btn-primary w-full !py-2.5 text-sm"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="admin-btn w-full !py-2.5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back to site
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 py-1.5 text-xs admin-faint transition-colors hover:text-[#e39a8c]"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
          {signOutError && (
            <p className="text-xs" style={{ color: "#e39a8c" }}>{signOutError}</p>
          )}
        </div>
      </GateScreen>
    );
  }

  if (status === "forbidden" || !isAdmin || !admin) {
    return (
      <GateScreen>
        <ShieldX className="mx-auto mb-3 h-8 w-8" style={{ color: "#e39a8c" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--admin-heading)" }}>Admin access required</p>
        <p className="mt-1.5 text-xs leading-relaxed admin-muted">
          You’re signed in, but this account isn’t an active Line Coffee admin.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="admin-btn admin-btn-primary w-full !py-2.5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back to site
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 py-1.5 text-xs admin-faint transition-colors hover:text-[#e39a8c]"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
          {signOutError && (
            <p className="text-xs" style={{ color: "#e39a8c" }}>{signOutError}</p>
          )}
        </div>
      </GateScreen>
    );
  }

  return (
    <div
      className="admin-language-root admin-shell-bg fixed inset-0 z-[9999] flex overflow-hidden"
      dir={dir}
    >
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/60 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <AdminSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        orderCount={orderOverview?.total ?? null}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopBar
          admin={admin}
          onMenuToggle={handleMenuToggle}
          orderOverview={orderOverview}
          lowStock={lowStock}
        />
        <main className="admin-scrollbar admin-content-bg flex-1 overflow-y-auto p-4 md:p-6 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
