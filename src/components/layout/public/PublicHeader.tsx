"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Globe,
  Heart,
  LayoutDashboard,
  LayoutList,
  Loader2,
  LogOut,
  Menu,
  Minus,
  Plus,
  Settings,
  ShoppingBag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { useCart } from "@/lib/context/cart";
import { useWishlist } from "@/lib/hooks/useWishlist";
import { useAuth, type AuthUser } from "@/lib/hooks/useAuth";
import { useCurrentAdmin } from "@/lib/hooks/useCurrentAdmin";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import {
  formatAdminRole,
  getAdminInitials,
  type CurrentAdmin,
} from "@/lib/auth/admin";
import {
  getPublicProductsBySlugs,
  type PublicCatalogProduct,
} from "@/lib/catalog/public-catalog";
import {
  getPublicSettings,
  type StorefrontSettings,
} from "@/lib/admin/admin-settings";
import {
  DEFAULT_ANNOUNCEMENTS,
  getPublicAnnouncements,
  type PublicAnnouncement,
} from "@/lib/content/announcements";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";

const navLinks = [
  { href: "/",        label: { en: "Home",     ar: "الرئيسية"   } },
  { href: "/products",label: { en: "Products", ar: "المنتجات"   } },
  { href: "/about",   label: { en: "About",    ar: "من نحن"     } },
  { href: "/contact", label: { en: "Contact",  ar: "تواصل معنا" } },
  { href: "/blog",    label: { en: "Blog",     ar: "المدونة"    } },
];

const accountLinks = [
  { href: "/account/profile",       icon: User,      label: { en: "Profile",       ar: "الملف الشخصي" } },
  { href: "/account/orders",        icon: LayoutList,label: { en: "My Orders",     ar: "طلباتي"        } },
  { href: "/account/wishlist",      icon: Heart,     label: { en: "Wishlist",      ar: "المحفوظات"     } },
  { href: "/account/notifications", icon: Bell,      label: { en: "Notifications", ar: "الإشعارات"    } },
  { href: "/account/settings",      icon: Settings,  label: { en: "Settings",      ar: "الإعدادات"    } },
];

const accountMenuInteractiveState =
  "cursor-pointer outline-none ring-1 ring-inset transition-[background-color,color,box-shadow] hover:bg-[#B6885E]/14 hover:text-[#FFF0E2] hover:ring-[#D6A373]/30 hover:shadow-[0_0_18px_rgba(182,136,94,0.10)] focus-visible:bg-[#B6885E]/18 focus-visible:text-[#FFF0E2] focus-visible:ring-2 focus-visible:ring-[#D6A373]/60 focus-visible:shadow-[0_0_20px_rgba(214,163,115,0.16)]";

const accountMenuCurrentState =
  "bg-[#B6885E]/16 text-[#FFE1C7] ring-[#D6A373]/35 shadow-[0_0_16px_rgba(182,136,94,0.10)]";

function isCurrentAccountRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type CommercePanel = "wishlist" | "cart";

type AccountStatus = "signed_out" | "resolving" | "customer" | "admin" | "error";

type ResolvedAccountState = {
  status: AccountStatus;
  user: AuthUser | null;
  admin: CurrentAdmin | null;
  displayName: string;
  displayEmail: string;
  avatarText: string;
  error: string | null;
};

