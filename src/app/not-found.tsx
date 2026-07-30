import Link from "next/link";
import { cookies } from "next/headers";
import type { Language } from "@/lib/context/language";

const LANGUAGE_COOKIE_NAME = "line-coffee-language";

function isLanguage(value: string | undefined): value is Language {
  return value === "ar" || value === "en";
}

// Root-level fallback for any unmatched URL Next can't resolve to a more
// specific not-found.tsx (e.g. outside the (public) route group, which owns
// LanguageProvider) — so a genuinely dead link never falls through to
// Next's generic unstyled default 404. Reads the language cookie directly
// (same pattern as the root layout) since this renders outside any client
// language context.
export default async function RootNotFound() {
  const cookieStore = await cookies();
  const cookieLanguage = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;
  const language: Language = isLanguage(cookieLanguage) ? cookieLanguage : "en";
  const dir = language === "ar" ? "rtl" : "ltr";

  const copy =
    language === "ar"
      ? {
          eyebrow: "الصفحة غير موجودة",
          title: "لم نتمكن من العثور على هذه الصفحة.",
          body: "ربما تم نقل الصفحة أو لم تعد موجودة.",
          cta: "العودة إلى الرئيسية",
        }
      : {
          eyebrow: "Page Not Found",
          title: "We could not find this page.",
          body: "The page may have been moved or no longer exists.",
          cta: "Back to Home",
        };

  return (
    <div
      dir={dir}
      className="flex min-h-screen flex-col items-center justify-center bg-[#0B0806] px-4 text-center text-[#F5E6D8]"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/80 px-6 py-8 shadow-[0_20px_56px_rgba(0,0,0,0.45)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6A373]">
          {copy.eyebrow}
        </p>
        <h1 className="mt-3 font-serif text-2xl font-bold">{copy.title}</h1>
        <p className="mt-3 text-sm text-[#D6B79A]/70">{copy.body}</p>
        <Link
          href="/"
          className="premium-button mt-6 inline-flex rounded-full px-6 py-3 text-sm font-semibold"
        >
          {copy.cta}
        </Link>
      </div>
    </div>
  );
}
