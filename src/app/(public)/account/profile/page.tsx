"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/context/language";
import { useAuth } from "@/lib/hooks/useAuth";
import { AccountShell } from "@/components/layout/account/AccountShell";
import {
  getCustomerProfile,
  updateCustomerProfile,
} from "@/lib/account/customer-account";

type ProfileForm = {
  firstName: string;
  lastName:  string;
  phone:     string;
  whatsapp:  string;
  email:     string;
};

function parseNameParts(fullName: string | undefined): { firstName: string; lastName: string } {
  const parts = (fullName ?? "").trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName:  parts.slice(1).join(" ") || "",
  };
}

function getInitialProfileForm(
  user: { name?: string; email?: string } | null | undefined,
  profile: { phone?: string | null; whatsapp?: string | null; name?: string | null } | null,
): ProfileForm {
  // Guard: if user.name equals user.email (the useAuth bug) treat name as absent
  const hasRealName = user?.name && user.name !== user?.email;
  // Prefer Supabase profile name over auth metadata when available
  const displayName = profile?.name || (hasRealName ? user?.name : undefined);
  const { firstName, lastName } = parseNameParts(displayName ?? undefined);
  return {
    firstName,
    lastName,
    phone:    profile?.phone    ?? "",
    whatsapp: profile?.whatsapp ?? "",
    email:    user?.email ?? "",
  };
}

function ProfileFormContent({ initialForm }: { initialForm: ProfileForm }) {
  const { t } = useLanguage();

  const [form, setSomeForm]   = useState<ProfileForm>(initialForm);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSomeForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const fullName = [form.firstName.trim(), form.lastName.trim()]
        .filter(Boolean)
        .join(" ");
      const ok = await updateCustomerProfile(fullName, form.phone, form.whatsapp);
      if (ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(t({ en: "Could not save — no order history found for this device.", ar: "تعذّر الحفظ — لا توجد طلبات مرتبطة بهذا الجهاز." }));
      }
    } catch {
      setError(t({ en: "An error occurred. Please try again.", ar: "حدث خطأ. يرجى المحاولة مجدداً." }));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-[#B6885E]/15 bg-[#1B140F] px-4 py-3 text-sm text-[#F5E6D8] placeholder-[#B79B85]/40 transition-colors focus:border-[#B6885E]/40 focus:outline-none";
  const labelClass = "mb-1.5 block text-xs font-medium text-[#D6B79A]/75";

  return (
    <AccountShell title={{ en: "Profile", ar: "الملف الشخصي" }}>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
        {/* Name row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t({ en: "First name", ar: "الاسم الأول" })}</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t({ en: "Last name", ar: "اسم العائلة" })}</label>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>

        {/* Phone + WhatsApp row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t({ en: "Phone number", ar: "رقم الهاتف" })}</label>
            <input
              name="phone"
              type="tel"
              dir="ltr"
              value={form.phone}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t({ en: "WhatsApp number", ar: "رقم واتساب" })}</label>
            <input
              name="whatsapp"
              type="tel"
              dir="ltr"
              value={form.whatsapp}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>

        {/* Email (display only — managed by Supabase Auth) */}
        <div>
          <label className={labelClass}>{t({ en: "Email address", ar: "البريد الإلكتروني" })}</label>
          <input
            name="email"
            type="email"
            dir="ltr"
            value={form.email}
            readOnly
            className={`${inputClass} cursor-not-allowed opacity-60`}
          />
        </div>

        <div className="h-px bg-[#B6885E]/10" />

        {/* Password section */}
        <div>
          <p className="mb-3 text-sm font-medium text-[#D6B79A]/80">
            {t({ en: "Password", ar: "كلمة المرور" })}
          </p>
          <a
            href="/auth/forgot-password"
            className="text-sm text-[#B6885E]/80 underline-offset-2 hover:text-[#D6A373] hover:underline"
          >
            {t({ en: "Change password", ar: "تغيير كلمة المرور" })}
          </a>
        </div>

        <div className="h-px bg-[#B6885E]/10" />

        {error && (
          <p className="rounded-lg bg-red-900/20 px-4 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="premium-button px-8 py-2.5 text-sm disabled:opacity-60"
          >
            {saving
              ? t({ en: "Saving…", ar: "جاري الحفظ…" })
              : t({ en: "Save changes", ar: "حفظ التغييرات" })}
          </button>
          {saved && (
            <span className="text-sm text-emerald-400">
              {t({ en: "Saved!", ar: "تم الحفظ!" })}
            </span>
          )}
        </div>
      </form>
    </AccountShell>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{
    phone: string | null;
    whatsapp: string | null;
    name: string | null;
  } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getCustomerProfile()
      .then((p) =>
        setProfile(
          p
            ? { phone: p.phone, whatsapp: p.whatsapp, name: p.name }
            : null,
        ),
      )
      .catch(() => setProfile(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <AccountShell title={{ en: "Profile", ar: "الملف الشخصي" }}>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-[#120D09]" />
          ))}
        </div>
      </AccountShell>
    );
  }

  const initialForm = getInitialProfileForm(user, profile);
  const formKey = `${user?.id ?? "guest"}:${user?.email ?? ""}:${profile?.phone ?? ""}:${profile?.whatsapp ?? ""}`;

  return <ProfileFormContent key={formKey} initialForm={initialForm} />;
}
