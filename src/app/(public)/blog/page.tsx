"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Calendar, Clock, Search, Tag, X } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { blogPosts } from "@/lib/mock-data/blog-data";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";

export default function BlogPage() {
  const { t, dir, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const featured = blogPosts.find((p) => p.featured);
  const rest = useMemo(() => blogPosts.filter((p) => !p.featured), []);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    return blogPosts
      .map((p) => p.category)
      .filter((cat) => {
        if (seen.has(cat.en)) return false;
        seen.add(cat.en);
        return true;
      });
  }, []);

  const filtered = useMemo(() => {
    const lq = query.toLowerCase();
    return rest.filter((post) => {
      const matchesQuery =
        !query ||
        t(post.title).toLowerCase().includes(lq) ||
        t(post.excerpt).toLowerCase().includes(lq);
      const matchesCategory =
        !activeCategory || post.category.en === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [rest, query, activeCategory, t]);

  return (
    <div className="arabic-body min-h-screen bg-[#0B0806] text-[#F5E6D8]">

      {/* ── Hero ── */}
      <section className="products-hero relative overflow-hidden pb-16 pt-28 lg:pt-36">
        <Image
          src="/assets/story/roastery.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover brightness-[0.38] saturate-[0.88]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[#0B0806]/52" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,8,6,0.18)_0%,rgba(11,8,6,0.80)_70%,#0B0806_100%)]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_20%,rgba(182,136,94,0.08),transparent_62%)]"
        />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.26em] text-[#D6A373]">
            {t({ en: "Coffee Journal", ar: "مجلة القهوة" })}
          </p>
          <h1 className="font-serif text-4xl font-bold text-[#F5E6D8] sm:text-5xl">
            {t({ en: "All Things Coffee", ar: "كل ما يخص القهوة" })}
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#D6B79A]/70">
            {t({
              en: "Roast notes, blend guides, brewing rituals, and the stories behind every cup.",
              ar: "ملاحظات التحميص، أدلة الخلطات، طقوس التحضير، وقصص خلف كل كوب.",
            })}
          </p>
        </div>
      </section>

      {/* ── Featured Post ── */}
      {featured && (
        <section className="cinematic-section section-bg-warm relative py-14 md:py-20">
          <div className="relative z-10 mx-auto max-w-7xl px-4">
            <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#B6885E]">
              {t({ en: "Featured Article", ar: "المقال المميز" })}
            </p>
            <Link
              href={`/blog/${featured.slug}`}
              className="group grid overflow-hidden rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/68 shadow-[0_16px_48px_rgba(0,0,0,0.32)] transition-all duration-300 hover:border-[#D6A373]/30 hover:shadow-[0_24px_64px_rgba(0,0,0,0.44)] md:grid-cols-2"
            >
              <div className="relative h-64 overflow-hidden md:h-auto md:min-h-[22rem]">
                <Image
                  src={featured.image}
                  alt={t(featured.title)}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover brightness-[0.82] contrast-[1.06] transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 hidden bg-gradient-to-r from-[#0B0806]/0 to-[#0B0806]/38 md:block" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0806]/70 via-transparent to-transparent md:hidden" />
              </div>
              <div className="flex flex-col justify-center p-8 md:p-12">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full border border-[#B6885E]/30 bg-[#B6885E]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D6A373]">
                    <Tag className="h-2.5 w-2.5" />
                    {t(featured.category)}
                  </span>
                </div>
                <h2 className="mb-4 font-serif text-2xl font-bold leading-snug text-[#F5E6D8] transition-colors group-hover:text-[#D6A373] md:text-3xl">
                  {t(featured.title)}
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-[#D6B79A]/65 md:text-base">
                  {t(featured.excerpt)}
                </p>
                <div className="mb-6 flex flex-wrap items-center gap-4 text-xs text-[#D6B79A]/45">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(featured.date, language)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {t(featured.readTime)}
                  </span>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#D6A373] transition-colors group-hover:text-[#F5E6D8]">
                  {t({ en: "Read article", ar: "اقرأ المقال" })}
                  <ArrowRight
                    className={cn(
                      "h-4 w-4 transition-transform group-hover:translate-x-1",
                      dir === "rtl" && "rotate-180 group-hover:-translate-x-1",
                    )}
                  />
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ── All Posts ── */}
      <section className="cinematic-section section-bg-black relative py-14 md:py-20">
        <div className="relative z-10 mx-auto max-w-7xl px-4">

          {/* Search + category filter */}
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-sm">
              <Search
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#B6885E]/60",
                  dir === "rtl" ? "right-4" : "left-4",
                )}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t({ en: "Search articles...", ar: "ابحث في المقالات..." })}
                dir={dir}
                className={cn(
                  "h-11 w-full rounded-full border border-[#B6885E]/20 bg-[#120D09]/68 text-sm text-[#F5E6D8] placeholder-[#D6B79A]/35 outline-none transition-all focus:border-[#D6A373]/40 focus:ring-1 focus:ring-[#D6A373]/20",
                  dir === "rtl" ? "pr-11 pl-10" : "pl-11 pr-10",
                )}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t({ en: "Clear search", ar: "مسح البحث" })}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 text-[#D6B79A]/50 hover:text-[#D6B79A]",
                    dir === "rtl" ? "left-4" : "right-4",
                  )}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
                  !activeCategory
                    ? "border-[#D6A373]/40 bg-[#D6A373]/12 text-[#D6A373]"
                    : "border-[#B6885E]/20 text-[#D6B79A]/55 hover:border-[#B6885E]/40 hover:text-[#D6B79A]",
                )}
              >
                {t({ en: "All", ar: "الكل" })}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.en}
                  type="button"
                  onClick={() =>
                    setActiveCategory(
                      activeCategory === cat.en ? null : cat.en,
                    )
                  }
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
                    activeCategory === cat.en
                      ? "border-[#D6A373]/40 bg-[#D6A373]/12 text-[#D6A373]"
                      : "border-[#B6885E]/20 text-[#D6B79A]/55 hover:border-[#B6885E]/40 hover:text-[#D6B79A]",
                  )}
                >
                  {t(cat)}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[#D6B79A]/50">
                {t({ en: "No articles found.", ar: "لا توجد مقالات." })}
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveCategory(null);
                }}
                className="mt-4 text-sm text-[#D6A373] hover:underline"
              >
                {t({ en: "Clear filters", ar: "مسح الفلاتر" })}
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group overflow-hidden rounded-2xl border border-[#B6885E]/14 bg-[#120D09]/68 shadow-[0_16px_48px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D6A373]/30 hover:shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
                >
                  <div className="relative h-52 overflow-hidden bg-[#1A120D]">
                    <Image
                      src={post.image}
                      alt={t(post.title)}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover brightness-[0.80] contrast-[1.08] transition-transform duration-500 group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0806]/72 via-transparent to-transparent" />
                    <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-[#B6885E]/30 bg-[#0B0806]/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D6A373]/90 backdrop-blur-md">
                      <Tag className="h-2.5 w-2.5" />
                      {t(post.category)}
                    </div>
                  </div>
                  <div className="p-5 pb-6">
                    <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] text-[#D6B79A]/42">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.date, language)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t(post.readTime)}
                      </span>
                    </div>
                    <h3 className="mb-3 line-clamp-2 text-[1.05rem] font-bold leading-snug text-[#F5E6D8] transition-colors group-hover:text-[#D6A373]">
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
          )}
        </div>
      </section>
    </div>
  );
}
