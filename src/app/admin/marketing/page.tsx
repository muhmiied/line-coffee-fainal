"use client";

import { useState, type ComponentType } from "react";
import { Megaphone, Percent } from "lucide-react";
import PromoCodesPanel from "@/components/admin/marketing/PromoCodesPanel";
import AnnouncementsPanel from "@/components/admin/marketing/AnnouncementsPanel";

// Phase 20C — Marketing is now real end to end. The fabricated Offers,
// Customer-Targeting, and Performance tabs (and their mock data) were removed;
// only genuinely-backed features remain:
//   • Promo Codes      — real promo_codes table, used at checkout.
//   • Announcement Bar — real announcements table, shown in the public header.
type ActiveTab = "promos" | "announcements";

const TABS: {
  key: ActiveTab;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}[] = [
  { key: "promos", label: "Promo Codes", icon: Percent },
  { key: "announcements", label: "Announcement Bar", icon: Megaphone },
];

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("promos");

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-xl font-bold text-[#f5e6d8]"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Marketing &amp; Promotions
        </h1>
        <p className="mt-1 text-[13px] text-[#b79b85]/60">
          Real promo codes used at checkout, and the public site announcement
          bar. Promo discounts apply to the product subtotal only — delivery is
          never discounted.
        </p>
      </div>

      <div className="flex overflow-x-auto border-b border-[#2a2018]">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex flex-shrink-0 items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors ${
                active
                  ? "text-[#b6885e]"
                  : "text-[#b79b85]/60 hover:text-[#f5e6d8]"
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b6885e]" />
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "promos" && <PromoCodesPanel />}
      {activeTab === "announcements" && <AnnouncementsPanel />}
    </div>
  );
}
