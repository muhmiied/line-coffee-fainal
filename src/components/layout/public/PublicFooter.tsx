"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/icons/SocialIcons";
import {
  DEFAULT_ADMIN_SETTINGS,
  formatPublicPhone,
  getPublicSettings,
  resolvePublicPhone,
  toEmailHref,
  toPhoneHref,
  toPublicHttpUrl,
  toWhatsAppHref,
} from "@/lib/admin/admin-settings";
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

export function PublicFooter() {
  const { dir, t } = useLanguage();
  const [settings, setSettings] = useState(DEFAULT_ADMIN_SETTINGS);

  useEffect(() => {
    let active = true;
    getPublicSettings()
      .then((next) => {
        if (active) setSettings(next);
      })
      .catch(() => {
        // Honest defaults contain no contact or social links.
      });
    return () => {
      active = false;
    };
  }, []);

  const whatsappNumber = resolvePublicPhone(
    settings.contact.whatsappNumber,
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "",
  );
  // Only surface a Phone row when a real, distinct support phone is configured —
  // no WhatsApp fallback, so the same number never shows twice (once as a call,
  // once as WhatsApp).
  const supportPhone = resolvePublicPhone(settings.contact.supportPhone);
  const whatsappDisplay = whatsappNumber ? formatPublicPhone(whatsappNumber) : null;
  const supportPhoneDisplay = supportPhone ? formatPublicPhone(supportPhone) : null;
  const emailHref = toEmailHref(settings.contact.supportEmail);
  const whatsappHref = toWhatsAppHref(
    whatsappNumber ?? "",
    settings.social.whatsapp,
  );
  const phoneIsDistinct =
    Boolean(supportPhone) && supportPhoneDisplay !== whatsappDisplay;
  const phoneDisplay = phoneIsDistinct ? supportPhoneDisplay : null;
  const phoneHref = phoneIsDistinct && supportPhone ? toPhoneHref(supportPhone) : null;
  const socialCandidates: Array<{
    href: string | null;
    label: string;
    Icon: ComponentType<{ className?: string }>;
  }> = [
    { href: toPublicHttpUrl(settings.social.instagram), label: "Instagram", Icon: InstagramIcon },
    { href: toPublicHttpUrl(settings.social.facebook), label: "Facebook", Icon: FacebookIcon },
    { href: toPublicHttpUrl(settings.social.tiktok), label: "TikTok", Icon: TikTokIcon },
    { href: toPublicHttpUrl(settings.social.youtube), label: "YouTube", Icon: YouTubeIcon },
    { href: whatsappHref, label: "WhatsApp", Icon: WhatsAppIcon },
  ];
  const socials = socialCandidates.filter(
    (item): item is typeof item & { href: string } => item.href !== null,
  );
  const hasContact =
    Boolean(settings.contact.businessAddress.trim()) ||
    Boolean(phoneHref) ||
    Boolean(emailHref) ||
    Boolean(whatsappHref);

  return (
    <footer className="line-footer relative overflow-hidden bg-[#070504]" dir={dir}>
      <Image
        src="/assets/hero/dark-roast.png"
        alt=""
        fill
        priority
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
                <span className="sr-only">{settings.brand.storeName}</span>
                <span className="relative block h-20 w-64 md:h-24 md:w-72">
                  <Image
                    src="/brand/logo-white.svg"
                    alt={settings.brand.storeName}
                    fill
                    sizes="18rem"
                    className="object-contain object-left"
                  />
                </span>
              </Link>

              <p className="mb-7 max-w-sm text-sm leading-relaxed text-[#B79B85]/75">
                {t({
                  en: "Carefully sourced coffee crafted for warm daily rituals, from Turkish blends to espresso and flavored favorites.",
                  ar: "قهوة مختارة بعناية لطقوس يومية دافئة، من خلطات تركي إلى الإسبريسو والنكهات المميزة.",
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
                    className="line-footer-social flex h-9 w-9 items-center justify-center rounded-full border border-[#B6885E]/18 bg-[#B6885E]/[0.08] text-[#B79B85]/70 transition-all duration-300 hover:border-[#B6885E]/40 hover:bg-[#B6885E]/18 hover:text-[#D6A373]"
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
                {settings.contact.businessAddress.trim() && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="line-footer-contact-icon mt-0.5 h-4 w-4 shrink-0 text-[#B6885E]" />
                  <span className="text-sm text-[#B79B85]/85">
                    {settings.contact.businessAddress}
                  </span>
                </li>
                )}
                {phoneHref && phoneDisplay && (
                <li className="flex items-center gap-2.5">
                  <Phone className="line-footer-contact-icon h-4 w-4 shrink-0 text-[#B6885E]" />
                  <a className="text-sm text-[#B79B85]/85 transition-colors hover:text-[#D6A373]" href={phoneHref}>
                    {phoneDisplay}
                  </a>
                </li>
                )}
                {emailHref && (
                <li className="flex items-center gap-2.5">
                  <Mail className="line-footer-contact-icon h-4 w-4 shrink-0 text-[#B6885E]" />
                  <a className="text-sm text-[#B79B85]/85 transition-colors hover:text-[#D6A373]" href={emailHref}>
                    {settings.contact.supportEmail}
                  </a>
                </li>
                )}
                {whatsappHref && (
                  <li className="flex items-center gap-2.5">
                    <WhatsAppIcon className="line-footer-contact-icon h-4 w-4 shrink-0 text-[#B6885E]" />
                    <a
                      className="text-sm text-[#B79B85]/85 transition-colors hover:text-[#D6A373]"
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {whatsappDisplay || "WhatsApp"}
                    </a>
                  </li>
                )}
                {!hasContact && (
                  <li className="text-sm text-[#B79B85]/85">
                    {t({
                      en: "Contact details are not available yet.",
                      ar: "بيانات التواصل غير متاحة حالياً.",
                    })}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-[#B6885E]/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-[#B79B85]/65 md:flex-row">
            <p>
              &copy; {new Date().getFullYear()} {settings.brand.storeName}.{" "}
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
              className="text-sm text-[#B79B85]/85 transition-colors hover:text-[#D6A373]"
            >
              {t(link.label)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
