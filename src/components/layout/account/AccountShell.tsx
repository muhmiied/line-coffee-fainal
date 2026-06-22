"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
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
  const { user, isLoggedIn, signOut } = useAuth();

  // Auth guard — useEffect runs client-side only, where localStorage is available
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/auth/login");
    }
  }, [isLoggedIn, router]);

  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  const displayName  = user?.name  ?? "Mohamed Sayed";
  const displayEmail = user?.email ?? "info@linecoffee.com";

  return (
    <div
      className="arabic-body relative min-h-screen bg-[#0B0806] text-[#F5E6D8]"
      dir={dir}
    >
      {/* Ambient background */}
      <Image
        src="/assets/hero/dark-roast.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-[0.04]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(182,136,94,0.06),transparent_70%)]" />

      <div className="relative z-10 pt-20 lg:pt-24" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">

          {/* ── Sidebar ─────────────────────────────────────── */}
          <aside className="shrink-0 lg:w-56">
            {/* User badge */}
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#B6885E]/15 bg-[#120D09]/80 px-4 py-3.5 backdrop-blur-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B6885E]/15 text-[#D6A373] font-bold text-sm">
                {displayName[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#F5E6D8]">{displayName}</p>
                <p className="truncate text-xs text-[#B79B85]/60">{displayEmail}</p>
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
                      "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-all",
                      active
                        ? "bg-[#B6885E]/12 text-[#D6A373] font-medium"
                        : "text-[#B79B85]/70 hover:bg-[#B6885E]/06 hover:text-[#D6B79A]",
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
                className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm text-[#B79B85]/55 transition-colors hover:text-red-400/70"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {t({ en: "Sign out", ar: "تسجيل الخروج" })}
              </button>
            </nav>
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
