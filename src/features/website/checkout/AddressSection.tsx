"use client";

import { ExternalLink } from "lucide-react";
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

function getSafeLocationUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

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
  const selectedLocationUrl = getSafeLocationUrl(
    savedAddresses.find((address) => address.id === selectedAddressId)
      ?.locationUrl ?? null,
  );

  return (
    <>
      {/* Saved addresses (registered customers only) */}
      {user && savedAddresses.length > 0 && (
        <div className="rounded-2xl border border-[#B6885E]/14 bg-[#120D09]/68 p-6">
          <h2 className="mb-1 font-serif text-lg font-bold text-[#F5E6D8]">
            {t({ en: "Saved Addresses", ar: "العناوين المحفوظة" })}
          </h2>
          <p className="mb-4 text-[11px] text-[#D6B79A]/65">
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
                    <p className="mt-0.5 truncate text-[11px] text-[#D6B79A]/70">{locline}</p>
                  )}
                  {a.street && (
                    <p className="truncate text-[11px] text-[#D6B79A]/60">{a.street}</p>
                  )}
                </button>
              );
            })}
          </div>
          {selectedLocationUrl && (
            <a
              href={selectedLocationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-[#B6885E]/70 hover:text-[#D6A373]"
            >
              <ExternalLink className="h-3 w-3" />
              {t({ en: "View selected address on map", ar: "عرض العنوان المحدد على الخريطة" })}
            </a>
          )}
        </div>
      )}

      {/* Customer info */}
      <div className="rounded-2xl border border-[#B6885E]/14 bg-[#120D09]/68 p-6">
        <h2 className="mb-6 font-serif text-lg font-bold text-[#F5E6D8]">
          {t({ en: "Your Information", ar: "بياناتك" })}
        </h2>
        <div className="grid gap-4">

          <div>
            <FieldLabel htmlFor="checkout-name" label={t({ en: "Full Name", ar: "الاسم الكامل" })} required />
            <input
              id="checkout-name"
              name="name"
              type="text"
              required
              autoComplete={user ? "off" : "name"}
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
              <FieldLabel htmlFor="checkout-phone" label={t({ en: "Phone Number", ar: "رقم الهاتف" })} required />
              <input
                id="checkout-phone"
                name="phone"
                type="tel"
                required
                autoComplete={user ? "off" : "tel"}
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+20 1XX XXX XXXX"
                dir="ltr"
                className={inputClass}
              />
              {errors.phone && <p className={errorClass}>{errors.phone}</p>}
            </div>
            <div>
              <FieldLabel htmlFor="checkout-whatsapp" label={t({ en: "WhatsApp Number", ar: "رقم الواتساب" })} required />
              <input
                id="checkout-whatsapp"
                name="whatsapp"
                type="tel"
                required
                autoComplete={user ? "off" : "tel"}
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
            <FieldLabel htmlFor="checkout-email" label={t({ en: "Email", ar: "البريد الإلكتروني" })} />
            <input
              id="checkout-email"
              name="email"
              type="email"
              autoComplete={user ? "off" : "email"}
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
            <FieldLabel htmlFor="checkout-governorate" label={t({ en: "Governorate", ar: "المحافظة" })} required />
            <CustomSelect
              id="checkout-governorate"
              value={form.governorate}
              onChange={(v) => update("governorate", v)}
              options={govOptions}
              placeholder={t({ en: "Select your governorate", ar: "اختر المحافظة" })}
              label={t({ en: "Governorate", ar: "المحافظة" })}
              required
              dir={dir}
            />
            {errors.governorate && <p className={errorClass}>{errors.governorate}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="checkout-area" label={t({ en: "Area / District", ar: "المنطقة / الحي" })} required />
            <CustomSelect
              id="checkout-area"
              value={form.area}
              onChange={(v) => update("area", v)}
              options={areaOptions}
              placeholder={
                form.governorate
                  ? t({ en: "Select your area", ar: "اختر المنطقة" })
                  : t({ en: "Select a governorate first", ar: "اختر المحافظة أولاً" })
              }
              disabled={!form.governorate}
              label={t({ en: "Area / District", ar: "المنطقة / الحي" })}
              required
              dir={dir}
            />
            {errors.area && <p className={errorClass}>{errors.area}</p>}
          </div>

          {form.area === "Other" && (
            <div>
              <FieldLabel
                htmlFor="checkout-manual-area"
                label={t({
                  en: "Area / District name",
                  ar: "اسم المنطقة / الحي",
                })}
                required
              />
              <input
                id="checkout-manual-area"
                name="manualArea"
                type="text"
                required
                autoComplete="address-level2"
                value={form.manualArea}
                onChange={(e) => update("manualArea", e.target.value)}
                placeholder={t({
                  en: "Enter your area or district",
                  ar: "أدخل اسم المنطقة أو الحي",
                })}
                dir={dir}
                className={inputClass}
              />
              {errors.manualArea && (
                <p className={errorClass}>{errors.manualArea}</p>
              )}
            </div>
          )}

          <div>
            <FieldLabel htmlFor="checkout-street" label={t({ en: "Street Address", ar: "عنوان الشارع" })} required />
            <input
              id="checkout-street"
              name="street"
              type="text"
              required
              autoComplete="address-line1"
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
              <FieldLabel htmlFor="checkout-building" label={t({ en: "Building", ar: "المبنى" })} />
              <input
                id="checkout-building"
                name="building"
                type="text"
                autoComplete="address-line2"
                value={form.building}
                onChange={(e) => update("building", e.target.value)}
                placeholder={t({ en: "Name or number", ar: "اسم أو رقم المبنى" })}
                dir={dir}
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel htmlFor="checkout-floor-apartment" label={t({ en: "Floor / Apartment", ar: "الطابق / الشقة" })} />
              <input
                id="checkout-floor-apartment"
                name="floorApt"
                type="text"
                autoComplete="address-line3"
                value={form.floorApt}
                onChange={(e) => update("floorApt", e.target.value)}
                placeholder={t({ en: "e.g. Floor 3, Apt 12", ar: "مثال: الطابق 3، شقة 12" })}
                dir={dir}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="checkout-google-maps" label={t({ en: "Google Maps link", ar: "رابط Google Maps" })} />
            <input
              id="checkout-google-maps"
              name="googleMapsUrl"
              type="url"
              inputMode="url"
              autoComplete="off"
              maxLength={2048}
              value={form.googleMapsUrl}
              onChange={(e) => update("googleMapsUrl", e.target.value)}
              placeholder={t({
                en: "Paste your location link from Google Maps",
                ar: "الصق رابط موقعك من Google Maps",
              })}
              dir="ltr"
              className={inputClass}
            />
            {errors.googleMapsUrl && (
              <p className={errorClass}>{errors.googleMapsUrl}</p>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
