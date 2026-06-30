"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Globe,
  Heart,
  LayoutDashboard,
  LayoutList,
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
import { useAuth } from "@/lib/hooks/useAuth";
import { useCurrentAdmin } from "@/lib/hooks/useCurrentAdmin";
import {
  formatAdminRole,
  getAdminDisplayName,
  getAdminInitials,
} from "@/lib/auth/admin";
import {
  getPublicProductsBySlugs,
  type PublicCatalogProduct,
} from "@/lib/catalog/public-catalog";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";

const announcements = [
  { text: { en: "Free delivery on selected coffee rituals", ar: "توصيل مجاني على طقوس قهوة مختارة" }, cta: true },
  { text: { en: "Freshly roasted every 72 hours — taste the difference", ar: "تحميص طازج كل ٧٢ ساعة — ذوق الفرق" }, cta: false },
  { text: { en: "100% Arabica from 15+ curated origins", ar: "أرابيكا ١٠٠٪ من أكثر من ١٥ مصدراً مختاراً" }, cta: false },
];

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

type CommercePanel = "wishlist" | "cart";

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
    <div className="absolute end-0 top-[calc(100%+0.85rem)] z-50 w-80 overflow-hidden rounded-2xl border border-[#D6A373]/22 bg-[#100B08]/90 shadow-[0_24px_64px_rgba(0,0,0,0.60)] backdrop-blur-2xl">
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
          <p className="text-sm text-[#D6B79A]/55">
            {t({ en: "No notifications yet.", ar: "لا توجد إشعارات بعد." })}
          </p>
          <p className="mt-1 text-xs text-[#B79B85]/40">
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
                  <p className="truncate text-xs text-[#B79B85]/60">{t(content.body)}</p>
                  <p className="mt-0.5 text-[10px] text-[#B79B85]/40">
                    <span className="font-mono text-[#B6885E]/50">{notif.orderCode}</span>
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

