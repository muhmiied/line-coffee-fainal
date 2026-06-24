"use client";

import { useState } from "react";
import { MapPin, Plus, Star, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AccountShell } from "@/components/layout/account/AccountShell";
import { type MockAddress } from "@/lib/mock-data/account-data";
import { cn } from "@/lib/utils/cn";

export default function AddressesPage() {
  const { t } = useLanguage();

  const [addresses, setAddresses] = useState<MockAddress[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [newLabel, setNewLabel]   = useState("");
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity]     = useState("");

  const setDefault = (id: string) =>
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));

  const remove = (id: string) =>
    setAddresses((prev) => prev.filter((a) => a.id !== id));

  const addAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreet || !newCity) return;
    const next: MockAddress = {
      id: `addr-${Date.now()}`,
      label:     { en: newLabel || "New Address", ar: newLabel || "عنوان جديد" },
      name:      "Mohamed Sayed",
      phone:     "+20 100 476 1171",
      street:    { en: newStreet, ar: newStreet },
      city:      { en: newCity,   ar: newCity },
      isDefault: false,
    };
    setAddresses((prev) => [...prev, next]);
    setShowForm(false);
    setNewLabel(""); setNewStreet(""); setNewCity("");
  };

  const inputClass =
    "w-full rounded-lg border border-[#B6885E]/15 bg-[#1B140F] px-4 py-2.5 text-sm text-[#F5E6D8] placeholder-[#B79B85]/40 focus:border-[#B6885E]/40 focus:outline-none";

  return (
    <AccountShell title={{ en: "Addresses", ar: "عناويني" }}>
      <div className="space-y-3">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className={cn(
              "rounded-xl border bg-[#120D09] px-5 py-4 transition-all",
              addr.isDefault ? "border-[#B6885E]/30" : "border-[#B6885E]/10",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B6885E]" />
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-[#F5E6D8]">{t(addr.label)}</span>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#B6885E]/12 px-2 py-0.5 text-xs text-[#D6A373]">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        {t({ en: "Default", ar: "الافتراضي" })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#B79B85]/65">{t(addr.street)}</p>
                  <p className="text-xs text-[#B79B85]/65">{t(addr.city)}</p>
                  <p className="mt-0.5 text-xs text-[#B79B85]/50">{addr.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!addr.isDefault && (
                  <button
                    onClick={() => setDefault(addr.id)}
                    className="rounded-md border border-[#B6885E]/15 px-2.5 py-1 text-xs text-[#B79B85]/60 transition-colors hover:border-[#B6885E]/35 hover:text-[#D6A373]"
                  >
                    {t({ en: "Set default", ar: "تعيين افتراضي" })}
                  </button>
                )}
                <button
                  onClick={() => remove(addr.id)}
                  className="rounded-md p-1.5 text-[#B79B85]/40 transition-colors hover:text-red-400/70"
                  aria-label="Remove address"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {addresses.length === 0 && !showForm && (
          <div className="rounded-xl border border-[#B6885E]/10 bg-[#120D09] px-6 py-10 text-center">
            <MapPin className="mx-auto mb-3 h-8 w-8 text-[#B6885E]/20" />
            <p className="text-sm text-[#B79B85]/55">
              {t({ en: "No addresses saved yet.", ar: "لا توجد عناوين محفوظة بعد." })}
            </p>
            <p className="mt-1.5 text-xs text-[#B79B85]/40">
              {t({ en: "Saved delivery addresses will appear here after backend integration.", ar: "ستظهر هنا عناوين التوصيل المحفوظة بعد ربط النظام." })}
            </p>
          </div>
        )}

        {/* Add new */}
        {showForm ? (
          <form
            onSubmit={addAddress}
            className="space-y-3 rounded-xl border border-[#B6885E]/18 bg-[#120D09] px-5 py-5"
          >
            <p className="mb-1 text-sm font-medium text-[#D6B79A]">
              {t({ en: "New address", ar: "عنوان جديد" })}
            </p>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={t({ en: "Label (e.g. Home)", ar: "تسمية (مثال: المنزل)" })}
              className={inputClass}
            />
            <input
              value={newStreet}
              onChange={(e) => setNewStreet(e.target.value)}
              placeholder={t({ en: "Street address", ar: "الشارع والمبنى" })}
              className={inputClass}
            />
            <input
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder={t({ en: "City / District", ar: "المدينة / الحي" })}
              className={inputClass}
            />
            <div className="flex gap-2 pt-1">
              <button type="submit" className="premium-button px-6 py-2 text-sm">
                {t({ en: "Save", ar: "حفظ" })}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="premium-button-outline px-6 py-2 text-sm"
              >
                {t({ en: "Cancel", ar: "إلغاء" })}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
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
