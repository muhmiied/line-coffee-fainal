"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Mock auth guard: auto-seed a mock admin user if none exists
  useEffect(() => {
    const stored = localStorage.getItem("line-user-v1");
    if (!stored) {
      localStorage.setItem(
        "line-user-v1",
        JSON.stringify({ name: "Mohamed Sayed", email: "midoseka8@gmail.com" })
      );
    }
  }, []);

  const handleMenuToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex overflow-hidden"
      style={{ background: "var(--coffee-black)" }}
    >
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/60 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <AdminSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopBar onMenuToggle={handleMenuToggle} />
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6 admin-scrollbar"
          style={{ background: "var(--coffee-black)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
