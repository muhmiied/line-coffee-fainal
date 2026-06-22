"use client";

import Link from "next/link";
import { Package, Receipt, ShoppingCart, Tag, ArrowUpRight } from "lucide-react";
import { QUICK_ACTIONS } from "@/lib/mock-data/admin/dashboard-mock";

const ICON_MAP: Record<string, React.ElementType> = {
  Package,
  Receipt,
  ShoppingCart,
  Tag,
};

export default function QuickActions() {
  return (
    <div className="admin-surface p-5 flex flex-col h-full">
      <p
        className="text-sm font-semibold mb-4"
        style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
      >
        Quick Actions
      </p>

      <div className="grid grid-cols-2 gap-2.5 flex-1">
        {QUICK_ACTIONS.map((action) => {
          const Icon = ICON_MAP[action.iconName] ?? Package;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="group flex flex-col justify-between p-3.5 rounded-xl transition-all duration-150 hover:-translate-y-px"
              style={{
                background: "rgba(182,136,94,0.05)",
                border: "1px solid rgba(182,136,94,0.10)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(182,136,94,0.09)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(182,136,94,0.22)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(182,136,94,0.05)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(182,136,94,0.10)";
              }}
            >
              {/* Top: icon + arrow */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(182,136,94,0.12)" }}
                >
                  <Icon size={14} style={{ color: "var(--gold)" }} />
                </div>
                <ArrowUpRight
                  size={13}
                  className="opacity-0 group-hover:opacity-60 transition-opacity"
                  style={{ color: "var(--gold)" }}
                />
              </div>

              {/* Bottom: label + sublabel */}
              <div>
                <p className="text-[12.5px] font-semibold leading-tight mb-0.5" style={{ color: "var(--cream)" }}>
                  {action.label}
                </p>
                <p className="text-[11px] leading-tight" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
                  {action.sublabel}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
