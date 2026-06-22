import type { Metadata } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { Cairo, Tajawal } from "next/font/google";
import { PublicFooter } from "@/components/layout/public/PublicFooter";
import { PublicHeader } from "@/components/layout/public/PublicHeader";
import { LanguageProvider, type Language } from "@/lib/context/language";
import { CartProvider } from "@/lib/context/cart";
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
  title: "Line Coffee",
  description: "Premium coffee experience by Line Coffee.",
  icons: {
    icon: "/brand/logo-colored.svg",
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
      className={`${playfairDisplay.variable} ${cairo.variable} ${tajawal.variable}`}
    >
      <body>
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
