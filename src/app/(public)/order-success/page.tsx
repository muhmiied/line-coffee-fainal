"use client";

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle, MessageCircle } from "lucide-react";
import {
  buildWhatsAppOrderHref,
  checkoutResultStorageKey,
  isCheckoutOrderResult,
  whatsappOpenedStorageKey,
  type CheckoutOrderResult,
} from "@/lib/checkout";
import {
  getCustomerOrderDetail,
  type CustomerOrderDetail,
} from "@/lib/account/customer-account";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLanguage } from "@/lib/context/language";
import { cn } from "@/lib/utils/cn";

const RECEIPT_LOADING = "__receipt_loading__";
const subscribeToNothing = () => () => {};
const getLoadingSnapshot = () => RECEIPT_LOADING;

const PAYMENT_METHOD_LABEL: Record<string, { en: string; ar: string }> = {
  cash_on_delivery: { en: "Cash on Delivery", ar: "الدفع عند الاستلام" },
  instapay: { en: "InstaPay", ar: "إنستا باي" },
  wallet: { en: "Wallet", ar: "المحفظة الإلكترونية" },
};

// Phase 10-11: payment_status is ledger-derived and can move past "pending"
// by the time a receipt is recovered (e.g. an admin already recorded a
// payment), so recovered orders must show the real value, not an assumption.
const PAYMENT_STATUS_LABEL: Record<string, { en: string; ar: string }> = {
  pending: { en: "Pending", ar: "قيد الانتظار" },
  pending_review: { en: "Pending Review", ar: "قيد المراجعة" },
  unpaid: { en: "Unpaid", ar: "غير مدفوع" },
  partially_paid: { en: "Partially Paid", ar: "مدفوع جزئياً" },
  paid: { en: "Paid", ar: "مدفوع" },
  refunded: { en: "Refunded", ar: "مسترد" },
  failed: { en: "Failed", ar: "فشل" },
};

type ReceiptRecoveryState = "idle" | "loading" | "found" | "unavailable";

