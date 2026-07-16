import { cookies } from "next/headers";
import { PublicFooter } from "@/components/layout/public/PublicFooter";
import { PublicHeader } from "@/components/layout/public/PublicHeader";
import { CartProvider } from "@/lib/context/cart";
import { LanguageProvider, type Language } from "@/lib/context/language";
import { getSeoBusinessInfo } from "@/lib/seo/data";
import {
  JsonLd,
  localBusinessJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo/jsonld";

const LANGUAGE_COOKIE_NAME = "line-coffee-language";

function isLanguage(value: string | undefined): value is Language {
  return value === "ar" || value === "en";
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieLanguage = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;
  const initialLanguage: Language = isLanguage(cookieLanguage) ? cookieLanguage : "en";
  const businessInfo = await getSeoBusinessInfo();

  // `.line-public` is a scoping hook only (no box styling of its own). It lets
  // globals.css apply the token-driven public visual language (buttons, panels,
  // hover lights) to every off-home public page WITHOUT touching the admin
  // dashboard, which lives outside this route group.
  //
  // PublicHeader/PublicFooter live here (not the root layout) so `/admin/*`
  // never mounts them: admin's own AdminShell is a `fixed inset-0 z-[9999]`
  // overlay that already covers the full viewport, so the public header/footer
  // rendered underneath it was always invisible dead weight — and after the
  // header grew its own admin-identity resolution + several dynamic imports,
  // that dead weight became a second concurrent `useCurrentAdmin()` Supabase
  // auth-listener mounted on every admin page load, doubling the client module
  // graph admin routes had to resolve per request.
  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      <CartProvider>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(), localBusinessJsonLd(businessInfo)]} />
        <div className="line-public">
          <a
            href="#main-content"
            className="fixed left-4 top-4 z-[10000] -translate-y-24 rounded-full border border-[#D6A373]/45 bg-[#120D09] px-4 py-2 text-sm font-semibold text-[#F5E6D8] shadow-xl transition-transform focus:translate-y-0"
          >
            Skip to content · انتقل إلى المحتوى
          </a>
          <PublicHeader />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 w-full pt-[6.4rem] sm:pt-[7.2rem] md:pt-[7.9rem]"
          >
            {children}
          </main>
          <PublicFooter />
        </div>
      </CartProvider>
    </LanguageProvider>
  );
}
