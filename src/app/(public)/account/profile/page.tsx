"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/context/language";
import { useAuth } from "@/lib/hooks/useAuth";
import { AccountShell } from "@/components/layout/account/AccountShell";
import {
  getCustomerProfile,
  updateCustomerProfile,
} from "@/lib/account/customer-account";
import { isValidEgyptianPhone, normalizeEgyptianPhone } from "@/lib/validation/phone";

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

function ProfileFormContent({
  initialForm,
  hasExistingProfile,
}: {
  initialForm: ProfileForm;
  hasExistingProfile: boolean;
}) {
  const { t } = useLanguage();

  const [form, setSomeForm]   = useState<ProfileForm>(initialForm);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSomeForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // The very first save for an account creates its customer profile row,
    // and that row requires a non-empty WhatsApp number (server-side
    // constraint, preserved as-is). Check this up front with the exact,
    // relevant message instead of letting a generic post-RPC failure stand
    // in for it — that previously showed an unrelated "no order history"
    // message that didn't explain what to actually do.
    if (!hasExistingProfile && !form.whatsapp.trim()) {
      setError(
        t({
          en: "WhatsApp number is required to create your profile.",
          ar: "رقم واتساب مطلوب لإنشاء ملفك الشخصي.",
        }),
      );
      return;
    }

    // Same Egyptian-format rule as Checkout — only enforced when a value is
    // actually entered (phone/whatsapp stay optional here otherwise).
    if (form.phone.trim() && !isValidEgyptianPhone(form.phone)) {
      setError(t({ en: "Enter a valid Egyptian phone number.", ar: "أدخل رقم هاتف مصري صحيح." }));
      return;
    }
    if (form.whatsapp.trim() && !isValidEgyptianPhone(form.whatsapp)) {
      setError(t({ en: "Enter a valid Egyptian WhatsApp number.", ar: "أدخل رقم واتساب مصري صحيح." }));
      return;
    }

    setSaving(true);
    try {
      const fullName = [form.firstName.trim(), form.lastName.trim()]
        .filter(Boolean)
        .join(" ");
      const normalizedPhone = normalizeEgyptianPhone(form.phone) ?? "";
      const normalizedWhatsapp = normalizeEgyptianPhone(form.whatsapp) ?? "";
      const ok = await updateCustomerProfile(fullName, normalizedPhone, normalizedWhatsapp);
      if (ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(t({ en: "Could not save your profile. Please try again.", ar: "تعذّر حفظ ملفك الشخصي. يرجى المحاولة مجدداً." }));
      }
    } catch {
      setError(t({ en: "An error occurred. Please try again.", ar: "حدث خطأ. يرجى المحاولة مجدداً." }));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "line-input";
  const labelClass = "mb-1.5 block text-xs font-medium text-[#D6B79A]/75";

  return (
    <AccountShell title={{ en: "Profile", ar: "الملف الشخصي" }}>
      <form onSubmit={handleSubmit} className="pub-card-static max-w-xl space-y-5 rounded-2xl p-5 sm:p-6">
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
            className="premium-button pub-btn-3d px-8 py-2.5 text-sm disabled:opacity-60"
          >
            {saving
              ? t({ en: "Saving…", ar: "جاري الحفظ…" })
              : t({ en: "Save changes", ar: "حفظ التغييرات" })}
          </button>
          {saved && (
            <span className="text-sm font-semibold text-[#D6A373]">
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
            <div key={i} className="account-skeleton h-12 rounded-lg" />
          ))}
        </div>
      </AccountShell>
    );
  }

  const initialForm = getInitialProfileForm(user, profile);
  const formKey = `${user?.id ?? "guest"}:${user?.email ?? ""}:${profile?.phone ?? ""}:${profile?.whatsapp ?? ""}`;

  return (
    <ProfileFormContent
      key={formKey}
      initialForm={initialForm}
      hasExistingProfile={profile !== null}
    />
  );
}
