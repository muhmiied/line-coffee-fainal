import type { Metadata } from "next";
import { cookies } from "next/headers";
import AdminShell from "@/components/admin/layout/AdminShell";
import AdminLanguageProvider from "@/components/admin/layout/AdminLanguageProvider";
import {
  ADMIN_LANGUAGE_COOKIE_NAME,
  isAdminLanguage,
} from "@/lib/admin/admin-i18n";

export const metadata: Metadata = {
  title: "Admin — Line Coffee",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const storedLanguage = cookieStore.get(ADMIN_LANGUAGE_COOKIE_NAME)?.value;
  const initialLanguage = isAdminLanguage(storedLanguage) ? storedLanguage : "en";

  return (
    <AdminLanguageProvider initialLanguage={initialLanguage}>
      <AdminShell>{children}</AdminShell>
    </AdminLanguageProvider>
  );
}
