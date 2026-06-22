"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { visualJournal } from "@/lib/mock-data/visual-content";
import type { VisualJournalItem } from "@/types/homepage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils/cn";

type JournalSectionProps = {
  posts?: VisualJournalItem[];
};

export function JournalSection({ posts = visualJournal }: JournalSectionProps) {
  const { dir, t } = useLanguage();

  return (
    <>
      <section
        className="arabic-body cinematic-section section-bg-warm relative overflow-hidden py-20 md:py-28"
      >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(182,136,94,0.06)_0%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
          <SectionHeading
            eyebrow={{ en: "Coffee Journal", ar: "مجلة القهوة" }}
            title={{ en: "Latest From The Blog", ar: "أحدث المقالات" }}
            align="flush"
          />
          <Link
            href="/blog"
            className="group inline-flex w-fit items-center justify-center gap-2 text-sm font-semibold text-[#D6A373] transition-colors hover:text-[#F5E6D8]"
          >
            {t({ en: "View all posts", ar: "عرض كل المقالات" })}
            <ArrowRight
              className={cn(
                "h-4 w-4 transition-transform group-hover:translate-x-1",
                dir === "rtl" && "rotate-180 group-hover:-translate-x-1",
              )}
            />
          </Link>
        </div>

        <div className="stagger-children grid gap-5 md:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              data-reveal
              className="reveal-on-scroll group overflow-hidden rounded-2xl border border-[#B6885E]/14 bg-[#120D09]/68 shadow-[0_16px_48px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D6A373]/30 hover:shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
            >
              {/* Card image — taller for editorial feel */}
              <div className="relative h-52 overflow-hidden bg-[#1A120D] sm:h-56">
                <Image
                  src={post.image}
                  alt={t(post.title)}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover brightness-[0.8] contrast-[1.08] saturate-[1.04] transition-transform duration-600 group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0806]/72 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#B6885E]/8 to-transparent" />

                {/* Category tag floats over image */}
                {post.category && (
                  <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-[#B6885E]/30 bg-[#0B0806]/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D6A373]/90 backdrop-blur-md">
                    <Tag className="h-2.5 w-2.5" />
                    <span>{t(post.category)}</span>
                  </div>
                )}
              </div>

              <div className="p-5 pb-6">
                <h3 className="mb-3 line-clamp-2 text-[1.1rem] font-bold leading-snug text-[#F5E6D8] transition-colors group-hover:text-[#D6A373] md:text-[1.15rem]">
                  {t(post.title)}
                </h3>
                <p className="line-clamp-3 text-[0.82rem] leading-relaxed text-[#D6B79A]/60">
                  {t(post.excerpt)}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#D6A373]/60 transition-colors group-hover:text-[#D6A373]">
                  <span>{t({ en: "Read more", ar: "اقرأ المزيد" })}</span>
                  <ArrowRight
                    className={cn(
                      "h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5",
                      dir === "rtl" && "rotate-180 group-hover:-translate-x-0.5",
                    )}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      </section>
    </>
  );
}
