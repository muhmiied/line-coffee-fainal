"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowUpRight, Camera } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { socialGalleryImages } from "@/lib/mock-data/visual-content";
import { InstagramIcon, FacebookIcon } from "@/components/icons/SocialIcons";
import { getPublicSettings, toPublicHttpUrl } from "@/lib/admin/admin-settings";
import { cn } from "@/lib/utils/cn";

const INSTAGRAM_HANDLE = "@linecoffee.eg";
const INSTAGRAM_URL_DEFAULT = "https://instagram.com/linecoffee.eg";
const FACEBOOK_URL_DEFAULT = "https://facebook.com/linecoffee.eg";

type SocialGallerySectionProps = {
  images?: string[];
  handle?: string;
};

export function SocialGallerySection({
  images = socialGalleryImages,
  handle = INSTAGRAM_HANDLE,
}: SocialGallerySectionProps) {
  const { t } = useLanguage();
  const [instagramUrl, setInstagramUrl] = useState(INSTAGRAM_URL_DEFAULT);
  const [facebookUrl, setFacebookUrl] = useState(FACEBOOK_URL_DEFAULT);

  // Prefer real configured social links; keep the launch defaults otherwise
  // (same convention the section already used for the Instagram handle).
  useEffect(() => {
    let active = true;
    getPublicSettings()
      .then((settings) => {
        if (!active) return;
        setInstagramUrl(toPublicHttpUrl(settings.social.instagram) ?? INSTAGRAM_URL_DEFAULT);
        setFacebookUrl(toPublicHttpUrl(settings.social.facebook) ?? FACEBOOK_URL_DEFAULT);
      })
      .catch(() => {
        // Keep the defaults — no invented external data.
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="arabic-body cinematic-section section-bg-warm relative overflow-hidden py-16 md:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_45%,rgba(182,136,94,0.06)_0%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-10 reveal-on-scroll text-center" data-reveal>
          <p className="numeric-symbol premium-section-kicker mx-auto mb-3">{handle}</p>
          <h2 className="arabic-display premium-heading-shimmer mb-4 font-serif text-4xl font-bold text-[#F5E6D8] md:text-5xl">
            {t({ en: "Follow Our Journey", ar: "تابع رحلتنا" })}
          </h2>
          <p className="mx-auto mb-7 max-w-xl text-sm leading-7 text-[#D6BB9F]/80 md:text-base">
            {t({
              en: "Roasts, rituals, and the warm little moments behind every cup — join us across our socials.",
              ar: "تحميص وطقوس ولحظات دافئة خلف كل فنجان — تابعنا على منصاتنا.",
            })}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t({ en: "Visit Line Coffee on Instagram", ar: "زيارة لاين كوفي على إنستغرام" })}
              className="premium-button group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
            >
              <InstagramIcon className="h-4 w-4" />
              <span className="numeric-symbol">Instagram</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t({ en: "Visit Line Coffee on Facebook", ar: "زيارة لاين كوفي على فيسبوك" })}
              className="premium-button-outline group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
            >
              <FacebookIcon className="h-4 w-4" />
              <span className="numeric-symbol">Facebook</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>

        {/* Bento gallery — first tile featured, rest 1×1. Reuses existing
            assets only; premium-image-card carries the Home warm glow. */}
        <div
          className="reveal-on-scroll grid auto-rows-[8.5rem] grid-cols-2 gap-3 sm:auto-rows-[10rem] sm:grid-cols-3 sm:gap-4 lg:auto-rows-[12rem]"
          data-reveal
        >
          {images.map((src, index) => (
            <a
              key={`${src}-${index}`}
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Line Coffee ${handle} — ${t({ en: "photo", ar: "صورة" })} ${index + 1}`}
              className={cn(
                "premium-image-card group relative block overflow-hidden rounded-2xl",
                index === 0 && "col-span-2 sm:col-span-2 sm:row-span-2",
              )}
            >
              <Image
                src={src}
                alt={`Line Coffee ${handle} — photo ${index + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 26rem"
                className="object-cover brightness-[0.82] contrast-[1.07] saturate-[1.05] transition-all duration-700 group-hover:scale-105 group-hover:brightness-[0.92]"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#42200C]/25 to-transparent mix-blend-multiply" />
              <div className="absolute inset-0 flex items-center justify-center bg-[#0B0806]/0 transition-colors duration-300 group-hover:bg-[#0B0806]/30">
                <span className="pub-icon-circle h-10 w-10 opacity-0 transition-all duration-300 group-hover:opacity-100">
                  <Camera className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
