import type { ReactNode } from "react";
import { DashboardSidebarPlaceholder } from "./DashboardSidebarPlaceholder";
import { DashboardTopbarPlaceholder } from "./DashboardTopbarPlaceholder";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[17rem_1fr]">
      <DashboardSidebarPlaceholder />
      <div className="min-w-0">
        <DashboardTopbarPlaceholder />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