function UserMenu({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { user, isLoggedIn, signOut } = useAuth();
  const { isAdmin, admin } = useCurrentAdmin();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.replace("/");
  };

  // When the signed-in user is an active admin, surface their real admin_users
  // identity (display name, email, role) instead of the bare auth email.
  const showAdmin = isAdmin && admin !== null;
  const displayName = showAdmin ? getAdminDisplayName(admin) : user?.name;
  const displayEmail = showAdmin ? admin.email : user?.email;
  const avatarText = showAdmin
    ? getAdminInitials(admin)
    : (user?.name?.[0]?.toUpperCase() ?? "M");

  return (
    <div className="absolute end-0 top-[calc(100%+0.85rem)] z-50 w-64 overflow-hidden rounded-2xl border border-[#D6A373]/22 bg-[#100B08]/90 shadow-[0_24px_64px_rgba(0,0,0,0.60)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D6A373]/35 to-transparent" />

      {isLoggedIn ? (
        <>
          {/* User info */}
          <div className="border-b border-[#B6885E]/12 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B6885E]/18 text-sm font-bold text-[#D6A373]">
                {avatarText}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#F5E6D8]">{displayName}</p>
                <p className="truncate text-xs text-[#B79B85]/60">{displayEmail}</p>
                {showAdmin && (
                  <span className="mt-1.5 inline-flex rounded-full bg-[#B6885E]/15 px-2 py-0.5 text-[10px] font-semibold text-[#D6A373]">
                    {formatAdminRole(admin.role)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Admin Dashboard — only for active admins */}
          {showAdmin && (
            <div className="border-b border-[#B6885E]/10 py-2">
              <Link
                href="/admin/dashboard"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#D6A373] transition-colors hover:bg-[#B6885E]/10"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {t({ en: "Admin Dashboard", ar: "لوحة التحكم" })}
              </Link>
            </div>
          )}

          {/* Account links */}
          <div className="py-2">
            {accountLinks.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#B79B85]/75 transition-colors hover:bg-[#B6885E]/08 hover:text-[#D6A373]"
              >
                <Icon className="h-4 w-4 shrink-0 text-[#B6885E]" />
                {t(label)}
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <div className="border-t border-[#B6885E]/10 px-4 py-3">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 text-sm text-[#B79B85]/55 transition-colors hover:text-red-400/80"
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
            <p className="text-xs text-[#B79B85]/45">
              {t({ en: "Sign in to view orders, wishlist & more.", ar: "سجّل دخولك لعرض طلباتك وقائمة المحفوظات." })}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Mobile menu ─────────────────────────────────────────────────────────────

function MobileMenu({ onClose }: { onClose: () => void }) {
  const { t, dir } = useLanguage();
  const { isLoggedIn, user, signOut } = useAuth();
  const { isAdmin, admin } = useCurrentAdmin();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.replace("/");
  };

  const showAdmin = isAdmin && admin !== null;
  const displayName = showAdmin ? getAdminDisplayName(admin) : user?.name;
  const displayEmail = showAdmin ? admin.email : user?.email;
  const avatarText = showAdmin
    ? getAdminInitials(admin)
    : (user?.name?.[0]?.toUpperCase() ?? "M");

  return (
    <div className="fixed inset-0 z-[60] flex" dir={dir}>
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
            type="button"
            onClick={onClose}
            aria-label={t({ en: "Close menu", ar: "إغلاق القائمة" })}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#B6885E]/18 text-[#D6B79A]/70 hover:text-[#F5E6D8]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User section */}
        {isLoggedIn ? (
          <div className="border-b border-[#B6885E]/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B6885E]/15 text-sm font-bold text-[#D6A373]">
                {avatarText}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#F5E6D8]">{displayName}</p>
                <p className="text-xs text-[#B79B85]/55">{displayEmail}</p>
                {showAdmin && (
                  <span className="mt-1.5 inline-flex rounded-full bg-[#B6885E]/15 px-2 py-0.5 text-[10px] font-semibold text-[#D6A373]">
                    {formatAdminRole(admin.role)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Nav links */}
        <div className="px-3 py-4">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-[#B6885E]/60">
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
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-[#B6885E]/60">
            {t({ en: "Account", ar: "الحساب" })}
          </p>
          {isLoggedIn ? (
            <>
              {showAdmin && (
                <Link
                  href="/admin/dashboard"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#D6A373] transition-colors hover:bg-[#B6885E]/10"
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  {t({ en: "Admin Dashboard", ar: "لوحة التحكم" })}
                </Link>
              )}
              {accountLinks.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#D6B79A]/80 transition-colors hover:text-[#F5E6D8]"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#B6885E]" />
                  {t(label)}
                </Link>
              ))}
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#B79B85]/50 transition-colors hover:text-red-400/70"
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
    <div className="absolute end-0 top-[calc(100%+2rem)] z-50 w-[min(30rem,calc(100vw-1rem))] overflow-hidden rounded-[1.65rem] border border-[#F5CFAE]/20 bg-[#100B08]/72 text-start shadow-[0_34px_96px_rgba(0,0,0,0.64),0_0_52px_rgba(182,136,94,0.16),inset_0_1px_0_rgba(245,230,216,0.08)] backdrop-blur-[30px]">
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
              <p className="text-sm text-[#D6B79A]/55">
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
              <p className="text-sm text-[#D6B79A]/55">
                {t({ en: "Loading saved products.", ar: "جاري تحميل المنتجات المحفوظة." })}
              </p>
            </div>
          ) : wishlistState === "error" ? (
            <div className="py-8 text-center">
              <Heart className="mx-auto mb-3 h-10 w-10 text-[#B6885E]/20" />
              <p className="text-sm text-[#D6B79A]/55">
                {t({ en: "Saved products could not be loaded.", ar: "تعذر تحميل المنتجات المحفوظة." })}
              </p>
            </div>
          ) : visibleWishlistProducts.length === 0 ? (
            <div className="py-8 text-center">
              <Heart className="mx-auto mb-3 h-10 w-10 text-[#B6885E]/20" />
              <p className="text-sm text-[#D6B79A]/55">
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
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#B79B85]/40 transition-colors hover:text-red-400/70"
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
                    <p className="truncate text-[11px] text-[#D6B79A]/55">{t(item.detail)}</p>
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
                  className="text-xs text-[#B79B85]/40 transition-colors hover:text-red-400/60"
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
            <p className="text-sm text-[#D6B79A]/55">
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
  const { count, isOpen, closeCart, openCart } = useCart();
  const { count: wishCount } = useWishlist();
  const { user, isLoggedIn } = useAuth();
  const pathname = usePathname();

  const [isScrolled,          setIsScrolled]          = useState(false);
  const [openCommercePanel,   setOpenCommercePanel]   = useState<CommercePanel | null>(null);
  const [isUserMenuOpen,      setIsUserMenuOpen]      = useState(false);
  const [isNotifOpen,         setIsNotifOpen]         = useState(false);
  const [isMobileMenuOpen,    setIsMobileMenuOpen]    = useState(false);
  const [scrollProgress,      setScrollProgress]      = useState(0);
  const [announcementIdx,     setAnnouncementIdx]     = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);

  const isMakeYourEspressoPage = pathname === "/make-your-espresso";

  const closeAll = () => {
    setOpenCommercePanel(null);
    setIsUserMenuOpen(false);
    setIsNotifOpen(false);
    closeCart();
  };

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

  // Announcement cycle
  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>;
    const cycle = setInterval(() => {
      setAnnouncementVisible(false);
      fadeTimer = setTimeout(() => {
        setAnnouncementIdx((i) => (i + 1) % announcements.length);
        setAnnouncementVisible(true);
      }, 350);
    }, 3800);
    return () => { clearInterval(cycle); clearTimeout(fadeTimer); };
  }, []);

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
          "fixed inset-x-0 top-0 z-50 isolate overflow-visible text-white transition-all duration-500",
          isScrolled ? "nav-glass" : "",
        )}
        dir={dir}
      >
        {/* Announcement bar */}
        <div
          className={cn(
            "relative z-20 min-h-[38px] overflow-hidden border-b px-10 py-2.5 text-center text-sm text-[#F5E6D8] backdrop-blur-2xl",
            isMakeYourEspressoPage && !isScrolled
              ? "border-[#B6885E]/10 bg-[rgba(11,8,6,0.06)] shadow-none"
              : "border-[#B6885E]/18 bg-[#120D09]/58 shadow-[0_8px_26px_rgba(0,0,0,0.18)]",
          )}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 animate-line-sweep bg-gradient-to-r from-transparent via-[#FFDCC2]/12 to-transparent" />
          <div
            aria-live="polite"
            aria-atomic="true"
            className={cn(
              "relative z-10 flex items-center justify-center gap-3 transition-opacity duration-300",
              announcementVisible ? "opacity-100" : "opacity-0",
            )}
          >
            <span>{t(announcements[announcementIdx].text)}</span>
            {announcements[announcementIdx].cta && (
              <>
                <span className="text-[#B6885E]" aria-hidden="true">&bull;</span>
                <Link
                  href="/products"
                  className="rounded-full border border-[#B6885E]/35 px-2.5 py-0.5 text-xs text-[#FFDCC2] transition-colors hover:border-[#FFDCC2]/50 hover:text-white"
                >
                  {t({ en: "Shop now", ar: "تسوق الآن" })}
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
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent",
              isMakeYourEspressoPage ? "from-black/5 via-black/[0.015]" : "from-black/18 via-black/5",
            )}
          />
        )}

        <div className="relative z-10 mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
          <div className="relative flex h-14 items-center justify-between sm:h-16 md:h-24">
            {!isScrolled && (
              <div className="absolute bottom-0 left-1/2 h-px w-[60%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#B6885E]/30 to-transparent" />
            )}

            {/* Logo */}
            <Link href="/" className="flex min-w-0 items-center">
              <span className="sr-only">Line Coffee</span>
              <span className="relative block h-10 w-28 sm:h-12 sm:w-36 md:h-20 md:w-[15rem]">
                <Image
                  src="/brand/logo-white.svg"
                  alt="Line Coffee"
                  fill
                  priority
                  sizes="(min-width: 768px) 15rem, (min-width: 640px) 9rem, 7rem"
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
                      isActive ? "nav-link-active text-[#FFF0E4]" : "text-[#D6B79A]/85 hover:text-[#F5E6D8]",
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
            <div className="relative flex shrink-0 items-center gap-0.5 sm:gap-1.5">
              {/* Language toggle */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#B6885E]/18 bg-[#B6885E]/[0.06] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#D6B79A]/85 transition-all hover:border-[#D6A373]/35 hover:bg-[#B6885E]/12 hover:text-[#F5E6D8]"
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
                  className={cn("header-icon-button", isUserMenuOpen && "bg-[#B6885E]/12 text-[#F5E6D8]")}
                  aria-label={t({ en: "Account", ar: "الحساب" })}
                  aria-expanded={isUserMenuOpen ? "true" : "false"}
                >
                  {isLoggedIn ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B6885E]/30 text-[9px] font-bold text-[#D6A373]">
                      <User className="h-4 w-4" />
                    </div>
                  ) : (
                    <User />
                  )}
                </button>
                {isUserMenuOpen && <UserMenu onClose={() => setIsUserMenuOpen(false)} />}
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
      {isMobileMenuOpen && <MobileMenu onClose={() => setIsMobileMenuOpen(false)} />}
    </>
  );
}
