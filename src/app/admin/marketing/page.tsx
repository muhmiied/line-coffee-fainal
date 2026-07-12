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
        <h1 className="admin-page-title">
          Marketing &amp; Promotions
        </h1>
        <p className="admin-page-subtitle">
          Real promo codes used at checkout, and the public site announcement
          bar. Promo discounts apply to the product subtotal only — delivery is
          never discounted.
        </p>
      </div>

      <div className="admin-tabs">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`admin-tab${active ? " admin-tab-active" : ""}`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "promos" && <PromoCodesPanel />}
      {activeTab === "announcements" && <AnnouncementsPanel />}
    </div>
  );
}
