"use client";

import { useEffect, useState, useCallback } from "react";
import { MapPin, Plus, Star, Trash2, Pencil, ExternalLink } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AccountShell } from "@/components/layout/account/AccountShell";
import {
  getCustomerAddresses,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  type CustomerAddress,
} from "@/lib/account/customer-account";
import { EGYPT_GOVERNORATES as GOVS } from "@/lib/checkout/governorates";
import { isValidEgyptianPhone, normalizeEgyptianPhone } from "@/lib/validation/phone";
import { cn } from "@/lib/utils/cn";

// ─── Form state ───────────────────────────────────────────────────────────────

type AddressForm = {
  label:         string;
  recipientName: string;
  phone:         string;
  governorate:   string;
  city:          string;
  area:          string;
  manualArea:    string;
  street:        string;
  building:      string;
  floor:         string;
  apartment:     string;
  landmark:      string;
  locationUrl:   string;
  isDefault:     boolean;
};

const EMPTY_FORM: AddressForm = {
  label: "", recipientName: "", phone: "",
  governorate: "", city: "", area: "", manualArea: "",
  street: "", building: "", floor: "",
  apartment: "", landmark: "", locationUrl: "",
  isDefault: false,
};

function formFromAddress(a: CustomerAddress): AddressForm {
  const governorateValue = a.governorate.trim();
  const governorate = GOVS.find(
    (option) =>
      option.en.toLowerCase() === governorateValue.toLowerCase() ||
      option.ar === governorateValue,
  );
  const savedArea = (a.area ?? "").trim();
  const areaValue =
    savedArea &&
    savedArea.toLowerCase() !== "other" &&
    savedArea !== "أخرى"
      ? savedArea
      : a.city.trim();
  const area = governorate?.areas.find(
    (option) =>
      option.en.toLowerCase() === areaValue.toLowerCase() ||
      option.ar === areaValue,
  );

  return {
    label:         a.label,
    recipientName: a.recipientName ?? "",
    phone:         a.phone ?? "",
    governorate:   governorate?.en ?? a.governorate,
    city:          a.city,
    area:          area?.en ?? (areaValue ? "Other" : ""),
    manualArea:    area ? "" : areaValue,
    street:        a.street,
    building:      a.building ?? "",
    floor:         a.floor ?? "",
    apartment:     a.apartment ?? "",
    landmark:      a.landmark ?? "",
    locationUrl:   a.locationUrl ?? "",
    isDefault:     a.isDefault,
  };
}

// ─── Address card ─────────────────────────────────────────────────────────────

