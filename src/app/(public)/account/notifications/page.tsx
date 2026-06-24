"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AccountShell } from "@/components/layout/account/AccountShell";
import { type MockNotification } from "@/lib/mock-data/account-data";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";

export default function NotificationsPage() {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<MockNotification[]>([]);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  const markRead = (id: string) =>
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

  return (
    <AccountShell title={{ en: "Notifications", ar: "الإشعارات" }}>
      {/* Header row */}
      {unread > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-[#B79B85]/60">
            {unread} {t({ en: "unread", ar: "غير مقروء" })}
          </span>
          <button
            onClick={markAllRead}
            className="text-sm text-[#B6885E]/80 transition-colors hover:text-[#D6A373]"
          >
            {t({ en: "Mark all as read", ar: "تحديد الكل كمقروء" })}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-[#B6885E]/10 bg-[#120D09] px-6 py-16 text-center">
          <Bell className="mx-auto mb-4 h-10 w-10 text-[#B6885E]/20" />
          <p className="text-sm text-[#B79B85]/55">
            {t({ en: "No notifications yet.", ar: "لا توجد إشعارات بعد." })}
          </p>
          <p className="mt-2 text-xs text-[#B79B85]/40">
            {t({ en: "Order updates and account alerts will appear here.", ar: "ستظهر هنا تحديثات طلباتك وإشعارات حسابك." })}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((notif) => (
            <button
              key={notif.id}
              onClick={() => markRead(notif.id)}
              className={cn(
                "w-full rounded-xl border px-5 py-4 text-start transition-all",
                notif.read
                  ? "border-[#B6885E]/08 bg-[#120D09] opacity-70"
                  : "border-[#B6885E]/18 bg-[#15100B] hover:border-[#B6885E]/28",
              )}
            >
              <div className="flex items-start gap-3">
                {/* Dot */}
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    notif.read ? "bg-transparent" : "bg-[#B6885E]",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#F5E6D8]">{t(notif.title)}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#B79B85]/65">{t(notif.body)}</p>
                  <p className="mt-1.5 text-xs text-[#B79B85]/40">{formatDate(notif.date, language)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </AccountShell>
  );
}
