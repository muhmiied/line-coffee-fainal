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
import { cn } from "@/lib/utils/cn";

// ─── Form state ───────────────────────────────────────────────────────────────

type AddressForm = {
  label:         string;
  recipientName: string;
  phone:         string;
  governorate:   string;
  city:          string;
  area:          string;
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
  governorate: "", city: "", area: "",
  street: "", building: "", floor: "",
  apartment: "", landmark: "", locationUrl: "",
  isDefault: false,
};

function formFromAddress(a: CustomerAddress): AddressForm {
  return {
    label:         a.label,
    recipientName: a.recipientName ?? "",
    phone:         a.phone ?? "",
    governorate:   a.governorate,
    city:          a.city,
    area:          a.area ?? "",
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
  onEdit,
  onDelete,
  onSetDefault,
  t,
}: {
  address: CustomerAddress;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  t: (v: { en: string; ar: string }) => string;
}) {
  const cityLine = [address.area, address.city, address.governorate]
    .filter(Boolean)
    .join(", ");
  const streetLine = [
    address.street,
    address.building && `Bldg ${address.building}`,
    address.floor && `Fl ${address.floor}`,
    address.apartment && `Apt ${address.apartment}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={cn(
        "rounded-xl border bg-[#120D09] px-5 py-4 transition-all",
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
                <span className="inline-flex items-center gap-1 rounded-full bg-[#B6885E]/12 px-2 py-0.5 text-xs text-[#D6A373]">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  {t({ en: "Default", ar: "الافتراضي" })}
                </span>
              )}
            </div>
            {address.recipientName && (
              <p className="text-xs text-[#B79B85]/70">{address.recipientName}</p>
            )}
            {streetLine && (
              <p className="text-xs text-[#B79B85]/65">{streetLine}</p>
            )}
            {cityLine && (
              <p className="text-xs text-[#B79B85]/65">{cityLine}</p>
            )}
            {address.landmark && (
              <p className="text-xs italic text-[#B79B85]/45">{address.landmark}</p>
            )}
            {address.phone && (
              <p className="mt-0.5 text-xs text-[#B79B85]/50">{address.phone}</p>
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
          {!address.isDefault && (
            <button
              type="button"
              onClick={onSetDefault}
              className="rounded-md border border-[#B6885E]/15 px-2.5 py-1 text-xs text-[#B79B85]/60 transition-colors hover:border-[#B6885E]/35 hover:text-[#D6A373]"
            >
              {t({ en: "Set default", ar: "افتراضي" })}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md p-1.5 text-[#B79B85]/40 transition-colors hover:text-[#D6A373]"
            aria-label="Edit address"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-1.5 text-[#B79B85]/40 transition-colors hover:text-red-400/70"
            aria-label="Remove address"
          >
            <Trash2 className="h-4 w-4" />
          </button>
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

  const inputCls =
    "w-full rounded-lg border border-[#B6885E]/15 bg-[#1B140F] px-3 py-2.5 text-sm text-[#F5E6D8] placeholder-[#B79B85]/40 focus:border-[#B6885E]/40 focus:outline-none";
  const labelCls = "mb-1 block text-xs font-medium text-[#D6B79A]/70";
  const row2 = "grid grid-cols-2 gap-3";

  return (
    <div className="space-y-4 rounded-xl border border-[#B6885E]/18 bg-[#120D09] px-5 py-5">
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

      {/* Governorate + City */}
      <div className={row2}>
        <div>
          <label className={labelCls}>{t({ en: "Governorate *", ar: "المحافظة *" })}</label>
          <input value={form.governorate} onChange={field("governorate")} className={inputCls}
            placeholder={t({ en: "Cairo", ar: "القاهرة" })} />
        </div>
        <div>
          <label className={labelCls}>{t({ en: "City *", ar: "المدينة *" })}</label>
          <input value={form.city} onChange={field("city")} className={inputCls}
            placeholder={t({ en: "Nasr City", ar: "مدينة نصر" })} />
        </div>
      </div>

      {/* Area + Street */}
      <div className={row2}>
        <div>
          <label className={labelCls}>{t({ en: "Area / District", ar: "الحي / المنطقة" })}</label>
          <input value={form.area} onChange={field("area")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t({ en: "Street *", ar: "الشارع *" })}</label>
          <input value={form.street} onChange={field("street")} className={inputCls} />
        </div>
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
          <label className={labelCls}>{t({ en: "Apt.", ar: "الشقة" })}</label>
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
          className="premium-button px-6 py-2 text-sm disabled:opacity-60"
        >
          {saving
            ? t({ en: "Saving…", ar: "جاري الحفظ…" })
            : t({ en: "Save address", ar: "حفظ العنوان" })}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="premium-button-outline px-6 py-2 text-sm"
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

  const reload = useCallback(() => {
    return getCustomerAddresses()
      .then(setAddresses)
      .catch(() => setAddresses([]));
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd  = () => { setFormError(null); setFormMode({ kind: "add" }); };
  const openEdit = (a: CustomerAddress) => { setFormError(null); setFormMode({ kind: "edit", address: a }); };
  const closeForm = () => setFormMode({ kind: "hidden" });

  const handleSubmit = async (form: AddressForm) => {
    if (!form.governorate.trim() || !form.city.trim() || !form.street.trim()) {
      setFormError(t({ en: "Governorate, city and street are required.", ar: "المحافظة والمدينة والشارع مطلوبة." }));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (formMode.kind === "add") {
        const id = await addCustomerAddress(form);
        if (!id) {
          setFormError(t({ en: "Could not save — place an order first to create your account.", ar: "تعذّر الحفظ — أكمل طلباً أولاً لإنشاء حسابك." }));
          return;
        }
      } else if (formMode.kind === "edit") {
        const ok = await updateCustomerAddress(formMode.address.id, form);
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

  const handleDelete = async (addressId: string) => {
    setBusyId(addressId);
    try {
      await deleteCustomerAddress(addressId);
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    setBusyId(addressId);
    try {
      await setDefaultCustomerAddress(addressId);
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <AccountShell title={{ en: "Addresses", ar: "عناويني" }}>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-[#120D09]" />
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
        {/* Address cards */}
        {addresses.map((addr) => (
          <AddressCard
            key={addr.id}
            address={addr}
            busy={busyId === addr.id}
            onEdit={() => openEdit(addr)}
            onDelete={() => handleDelete(addr.id)}
            onSetDefault={() => handleSetDefault(addr.id)}
            t={t}
          />
        ))}

        {/* Empty state when no form is open */}
        {addresses.length === 0 && formMode.kind === "hidden" && (
          <div className="rounded-xl border border-[#B6885E]/10 bg-[#120D09] px-6 py-10 text-center">
            <MapPin className="mx-auto mb-3 h-8 w-8 text-[#B6885E]/20" />
            <p className="text-sm text-[#B79B85]/55">
              {t({ en: "No addresses saved yet.", ar: "لا توجد عناوين محفوظة بعد." })}
            </p>
            <p className="mt-1.5 text-xs text-[#B79B85]/40">
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
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#B6885E]/20 bg-transparent py-4 text-sm text-[#B79B85]/60 transition-colors hover:border-[#B6885E]/40 hover:text-[#D6A373]"
          >
            <Plus className="h-4 w-4" />
            {t({ en: "Add new address", ar: "إضافة عنوان جديد" })}
          </button>
        )}
      </div>
    </AccountShell>
  );
}
