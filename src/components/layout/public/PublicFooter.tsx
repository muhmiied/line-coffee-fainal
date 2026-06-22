"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function IconTikTok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.74a4.85 4.85 0 01-1.01-.05z"/>
    </svg>
  );
}
import { useLanguage, type LocalizedValue } from "@/lib/context/language";

const footerLinks = {
  categories: [
    { href: "/products?category=turkish-blends", label: { en: "Turkish Blends", ar: "خلطات تركي" } },
    { href: "/products?category=espresso-blends", label: { en: "Espresso Blends", ar: "خلطات إسبريسو" } },
    { href: "/products?category=easy-coffee", label: { en: "Easy Coffee", ar: "إيزي كوفي" } },
    { href: "/products?category=flavor-coffee", label: { en: "Flavor Coffee", ar: "قهوة بالنكهات" } },
  ],
  make: [
    { href: "/products?category=make-your-espresso", label: { en: "Make Your Espresso", ar: "اصنع إسبريسو خاصتك" } },
    { href: "/products?category=make-your-flavor", label: { en: "Make Your Flavor", ar: "اصنع نكهتك" } },
  ],
  company: [
    { href: "/about", label: { en: "About Us", ar: "من نحن" } },
    { href: "/contact", label: { en: "Contact", ar: "تواصل معنا" } },
    { href: "/blog", label: { en: "Blog", ar: "المدونة" } },
  ],
  support: [
    { href: "/privacy", label: { en: "Privacy Policy", ar: "سياسة الخصوصية" } },
    { href: "/terms", label: { en: "Terms of Use", ar: "شروط الاستخدام" } },
    { href: "/shipping", label: { en: "Shipping Policy", ar: "سياسة الشحن" } },
    { href: "/returns", label: { en: "Returns Policy", ar: "سياسة الإرجاع" } },
  ],
};

const socials = [
  { href: "https://instagram.com/linecoffee.eg", label: "Instagram", Icon: IconInstagram },
  { href: "https://facebook.com/linecoffee", label: "Facebook", Icon: IconFacebook },
  { href: "https://www.tiktok.com/@linecoffee", label: "TikTok", Icon: IconTikTok },
];

export function PublicFooter() {
  const { dir, t } = useLanguage();

  return (
    <footer className="relative overflow-hidden bg-[#070504]" dir={dir}>
      <Image
        src="/assets/hero/dark-roast.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-[0.06]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#070504]/72" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(182,136,94,0.06)_0%,transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#B6885E]/25 to-transparent" />

      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-16">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-6 lg:gap-12">
            <div className="lg:col-span-2">
              <Link href="/" className="mb-6 inline-block">
                <span className="sr-only">Line Coffee</span>
                <span className="relative block h-20 w-64 md:h-24 md:w-72">
                  <Image
                    src="/brand/logo-white.svg"
                    alt="Line Coffee"
                    fill
                    sizes="18rem"
                    className="object-contain object-left"
                  />
                </span>
              </Link>

              <p className="mb-7 max-w-sm text-sm leading-relaxed text-[#B79B85]/75">
                {t({
                  en: "Freshly roasted coffee crafted for warm daily rituals, from Turkish blends to espresso and flavored favorites.",
                  ar: "قهوة طازجة التحميص لطقوس يومية دافئة، من خلطات تركي إلى الإسبريسو والنكهات المميزة.",
                })}
              </p>

              <div className="flex gap-3">
                {socials.map(({ href, label, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#B6885E]/18 bg-[#B6885E]/[0.08] text-[#B79B85]/70 transition-all duration-300 hover:border-[#B6885E]/40 hover:bg-[#B6885E]/18 hover:text-[#D6A373]"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            <FooterColumn title={{ en: "Categories", ar: "الفئات" }} links={footerLinks.categories} />
            <FooterColumn title={{ en: "Make Your Product", ar: "اصنع منتجك" }} links={footerLinks.make} />
            <FooterColumn title={{ en: "Company", ar: "الشركة" }} links={footerLinks.company} />

            <div>
              <h4 className="mb-5 text-sm font-semibold tracking-wide text-[#D6A373]">
                {t({ en: "Contact", ar: "تواصل" })}
              </h4>
              <ul className="space-y-3.5">
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B6885E]" />
                  <span className="text-sm text-[#B79B85]/65">
                    {t({ en: "Cairo, Egypt", ar: "القاهرة، مصر" })}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-[#B6885E]" />
                  <a className="text-sm text-[#B79B85]/65 transition-colors hover:text-[#D6A373]" href="tel:+201004761171">
                    +20 100 476 1171
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-[#B6885E]" />
                  <a className="text-sm text-[#B79B85]/65 transition-colors hover:text-[#D6A373]" href="mailto:info@linecoffee.com">
                    info@linecoffee.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-[#B6885E]/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-[#B79B85]/45 md:flex-row">
            <p>
              &copy; {new Date().getFullYear()} Line Coffee.{" "}
              {t({ en: "All rights reserved.", ar: "جميع الحقوق محفوظة." })}
            </p>
            <div className="flex flex-wrap justify-center gap-5">
              {footerLinks.support.map((link) => (
                <Link key={link.href} href={link.href} className="transition-colors hover:text-[#B6885E]">
                  {t(link.label)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: LocalizedValue;
  links: Array<{ href: string; label: LocalizedValue }>;
}) {
  const { t } = useLanguage();

  return (
    <div>
      <h4 className="mb-5 text-sm font-semibold tracking-wide text-[#D6A373]">
        {t(title)}
      </h4>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-[#B79B85]/65 transition-colors hover:text-[#D6A373]"
            >
              {t(link.label)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
