"use client";

import Image from "next/image";
import { Camera } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { socialGalleryImages } from "@/lib/mock-data/visual-content";

const INSTAGRAM_HANDLE = "@linecoffee.eg";
const INSTAGRAM_URL = "https://instagram.com/linecoffee.eg";

type SocialGallerySectionProps = {
  images?: string[];
  handle?: string;
  profileUrl?: string;
};

export function SocialGallerySection({
  images = socialGalleryImages,
  handle = INSTAGRAM_HANDLE,
  profileUrl = INSTAGRAM_URL,
}: SocialGallerySectionProps) {
  const { t } = useLanguage();

  return (
    <>
      <section
        className="arabic-body cinematic-section section-bg-warm relative overflow-hidden py-16 md:py-24"
      >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(182,136,94,0.05)_0%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4">

        {/* Header */}
        <div className="mb-10 reveal-on-scroll text-center" data-reveal>
          <p className="numeric-symbol premium-section-kicker mx-auto mb-3">{handle}</p>
          <h2 className="arabic-display premium-heading-shimmer mb-4 font-serif text-4xl font-bold text-[#F5E6D8] md:text-5xl">
            {t({ en: "Follow Our Journey", ar: "تابع رحلتنا" })}
          </h2>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t({ en: "Visit Line Coffee on Instagram", ar: "زيارة لاين كوفي على إنستغرام" })}
            className="inline-flex items-center gap-2 rounded-full border border-[#B6885E]/20 bg-[#B6885E]/[0.07] px-4 py-2 text-sm text-[#B79B85]/65 transition-all duration-300 hover:border-[#D6A373]/35 hover:bg-[#B6885E]/12 hover:text-[#D6A373]"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden />
            <span className="numeric-symbol">Instagram</span>
          </a>
        </div>

        {/* Marquee */}
        <div className="social-marquee reveal-on-scroll" data-reveal>
          <div className="social-marquee-track">
            {/* Live items — keyboard-accessible, labelled */}
            {images.map((src, index) => (
              <GalleryItem
                key={`a-${index}`}
                src={src}
                index={index}
                profileUrl={profileUrl}
                handle={handle}
              />
            ))}
            {/* Decorative duplicates for infinite scroll — hidden from AT */}
            {images.map((src, index) => (
              <GalleryItemDupe
                key={`b-${index}`}
                src={src}
                index={index}
                handle={handle}
              />
            ))}
          </div>
        </div>
      </div>
      </section>
    </>
  );
}

// ─── Gallery items ────────────────────────────────────────────────────────────

const itemClass =
  "premium-image-card group relative block aspect-square w-[9.5rem] shrink-0 cursor-pointer overflow-hidden rounded-xl sm:w-[11rem] md:w-[12rem] lg:w-[13rem]";

function GalleryItemImage({ src, handle, index }: { src: string; handle: string; index: number }) {
  return (
    <>
      <Image
        src={src}
        alt={`Line Coffee ${handle} — photo ${index + 1}`}
        fill
        sizes="(max-width: 640px) 10rem, (max-width: 1024px) 12rem, 13rem"
        className="object-cover brightness-[0.82] contrast-[1.07] saturate-[1.05] transition-all duration-700 group-hover:scale-110 group-hover:brightness-[0.9]"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#B6885E]/8 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center bg-[#0B0806]/0 transition-colors duration-300 group-hover:bg-[#0B0806]/32">
        <Camera className="h-6 w-6 text-white opacity-0 drop-shadow-lg transition-all duration-300 group-hover:opacity-100" aria-hidden />
      </div>
    </>
  );
}

function GalleryItem({
  src,
  index,
  profileUrl,
  handle,
}: {
  src: string;
  index: number;
  profileUrl: string;
  handle: string;
}) {
  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Line Coffee on Instagram — photo ${index + 1}`}
      className={itemClass}
    >
      <GalleryItemImage src={src} handle={handle} index={index} />
    </a>
  );
}

function GalleryItemDupe({
  src,
  index,
  handle,
}: {
  src: string;
  index: number;
  handle: string;
}) {
  return (
    <span aria-hidden="true" className={itemClass}>
      <GalleryItemImage src={src} handle={handle} index={index} />
    </span>
  );
}
