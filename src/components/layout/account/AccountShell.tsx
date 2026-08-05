"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Heart,
  LayoutList,
  LogOut,
  MapPin,
  Settings,
  User,
} from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { useAuth } from "@/lib/hooks/useAuth";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/account/profile",       icon: User,       label: { en: "Profile",        ar: "الملف الشخصي" } },
  { href: "/account/orders",        icon: LayoutList, label: { en: "My Orders",       ar: "طلباتي" } },
  { href: "/account/addresses",     icon: MapPin,     label: { en: "Addresses",        ar: "عناويني" } },
  { href: "/account/wishlist",      icon: Heart,      label: { en: "Wishlist",         ar: "المحفوظات" } },
  { href: "/account/notifications", icon: Bell,       label: { en: "Notifications",   ar: "الإشعارات" } },
  { href: "/account/settings",      icon: Settings,   label: { en: "Settings",         ar: "الإعدادات" } },
];

interface AccountShellProps {
  children: React.ReactNode;
  title:    { en: string; ar: string };
}

export function AccountShell({ children, title }: AccountShellProps) {
  const { dir, t } = useLanguage();
  const pathname   = usePathname();
  const router     = useRouter();
  const { user, isLoading, isLoggedIn, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Auth guard — useEffect runs client-side only, where localStorage is available
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace("/auth/login");
    }
  }, [isLoading, isLoggedIn, router]);

  const handleSignOut = async () => {
    setSignOutError(null);
    try {
      await signOut();
      router.replace("/");
    } catch {
      // A failed sign-out must leave the user visibly authenticated — stay
      // on the account page and surface a retry message.
      setSignOutError(
        t({ en: "Could not sign out. Please try again.", ar: "تعذر تسجيل الخروج. حاول مرة أخرى." }),
      );
    }
  };

  const displayName = user?.name ?? user?.email ?? "Customer";
  const displayEmail = user?.email ?? "";

  if (isLoading || !isLoggedIn) {
    return (
      <div className="pub-page-surface min-h-screen pt-28 text-center text-sm text-[#B79B85]/70">
        {t({ en: "Checking your session...", ar: "جار التحقق من الجلسة..." })}
      </div>
    );
  }

  return (
    <div
      className="pub-page-surface arabic-body relative min-h-screen text-[#F5E6D8]"
      dir={dir}
    >
      {/* Ambient background */}
      <Image
        src="/site-images/shared/account/background.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-[0.075]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_42%_at_50%_0%,rgba(214,163,115,0.11),transparent_70%)]" />

      <div className="relative z-10 pt-20 lg:pt-24" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">

          {/* ── Sidebar ─────────────────────────────────────── */}
          <aside className="shrink-0 lg:w-60">
            <div className="pub-card-static sticky top-28 rounded-2xl p-3">
            {/* User badge */}
            <div className="account-card mb-4 flex items-center gap-3 rounded-xl px-3.5 py-3">
              <div className="pub-icon-circle h-9 w-9 shrink-0 text-sm font-bold">
                {displayName[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#F5E6D8]">{displayName}</p>
                {displayEmail ? (
                  <p className="truncate text-xs text-[#B79B85]/80">{displayEmail}</p>
                ) : null}
              </div>
            </div>

            {/* Nav */}
            <nav className="space-y-1">
              {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "account-nav-link flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-all",
                      active
                        ? "account-nav-active font-medium"
                        : "text-[#B79B85]/70 hover:text-[#D6B79A]",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {t(label)}
                  </Link>
                );
              })}

              <div className="my-3 h-px bg-[#B6885E]/08" />

              <button
                type="button"
                onClick={handleSignOut}
                className="account-nav-link flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm text-[#B79B85]/75 transition-colors hover:text-red-400/70"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {t({ en: "Sign out", ar: "تسجيل الخروج" })}
              </button>
              {signOutError && (
                <p className="px-3.5 pt-1.5 text-xs text-red-400/80">{signOutError}</p>
              )}
            </nav>
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────── */}
          <main className="min-w-0 flex-1">
            {/* Gold top accent */}
            <div className="mb-2 h-px w-10 bg-gradient-to-r from-[#B6885E]/50 to-transparent" />
            <h1 className="mb-6 font-serif text-2xl font-bold text-[#F5E6D8] lg:text-3xl">
              {t(title)}
            </h1>
            {children}
          </main>

        </div>
      </div>
    </div>
  );
}
