import type { Metadata } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { Cairo, Tajawal } from "next/font/google";
import { PublicFooter } from "@/components/layout/public/PublicFooter";
import { PublicHeader } from "@/components/layout/public/PublicHeader";
import { LanguageProvider, type Language } from "@/lib/context/language";
import { CartProvider } from "@/lib/context/cart";
import {
  BRAND_LOGO,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo/site";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import "./globals.css";

const playfairDisplay = localFont({
  src: [
    {
      path: "../../public/fonts/PlayfairDisplay-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/PlayfairDisplay-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/PlayfairDisplay-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/PlayfairDisplay-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../../public/fonts/PlayfairDisplay-Black.ttf",
      weight: "900",
      style: "normal",
    },
    {
      path: "../../public/fonts/PlayfairDisplay-BlackItalic.ttf",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-playfair",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

// Arabic display/body font, self-hosted + optimized (was a raw @font-face OTF
// load in globals.css). Exposes --font-aligarh, referenced by the
// --font-arabic-*-active variables in globals.css.
const aligarh = localFont({
  src: [
    {
      path: "../../public/fonts/ARABIC/aligarh-arabic-free-personal-use/AligarhArabicFREEPERSONALUSE-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/ARABIC/aligarh-arabic-free-personal-use/AligarhArabicFREEPERSONALUSE-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-aligarh",
  display: "swap",
  fallback: ["Tajawal", "Cairo", "Segoe UI", "Tahoma", "sans-serif"],
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Food & Drink",
  // No global canonical: the home page sets canonical "/" itself, and each
  // public page/layout sets its own. Leaving it unset here means any route
  // without an explicit canonical self-canonicalizes (correct) instead of
  // wrongly pointing at "/".
  icons: {
    icon: BRAND_LOGO,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    alternateLocale: ["ar_EG"],
    images: [{ url: DEFAULT_OG_IMAGE, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const LANGUAGE_COOKIE_NAME = "line-coffee-language";

function isLanguage(value: string | undefined): value is Language {
  return value === "ar" || value === "en";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLanguage = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;
  const initialLanguage: Language = isLanguage(cookieLanguage) ? cookieLanguage : "en";
  const initialDir = initialLanguage === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={initialLanguage}
      dir={initialDir}
      suppressHydrationWarning
      className={`${playfairDisplay.variable} ${cairo.variable} ${tajawal.variable} ${aligarh.variable}`}
    >
      <body>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <LanguageProvider initialLanguage={initialLanguage}>
          <CartProvider>
            <PublicHeader />
            <main className="flex-1 w-full pt-[6.4rem] sm:pt-[7.2rem] md:pt-[8.9rem]">
              {children}
            </main>
            <PublicFooter />
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
