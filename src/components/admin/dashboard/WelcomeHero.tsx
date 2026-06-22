"use client";

import Image from "next/image";
import { useAuth } from "@/lib/hooks/useAuth";
import { ALERTS_DATA, LATEST_ORDERS } from "@/lib/mock-data/admin/dashboard-mock";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function WelcomeHero() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "Mohamed";

  const newOrders      = LATEST_ORDERS.filter((o) => o.status === "New").length;
  const lowStockCount  = ALERTS_DATA.find((a) => a.type === "low-stock")?.count ?? 0;
  const pendingReviews = ALERTS_DATA.find((a) => a.type === "reviews")?.count ?? 0;

  return (
    <div
      className="rounded-2xl relative overflow-hidden"
      style={{
        border: "1px solid rgba(182,136,94,0.16)",
        minHeight: 180,
      }}
    >
      {/* Full-card background image */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/assets/story/roastery.png"
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, calc(100vw - 300px)"
          className="object-cover object-center"
          style={{ opacity: 0.45 }}
        />
        {/* Dark overlay so text is readable */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(12,8,5,0.82) 0%, rgba(12,8,5,0.55) 60%, rgba(12,8,5,0.35) 100%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        {/* Left: greeting + stats */}
        <div>
          <h1
            className="text-xl sm:text-[22px] font-semibold mb-1.5"
            style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
          >
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-[13px] mb-4" style={{ color: "var(--cream-dim)" }}>
            Here&apos;s what&apos;s happening with Line Coffee today.
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <StatPill value={newOrders}      label="new orders"       dotColor="var(--gold)" />
            <StatPill value={lowStockCount}  label="low stock alerts" dotColor="#ef4444" />
            <StatPill value={pendingReviews} label="pending reviews"  dotColor="#a78bfa" />
          </div>
        </div>

        {/* Right: today's date */}
        <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--gold)", opacity: 0.75 }}
          >
            Today
          </span>
          <span className="text-sm font-medium" style={{ color: "var(--cream)" }}>
            {new Date().toLocaleDateString("en-EG", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  value,
  label,
  dotColor,
}: {
  value: number;
  label: string;
  dotColor: string;
}) {
  return (
    <span className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--cream-dim)" }}>
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: dotColor }}
      />
      <span className="font-semibold tabular-nums" style={{ color: "var(--cream)" }}>
        {value}
      </span>
      {label}
    </span>
  );
}