function isMobileDevice() {
  const navigatorWithUserAgentData = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };

  if (typeof navigatorWithUserAgentData.userAgentData?.mobile === "boolean") {
    return navigatorWithUserAgentData.userAgentData.mobile;
  }

  return (
    /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const fallbackCode = searchParams.get("order");
  const { t, dir } = useLanguage();
  const { isLoggedIn } = useAuth();
  const getStoredResult = useCallback(() => {
    if (!orderId) return null;
    try {
      return window.sessionStorage.getItem(checkoutResultStorageKey(orderId));
    } catch {
      return null;
    }
  }, [orderId]);
  const rawResult = useSyncExternalStore(
    subscribeToNothing,
    getStoredResult,
    getLoadingSnapshot,
  );
  const result = useMemo<CheckoutOrderResult | null>(() => {
    if (!rawResult || !orderId) return null;
    try {
      const parsed: unknown = JSON.parse(rawResult);
      return isCheckoutOrderResult(parsed) && parsed.order_id === orderId ? parsed : null;
    } catch {
      return null;
    }
  }, [orderId, rawResult]);
  const whatsappUrl = useMemo(
    () => (result ? buildWhatsAppOrderHref(result) : null),
    [result],
  );

  useEffect(() => {
    if (!orderId || !whatsappUrl) return;
    const openedKey = whatsappOpenedStorageKey(orderId);
    try {
      if (window.sessionStorage.getItem(openedKey)) return;
      window.sessionStorage.setItem(openedKey, "1");
    } catch {
      // Continue with the handoff even when session storage is unavailable.
    }
    if (isMobileDevice()) {
      window.location.assign(whatsappUrl);
      return;
    }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }, [orderId, whatsappUrl]);

  // Resilience: the sessionStorage receipt only survives in the browser tab
  // that placed the order. If it's missing (another tab/device, cleared
  // storage, revisit later) but the order code is still in the URL, recover
  // the receipt through the same ownership-scoped RPC the account Orders
  // pages use — resolved by auth.uid() for signed-in customers or the device
  // guest_id for guests, never by the raw order id alone. This never touches
  // Telegram and never creates/mutates the order.
  const recoveryAttempted = useRef(false);
  const [recoveryState, setRecoveryState] = useState<ReceiptRecoveryState>("idle");
  const [recovered, setRecovered] = useState<CustomerOrderDetail | null>(null);

  useEffect(() => {
    if (result || !fallbackCode || rawResult === RECEIPT_LOADING) return;
    if (recoveryAttempted.current) return;
    recoveryAttempted.current = true;

    let active = true;
    setRecoveryState("loading");
    getCustomerOrderDetail(fallbackCode)
      .then((detail) => {
        if (!active) return;
        setRecovered(detail);
        setRecoveryState(detail ? "found" : "unavailable");
      })
      .catch(() => {
        if (!active) return;
        setRecovered(null);
        setRecoveryState("unavailable");
      });
    return () => {
      active = false;
    };
  }, [result, fallbackCode, rawResult]);

  if (rawResult === RECEIPT_LOADING) {
    return <div className="min-h-screen bg-[#0B0806]" />;
  }

  const orderCode = result?.code ?? recovered?.code ?? fallbackCode;
  const paymentMethodKey = result?.payment_method ?? recovered?.paymentMethod ?? null;
  const paymentMethod = paymentMethodKey
    ? t(PAYMENT_METHOD_LABEL[paymentMethodKey] ?? { en: paymentMethodKey, ar: paymentMethodKey })
    : null;
  // Phase 1 (Decision 12): every order starts with payment_status "pending" —
  // true at the moment of the original in-session receipt. A recovered order
  // may have moved on (Phase 10-11 ledger-derived status), so it uses the
  // real stored value instead of assuming "pending".
  const paymentStatusKey = result ? "pending" : recovered?.paymentStatus ?? null;
  const paymentStatus = paymentStatusKey
    ? t(PAYMENT_STATUS_LABEL[paymentStatusKey] ?? { en: paymentStatusKey, ar: paymentStatusKey })
    : null;
  const itemCount = result?.item_count ?? recovered?.itemCount ?? null;
  const totalAmount = result?.total ?? recovered?.total ?? null;
  const hasOrderData = Boolean(result) || Boolean(recovered);
  const isRecovering = recoveryState === "loading";
  const recoveryFailed = recoveryState === "unavailable";

  return (
    <div className="arabic-body min-h-screen bg-[#0B0806] text-[#F5E6D8]">
      <section className="products-hero relative overflow-hidden pb-10 pt-28 lg:pt-36">
        <div className="absolute inset-0 bg-[#0B0806]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#B6885E]/22 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#B6885E]">
            {t({ en: "Order Received", ar: "تم استلام الطلب" })}
          </p>
          <h1 className="font-serif text-3xl font-bold text-[#F5E6D8] sm:text-4xl">
            {t({ en: "Thank You!", ar: "شكراً لك!" })}
          </h1>
        </div>
      </section>

      <section className="cinematic-section section-bg-warm pb-20 pt-12">
        <div className="relative z-10 mx-auto max-w-2xl px-4">
          <div className="rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/72 p-8 shadow-[0_16px_48px_rgba(0,0,0,0.32)] md:p-10">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#D6A373]/30 bg-[#D6A373]/10 text-[#D6A373]">
                <CheckCircle className="h-9 w-9" />
              </div>
            </div>

            <div className="mb-8 text-center">
              <p className="mb-2 text-sm text-[#D6B79A]/80">
                {orderCode
                  ? t({ en: "Your order number", ar: "رقم طلبك" })
                  : t({ en: "Your order was received", ar: "تم استلام طلبك" })}
              </p>
              {orderCode && (
                <p className="font-serif text-3xl font-bold tracking-wide text-[#D6A373]" dir="ltr">
                  {orderCode}
                </p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-[#D6B79A]/80">
                {t({
                  en: "Our team will contact you shortly to confirm your delivery details.",
                  ar: "سيتواصل فريقنا معك قريباً لتأكيد تفاصيل التوصيل.",
                })}
              </p>
            </div>

            <div className="mb-8 h-px bg-gradient-to-r from-transparent via-[#B6885E]/25 to-transparent" />

            {hasOrderData ? (
              <div className="mb-8 rounded-xl border border-[#B6885E]/14 bg-[#0B0806]/40 p-5">
                <h2 className="mb-4 font-serif text-lg font-bold text-[#F5E6D8]">
                  {t({ en: "Order Summary", ar: "ملخص الطلب" })}
                </h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[#D6B79A]/80">{t({ en: "Items", ar: "عدد القطع" })}</dt>
                    <dd className="arabic-number font-semibold text-[#F5E6D8]">{itemCount}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[#D6B79A]/80">{t({ en: "Payment method", ar: "طريقة الدفع" })}</dt>
                    <dd className="font-semibold text-[#F5E6D8]">{paymentMethod}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[#D6B79A]/80">{t({ en: "Payment status", ar: "حالة الدفع" })}</dt>
                    <dd className="font-semibold text-[#D6A373]">{paymentStatus}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-[#B6885E]/12 pt-3">
                    <dt className="font-semibold text-[#F5E6D8]">{t({ en: "Total", ar: "الإجمالي" })}</dt>
                    <dd className="arabic-number font-serif text-xl font-bold text-[#D6A373]">
                      {totalAmount} {t({ en: "EGP", ar: "ج.م" })}
                    </dd>
                  </div>
                </dl>
                {!result && recovered && isLoggedIn && (
                  <Link
                    href={`/account/orders/${encodeURIComponent(recovered.code)}`}
                    className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#D6A373] transition-colors hover:text-[#F5E6D8]"
                  >
                    {t({ en: "View full details in My Orders", ar: "عرض التفاصيل الكاملة في طلباتي" })}
                    <ArrowRight className={cn("h-3.5 w-3.5", dir === "rtl" && "rotate-180")} />
                  </Link>
                )}
              </div>
            ) : isRecovering ? (
              <div className="mb-8 rounded-xl border border-[#B6885E]/14 bg-[#0B0806]/40 p-5 text-center">
                <p className="text-sm leading-6 text-[#D6B79A]/75">
                  {t({
                    en: "Loading your order details…",
                    ar: "جارٍ تحميل تفاصيل طلبك…",
                  })}
                </p>
              </div>
            ) : recoveryFailed ? (
              <div className="mb-8 rounded-xl border border-[#B6885E]/14 bg-[#0B0806]/40 p-5 text-center">
                <p className="text-sm leading-6 text-[#D6B79A]/75">
                  {t({
                    en: "We couldn't load this order's details on this device.",
                    ar: "تعذر تحميل تفاصيل هذا الطلب على هذا الجهاز.",
                  })}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#D6B79A]/55">
                  {isLoggedIn
                    ? t({
                        en: "Check My Orders for the full receipt, or contact us with your order number.",
                        ar: "راجع صفحة طلباتي للحصول على الإيصال الكامل، أو تواصل معنا برقم طلبك.",
                      })
                    : t({
                        en: "Sign in to view it in My Orders, or contact us with your order number.",
                        ar: "سجّل الدخول لعرضه في طلباتي، أو تواصل معنا برقم طلبك.",
                      })}
                </p>
                {isLoggedIn && orderCode && (
                  <Link
                    href={`/account/orders/${encodeURIComponent(orderCode)}`}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#D6A373] transition-colors hover:text-[#F5E6D8]"
                  >
                    {t({ en: "Go to My Orders", ar: "الذهاب إلى طلباتي" })}
                    <ArrowRight className={cn("h-3.5 w-3.5", dir === "rtl" && "rotate-180")} />
                  </Link>
                )}
              </div>
            ) : (
              <div className="mb-8 rounded-xl border border-[#B6885E]/14 bg-[#0B0806]/40 p-5 text-center">
                <p className="text-sm leading-6 text-[#D6B79A]/75">
                  {t({
                    en: "The receipt details are available in the browser session that placed the order.",
                    ar: "تفاصيل الإيصال متاحة في جلسة المتصفح التي تم تقديم الطلب منها.",
                  })}
                </p>
                {orderId && (
                  <p className="mt-2 break-all text-xs text-[#D6B79A]/60" dir="ltr">
                    {orderId}
                  </p>
                )}
              </div>
            )}

            {result?.handoff?.telegramStatus === "failed" && (
              <div
                role="status"
                className="mb-6 rounded-xl border border-amber-300/25 bg-amber-300/8 px-4 py-3 text-sm leading-6 text-amber-100"
              >
                {t({
                  en: "Your order is safely saved, but the admin notification could not be confirmed. Please send the prepared WhatsApp message.",
                  ar: "تم حفظ طلبك بأمان، لكن تعذر تأكيد إشعار الإدارة. يرجى إرسال رسالة واتساب المجهزة.",
                })}
              </div>
            )}

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="premium-button mb-3 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold"
              >
                <MessageCircle className="h-4 w-4" />
                {t({
                  en: "Open WhatsApp",
                  ar: "فتح واتساب",
                })}
              </a>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/products"
                className="premium-button flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold"
              >
                {t({ en: "Continue Shopping", ar: "مواصلة التسوق" })}
                <ArrowRight className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
              </Link>
              <Link
                href="/"
                className="premium-button-outline flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold"
              >
                {t({ en: "Back to Home", ar: "العودة للرئيسية" })}
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#B6885E]/12 bg-[#120D09]/50 p-5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D6A373]/70">
              {t({ en: "Line Coffee Promise", ar: "وعد لاين كوفي" })}
            </p>
            <p className="mt-2 text-sm text-[#D6B79A]/80">
              {t({
                en: "Roasted within 72 hours of your order. Your coffee arrives at its most expressive.",
                ar: "محمصة خلال 72 ساعة من طلبك. تصل قهوتك في أعلى مستويات نضارتها.",
              })}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0806]" />}>
      <OrderSuccessContent />
    </Suspense>
  );
}
