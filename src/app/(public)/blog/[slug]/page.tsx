"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { blogPosts } from "@/lib/mock-data/blog-data";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { t, dir, language } = useLanguage();

  const post = blogPosts.find((p) => p.slug === slug);
  const related = post
    ? blogPosts.filter((p) => p.slug !== slug).slice(0, 2)
    : [];

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0806] px-4 text-center">
        <p className="text-lg text-[#D6B79A]/50">
          {t({ en: "Article not found.", ar: "المقال غير موجود." })}
        </p>
        <Link
          href="/blog"
          className="mt-5 text-sm font-semibold text-[#D6A373] hover:underline"
        >
          {t({ en: "Back to Blog", ar: "العودة إلى المدونة" })}
        </Link>
      </div>
    );
  }

  return (
    <div className="arabic-body min-h-screen bg-[#0B0806] text-[#F5E6D8]">

      {/* ── Cover hero ── */}
      <section className="products-hero relative overflow-hidden pb-0 pt-28 lg:pt-36">
        <div className="relative h-[42vh] min-h-[260px] md:h-[52vh]">
          <Image
            src={post.image}
            alt={t(post.title)}
            fill
            priority
            sizes="100vw"
            className="object-cover brightness-[0.42] contrast-[1.08]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0806]/25 via-[#0B0806]/15 to-[#0B0806]" />
        </div>
      </section>

      {/* ── Article body ── */}
      <section className="relative bg-[#0B0806] pb-20">
        <div className="mx-auto max-w-3xl px-4 pt-10">

          {/* Breadcrumb */}
          <nav
            aria-label={t({ en: "Breadcrumb", ar: "مسار التنقل" })}
            className="mb-8 flex flex-wrap items-center gap-1.5 text-xs text-[#D6B79A]/42"
          >
            <Link href="/" className="transition-colors hover:text-[#D6A373]">
              {t({ en: "Home", ar: "الرئيسية" })}
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/blog" className="transition-colors hover:text-[#D6A373]">
              {t({ en: "Blog", ar: "المدونة" })}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="line-clamp-1 text-[#D6B79A]/65">
              {t(post.title)}
            </span>
          </nav>

          {/* Meta row */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-[#B6885E]/30 bg-[#B6885E]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D6A373]">
              <Tag className="h-2.5 w-2.5" />
              {t(post.category)}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[#D6B79A]/42">
              <Calendar className="h-3 w-3" />
              {formatDate(post.date, language)}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[#D6B79A]/42">
              <Clock className="h-3 w-3" />
              {t(post.readTime)}
            </span>
          </div>

          {/* Title */}
          <h1 className="mb-8 font-serif text-3xl font-bold leading-snug text-[#F5E6D8] sm:text-4xl">
            {t(post.title)}
          </h1>

          {/* Gold rule */}
          <div className="mb-10 h-px w-14 bg-gradient-to-r from-[#D6A373] to-[#B6885E]" />

          {/* Body blocks */}
          <div className="space-y-6">
            {post.body.map((block, i) => {
              if (block.type === "heading") {
                return (
                  <h2
                    key={i}
                    className="pt-4 font-serif text-xl font-bold text-[#F5E6D8] sm:text-2xl"
                  >
                    {t(block.text)}
                  </h2>
                );
              }
              return (
                <p
                  key={i}
                  className="text-base leading-[1.9] text-[#D6B79A]/72"
                >
                  {t(block.text)}
                </p>
              );
            })}
          </div>

          {/* Back link */}
          <div className="mt-14 border-t border-[#B6885E]/14 pt-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#D6A373] transition-colors hover:text-[#F5E6D8]"
            >
              {dir === "rtl" ? (
                <ArrowRight className="h-4 w-4" />
              ) : (
                <ArrowLeft className="h-4 w-4" />
              )}
              {t({ en: "Back to Blog", ar: "العودة إلى المدونة" })}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Related Articles ── */}
      {related.length > 0 && (
        <section className="cinematic-section section-bg-warm py-14 md:py-20">
          <div className="relative z-10 mx-auto max-w-7xl px-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#B6885E]">
              {t({ en: "Continue Reading", ar: "تابع القراءة" })}
            </p>
            <h2 className="mb-10 font-serif text-2xl font-bold text-[#F5E6D8]">
              {t({ en: "Related Articles", ar: "مقالات ذات صلة" })}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {related.map((rp) => (
                <Link
                  key={rp.slug}
                  href={`/blog/${rp.slug}`}
                  className="group overflow-hidden rounded-2xl border border-[#B6885E]/14 bg-[#120D09]/68 shadow-[0_16px_48px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D6A373]/30"
                >
                  <div className="relative h-44 overflow-hidden bg-[#1A120D]">
                    <Image
                      src={rp.image}
                      alt={t(rp.title)}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover brightness-[0.80] transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0806]/72 via-transparent to-transparent" />
                  </div>
                  <div className="p-5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#D6A373]/70">
                      {t(rp.category)}
                    </p>
                    <h3 className="line-clamp-2 text-[1.05rem] font-bold text-[#F5E6D8] transition-colors group-hover:text-[#D6A373]">
                      {t(rp.title)}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-[0.8rem] leading-relaxed text-[#D6B79A]/55">
                      {t(rp.excerpt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Products CTA ── */}
      <section className="cinematic-section section-bg-black py-14 md:py-20">
        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#B6885E]">
            {t({ en: "From Blog to Bag", ar: "من المدونة إلى الكيس" })}
          </p>
          <h2 className="mb-4 font-serif text-2xl font-bold text-[#F5E6D8] sm:text-3xl">
            {t({
              en: "Ready to taste what you've read about?",
              ar: "مستعد لتذوق ما قرأت عنه؟",
            })}
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-[#D6B79A]/65">
            {t({
              en: "Explore our full range of single-origin coffees and signature blends.",
              ar: "استكشف مجموعتنا الكاملة من قهوات المصدر الواحد والخلطات المميزة.",
            })}
          </p>
          <Link
            href="/products"
            className="premium-button inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold"
          >
            {t({ en: "Shop Coffee", ar: "تسوق القهوة" })}
            <ArrowRight
              className={cn("h-4 w-4", dir === "rtl" && "rotate-180")}
            />
          </Link>
        </div>
      </section>
    </div>
  );
}
