"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/context/language";

// Catch-all for any unmatched URL under the public route group (typo'd path,
// dead link, removed page) that isn't already handled by a more specific
// not-found.tsx (product/category/blog). Lives inside (public)'s
// LanguageProvider, so it can use the same t()-driven bilingual pattern as
// every other public page.
export default function PublicNotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-[70vh] px-4 py-16 text-center text-[#F5E6D8]">
      <div className="mx-auto max-w-xl rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/70 p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6A373]">
          {t({ en: "Page Not Found", ar: "الصفحة غير موجودة" })}
        </p>
        <h1 className="mt-3 font-serif text-3xl font-bold">
          {t({ en: "We could not find this page.", ar: "لم نتمكن من العثور على هذه الصفحة." })}
        </h1>
        <p className="mt-3 text-sm text-[#D6B79A]/70">
          {t({
            en: "The page may have been moved or no longer exists.",
            ar: "ربما تم نقل الصفحة أو لم تعد موجودة.",
          })}
        </p>
        <Link href="/" className="premium-button mt-6 inline-flex rounded-full px-6 py-3 text-sm font-semibold">
          {t({ en: "Back to Home", ar: "العودة إلى الرئيسية" })}
        </Link>
      </div>
    </div>
  );
}
