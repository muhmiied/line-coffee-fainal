"use client";

import Link from "next/link";
import { Package, Receipt, ShoppingCart, Tag, ArrowUpRight } from "lucide-react";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

// Static navigation shortcuts (not metrics). Inlined so the dashboard no longer
// imports the dashboard mock-data module.
type QuickAction = { label: string; sublabel: string; href: string; iconName: string };

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Add Product",       sublabel: "New catalog item",     href: "/admin/products",   iconName: "Package" },
  { label: "Add Expense",       sublabel: "Log a business cost",  href: "/admin/accounting", iconName: "Receipt" },
  { label: "Buy Inventory",     sublabel: "Record a purchase",    href: "/admin/inventory",  iconName: "ShoppingCart" },
  { label: "Create Promo Code", sublabel: "Discount or offer",    href: "/admin/marketing",  iconName: "Tag" },
];

const ICON_MAP: Record<string, React.ElementType> = {
  Package,
  Receipt,
  ShoppingCart,
  Tag,
};

export default function QuickActions() {
  const { dir, t } = useAdminLanguage();

  return (
    <div className="admin-surface p-5 flex flex-col h-full">
      <p className="admin-card-title font-serif mb-4">
        {t("Quick Actions")}
      </p>

      <div className="grid grid-cols-2 gap-2.5 flex-1">
        {QUICK_ACTIONS.map((action) => {
          const Icon = ICON_MAP[action.iconName] ?? Package;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="admin-card group flex flex-col justify-between p-3.5 !rounded-xl"
            >
              {/* Top: icon + arrow */}
              <div className="flex items-start justify-between mb-3">
                <span className="admin-icon-chip !w-7 !h-7 !rounded-lg">
                  <Icon size={14} />
                </span>
                <ArrowUpRight
                  size={13}
                  className={`opacity-0 group-hover:opacity-70 transition-opacity ${
                    dir === "rtl" ? "-rotate-90" : ""
                  }`}
                  style={{ color: "var(--admin-hazelnut)" }}
                />
              </div>

              {/* Bottom: label + sublabel */}
              <div>
                <p className="text-[12.5px] font-semibold leading-tight mb-0.5 admin-text">
                  {t(action.label)}
                </p>
                <p className="text-[11px] leading-tight admin-faint">
                  {t(action.sublabel)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
