"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/context/language";
import { useAuth } from "@/lib/hooks/useAuth";
import { AccountShell } from "@/components/layout/account/AccountShell";

type ProfileForm = {
  firstName: string;
  lastName:  string;
  phone:     string;
  email:     string;
};

function parseNameParts(fullName: string | undefined): { firstName: string; lastName: string } {
  const parts = (fullName ?? "").trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName:  parts.slice(1).join(" ") || "",
  };
}

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const { firstName, lastName } = parseNameParts(user?.name);

  const [form, setForm]   = useState<ProfileForm>({
    firstName: firstName || "Mohamed",
    lastName:  lastName  || "Sayed",
    phone:     "+20 100 476 1171",
    email:     user?.email ?? "info@linecoffee.com",
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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

        {/* Phone */}
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

        {/* Email */}
        <div>
          <label className={labelClass}>{t({ en: "Email address", ar: "البريد الإلكتروني" })}</label>
          <input
            name="email"
            type="email"
            dir="ltr"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
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

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="premium-button px-8 py-2.5 text-sm"
          >
            {t({ en: "Save changes", ar: "حفظ التغييرات" })}
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
