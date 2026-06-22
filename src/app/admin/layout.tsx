import type { Metadata } from "next";
import AdminShell from "@/components/admin/layout/AdminShell";

export const metadata: Metadata = {
  title: "Admin — Line Coffee",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