function cleanAccountName(name: string | null | undefined) {
  const trimmed = name?.trim() ?? "";
  if (!trimmed || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "";
  return trimmed;
}

function getAccountInitials(name: string | null | undefined, fallback = "M") {
  const parts = cleanAccountName(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return parts
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();
}

function getAccountFirstName(name: string | null | undefined, fallback: string) {
  return cleanAccountName(name).split(/\s+/)[0] || fallback;
}

function getEmailUsername(email: string | null | undefined) {
  return email?.trim().split("@")[0]?.trim() ?? "";
}

// ─── Notifications dropdown ───────────────────────────────────────────────────

function NotificationsDropdown({ onClose }: { onClose: () => void }) {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<import("@/lib/account/customer-account").CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("@/lib/account/customer-account").then(({ getCustomerNotifications }) =>
      getCustomerNotifications()
        .then(setItems)
        .catch(() => setItems([]))
        .finally(() => setLoading(false))
    );
  }, []);

  const STATUS_NOTIFICATION: Record<string, { title: { en: string; ar: string }; body: { en: string; ar: string } }> = {
    pending:   { title: { en: "Order Received",               ar: "تم استلام طلبك"       }, body: { en: "We've received your order.",           ar: "استلمنا طلبك وهو قيد المراجعة." } },
    preparing: { title: { en: "Order Being Prepared",         ar: "طلبك قيد التجهيز"     }, body: { en: "Our team is preparing your coffee.",   ar: "فريقنا يجهز قهوتك بعناية." } },
    shipped:   { title: { en: "Order On Its Way",             ar: "طلبك في الطريق"        }, body: { en: "Your order is out for delivery.",      ar: "تم تسليم طلبك لمندوب التوصيل." } },
    delivered: { title: { en: "Order Delivered",              ar: "تم توصيل طلبك"         }, body: { en: "Your order has been delivered.",       ar: "استمتع بقهوتك!" } },
    cancelled: { title: { en: "Order Cancelled",              ar: "تم إلغاء الطلب"        }, body: { en: "Your order has been cancelled.",       ar: "تم إلغاء طلبك." } },
    returned:  { title: { en: "Return Processed",             ar: "تمت معالجة الإرجاع"   }, body: { en: "Your return has been processed.",      ar: "تمت معالجة طلب إرجاعك." } },
  };

  const preview = items.slice(0, 5);

  return (
    <div
      role="region"
      aria-label={t({ en: "Notifications", ar: "الإشعارات" })}
      className="absolute end-0 top-[calc(100%+0.85rem)] z-50 w-80 overflow-hidden rounded-2xl border border-[#D6A373]/22 bg-[#100B08]/90 shadow-[0_24px_64px_rgba(0,0,0,0.60)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D6A373]/35 to-transparent" />

      {/* Header */}
      <div className="border-b border-[#B6885E]/12 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#B6885E]/70">
          {t({ en: "Notifications", ar: "الإشعارات" })}
        </p>
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-2 px-3 py-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-[#1B140F]" />
          ))}
        </div>
      ) : preview.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <Bell className="mx-auto mb-2 h-7 w-7 text-[#B6885E]/20" />
          <p className="text-sm text-[#D6B79A]/75">
            {t({ en: "No notifications yet.", ar: "لا توجد إشعارات بعد." })}
          </p>
          <p className="mt-1 text-xs text-[#B79B85]/60">
            {t({ en: "Order updates will appear here.", ar: "ستظهر هنا تحديثات طلباتك." })}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#B6885E]/08">
          {preview.map((notif) => {
            const content = STATUS_NOTIFICATION[notif.status] ?? {
              title: { en: `Order ${notif.orderCode}`, ar: `طلب ${notif.orderCode}` },
              body:  { en: notif.status, ar: notif.status },
            };
            const timeStr = formatDate(notif.changedAt, language);

            return (
              <Link
                key={notif.eventId}
                href={`/account/orders/${notif.orderCode}`}
                onClick={onClose}
                className="flex items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-[#B6885E]/08"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B6885E]/70" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#F5E6D8]">{t(content.title)}</p>
                  <p className="truncate text-xs text-[#B79B85]/80">{t(content.body)}</p>
                  <p className="mt-0.5 text-[10px] text-[#B79B85]/60">
                    <span className="font-mono text-[#B6885E]/70">{notif.orderCode}</span>
                    {" · "}{timeStr}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#B6885E]/10 px-3 py-2.5">
        <Link
          href="/account/notifications"
          onClick={onClose}
          className="flex w-full items-center justify-center rounded-xl border border-[#B6885E]/18 bg-[#B6885E]/[0.06] px-4 py-2 text-xs font-semibold text-[#D6B79A]/85 transition-all hover:border-[#D6A373]/35 hover:bg-[#B6885E]/12 hover:text-[#F5E6D8]"
        >
          {t({ en: "View all notifications", ar: "عرض كل الإشعارات" })}
        </Link>
      </div>
    </div>
  );
}

// ─── UserMenu dropdown ────────────────────────────────────────────────────────

function UserMenu({
  onClose,
  account,
  signOut,
}: {
  onClose: () => void;
  account: ResolvedAccountState;
  signOut: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.replace("/");
  };

  const isLoggedIn = account.user !== null;
  const showAdmin = account.status === "admin" && account.admin !== null;
  const isResolved = account.status === "customer" || showAdmin;

  if (account.status === "resolving") {
    return (
      <div
        role="region"
        aria-label={t({ en: "Account menu", ar: "قائمة الحساب" })}
        aria-busy="true"
        className="absolute end-0 top-[calc(100%+0.85rem)] z-50 w-64 overflow-hidden rounded-2xl border border-[#D6A373]/22 bg-[#100B08]/90 px-4 py-5 shadow-[0_24px_64px_rgba(0,0,0,0.60)] backdrop-blur-2xl"
      >
        <div className="flex items-center gap-3 text-sm text-[#D6B79A]/75">
          <Loader2 className="h-4 w-4 animate-spin text-[#D6A373]" />
          {t({ en: "Checking your account…", ar: "جارٍ التحقق من حسابك…" })}
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={t({ en: "Account menu", ar: "قائمة الحساب" })}
      className="absolute end-0 top-[calc(100%+0.85rem)] z-50 w-64 overflow-hidden rounded-2xl border border-[#D6A373]/22 bg-[#100B08]/90 shadow-[0_24px_64px_rgba(0,0,0,0.60)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D6A373]/35 to-transparent" />

      {isLoggedIn ? (
        <>
          {/* User info */}
          <div className="border-b border-[#B6885E]/12 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B6885E]/18 text-sm font-bold text-[#D6A373]">
                {account.avatarText}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#F5E6D8]">{account.displayName}</p>
                <p className="truncate text-xs text-[#B79B85]/80">{account.displayEmail}</p>
                {showAdmin && (
                  <span className="mt-1.5 inline-flex rounded-full bg-[#B6885E]/15 px-2 py-0.5 text-[10px] font-semibold text-[#D6A373]">
                    {formatAdminRole(account.admin!.role)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {isResolved ? (
            <>
              {/* Admin Dashboard — only for active admins */}
              {showAdmin && (
                <div className="border-b border-[#B6885E]/10 py-2">
                  <Link
                    href="/admin/dashboard"
                    onClick={onClose}
                    aria-current={pathname.startsWith("/admin") ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-2.5 text-sm font-medium",
                      accountMenuInteractiveState,
                      pathname.startsWith("/admin")
                        ? accountMenuCurrentState
                        : "text-[#E2B78E] ring-transparent",
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0 text-[#D6A373] transition-colors group-hover:text-[#F0C69F] group-focus-visible:text-[#F0C69F]" />
                    {t({ en: "Admin Dashboard", ar: "لوحة التحكم" })}
                  </Link>
                </div>
              )}

              <div className="py-2">
                {accountLinks.map(({ href, icon: Icon, label }) => {
                  const active = isCurrentAccountRoute(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 px-4 py-2.5 text-sm",
                        accountMenuInteractiveState,
                        active
                          ? accountMenuCurrentState
                          : "text-[#D6B79A]/90 ring-transparent",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[#C99A70] transition-colors group-hover:text-[#F0C69F] group-focus-visible:text-[#F0C69F]" />
                      {t(label)}
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="border-b border-[#B6885E]/10 px-4 py-3 text-xs leading-relaxed text-[#D6B79A]/70">
              {t({
                en: "We couldn’t verify account access. Try again after refreshing.",
                ar: "تعذر التحقق من صلاحيات الحساب. حاول مرة أخرى بعد تحديث الصفحة.",
              })}
            </p>
          )}

          {/* Sign out */}
          <div className="border-t border-[#B6885E]/10 px-4 py-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-[#D6B79A]/85 outline-none ring-1 ring-inset ring-transparent transition-[background-color,color,box-shadow] hover:bg-red-400/[0.08] hover:text-red-300 hover:ring-red-300/20 focus-visible:bg-red-400/[0.10] focus-visible:text-red-200 focus-visible:ring-2 focus-visible:ring-red-300/45"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {t({ en: "Sign out", ar: "تسجيل الخروج" })}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Guest state */}
          <div className="p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#B6885E]/70">
              {t({ en: "Your Account", ar: "حسابك" })}
            </p>
            <Link
              href="/auth/login"
              onClick={onClose}
              className="premium-button mb-2 flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold"
            >
              {t({ en: "Sign in", ar: "تسجيل الدخول" })}
            </Link>
            <Link
              href="/auth/signup"
              onClick={onClose}
              className="premium-button-outline flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold"
            >
              {t({ en: "Create account", ar: "إنشاء حساب" })}
            </Link>
          </div>
          <div className="border-t border-[#B6885E]/10 px-4 py-3">
            <p className="text-xs text-[#B79B85]/65">
              {t({ en: "Sign in to view orders, wishlist & more.", ar: "سجّل دخولك لعرض طلباتك وقائمة المحفوظات." })}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Mobile menu ─────────────────────────────────────────────────────────────

function MobileMenu({
  onClose,
  account,
  signOut,
}: {
  onClose: () => void;
  account: ResolvedAccountState;
  signOut: () => Promise<void>;
}) {
  const { t, dir } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.replace("/");
  };

  const isLoggedIn = account.user !== null;
  const isResolving = account.status === "resolving";
  const showAdmin = account.status === "admin" && account.admin !== null;
  const isResolved = account.status === "customer" || showAdmin;

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t({ en: "Menu", ar: "القائمة" })}
      className="fixed inset-0 z-[60] flex"
      dir={dir}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0B0806]/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — slides from the end edge */}
      <div className="relative ms-auto flex h-full w-[min(22rem,100vw)] flex-col overflow-y-auto bg-[#0E0906] shadow-[-4px_0_40px_rgba(0,0,0,0.60)]">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[#B6885E]/12 px-5 py-4">
          <span className="relative block h-8 w-28">
            <Image src="/brand/logo-white.svg" alt="Line Coffee" fill sizes="7rem" className="object-contain object-left" />
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t({ en: "Close menu", ar: "إغلاق القائمة" })}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#B6885E]/18 text-[#D6B79A]/70 hover:text-[#F5E6D8]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User section */}
        {isResolving ? (
          <div
            aria-busy="true"
            className="flex items-center gap-3 border-b border-[#B6885E]/10 px-5 py-4 text-sm text-[#D6B79A]/75"
          >
            <Loader2 className="h-4 w-4 animate-spin text-[#D6A373]" />
            {t({ en: "Checking your account…", ar: "جارٍ التحقق من حسابك…" })}
          </div>
        ) : isLoggedIn ? (
          <div className="border-b border-[#B6885E]/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B6885E]/15 text-sm font-bold text-[#D6A373]">
                {account.avatarText}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#F5E6D8]">{account.displayName}</p>
                <p className="text-xs text-[#B79B85]/75">{account.displayEmail}</p>
                {showAdmin && (
                  <span className="mt-1.5 inline-flex rounded-full bg-[#B6885E]/15 px-2 py-0.5 text-[10px] font-semibold text-[#D6A373]">
                    {formatAdminRole(account.admin!.role)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Nav links */}
        <div className="px-3 py-4">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-[#B6885E]/80">
            {t({ en: "Navigate", ar: "التصفح" })}
          </p>
          {navLinks.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  "flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  active ? "bg-[#B6885E]/10 text-[#D6A373]" : "text-[#D6B79A]/80 hover:text-[#F5E6D8]",
                )}
              >
                {t(link.label)}
              </Link>
            );
          })}
        </div>

        {/* Account links */}
        <div className="border-t border-[#B6885E]/10 px-3 py-4">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-[#B6885E]/80">
            {t({ en: "Account", ar: "الحساب" })}
          </p>
          {isResolving ? (
            <p className="px-4 py-3 text-xs text-[#D6B79A]/70" aria-busy="true">
              {t({ en: "Account options will appear once verification finishes.", ar: "ستظهر خيارات الحساب بعد اكتمال التحقق." })}
            </p>
          ) : isLoggedIn ? (
            <>
              {isResolved ? (
                <>
                  {showAdmin && (
                    <Link
                      href="/admin/dashboard"
                      onClick={onClose}
                      aria-current={pathname.startsWith("/admin") ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold",
                        accountMenuInteractiveState,
                        pathname.startsWith("/admin")
                          ? accountMenuCurrentState
                          : "text-[#E2B78E] ring-transparent",
                      )}
                    >
                      <LayoutDashboard className="h-4 w-4 shrink-0 text-[#D6A373] transition-colors group-hover:text-[#F0C69F] group-focus-visible:text-[#F0C69F]" />
                      {t({ en: "Admin Dashboard", ar: "لوحة التحكم" })}
                    </Link>
                  )}
                  {accountLinks.map(({ href, icon: Icon, label }) => {
                    const active = isCurrentAccountRoute(pathname, href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm",
                          accountMenuInteractiveState,
                          active
                            ? accountMenuCurrentState
                            : "text-[#D6B79A]/90 ring-transparent",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[#C99A70] transition-colors group-hover:text-[#F0C69F] group-focus-visible:text-[#F0C69F]" />
                        {t(label)}
                      </Link>
                    );
                  })}
                </>
              ) : (
                <p className="px-4 py-3 text-xs leading-relaxed text-[#D6B79A]/70">
                  {t({
                    en: "We couldn’t verify account access. Refresh and try again.",
                    ar: "تعذر التحقق من صلاحيات الحساب. حدّث الصفحة وحاول مرة أخرى.",
                  })}
                </p>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-1 flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#D6B79A]/85 outline-none ring-1 ring-inset ring-transparent transition-[background-color,color,box-shadow] hover:bg-red-400/[0.08] hover:text-red-300 hover:ring-red-300/20 focus-visible:bg-red-400/[0.10] focus-visible:text-red-200 focus-visible:ring-2 focus-visible:ring-red-300/45"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {t({ en: "Sign out", ar: "تسجيل الخروج" })}
              </button>
            </>
          ) : (
            <div className="space-y-2 px-2">
              <Link
                href="/auth/login"
                onClick={onClose}
                className="premium-button flex w-full items-center justify-center rounded-xl py-2.5 text-sm"
              >
                {t({ en: "Sign in", ar: "تسجيل الدخول" })}
              </Link>
              <Link
                href="/auth/signup"
                onClick={onClose}
                className="premium-button-outline flex w-full items-center justify-center rounded-xl py-2.5 text-sm"
              >
                {t({ en: "Create account", ar: "إنشاء حساب" })}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Commerce Popover ─────────────────────────────────────────────────────────

function CommercePopover({
  panel,
  onClose,
}: {
  panel: CommercePanel;
  onClose: () => void;
}) {
  const { t, language } = useLanguage();
  const { items, total, removeItem, updateQty, clearCart } = useCart();
  const { ids: wishlistIds, remove: removeWish } = useWishlist();
  const isWishlist = panel === "wishlist";
  const hasCartItems = !isWishlist && items.length > 0;
  const wishlistKey = wishlistIds.join("|");
  const [wishlistProducts, setWishlistProducts] = useState<PublicCatalogProduct[]>([]);
  const [wishlistState, setWishlistState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const visibleWishlistProducts = wishlistProducts.filter((product) => wishlistIds.includes(product.slug));

  useEffect(() => {
    let isMounted = true;

    if (!isWishlist || wishlistIds.length === 0) return;

    getPublicProductsBySlugs(wishlistIds)
      .then((products) => {
        if (!isMounted) return;
        setWishlistProducts(products);
        setWishlistState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setWishlistProducts([]);
        setWishlistState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [isWishlist, wishlistIds, wishlistKey]);

  return (
    <div
      role="region"
      aria-label={t(isWishlist ? { en: "Wishlist", ar: "المفضلة" } : { en: "Cart", ar: "السلة" })}
      className="absolute end-0 top-[calc(100%+2rem)] z-50 w-[min(30rem,calc(100vw-1rem))] overflow-hidden rounded-[1.65rem] border border-[#F5CFAE]/20 bg-[#100B08]/72 text-start shadow-[0_34px_96px_rgba(0,0,0,0.64),0_0_52px_rgba(182,136,94,0.16),inset_0_1px_0_rgba(245,230,216,0.08)] backdrop-blur-[30px]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(214,163,115,0.18),transparent_36%),linear-gradient(145deg,rgba(245,230,216,0.08),transparent_42%,rgba(182,136,94,0.07))]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#FFDCC2]/45 to-transparent" />

      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D6A373]/28 bg-[#D6A373]/10 text-[#D6A373] shadow-[inset_0_1px_0_rgba(245,230,216,0.08),0_16px_32px_rgba(0,0,0,0.28)]">
              {isWishlist ? <Heart className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase leading-none tracking-[0.2em] text-[#D6A373]">
                {t(isWishlist ? { en: "Wishlist", ar: "المفضلة" } : { en: "Cart", ar: "السلة" })}
              </p>
              <h3 className="mt-2 font-serif text-2xl font-bold leading-tight text-[#F5E6D8]">
                {t(isWishlist ? { en: "Saved coffee", ar: "القهوة المحفوظة" } : { en: "Your bag", ar: "حقيبتك" })}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#B6885E]/22 bg-[#0B0806]/46 text-[#D6B79A] transition-all hover:border-[#D6A373]/40 hover:bg-[#B6885E]/12 hover:text-white"
            aria-label={t({ en: "Close", ar: "إغلاق" })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── WISHLIST panel ── */}
        {isWishlist && (
          wishlistIds.length === 0 ? (
            <div className="py-8 text-center">
              <Heart className="mx-auto mb-3 h-10 w-10 text-[#B6885E]/20" />
              <p className="text-sm text-[#D6B79A]/75">
                {t({ en: "No saved items yet.", ar: "لا توجد منتجات محفوظة بعد." })}
              </p>
              <Link
                href="/products"
                onClick={onClose}
                className="mt-4 inline-block text-sm font-medium text-[#B6885E] hover:text-[#D6A373]"
              >
                {t({ en: "Browse products →", ar: "← تصفح المنتجات" })}
              </Link>
            </div>
          ) : wishlistState === "idle" || wishlistState === "loading" ? (
            <div className="py-8 text-center">
              <Heart className="mx-auto mb-3 h-10 w-10 text-[#B6885E]/20" />
              <p className="text-sm text-[#D6B79A]/75">
                {t({ en: "Loading saved products.", ar: "جاري تحميل المنتجات المحفوظة." })}
              </p>
            </div>
          ) : wishlistState === "error" ? (
            <div className="py-8 text-center">
              <Heart className="mx-auto mb-3 h-10 w-10 text-[#B6885E]/20" />
              <p className="text-sm text-[#D6B79A]/75">
                {t({ en: "Saved products could not be loaded.", ar: "تعذر تحميل المنتجات المحفوظة." })}
              </p>
            </div>
          ) : visibleWishlistProducts.length === 0 ? (
            <div className="py-8 text-center">
              <Heart className="mx-auto mb-3 h-10 w-10 text-[#B6885E]/20" />
              <p className="text-sm text-[#D6B79A]/75">
                {t({ en: "No saved items yet.", ar: "لا توجد منتجات محفوظة بعد." })}
              </p>
              <Link
                href="/products"
                onClick={onClose}
                className="mt-4 inline-block text-sm font-medium text-[#B6885E] hover:text-[#D6A373]"
              >
                {t({ en: "Browse products →", ar: "← تصفح المنتجات" })}
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="max-h-[18rem] space-y-2 overflow-y-auto">
                {visibleWishlistProducts.map((product) => {
                  const firstSize = product.sizes[0];
                  return (
                    <div
                      key={product.slug}
                      className="flex items-center gap-3 rounded-2xl border border-[#B6885E]/14 bg-[#120D09]/52 p-3"
                    >
                      {/* Image */}
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#1B140F]">
                        {product.image && (
                          <Image src={product.image} alt={product.name.en} fill sizes="3rem" className="object-cover" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/products/${product.slug}`}
                          onClick={onClose}
                          className="block truncate text-sm font-semibold text-[#F5E6D8]/90 hover:text-[#D6A373]"
                        >
                          {language === "ar" ? product.name.ar : product.name.en}
                        </Link>
                        {firstSize && (
                          <p className="text-xs text-[#D6A373]/70">
                            {firstSize.salePrice} {language === "ar" ? "ج.م" : "EGP"} / {firstSize.label}
                          </p>
                        )}
                      </div>
                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeWish(product.slug)}
                        aria-label={t({ en: "Remove", ar: "إزالة" })}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#B79B85]/60 transition-colors hover:text-red-400/70"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <Link
                href="/account/wishlist"
                onClick={onClose}
                className="block pt-1 text-center text-xs font-medium text-[#B6885E]/70 transition-colors hover:text-[#D6A373]"
              >
                {t({ en: "View full wishlist →", ar: "← عرض كل المحفوظات" })}
              </Link>
            </div>
          )
        )}

        {/* ── CART panel with items ── */}
        {hasCartItems && (
          <div className="space-y-3">
            <div className="max-h-[18rem] space-y-2 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-2xl border border-[#B6885E]/14 bg-[#120D09]/52 p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D6A373]/18 bg-[#D6A373]/8 text-[#D6A373]">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#F5E6D8]/88">{t(item.name)}</p>
                    <p className="truncate text-[11px] text-[#D6B79A]/75">{t(item.detail)}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, -1)}
                          aria-label={t({ en: "Decrease", ar: "تقليل" })}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-[#B6885E]/20 bg-[#0B0806]/50 text-[#D6B79A] hover:border-[#D6A373]/40"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="arabic-number w-6 text-center text-sm font-semibold text-[#F5E6D8]">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, 1)}
                          aria-label={t({ en: "Increase", ar: "زيادة" })}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-[#B6885E]/20 bg-[#0B0806]/50 text-[#D6B79A] hover:border-[#D6A373]/40"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="arabic-number text-sm font-bold text-[#D6A373]">
                        {item.pricePerUnit * item.qty}{" "}
                        <span className="numeric-symbol text-[11px]">{t({ en: "EGP", ar: "ج.م" })}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={t({ en: "Remove item", ar: "إزالة المنتج" })}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#D6B79A]/35 transition-colors hover:text-red-400/60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Total + CTAs */}
            <div className="rounded-2xl border border-[#B6885E]/16 bg-[#0B0806]/46 p-3.5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-[#D6B79A]/72">{t({ en: "Total", ar: "الإجمالي" })}</span>
                <span className="arabic-number text-lg font-bold text-[#F5E6D8]">
                  {total} <span className="numeric-symbol text-sm">{t({ en: "EGP", ar: "ج.م" })}</span>
                </span>
              </div>
              <Link
                href="/checkout"
                onClick={onClose}
                className="premium-button mb-2 flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold"
              >
                {t({ en: "Proceed to checkout", ar: "إتمام الشراء" })}
              </Link>
              <div className="flex items-center justify-between gap-3">
                <Link
                  href="/cart"
                  onClick={onClose}
                  className="text-xs text-[#B6885E]/70 transition-colors hover:text-[#D6A373]"
                >
                  {t({ en: "View full cart", ar: "عرض السلة" })}
                </Link>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-[#B79B85]/60 transition-colors hover:text-red-400/60"
                >
                  {t({ en: "Clear cart", ar: "إفراغ السلة" })}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty cart */}
        {!isWishlist && !hasCartItems && (
          <div className="py-8 text-center">
            <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-[#B6885E]/20" />
            <p className="text-sm text-[#D6B79A]/75">
              {t({ en: "Your cart is empty.", ar: "سلتك فارغة." })}
            </p>
            <Link
              href="/products"
              onClick={onClose}
              className="mt-4 inline-block text-sm font-medium text-[#B6885E] hover:text-[#D6A373]"
            >
              {t({ en: "Browse products →", ar: "← تصفح المنتجات" })}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Header ──────────────────────────────────────────────────────────────

export function PublicHeader() {
  const { language, dir, toggleLanguage, t } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();
  const { count, isOpen, closeCart, openCart } = useCart();
  const { count: wishCount } = useWishlist();
  const { user, isLoggedIn, isLoading: isAuthLoading, signOut } = useAuth();
  const {
    status: adminStatus,
    admin,
    error: adminError,
    resolvedUserId: adminResolvedUserId,
  } = useCurrentAdmin();
  const pathname = usePathname();

  const [isScrolled,          setIsScrolled]          = useState(false);
  const [openCommercePanel,   setOpenCommercePanel]   = useState<CommercePanel | null>(null);
  const [isUserMenuOpen,      setIsUserMenuOpen]      = useState(false);
  const [isNotifOpen,         setIsNotifOpen]         = useState(false);
  const [isMobileMenuOpen,    setIsMobileMenuOpen]    = useState(false);
  const [scrollProgress,      setScrollProgress]      = useState(0);
  const [announcementIdx,     setAnnouncementIdx]     = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [storefront,           setStorefront]           = useState<StorefrontSettings | null>(null);
  const [announcements,        setAnnouncements]        = useState<PublicAnnouncement[]>(DEFAULT_ANNOUNCEMENTS);
  const [accountProfile,       setAccountProfile]       = useState<{
    userId: string;
    status: "loading" | "resolved";
    name: string | null;
  } | null>(null);

  const authUserId = user?.id;
  const closedNotice =
    storefront && !storefront.storeOpen
      ? storefront.closedNotice.trim() ||
        t({ en: "The store is currently closed.", ar: "المتجر مغلق حالياً." })
      : null;
  const currentAnnouncement = announcements[announcementIdx] ?? announcements[0];
  const accountProfileName =
    accountProfile && accountProfile.userId === authUserId
      ? accountProfile.name
      : null;
  const isAccountProfileResolved =
    !user ||
    (accountProfile?.userId === user.id && accountProfile.status === "resolved");
  const genericAccountName = t({ en: "Account", ar: "حسابي" });
  const authDisplayName = cleanAccountName(user?.name);
  const customerDisplayName =
    cleanAccountName(accountProfileName) ||
    authDisplayName ||
    getEmailUsername(user?.email) ||
    genericAccountName;

  let accountState: ResolvedAccountState;
  if (isAuthLoading) {
    accountState = {
      status: "resolving",
      user,
      admin: null,
      displayName: "",
      displayEmail: user?.email ?? "",
      avatarText: "L",
      error: null,
    };
  } else if (!user) {
    accountState = {
      status: "signed_out",
      user: null,
      admin: null,
      displayName: genericAccountName,
      displayEmail: "",
      avatarText: "L",
      error: null,
    };
  } else if (
    !isAccountProfileResolved ||
    adminStatus === "loading" ||
    adminStatus === "signed_out"
  ) {
    accountState = {
      status: "resolving",
      user,
      admin: null,
      displayName: customerDisplayName,
      displayEmail: user.email,
      avatarText: getAccountInitials(customerDisplayName, "L"),
      error: null,
    };
  } else if (
    adminStatus === "authorized" &&
    admin &&
    adminResolvedUserId === user.id &&
    admin.authUserId === user.id
  ) {
    const authoritativeAdminName =
      cleanAccountName(admin.displayName) || cleanAccountName(accountProfileName);
    const adminDisplayName =
      authoritativeAdminName ||
      authDisplayName ||
      getEmailUsername(admin.email || user.email) ||
      genericAccountName;
    accountState = {
      status: "admin",
      user,
      admin,
      displayName: adminDisplayName,
      displayEmail: admin.email || user.email,
      avatarText: authoritativeAdminName
        ? getAdminInitials(admin)
        : getAccountInitials(adminDisplayName, "L"),
      error: null,
    };
  } else if (adminStatus === "forbidden" && adminResolvedUserId === user.id) {
    accountState = {
      status: "customer",
      user,
      admin: null,
      displayName: customerDisplayName,
      displayEmail: user.email,
      avatarText: getAccountInitials(customerDisplayName, "L"),
      error: null,
    };
  } else if (adminStatus === "error") {
    accountState = {
      status: "error",
      user,
      admin: null,
      displayName: customerDisplayName,
      displayEmail: user.email,
      avatarText: getAccountInitials(customerDisplayName, "L"),
      error: adminError,
    };
  } else {
    // A result belonging to a previous auth owner is never role-safe.
    accountState = {
      status: "resolving",
      user,
      admin: null,
      displayName: customerDisplayName,
      displayEmail: user.email,
      avatarText: getAccountInitials(customerDisplayName, "L"),
      error: null,
    };
  }

  const headerAccountName = accountState.displayName;
  const headerAccountLabel = getAccountFirstName(
    headerAccountName,
    genericAccountName,
  );
  const headerAvatarText = accountState.avatarText;

  const closeAll = () => {
    setOpenCommercePanel(null);
    setIsUserMenuOpen(false);
    setIsNotifOpen(false);
    closeCart();
  };

  // Click-outside-to-close for the wishlist/cart/notifications/user dropdowns.
  // The ref covers every trigger button AND every popover (all rendered as
  // descendants of the same "right actions" container below), so clicking a
  // trigger button is always "inside" — the button's own onClick toggle logic
  // runs normally with no close/reopen race against this listener.
  const actionsRef = useRef<HTMLDivElement>(null);
  const anyPanelOpen = Boolean(openCommercePanel) || isUserMenuOpen || isNotifOpen;
  useEffect(() => {
    if (!anyPanelOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) closeAll();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyPanelOpen]);

  // Sync external cart open state
  useEffect(() => {
    if (isOpen) setTimeout(() => setOpenCommercePanel("cart"), 0);
    else if (openCommercePanel === "cart") setTimeout(() => setOpenCommercePanel(null), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(scrollableHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight)) : 0);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Announcement cycle — a nonessential motion effect; reduced-motion users
  // simply see the first active announcement without auto-rotation.
  useEffect(() => {
    if (reducedMotion || (storefront && !storefront.storeOpen)) {
      return;
    }

    let fadeTimer: ReturnType<typeof setTimeout>;
    const cycle = setInterval(() => {
      setAnnouncementVisible(false);
      fadeTimer = setTimeout(() => {
        setAnnouncementIdx((i) => (i + 1) % announcements.length);
        setAnnouncementVisible(true);
      }, 350);
    }, 3800);
    return () => { clearInterval(cycle); clearTimeout(fadeTimer); };
  }, [reducedMotion, storefront, announcements.length]);

  useEffect(() => {
    let active = true;
    getPublicSettings()
      .then((settings) => {
        if (active) {
          setStorefront(settings.storefront);
          if (!settings.storefront.storeOpen) setAnnouncementVisible(true);
        }
      })
      .catch(() => {
        if (active) setStorefront(null);
      });
    return () => {
      active = false;
    };
  }, []);

  // Load the real active announcements (falls back to the built-in launch
  // messages when the table is empty or unreachable).
  useEffect(() => {
    let active = true;
    getPublicAnnouncements()
      .then((list) => {
        if (active && list.length > 0) {
          setAnnouncements(list);
          setAnnouncementIdx(0);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!isLoggedIn || !authUserId) {
      return () => {
        active = false;
      };
    }
    const userId = authUserId;

    import("@/lib/account/customer-account")
      .then(({ getCustomerProfile }) => getCustomerProfile())
      .then((profile) => {
        if (!active) return;
        const profileName = cleanAccountName(profile?.name);
        setAccountProfile({
          userId,
          status: "resolved",
          name: profileName || null,
        });
      })
      .catch(() => {
        if (active) {
          setAccountProfile({ userId, status: "resolved", name: null });
        }
      });

    return () => {
      active = false;
    };
  }, [isLoggedIn, authUserId]);

  // ESC to close everything + prevent body scroll when mobile menu open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAll();
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  // Return focus to the hamburger button when the mobile menu closes (Escape,
  // backdrop click, or a nav link inside it) — it moves focus into the panel
  // on open via MobileMenu's own effect, so this completes the round trip.
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const wasMobileMenuOpen = useRef(false);
  useEffect(() => {
    if (wasMobileMenuOpen.current && !isMobileMenuOpen) hamburgerRef.current?.focus();
    wasMobileMenuOpen.current = isMobileMenuOpen;
  }, [isMobileMenuOpen]);

  const handleCartToggle = () => {
    setIsUserMenuOpen(false);
    setIsNotifOpen(false);
    if (openCommercePanel === "cart") {
      setOpenCommercePanel(null);
      closeCart();
    } else {
      setOpenCommercePanel("cart");
      openCart();
    }
  };

  const handleWishlistToggle = () => {
    setIsUserMenuOpen(false);
    setIsNotifOpen(false);
    closeCart();
    setOpenCommercePanel((p) => (p === "wishlist" ? null : "wishlist"));
  };

  const handleUserToggle = () => {
    setOpenCommercePanel(null);
    setIsNotifOpen(false);
    closeCart();
    setIsUserMenuOpen((v) => !v);
  };

  const handleNotifToggle = () => {
    setOpenCommercePanel(null);
    setIsUserMenuOpen(false);
    closeCart();
    setIsNotifOpen((v) => !v);
  };

  return (
    <>
      <header
        className={cn(
          "line-public-header fixed inset-x-0 top-0 z-50 isolate overflow-visible text-white transition-all duration-500",
          isScrolled ? "nav-glass" : "",
        )}
        dir={dir}
      >
        {/* Announcement bar */}
        <div className="relative z-20 min-h-[38px] overflow-hidden border-b border-[#B6885E]/18 bg-[#120D09]/58 px-10 py-2.5 text-center text-sm text-[#F5E6D8] shadow-[0_8px_26px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 animate-line-sweep bg-gradient-to-r from-transparent via-[#FFDCC2]/12 to-transparent" />
          <div
            aria-live="polite"
            aria-atomic="true"
            className={cn(
              "relative z-10 flex items-center justify-center gap-3 transition-opacity duration-300",
              announcementVisible ? "opacity-100" : "opacity-0",
            )}
          >
            <span>{closedNotice ?? (currentAnnouncement ? t(currentAnnouncement.text) : "")}</span>
            {!closedNotice && currentAnnouncement && (
              <>
                <span className="text-[#B6885E]" aria-hidden="true">&bull;</span>
                <Link
                  href={currentAnnouncement.cta.href}
                  className="rounded-full border border-[#B6885E]/35 px-2.5 py-0.5 text-xs text-[#FFDCC2] transition-colors hover:border-[#FFDCC2]/50 hover:text-white"
                >
                  {t(currentAnnouncement.cta.label)}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Glass overlays */}
        {isScrolled ? (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#B6885E]/[0.04] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#B6885E]/30 to-transparent" />
          </>
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/18 via-black/5 to-transparent" />
        )}

        <div className="relative z-10 mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
          <div className="relative flex h-14 items-center justify-between sm:h-16 md:h-20">
            {!isScrolled && (
              <div className="absolute bottom-0 left-1/2 h-px w-[60%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#B6885E]/30 to-transparent" />
            )}

            {/* Logo */}
            <Link href="/" className="flex min-w-0 items-center">
              <span className="sr-only">Line Coffee</span>
              <span className="relative block h-10 w-28 sm:h-12 sm:w-36 md:h-16 md:w-[12rem]">
                <Image
                  src="/brand/logo-white.svg"
                  alt="Line Coffee"
                  fill
                  priority
                  sizes="(min-width: 768px) 12rem, (min-width: 640px) 9rem, 7rem"
                  className="object-contain object-center"
                />
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
              {navLinks.map((link) => {
                const isActive = link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "nav-link group/nav relative px-1 py-2 text-[15px] font-medium tracking-wide",
                      isActive ? "nav-link-active text-[#FFF0E4]" : "text-[#E3D2B8]/92 hover:text-[#F5E6D8]",
                    )}
                  >
                    <span className="nav-sweep">{t(link.label)}</span>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 left-1/2 h-px -translate-x-1/2 bg-gradient-to-r from-transparent via-[#D6A373] to-transparent transition-all duration-300",
                        isActive ? "w-full shadow-[0_0_14px_rgba(214,163,115,0.45)]" : "w-0 group-hover/nav:w-full",
                      )}
                    />
                  </Link>
                );
              })}
            </nav>

            {/* Right actions */}
            <div ref={actionsRef} className="relative flex shrink-0 items-center gap-0.5 sm:gap-1.5">
              {/* Language toggle */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="line-language-toggle inline-flex h-9 items-center gap-1.5 rounded-full border border-[#B6885E]/18 bg-[#B6885E]/[0.06] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#D6B79A]/85 transition-all hover:border-[#D6A373]/35 hover:bg-[#B6885E]/12 hover:text-[#F5E6D8]"
                aria-label={t({ en: "Switch language", ar: "تغيير اللغة" })}
              >
                <Globe className="h-3.5 w-3.5" />
                {language === "en" ? "AR" : "EN"}
              </button>

              {/* Wishlist */}
              <button
                type="button"
                onClick={handleWishlistToggle}
                className={cn("header-icon-button relative hidden md:inline-flex", openCommercePanel === "wishlist" && "bg-[#B6885E]/12 text-[#F5E6D8]")}
                aria-label={t({ en: "Wishlist", ar: "المفضلة" })}
                aria-expanded={openCommercePanel === "wishlist" ? "true" : "false"}
              >
                <Heart />
                {wishCount > 0 && (
                  <span className="arabic-number absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D6A373] px-1 text-[9px] font-bold leading-none text-[#120D09]">
                    {wishCount}
                  </span>
                )}
              </button>

              {/* Cart */}
              <button
                type="button"
                onClick={handleCartToggle}
                className={cn("header-icon-button relative", openCommercePanel === "cart" && "bg-[#B6885E]/12 text-[#F5E6D8]")}
                aria-label={t({ en: "Cart", ar: "السلة" })}
                aria-expanded={openCommercePanel === "cart" ? "true" : "false"}
              >
                <ShoppingBag />
                {count > 0 && (
                  <span className="arabic-number absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D6A373] px-1 text-[9px] font-bold leading-none text-[#120D09]">
                    {count}
                  </span>
                )}
              </button>

              {/* Notifications bell — logged-in only, desktop only */}
              {isLoggedIn && (
                <div className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={handleNotifToggle}
                    className={cn("header-icon-button", isNotifOpen && "bg-[#B6885E]/12 text-[#F5E6D8]")}
                    aria-label={t({ en: "Notifications", ar: "الإشعارات" })}
                    aria-expanded={isNotifOpen ? "true" : "false"}
                  >
                    <Bell />
                  </button>
                  {isNotifOpen && user && (
                    <NotificationsDropdown
                      key={user.id}
                      onClose={() => setIsNotifOpen(false)}
                    />
                  )}
                </div>
              )}

              {/* User menu button */}
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={handleUserToggle}
                  className={cn(
                    "header-icon-button",
                    isLoggedIn &&
                      "!h-9 !w-auto max-w-[10.5rem] gap-2 overflow-hidden border border-[#D6A373]/24 bg-[#B6885E]/10 px-2 pe-3 text-[#F5E6D8] shadow-[0_0_22px_rgba(182,136,94,0.10)]",
                    isUserMenuOpen && "bg-[#B6885E]/12 text-[#F5E6D8]",
                  )}
                  aria-label={t({ en: "Account", ar: "الحساب" })}
                  aria-expanded={isUserMenuOpen ? "true" : "false"}
                  aria-busy={isLoggedIn && accountState.status === "resolving" ? "true" : undefined}
                >
                  {isLoggedIn ? (
                    accountState.status === "resolving" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#D6A373]" />
                    ) : (
                      <>
                      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D6A373]/35 bg-[#D6A373]/18 text-[10px] font-bold leading-none text-[#FFE3CA]">
                        {headerAvatarText}
                        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-[#120D09] bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]" />
                      </span>
                      <span className="max-w-[6.5rem] truncate text-xs font-semibold normal-case tracking-normal text-[#F5E6D8]">
                        {headerAccountLabel}
                      </span>
                      </>
                    )
                  ) : (
                    <User />
                  )}
                </button>
                {isUserMenuOpen && (
                  <UserMenu
                    account={accountState}
                    signOut={signOut}
                    onClose={() => setIsUserMenuOpen(false)}
                  />
                )}
              </div>

              {/* Commerce popovers */}
              {openCommercePanel && (
                <CommercePopover
                  panel={openCommercePanel}
                  onClose={() => { setOpenCommercePanel(null); closeCart(); }}
                />
              )}

              {/* Mobile hamburger — wrapper ensures display:none on md+ regardless of header-icon-button specificity */}
              <div className="md:hidden">
                <button
                  ref={hamburgerRef}
                  type="button"
                  onClick={() => { closeAll(); setIsMobileMenuOpen((v) => !v); }}
                  className="header-icon-button"
                  aria-label={t({ en: "Open menu", ar: "فتح القائمة" })}
                  aria-expanded={isMobileMenuOpen ? "true" : "false"}
                >
                  {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll progress bar */}
        <div
          className={cn(
            "scroll-progress-bar pointer-events-none absolute inset-x-0 top-[42px] z-50 h-[2px] bg-gradient-to-r from-transparent via-[#D6A373] to-transparent shadow-[0_0_14px_rgba(214,163,115,0.82)]",
            dir === "rtl" ? "origin-right" : "origin-left",
          )}
          style={{ ["--sp" as string]: scrollProgress }}
        />
      </header>

      {/* Mobile menu — rendered outside header to cover full viewport */}
      {isMobileMenuOpen && (
        <MobileMenu
          account={accountState}
          signOut={signOut}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
