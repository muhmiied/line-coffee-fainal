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

function GateScreen({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{ background: "var(--coffee-black)" }}
    >
      <div className="w-full max-w-sm rounded-xl border border-[#B6885E]/15 bg-[#120D09]/85 px-6 py-7 text-center shadow-[0_20px_56px_rgba(0,0,0,0.45)]">
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [orderOverview, setOrderOverview] = useState<AdminOrderOverview | null>(null);

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

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  // ── Gate: every non-authorized status resolves to a concrete screen, so the
  // shell can never sit on an endless spinner. ──────────────────────────────
  if (status === "loading") {
    return (
      <GateScreen>
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#D6A373]" />
        <p className="text-sm font-medium text-[#F5E6D8]">Loading admin workspace…</p>
        <p className="mt-1 text-xs text-[#B79B85]/60">Verifying your Supabase session.</p>
      </GateScreen>
    );
  }

  if (status === "signed_out") {
    return (
      <GateScreen>
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#D6A373]" />
        <p className="text-sm font-medium text-[#F5E6D8]">Redirecting to sign in…</p>
      </GateScreen>
    );
  }

  if (status === "error") {
    return (
      <GateScreen>
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-400" />
        <p className="text-sm font-semibold text-[#F5E6D8]">Couldn’t verify admin access</p>
        <p className="mt-1.5 text-xs leading-relaxed text-[#B79B85]/70">
          {error || "Something went wrong while checking your admin account."}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="premium-button w-full rounded-lg py-2.5 text-sm font-semibold"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#B6885E]/20 py-2.5 text-sm text-[#D6B79A]/80 transition-colors hover:text-[#F5E6D8]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to site
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 py-1.5 text-xs text-[#B79B85]/50 transition-colors hover:text-red-400/80"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </GateScreen>
    );
  }

  if (status === "forbidden" || !isAdmin || !admin) {
    return (
      <GateScreen>
        <ShieldX className="mx-auto mb-3 h-8 w-8 text-red-400/80" />
        <p className="text-sm font-semibold text-[#F5E6D8]">Admin access required</p>
        <p className="mt-1.5 text-xs leading-relaxed text-[#B79B85]/70">
          You’re signed in, but this account isn’t an active Line Coffee admin.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="premium-button flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4" /> Back to site
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 py-1.5 text-xs text-[#B79B85]/50 transition-colors hover:text-red-400/80"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </GateScreen>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex overflow-hidden"
      style={{ background: "var(--coffee-black)" }}
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
        />
        <main
          className="admin-scrollbar flex-1 overflow-y-auto p-4 md:p-6"
          style={{ background: "var(--coffee-black)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