function AddressCard({
  address,
  busy,
  confirmingDelete,
  onEdit,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onSetDefault,
  t,
}: {
  address: CustomerAddress;
  busy: boolean;
  confirmingDelete: boolean;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onSetDefault: () => void;
  t: (v: { en: string; ar: string }) => string;
}) {
  const cityLine = [address.area, address.city, address.governorate]
    .filter(Boolean)
    .join(", ");
  const streetLine = [
    address.street,
    address.building && `${t({ en: "Building", ar: "المبنى" })} ${address.building}`,
    address.floor && `${t({ en: "Floor", ar: "الدور" })} ${address.floor}`,
    address.apartment && `${t({ en: "Apt", ar: "شقة" })} ${address.apartment}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={cn(
        "account-card account-card-interactive rounded-xl px-5 py-4",
        address.isDefault ? "border-[#B6885E]/30" : "border-[#B6885E]/10",
        busy && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B6885E]" />
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[#F5E6D8]">
                {address.label}
              </span>
              {address.isDefault && (
                <span className="line-product-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  {t({ en: "Default", ar: "الافتراضي" })}
                </span>
              )}
            </div>
            {address.recipientName && (
              <p className="text-xs text-[#B79B85]/70">{address.recipientName}</p>
            )}
            {streetLine && (
              <p className="text-xs text-[#B79B85]/85">{streetLine}</p>
            )}
            {cityLine && (
              <p className="text-xs text-[#B79B85]/85">{cityLine}</p>
            )}
            {address.landmark && (
              <p className="text-xs italic text-[#B79B85]/65">{address.landmark}</p>
            )}
            {address.phone && (
              <p className="mt-0.5 text-xs text-[#B79B85]/70">{address.phone}</p>
            )}
            {address.locationUrl && (
              <a
                href={address.locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-[#B6885E]/70 hover:text-[#D6A373]"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                {t({ en: "View on map", ar: "عرض على الخريطة" })}
              </a>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {confirmingDelete ? (
            <>
              <span className="text-xs text-[#B79B85]/75">
                {t({ en: "Delete this address?", ar: "حذف هذا العنوان؟" })}
              </span>
              <button
                type="button"
                onClick={onDeleteConfirm}
                className="rounded-md border border-red-400/30 px-2.5 py-1 text-xs font-semibold text-red-400 transition-colors hover:border-red-400/50 hover:bg-red-400/10"
              >
                {t({ en: "Confirm", ar: "تأكيد" })}
              </button>
              <button
                type="button"
                onClick={onDeleteCancel}
                className="rounded-md border border-[#B6885E]/15 px-2.5 py-1 text-xs text-[#B79B85]/80 transition-colors hover:border-[#B6885E]/35 hover:text-[#D6A373]"
              >
                {t({ en: "Cancel", ar: "إلغاء" })}
              </button>
            </>
          ) : (
            <>
              {!address.isDefault && (
                <button
                  type="button"
                  onClick={onSetDefault}
                  className="rounded-md border border-[#B6885E]/15 px-2.5 py-1 text-xs text-[#B79B85]/80 transition-colors hover:border-[#B6885E]/35 hover:text-[#D6A373]"
                >
                  {t({ en: "Set default", ar: "افتراضي" })}
                </button>
              )}
              <button
                type="button"
                onClick={onEdit}
                className="rounded-md p-1.5 text-[#B79B85]/60 transition-colors hover:text-[#D6A373]"
                aria-label={t({ en: "Edit address", ar: "تعديل العنوان" })}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onDeleteRequest}
                className="rounded-md p-1.5 text-[#B79B85]/60 transition-colors hover:text-red-400/70"
                aria-label={t({ en: "Remove address", ar: "إزالة العنوان" })}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Address form ─────────────────────────────────────────────────────────────

function AddressFormPanel({
  initial,
  saving,
  error,
  onSubmit,
  onCancel,
  t,
}: {
  initial: AddressForm;
  saving: boolean;
  error: string | null;
  onSubmit: (form: AddressForm) => void;
  onCancel: () => void;
  t: (v: { en: string; ar: string }) => string;
}) {
  const [form, setForm] = useState<AddressForm>(initial);

  const field = (name: keyof AddressForm) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => setForm((p) => ({ ...p, [name]: e.target.value }));

  const inputCls = "line-input !py-2.5 text-sm";
  const selectCls = "line-select !py-2.5 text-sm";
  const labelCls = "mb-1 block text-xs font-medium text-[#D6B79A]/70";
  const row2 = "grid grid-cols-2 gap-3";
  const selectedGovernorate = GOVS.find(
    (governorate) => governorate.en === form.governorate,
  );

  return (
    <div className="account-card space-y-4 rounded-xl px-5 py-5">
      <p className="text-sm font-medium text-[#D6B79A]">
        {form === initial
          ? t({ en: "New address", ar: "عنوان جديد" })
          : t({ en: "Edit address", ar: "تعديل العنوان" })}
      </p>

      {/* Label */}
      <div>
        <label className={labelCls}>{t({ en: "Label (Home, Work…)", ar: "التسمية (منزل، عمل…)" })}</label>
        <input value={form.label} onChange={field("label")} className={inputCls}
          placeholder={t({ en: "e.g. Home", ar: "مثال: المنزل" })} />
      </div>

      {/* Recipient + Phone */}
      <div className={row2}>
        <div>
          <label className={labelCls}>{t({ en: "Recipient name", ar: "اسم المستلم" })}</label>
          <input value={form.recipientName} onChange={field("recipientName")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t({ en: "Phone", ar: "الهاتف" })}</label>
          <input value={form.phone} onChange={field("phone")} type="tel" dir="ltr" className={inputCls} />
        </div>
      </div>

      {/* Governorate + Area */}
      <div className={row2}>
        <div>
          <label className={labelCls}>{t({ en: "Governorate *", ar: "المحافظة *" })}</label>
          <select
            value={form.governorate}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                governorate: e.target.value,
                city: "",
                area: "",
                manualArea: "",
              }))
            }
            className={selectCls}
          >
            <option value="">{t({ en: "Select governorate", ar: "اختر المحافظة" })}</option>
            {!selectedGovernorate && form.governorate && (
              <option value={form.governorate}>{form.governorate}</option>
            )}
            {GOVS.map((governorate) => (
              <option key={governorate.en} value={governorate.en}>
                {t(governorate)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t({ en: "Area / District *", ar: "الحي / المنطقة *" })}</label>
          <select
            value={form.area}
            disabled={!selectedGovernorate}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                area: e.target.value,
                manualArea:
                  e.target.value === "Other" ? current.manualArea : "",
              }))
            }
            className={`${selectCls} disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <option value="">
              {selectedGovernorate
                ? t({ en: "Select area", ar: "اختر المنطقة" })
                : t({ en: "Select governorate first", ar: "اختر المحافظة أولاً" })}
            </option>
            {selectedGovernorate?.areas.map((area) => (
              <option key={area.en} value={area.en}>
                {t(area)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {form.area === "Other" && (
        <div>
          <label className={labelCls}>
            {t({ en: "Area / District name *", ar: "اسم الحي / المنطقة *" })}
          </label>
          <input
            value={form.manualArea}
            onChange={field("manualArea")}
            className={inputCls}
            placeholder={t({
              en: "Enter your area or district",
              ar: "أدخل اسم المنطقة أو الحي",
            })}
          />
        </div>
      )}

      {/* Street */}
      <div>
        <label className={labelCls}>{t({ en: "Street *", ar: "الشارع *" })}</label>
        <input value={form.street} onChange={field("street")} className={inputCls} />
      </div>

      {/* Building + Floor + Apt */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>{t({ en: "Building", ar: "المبنى" })}</label>
          <input value={form.building} onChange={field("building")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t({ en: "Floor", ar: "الدور" })}</label>
          <input value={form.floor} onChange={field("floor")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t({ en: "Apt", ar: "الشقة" })}</label>
          <input value={form.apartment} onChange={field("apartment")} className={inputCls} />
        </div>
      </div>

      {/* Landmark */}
      <div>
        <label className={labelCls}>{t({ en: "Landmark", ar: "علامة مميزة" })}</label>
        <input value={form.landmark} onChange={field("landmark")} className={inputCls}
          placeholder={t({ en: "Near the mosque, blue building…", ar: "بجانب المسجد، المبنى الأزرق…" })} />
      </div>

      {/* Location URL */}
      <div>
        <label className={labelCls}>{t({ en: "Google Maps link (optional)", ar: "رابط الموقع على الخريطة (اختياري)" })}</label>
        <input value={form.locationUrl} onChange={field("locationUrl")} type="url" dir="ltr"
          className={inputCls} placeholder="https://maps.google.com/..." />
      </div>

      {/* Default checkbox */}
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))}
          className="h-4 w-4 accent-[#B6885E]"
        />
        <span className="text-sm text-[#D6B79A]/75">
          {t({ en: "Set as default address", ar: "تعيين كعنوان افتراضي" })}
        </span>
      </label>

      {error && (
        <p className="rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSubmit(form)}
          className="premium-button pub-btn-3d px-6 py-2 text-sm disabled:opacity-60"
        >
          {saving
            ? t({ en: "Saving…", ar: "جاري الحفظ…" })
            : t({ en: "Save address", ar: "حفظ العنوان" })}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="premium-button-outline pub-btn-3d px-6 py-2 text-sm"
        >
          {t({ en: "Cancel", ar: "إلغاء" })}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FormMode =
  | { kind: "hidden" }
  | { kind: "add" }
  | { kind: "edit"; address: CustomerAddress };

export default function AddressesPage() {
  const { t } = useLanguage();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading]     = useState(true);
  const [formMode, setFormMode]   = useState<FormMode>({ kind: "hidden" });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId]       = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setListError(null);
    return getCustomerAddresses()
      .then(setAddresses)
      .catch(() =>
        setListError(
          t({
            en: "We couldn't load your addresses. Please try again.",
            ar: "تعذر تحميل عناوينك. يرجى المحاولة مرة أخرى.",
          }),
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd  = () => { setFormError(null); setFormMode({ kind: "add" }); };
  const openEdit = (a: CustomerAddress) => { setFormError(null); setFormMode({ kind: "edit", address: a }); };
  const closeForm = () => setFormMode({ kind: "hidden" });

  const handleSubmit = async (form: AddressForm) => {
    const resolvedArea =
      form.area === "Other" ? form.manualArea.trim() : form.area.trim();
    if (!form.governorate.trim() || !resolvedArea || !form.street.trim()) {
      setFormError(t({
        en: "Governorate, area and street are required.",
        ar: "المحافظة والمنطقة والشارع مطلوبة.",
      }));
      return;
    }
    // Same Egyptian-format rule as Checkout/Profile — only enforced when a
    // phone value is actually entered (this field stays optional otherwise).
    if (form.phone.trim() && !isValidEgyptianPhone(form.phone)) {
      setFormError(t({ en: "Enter a valid Egyptian phone number.", ar: "أدخل رقم هاتف مصري صحيح." }));
      return;
    }
    const normalizedForm = {
      ...form,
      phone: normalizeEgyptianPhone(form.phone) ?? "",
      city: resolvedArea,
      area: resolvedArea,
    };
    setSaving(true);
    setFormError(null);
    try {
      if (formMode.kind === "add") {
        const id = await addCustomerAddress(normalizedForm);
        if (!id) {
          // add_customer_address returns null for exactly one reason: this
          // account has no customer profile row yet (created the first time
          // Profile is saved). Point at that directly instead of the
          // unrelated "place an order first" message this used to show.
          setFormError(
            t({
              en: "Please save your Profile first, then add an address.",
              ar: "يرجى حفظ ملفك الشخصي أولاً، ثم إضافة عنوان.",
            }),
          );
          return;
        }
      } else if (formMode.kind === "edit") {
        const ok = await updateCustomerAddress(
          formMode.address.id,
          normalizedForm,
        );
        if (!ok) {
          setFormError(t({ en: "Could not update address.", ar: "تعذّر تحديث العنوان." }));
          return;
        }
      }
      closeForm();
      await reload();
    } catch {
      setFormError(t({ en: "An error occurred. Please try again.", ar: "حدث خطأ. يرجى المحاولة مجدداً." }));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async (addressId: string) => {
    setListError(null);
    setBusyId(addressId);
    try {
      const ok = await deleteCustomerAddress(addressId);
      if (!ok) {
        setListError(t({ en: "Could not remove this address. Please try again.", ar: "تعذّرت إزالة هذا العنوان. يرجى المحاولة مجدداً." }));
        return;
      }
      await reload();
    } catch {
      setListError(t({ en: "Could not remove this address. Please try again.", ar: "تعذّرت إزالة هذا العنوان. يرجى المحاولة مجدداً." }));
    } finally {
      setBusyId(null);
      setConfirmingDeleteId(null);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    setListError(null);
    setBusyId(addressId);
    try {
      const ok = await setDefaultCustomerAddress(addressId);
      if (!ok) {
        setListError(t({ en: "Could not update your default address. Please try again.", ar: "تعذّر تحديث العنوان الافتراضي. يرجى المحاولة مجدداً." }));
        return;
      }
      await reload();
    } catch {
      setListError(t({ en: "Could not update your default address. Please try again.", ar: "تعذّر تحديث العنوان الافتراضي. يرجى المحاولة مجدداً." }));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <AccountShell title={{ en: "Addresses", ar: "عناويني" }}>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="account-skeleton h-24 rounded-xl" />
          ))}
        </div>
      </AccountShell>
    );
  }

  const editInitial =
    formMode.kind === "edit" ? formFromAddress(formMode.address) : EMPTY_FORM;
  const formKey =
    formMode.kind === "edit" ? formMode.address.id : "new";

  return (
    <AccountShell title={{ en: "Addresses", ar: "عناويني" }}>
      <div className="space-y-3">
        {listError && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-red-900/20 px-4 py-2.5 text-sm text-red-400">
            <span>{listError}</span>
            <button
              type="button"
              onClick={() => reload()}
              className="shrink-0 rounded-md border border-red-400/30 px-3 py-1 text-xs text-red-300 transition-colors hover:bg-red-400/10"
            >
              {t({ en: "Retry", ar: "إعادة المحاولة" })}
            </button>
          </div>
        )}

        {/* Address cards */}
        {addresses.map((addr) => (
          <AddressCard
            key={addr.id}
            address={addr}
            busy={busyId === addr.id}
            confirmingDelete={confirmingDeleteId === addr.id}
            onEdit={() => openEdit(addr)}
            onDeleteRequest={() => {
              setListError(null);
              setConfirmingDeleteId(addr.id);
            }}
            onDeleteConfirm={() => handleDeleteConfirm(addr.id)}
            onDeleteCancel={() => setConfirmingDeleteId(null)}
            onSetDefault={() => handleSetDefault(addr.id)}
            t={t}
          />
        ))}

        {/* Empty state when no form is open (only for a genuine empty list, not a failed load) */}
        {!listError && addresses.length === 0 && formMode.kind === "hidden" && (
          <div className="account-card rounded-xl px-6 py-10 text-center">
            <MapPin className="mx-auto mb-3 h-8 w-8 text-[#B6885E]/20" />
            <p className="text-sm text-[#B79B85]/75">
              {t({ en: "No addresses saved yet.", ar: "لا توجد عناوين محفوظة بعد." })}
            </p>
            <p className="mt-1.5 text-xs text-[#B79B85]/60">
              {t({ en: "Add a delivery address to speed up future orders.", ar: "أضف عنوان توصيل لتسريع طلباتك القادمة." })}
            </p>
          </div>
        )}

        {/* Form panel */}
        {formMode.kind !== "hidden" && (
          <AddressFormPanel
            key={formKey}
            initial={formMode.kind === "edit" ? editInitial : EMPTY_FORM}
            saving={saving}
            error={formError}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            t={t}
          />
        )}

        {/* Add button (hidden while form is open) */}
        {formMode.kind === "hidden" && (
          <button
            type="button"
            onClick={openAdd}
            className="account-secondary-button flex w-full items-center justify-center gap-2 rounded-xl border-dashed py-4 text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t({ en: "Add new address", ar: "إضافة عنوان جديد" })}
          </button>
        )}
      </div>
    </AccountShell>
  );
}
