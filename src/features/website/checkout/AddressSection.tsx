"use client";

import { cn } from "@/lib/utils/cn";
import type { CustomerAddress } from "@/lib/account/customer-account";
import type { AuthUser } from "@/lib/hooks/useAuth";
import {
  CustomSelect,
  FieldLabel,
  errorClass,
  inputClass,
} from "./CheckoutPrimitives";
import type { FormData, FormErrors, SelectOption, TranslateFn } from "./types";

type AddressSectionProps = {
  t: TranslateFn;
  dir: string;
  form: FormData;
  errors: FormErrors;
  update: (field: keyof FormData, value: string) => void;
  user: AuthUser | null;
  savedAddresses: CustomerAddress[];
  selectedAddressId: string | null;
  applySavedAddress: (address: CustomerAddress) => void;
  govOptions: SelectOption[];
  areaOptions: SelectOption[];
};

export function AddressSection({
  t,
  dir,
  form,
  errors,
  update,
  user,
  savedAddresses,
  selectedAddressId,
  applySavedAddress,
  govOptions,
  areaOptions,
}: AddressSectionProps) {
  return (
    <>
      {/* Saved addresses (registered customers only) */}
      {user && savedAddresses.length > 0 && (
        <div className="rounded-2xl border border-[#B6885E]/14 bg-[#120D09]/68 p-6">
          <h2 className="mb-1 font-serif text-lg font-bold text-[#F5E6D8]">
            {t({ en: "Saved Addresses", ar: "العناوين المحفوظة" })}
          </h2>
          <p className="mb-4 text-[11px] text-[#D6B79A]/45">
            {t({
              en: "Pick a saved address to fill the form below.",
              ar: "اختر عنواناً محفوظاً لتعبئة النموذج أدناه.",
            })}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {savedAddresses.map((a) => {
              const active = selectedAddressId === a.id;
              const locline = [a.area, a.city, a.governorate]
                .filter(Boolean)
                .join("، ");
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => applySavedAddress(a)}
                  aria-pressed={active ? "true" : "false"}
                  className={cn(
                    "rounded-xl border p-3.5 text-start transition-all",
                    active
                      ? "border-[#D6A373]/40 bg-[#D6A373]/8 ring-1 ring-[#D6A373]/22"
                      : "border-[#B6885E]/18 hover:border-[#B6885E]/35",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[#F5E6D8]">
                      {a.label}
                    </span>
                    {a.isDefault && (
                      <span className="rounded-full bg-[#B6885E]/12 px-2 py-0.5 text-[10px] text-[#D6A373]">
                        {t({ en: "Default", ar: "الافتراضي" })}
                      </span>
                    )}
                  </div>
                  {locline && (
                    <p className="mt-0.5 truncate text-[11px] text-[#D6B79A]/50">{locline}</p>
                  )}
                  {a.street && (
                    <p className="truncate text-[11px] text-[#D6B79A]/40">{a.street}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer info */}
      <div className="rounded-2xl border border-[#B6885E]/14 bg-[#120D09]/68 p-6">
        <h2 className="mb-6 font-serif text-lg font-bold text-[#F5E6D8]">
          {t({ en: "Your Information", ar: "بياناتك" })}
        </h2>
        <div className="grid gap-4">

          <div>
            <FieldLabel label={t({ en: "Full Name", ar: "الاسم الكامل" })} required />
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={t({ en: "Your full name", ar: "اسمك الكامل" })}
              dir={dir}
              className={inputClass}
            />
            {errors.name && <p className={errorClass}>{errors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label={t({ en: "Phone Number", ar: "رقم الهاتف" })} required />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+20 1XX XXX XXXX"
                dir="ltr"
                className={inputClass}
              />
              {errors.phone && <p className={errorClass}>{errors.phone}</p>}
            </div>
            <div>
              <FieldLabel label={t({ en: "WhatsApp Number", ar: "رقم الواتساب" })} required />
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => update("whatsapp", e.target.value)}
                placeholder="+20 1XX XXX XXXX"
                dir="ltr"
                className={inputClass}
              />
              {errors.whatsapp && <p className={errorClass}>{errors.whatsapp}</p>}
            </div>
          </div>

          <div>
            <FieldLabel label={t({ en: "Email", ar: "البريد الإلكتروني" })} />
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder={t({ en: "Optional", ar: "اختياري" })}
              dir="ltr"
              className={inputClass}
            />
            {errors.email && <p className={errorClass}>{errors.email}</p>}
          </div>

        </div>
      </div>

      {/* Delivery address */}
      <div className="rounded-2xl border border-[#B6885E]/14 bg-[#120D09]/68 p-6">
        <h2 className="mb-6 font-serif text-lg font-bold text-[#F5E6D8]">
          {t({ en: "Delivery Address", ar: "عنوان التوصيل" })}
        </h2>
        <div className="grid gap-4">

          <div>
            <FieldLabel label={t({ en: "Governorate", ar: "المحافظة" })} required />
            <CustomSelect
              value={form.governorate}
              onChange={(v) => update("governorate", v)}
              options={govOptions}
              placeholder={t({ en: "Select your governorate", ar: "اختر المحافظة" })}
              dir={dir}
            />
            {errors.governorate && <p className={errorClass}>{errors.governorate}</p>}
          </div>

          <div>
            <FieldLabel label={t({ en: "Area / District", ar: "المنطقة / الحي" })} required />
            <CustomSelect
              value={form.area}
              onChange={(v) => update("area", v)}
              options={areaOptions}
              placeholder={
                form.governorate
                  ? t({ en: "Select your area", ar: "اختر المنطقة" })
                  : t({ en: "Select a governorate first", ar: "اختر المحافظة أولاً" })
              }
              disabled={!form.governorate}
              dir={dir}
            />
            {errors.area && <p className={errorClass}>{errors.area}</p>}
          </div>

          <div>
            <FieldLabel label={t({ en: "Street Address", ar: "عنوان الشارع" })} required />
            <input
              type="text"
              value={form.street}
              onChange={(e) => update("street", e.target.value)}
              placeholder={t({ en: "Street name and number", ar: "اسم الشارع والرقم" })}
              dir={dir}
              className={inputClass}
            />
            {errors.street && <p className={errorClass}>{errors.street}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label={t({ en: "Building", ar: "المبنى" })} />
              <input
                type="text"
                value={form.building}
                onChange={(e) => update("building", e.target.value)}
                placeholder={t({ en: "Name or number", ar: "اسم أو رقم المبنى" })}
                dir={dir}
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel label={t({ en: "Floor / Apartment", ar: "الطابق / الشقة" })} />
              <input
                type="text"
                value={form.floorApt}
                onChange={(e) => update("floorApt", e.target.value)}
                placeholder={t({ en: "e.g. Floor 3, Apt 12", ar: "مثال: الطابق 3، شقة 12" })}
                dir={dir}
                className={inputClass}
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
