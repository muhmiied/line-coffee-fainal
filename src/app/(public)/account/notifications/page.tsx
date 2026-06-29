"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AccountShell } from "@/components/layout/account/AccountShell";
import {
  getCustomerNotifications,
  type CustomerNotification,
} from "@/lib/account/customer-account";
import { formatDate } from "@/lib/utils/formatDate";

// Bilingual notification content per order status event
const STATUS_NOTIFICATION: Record<
  string,
  { title: { en: string; ar: string }; body: { en: string; ar: string } }
> = {
  pending: {
    title: { en: "Order Received",   ar: "تم استلام طلبك"       },
    body:  { en: "We've received your order and it's being reviewed.", ar: "استلمنا طلبك وهو قيد المراجعة." },
  },
  preparing: {
    title: { en: "Your Order is Being Prepared", ar: "طلبك قيد التجهيز" },
    body:  { en: "Our team is carefully preparing your coffee.",  ar: "فريقنا يجهز قهوتك بعناية الآن." },
  },
  shipped: {
    title: { en: "Order On Its Way",  ar: "طلبك في الطريق إليك"  },
    body:  { en: "Your order has been handed to the courier.",    ar: "تم تسليم طلبك لمندوب التوصيل." },
  },
  delivered: {
    title: { en: "Order Delivered",   ar: "تم توصيل طلبك"        },
    body:  { en: "Your order has been delivered. Enjoy your coffee!", ar: "تم توصيل طلبك. استمتع بقهوتك!" },
  },
  cancelled: {
    title: { en: "Order Cancelled",   ar: "تم إلغاء الطلب"        },
    body:  { en: "Your order has been cancelled. Contact us if you have questions.", ar: "تم إلغاء طلبك. تواصل معنا إن كان لديك استفسار." },
  },
  returned: {
    title: { en: "Return Processed",  ar: "تمت معالجة الإرجاع"    },
    body:  { en: "Your return has been processed successfully.",  ar: "تمت معالجة طلب إرجاعك بنجاح." },
  },
};

export default function NotificationsPage() {
  const { t, language } = useLanguage();
  const [loading, setLoading]       = useState(true);
  const [items, setItems]           = useState<CustomerNotification[]>([]);

  useEffect(() => {
    getCustomerNotifications()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AccountShell title={{ en: "Notifications", ar: "الإشعارات" }}>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-[#120D09]" />
          ))}
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell title={{ en: "Notifications", ar: "الإشعارات" }}>
      {items.length === 0 ? (
        <div className="rounded-xl border border-[#B6885E]/10 bg-[#120D09] px-6 py-16 text-center">
          <Bell className="mx-auto mb-4 h-10 w-10 text-[#B6885E]/20" />
          <p className="text-sm text-[#B79B85]/55">
            {t({ en: "No notifications yet.", ar: "لا توجد إشعارات بعد." })}
          </p>
          <p className="mt-2 text-xs text-[#B79B85]/40">
            {t({
              en: "Order updates will appear here when your order status changes.",
              ar: "ستظهر هنا تحديثات طلباتك عند تغيير حالة طلبك.",
            })}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((notif) => {
            const content =
              STATUS_NOTIFICATION[notif.status] ?? {
                title: { en: `Order ${notif.orderCode}`, ar: `طلب ${notif.orderCode}` },
                body:  { en: notif.note ?? notif.status, ar: notif.note ?? notif.status },
              };
            return (
              <Link
                key={notif.eventId}
                href={`/account/orders/${notif.orderCode}`}
                className="block w-full rounded-xl border border-[#B6885E]/18 bg-[#15100B] px-5 py-4 text-start transition-all hover:border-[#B6885E]/28"
              >
                <div className="flex items-start gap-3">
                  <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[#B6885E]/60" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#F5E6D8]">
                      {t(content.title)}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#B79B85]/65">
                      {t(content.body)}
                    </p>
                    {notif.note && (
                      <p className="mt-0.5 text-xs italic text-[#B79B85]/45">
                        {notif.note}
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-[#B79B85]/40">
                      <span className="font-mono text-[#B6885E]/50">
                        {notif.orderCode}
                      </span>
                      {" · "}
                      {formatDate(notif.changedAt, language)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}
