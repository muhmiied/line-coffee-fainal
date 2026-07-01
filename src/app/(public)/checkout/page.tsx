"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  ArrowRight, ChevronDown, ShoppingBag,
  Banknote, Tag, Zap, Wallet,
} from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { useCart } from "@/lib/context/cart";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  checkoutResultStorageKey,
  createCheckoutAttemptId,
  getOrCreateGuestId,
  isCheckoutOrderResult,
  validatePromoCode,
} from "@/lib/checkout";
import type { PromoValidationResult } from "@/lib/types/marketing";
import {
  getCustomerAddresses,
  type CustomerAddress,
} from "@/lib/account/customer-account";
import { resolveDeliveryFee } from "@/lib/delivery";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type FormData = {
  name:          string;
  phone:         string;
  whatsapp:      string;
  email:         string;
  governorate:   string;
  area:          string;
  street:        string;
  building:      string;
  floorApt:      string;
  paymentMethod: "cash" | "instapay" | "e-wallet";
  paymentReference: string;
  paymentPhone:     string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const EMPTY: FormData = {
  name: "", phone: "", whatsapp: "", email: "",
  governorate: "", area: "", street: "", building: "", floorApt: "",
  paymentMethod: "cash",
  paymentReference: "", paymentPhone: "",
};

// ── Governorates + Areas ──────────────────────────────────────────────────────

const GOVS = [
  { en: "Cairo", ar: "القاهرة", areas: [
    { en: "Maadi",              ar: "المعادي" },
    { en: "Heliopolis",         ar: "مصر الجديدة" },
    { en: "Nasr City",          ar: "مدينة نصر" },
    { en: "Zamalek",            ar: "الزمالك" },
    { en: "New Cairo",          ar: "القاهرة الجديدة" },
    { en: "Shubra",             ar: "شبرا" },
    { en: "Helwan",             ar: "حلوان" },
    { en: "Ain Shams",          ar: "عين شمس" },
    { en: "Downtown",           ar: "وسط البلد" },
    { en: "Garden City",        ar: "جاردن سيتي" },
    { en: "Manyal",             ar: "المنيل" },
    { en: "Abbassia",           ar: "العباسية" },
    { en: "Matariyya",          ar: "المطرية" },
    { en: "El-Rehab",           ar: "الرحاب" },
    { en: "Madinaty",           ar: "مدينتي" },
    { en: "El-Shorouk",         ar: "الشروق" },
    { en: "Badr City",          ar: "مدينة بدر" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Giza", ar: "الجيزة", areas: [
    { en: "Dokki",              ar: "الدقي" },
    { en: "Mohandessin",        ar: "المهندسين" },
    { en: "Agouza",             ar: "العجوزة" },
    { en: "Imbaba",             ar: "إمبابة" },
    { en: "Haram",              ar: "الهرم" },
    { en: "Faisal",             ar: "فيصل" },
    { en: "6th October",        ar: "السادس من أكتوبر" },
    { en: "Sheikh Zayed",       ar: "الشيخ زايد" },
    { en: "Smart Village",      ar: "المدينة الذكية" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Alexandria", ar: "الإسكندرية", areas: [
    { en: "Sidi Bishr",         ar: "سيدي بشر" },
    { en: "Miami",              ar: "ميامي" },
    { en: "Stanley",            ar: "ستانلي" },
    { en: "Rushdy",             ar: "رشدي" },
    { en: "Smouha",             ar: "سموحة" },
    { en: "Montaza",            ar: "المنتزة" },
    { en: "Glim",               ar: "جليم" },
    { en: "San Stefano",        ar: "سان ستيفانو" },
    { en: "El-Raml",            ar: "الرمل" },
    { en: "Louran",             ar: "لوران" },
    { en: "Agami",              ar: "العجمي" },
    { en: "Borg El-Arab",       ar: "برج العرب" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Qalyubia", ar: "القليوبية", areas: [
    { en: "Banha",              ar: "بنها" },
    { en: "Shubra El-Kheima",   ar: "شبرا الخيمة" },
    { en: "Qaha",               ar: "قها" },
    { en: "Obour",              ar: "العبور" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Sharqia", ar: "الشرقية", areas: [
    { en: "Zagazig",            ar: "الزقازيق" },
    { en: "10th of Ramadan",    ar: "العاشر من رمضان" },
    { en: "Abu Hammad",         ar: "أبو حماد" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Dakahlia", ar: "الدقهلية", areas: [
    { en: "Mansoura",           ar: "المنصورة" },
    { en: "Mit Ghamr",          ar: "ميت غمر" },
    { en: "Talkha",             ar: "طلخا" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Gharbia", ar: "الغربية", areas: [
    { en: "Tanta",              ar: "طنطا" },
    { en: "Mahalla El-Kubra",   ar: "المحلة الكبرى" },
    { en: "Kafr El-Zayat",      ar: "كفر الزيات" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Menoufia", ar: "المنوفية", areas: [
    { en: "Shebeen El-Kom",     ar: "شبين الكوم" },
    { en: "Sadat City",         ar: "مدينة السادات" },
    { en: "Menouf",             ar: "منوف" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Kafr El-Sheikh", ar: "كفر الشيخ", areas: [
    { en: "Kafr El-Sheikh",     ar: "كفر الشيخ" },
    { en: "Desouk",             ar: "دسوق" },
    { en: "Fuwwah",             ar: "فوة" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Beheira", ar: "البحيرة", areas: [
    { en: "Damanhour",          ar: "دمنهور" },
    { en: "Kafr El-Dawwar",     ar: "كفر الدوار" },
    { en: "Rashid",             ar: "رشيد" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Damietta", ar: "دمياط", areas: [
    { en: "Damietta",           ar: "دمياط" },
    { en: "New Damietta",       ar: "دمياط الجديدة" },
    { en: "Ras El-Bar",         ar: "رأس البر" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Ismailia", ar: "الإسماعيلية", areas: [
    { en: "Ismailia",           ar: "الإسماعيلية" },
    { en: "Qantara",            ar: "القنطرة" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Port Said", ar: "بورسعيد", areas: [
    { en: "Port Said",          ar: "بورسعيد" },
    { en: "Port Fouad",         ar: "بورفؤاد" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Suez", ar: "السويس", areas: [
    { en: "Suez",               ar: "السويس" },
    { en: "Ain Sokhna",         ar: "عين السخنة" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Beni Suef", ar: "بني سويف", areas: [
    { en: "Beni Suef",          ar: "بني سويف" },
    { en: "Nasser",             ar: "ناصر" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Fayoum", ar: "الفيوم", areas: [
    { en: "Fayoum",             ar: "الفيوم" },
    { en: "Tamiya",             ar: "طامية" },
    { en: "Ibsheway",           ar: "إبشواي" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Minya", ar: "المنيا", areas: [
    { en: "Minya",              ar: "المنيا" },
    { en: "Mallawi",            ar: "ملوي" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Asyut", ar: "أسيوط", areas: [
    { en: "Asyut",              ar: "أسيوط" },
    { en: "Dairout",            ar: "ديروط" },
    { en: "New Asyut",          ar: "أسيوط الجديدة" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Sohag", ar: "سوهاج", areas: [
    { en: "Sohag",              ar: "سوهاج" },
    { en: "Akhmim",             ar: "أخميم" },
    { en: "Girga",              ar: "جرجا" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Qena", ar: "قنا", areas: [
    { en: "Qena",               ar: "قنا" },
    { en: "Nag Hammadi",        ar: "نجع حمادي" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Luxor", ar: "الأقصر", areas: [
    { en: "Luxor",              ar: "الأقصر" },
    { en: "Esna",               ar: "إسنا" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Aswan", ar: "أسوان", areas: [
    { en: "Aswan",              ar: "أسوان" },
    { en: "Kom Ombo",           ar: "كوم أمبو" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Red Sea", ar: "البحر الأحمر", areas: [
    { en: "Hurghada",           ar: "الغردقة" },
    { en: "El-Gouna",           ar: "الجونة" },
    { en: "Safaga",             ar: "سفاجا" },
    { en: "Marsa Alam",         ar: "مرسى علم" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "New Valley", ar: "الوادي الجديد", areas: [
    { en: "Kharga",             ar: "الخارجة" },
    { en: "Dakhla",             ar: "الداخلة" },
    { en: "Farafra",            ar: "الفرافرة" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "Matrouh", ar: "مطروح", areas: [
    { en: "Marsa Matrouh",      ar: "مرسى مطروح" },
    { en: "Siwa",               ar: "سيوة" },
    { en: "Alamein",            ar: "العلمين" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "North Sinai", ar: "شمال سيناء", areas: [
    { en: "El-Arish",           ar: "العريش" },
    { en: "Sheikh Zuweid",      ar: "الشيخ زويد" },
    { en: "Other",              ar: "أخرى" },
  ]},
  { en: "South Sinai", ar: "جنوب سيناء", areas: [
    { en: "Sharm El-Sheikh",    ar: "شرم الشيخ" },
    { en: "Dahab",              ar: "دهب" },
    { en: "Taba",               ar: "طابا" },
    { en: "Nuweiba",            ar: "نويبع" },
    { en: "Other",              ar: "أخرى" },
  ]},
];

// ── Payment Options ───────────────────────────────────────────────────────────

const PAYMENT_OPTIONS = [
  {
    key:     "cash"     as const,
    labelEn: "Cash on Delivery",           labelAr: "كاش",
    descEn:  "Pay when delivered",         descAr:  "ادفع عند الاستلام",
    Icon:    Banknote,
  },
  {
    key:     "instapay" as const,
    labelEn: "InstaPay",                   labelAr: "إنستا باي",
    descEn:  "Bank transfer via InstaPay", descAr:  "تحويل بنكي عبر إنستا باي",
    Icon:    Zap,
  },
  {
    key:     "e-wallet" as const,
    labelEn: "E-Wallet",                   labelAr: "محفظة إلكترونية",
    descEn:  "Vodafone Cash & others",     descAr:  "فودافون كاش وغيره",
    Icon:    Wallet,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[#D6B79A]/60">
      {label}
      {required && <span className="ml-1 text-[#D6A373]">*</span>}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-[#B6885E]/20 bg-[#120D09]/68 px-4 text-sm text-[#F5E6D8] placeholder-[#D6B79A]/28 outline-none transition-all focus:border-[#D6A373]/40 focus:ring-1 focus:ring-[#D6A373]/18";

const errorClass = "mt-1.5 text-[11px] text-red-400";

// ── Custom Select ─────────────────────────────────────────────────────────────

function CustomSelect({
  value, onChange, options, placeholder, disabled, dir,
}: {
  value:       string;
  onChange:    (v: string) => void;
  options:     Array<{ value: string; label: string }>;
  placeholder: string;
  disabled?:   boolean;
  dir:         string;
}) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          inputClass,
          "flex items-center justify-between gap-2",
          disabled && "cursor-not-allowed opacity-35",
          !disabled && "cursor-pointer",
        )}
      >
        <span className={cn("truncate text-start text-sm", selected ? "text-[#F5E6D8]" : "text-[#D6B79A]/28")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[#B6885E]/45 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && !disabled && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 60,
            background: "linear-gradient(135deg,#130E09 0%,#0F0A06 100%)",
            border: "1px solid rgba(182,136,94,0.26)", borderRadius: 14,
            maxHeight: 240, overflowY: "auto",
            boxShadow: "0 16px 48px rgba(0,0,0,0.72), 0 0 0 1px rgba(182,136,94,0.08)",
          }}
        >
          {options.map((opt) => {
            const isSel = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full px-4 py-2.5 text-start transition-colors hover:bg-white/[0.04]"
                style={{
                  fontSize: 13,
                  color:      isSel ? "var(--gold)"              : "var(--cream)",
                  background: isSel ? "rgba(182,136,94,0.12)"    : "transparent",
                  fontWeight: isSel ? 600                        : 400,
                  borderLeft:  isSel && dir === "ltr" ? "2px solid var(--gold)" : "none",
                  borderRight: isSel && dir === "rtl" ? "2px solid var(--gold)" : "none",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { t, dir, language } = useLanguage();
  const { items, total, clearCart } = useCart();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const checkoutAttemptId = useRef<string | null>(null);
  const ownerKey = isAuthLoading ? "loading" : (user?.id ?? "guest");

  const [ownedForm, setOwnedForm] = useState<{
    ownerKey: string;
    value: FormData;
  }>({ ownerKey, value: EMPTY });
  const form = ownedForm.ownerKey === ownerKey ? ownedForm.value : EMPTY;
  const [errors,     setErrors]     = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Phase 2: saved addresses are cached with their authenticated owner. The
  // owner id is checked again at render time so an Account A -> Account B
  // session switch can never paint Account A's addresses while B's request is
  // still in flight.
  const [savedAddressState, setSavedAddressState] = useState<{
    ownerId: string | null;
    rows: CustomerAddress[];
  }>({ ownerId: null, rows: [] });
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const savedAddresses =
    user && savedAddressState.ownerId === user.id ? savedAddressState.rows : [];

  function setForm(action: React.SetStateAction<FormData>) {
    setOwnedForm((current) => {
      const currentValue = current.ownerKey === ownerKey ? current.value : EMPTY;
      const value =
        typeof action === "function" ? action(currentValue) : action;
      return { ownerKey, value };
    });
  }

  useEffect(() => {
    if (isAuthLoading) return;

    const ownerId = user?.id ?? null;
    if (!ownerId) return;

    let active = true;
    getCustomerAddresses()
      .then((rows) => {
        if (active) setSavedAddressState({ ownerId, rows });
      })
      .catch(() => {
        if (active) setSavedAddressState({ ownerId, rows: [] });
      });
    return () => { active = false; };
  }, [isAuthLoading, user?.id]);

  // Map a saved address onto the checkout form. Address fields overwrite; identity
  // fields fill only when empty (don't clobber what the user already typed).
  // Governorate/area are matched against the known options so the zone preview
  // still resolves; an unmatched value is left for the user to pick manually.
  function applySavedAddress(a: CustomerAddress) {
    const govNorm = a.governorate.trim().toLowerCase();
    const gov = GOVS.find(
      (g) => g.en.toLowerCase() === govNorm || g.ar === a.governorate.trim(),
    );
    const areaNorm = (a.area ?? "").trim().toLowerCase();
    const area = gov?.areas.find(
      (ar) => ar.en.toLowerCase() === areaNorm || ar.ar === (a.area ?? "").trim(),
    );
    const floorApt = [
      a.floor && `${t({ en: "Floor", ar: "الدور" })} ${a.floor}`,
      a.apartment && `${t({ en: "Apt", ar: "شقة" })} ${a.apartment}`,
    ]
      .filter(Boolean)
      .join(" · ");

    setSelectedAddressId(a.id);
    setSubmitError(null);
    setErrors({});
    setForm((prev) => ({
      ...prev,
      name:        prev.name.trim()  ? prev.name  : (a.recipientName ?? ""),
      phone:       prev.phone.trim() ? prev.phone : (a.phone ?? ""),
      governorate: gov ? gov.en : prev.governorate,
      area:        gov ? (area ? area.en : "") : prev.area,
      street:      a.street || prev.street,
      building:    a.building ?? "",
      floorApt:    floorApt || prev.floorApt,
    }));
  }

  // Zone-based delivery (Decisions 10 + 11). This mirrors the server for an
  // accurate preview; create_checkout_order recomputes the authoritative fee.
  // Resolvable only once both governorate AND area are chosen.
  const deliveryZone =
    form.governorate && form.area
      ? resolveDeliveryFee(form.governorate, form.area)
      : null;
  const deliveryFee = deliveryZone?.fee ?? 0;
  const promoMatchesSubtotal =
    promoResult?.status === "valid" &&
    Math.abs(promoResult.subtotal - total) < 0.01;
  const promoDiscount = promoMatchesSubtotal ? promoResult.discountTotal : 0;
  const grandTotal = Math.max(0, total - promoDiscount) + deliveryFee;

  const govOptions = GOVS.map((g) => ({
    value: g.en,
    label: language === "ar" ? g.ar : g.en,
  }));

  const selectedGov = GOVS.find((g) => g.en === form.governorate);
  const areaOptions = (selectedGov?.areas ?? []).map((a) => ({
    value: a.en,
    label: language === "ar" ? a.ar : a.en,
  }));

  function update(field: keyof FormData, value: string) {
    setSubmitError(null);
    // A manual edit to an address/identity field means the form no longer matches
    // the picked saved address — drop the highlight.
    if (field !== "paymentMethod" && field !== "paymentReference" && field !== "paymentPhone") {
      setSelectedAddressId(null);
    }
    if (field === "governorate") {
      setForm((prev) => ({ ...prev, governorate: value, area: "" }));
      setErrors((prev) => ({ ...prev, governorate: undefined, area: undefined }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): FormErrors {
    const req = t({ en: "Required", ar: "مطلوب" });
    const e: FormErrors = {};
    if (!form.name.trim())        e.name        = req;
    if (!form.phone.trim())       e.phone       = req;
    if (!form.whatsapp.trim())    e.whatsapp    = req;
    if (!form.governorate.trim()) e.governorate = req;
    if (!form.area.trim())        e.area        = req;
    if (!form.street.trim())      e.street      = req;
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = t({ en: "Enter a valid email", ar: "أدخل بريداً إلكترونياً صحيحاً" });
    }
    return e;
  }

  function getCheckoutError(message?: string) {
    if (message?.includes("Promo code rejected")) {
      return t({
        en: "This promo code cannot be applied to the current order.",
        ar: "لا يمكن تطبيق كود الخصم على الطلب الحالي.",
      });
    }
    if (message?.includes("Insufficient stock")) {
      return t({
        en: "One of your items does not have enough stock. Please lower its quantity.",
        ar: "الكمية المطلوبة لأحد المنتجات غير متاحة. يرجى تقليل الكمية.",
      });
    }
    if (message?.includes("not available for purchase") || message?.includes("is not available")) {
      return t({
        en: "One of your products is no longer available. Please update your cart.",
        ar: "أحد المنتجات لم يعد متاحاً. يرجى تحديث سلة التسوق.",
      });
    }
    if (message?.includes("Custom builder checkout")) {
      return t({
        en: "Custom blends cannot be checked out yet. Remove them to continue with catalog products.",
        ar: "لا يمكن إتمام طلب الخلطات المخصصة حالياً. احذفها للمتابعة بمنتجات المتجر.",
      });
    }
    if (message?.includes("Invalid email")) {
      return t({ en: "Enter a valid email address.", ar: "أدخل بريداً إلكترونياً صحيحاً." });
    }
    return t({
      en: "We could not place your order. Please try again.",
      ar: "تعذر تسجيل طلبك. يرجى المحاولة مرة أخرى.",
    });
  }

  async function handleApplyPromo() {
    const normalized = promoCode.trim();
    setSubmitError(null);
    setPromoResult(null);
    if (!normalized) return;

    setValidatingPromo(true);
    try {
      const result = await validatePromoCode(
        normalized,
        total,
        getOrCreateGuestId(),
      );
      setPromoResult(result);
      if (result.code) setPromoCode(result.code);
    } catch {
      setPromoResult({
        status: "invalid",
        code: null,
        discountTotal: 0,
        subtotal: total,
        discountedSubtotal: total,
        message: "Promo validation is temporarily unavailable.",
      });
    } finally {
      setValidatingPromo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const unsupportedItem = items.find((item) => item.kind !== "product");
    if (unsupportedItem) {
      setSubmitError(getCheckoutError("Custom builder checkout"));
      return;
    }

    const checkoutItems = items.map((item) => ({
      kind: "product",
      slug: item.slug,
      size: item.detail.en,
      quantity: item.qty,
    }));
    if (checkoutItems.some((item) => !item.slug || !["250g", "500g", "1kg"].includes(item.size))) {
      setSubmitError(t({
        en: "A cart item is missing its product or size. Remove it and add it again.",
        ar: "بيانات أحد منتجات السلة غير مكتملة. احذفه ثم أضفه مرة أخرى.",
      }));
      return;
    }

    setSubmitting(true);
    let orderPlaced = false;
    try {
      checkoutAttemptId.current ??= createCheckoutAttemptId();
      const { data, error } = await supabase.rpc("create_checkout_order", {
        p_payload: {
          guest_id: getOrCreateGuestId(),
          checkout_attempt_id: checkoutAttemptId.current,
          customer: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            whatsapp: form.whatsapp.trim(),
            email: form.email.trim() || null,
          },
          address: {
            governorate: form.governorate,
            area: form.area,
            city: form.area,
            street: form.street.trim(),
            building: form.building.trim() || null,
            floor: form.floorApt.trim() || null,
          },
          payment: {
            method: form.paymentMethod,
            reference: form.paymentReference.trim() || null,
            phone: form.paymentPhone.trim() || null,
          },
          promo_code: promoCode.trim() || null,
          items: checkoutItems,
        },
      });

      if (error) {
        setSubmitError(getCheckoutError(error.message));
        return;
      }
      if (!isCheckoutOrderResult(data)) {
        setSubmitError(getCheckoutError());
        return;
      }

      try {
        window.sessionStorage.setItem(
          checkoutResultStorageKey(data.order_id),
          JSON.stringify(data),
        );
      } catch {
        // The real order code is also carried in the URL as a display fallback.
      }

      orderPlaced = true;
      checkoutAttemptId.current = null;
      clearCart();
      router.push(
        `/order-success?id=${encodeURIComponent(data.order_id)}&order=${encodeURIComponent(data.code)}`,
      );
    } catch {
      setSubmitError(getCheckoutError());
    } finally {
      if (!orderPlaced) setSubmitting(false);
    }
  }

  if (items.length === 0 && !submitting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0806] px-4 text-center">
        <ShoppingBag className="mb-4 h-12 w-12 text-[#D6A373]/50" />
        <p className="mb-2 font-serif text-xl font-bold text-[#F5E6D8]">
          {t({ en: "Your cart is empty", ar: "سلتك فارغة" })}
        </p>
        <p className="mb-6 text-sm text-[#D6B79A]/55">
          {t({ en: "Add items to your cart before checking out.", ar: "أضف منتجات إلى سلتك قبل إتمام الطلب." })}
        </p>
        <Link
          href="/products"
          className="premium-button inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold"
        >
          {t({ en: "Browse Coffee", ar: "تصفح القهوة" })}
        </Link>
      </div>
    );
  }

  return (
    <div className="arabic-body min-h-screen bg-[#0B0806] text-[#F5E6D8]">

      {/* Hero bar */}
      <section className="products-hero relative overflow-hidden pb-10 pt-28 lg:pt-36">
        <div className="absolute inset-0 bg-[#0B0806]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#B6885E]/22 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#B6885E]">
            {t({ en: "Checkout", ar: "إتمام الطلب" })}
          </p>
          <h1 className="font-serif text-3xl font-bold text-[#F5E6D8] sm:text-4xl">
            {t({ en: "Complete Your Order", ar: "أكمل طلبك" })}
          </h1>
        </div>
      </section>

      {/* Form + Summary */}
      <section className="cinematic-section section-bg-warm pb-24 pt-12">
        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-3">

            {/* ── Left: Form ── */}
            <div className="space-y-6 lg:col-span-2">

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

              {/* Payment method */}
              <div className="rounded-2xl border border-[#B6885E]/14 bg-[#120D09]/68 p-6">
                <h2 className="mb-6 font-serif text-lg font-bold text-[#F5E6D8]">
                  {t({ en: "Payment Method", ar: "طريقة الدفع" })}
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {PAYMENT_OPTIONS.map(({ key, labelEn, labelAr, descEn, descAr, Icon }) => {
                    const active = form.paymentMethod === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => update("paymentMethod", key)}
                        aria-pressed={active ? "true" : "false"}
                        className={cn(
                          "rounded-xl border p-4 text-start transition-all",
                          active
                            ? "border-[#D6A373]/40 bg-[#D6A373]/8 ring-1 ring-[#D6A373]/22"
                            : "border-[#B6885E]/18 hover:border-[#B6885E]/35",
                        )}
                      >
                        <Icon className={cn("mb-2.5 h-4 w-4", active ? "text-[#D6A373]" : "text-[#B6885E]/50")} />
                        <p className="text-sm font-semibold text-[#F5E6D8]">
                          {t({ en: labelEn, ar: labelAr })}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#D6B79A]/48">
                          {t({ en: descEn, ar: descAr })}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {form.paymentMethod === "instapay" && (
                  <div className="mt-4">
                    <FieldLabel label={t({
                      en: "InstaPay reference (optional)",
                      ar: "رقم مرجع إنستا باي (اختياري)",
                    })} />
                    <input
                      type="text"
                      value={form.paymentReference}
                      onChange={(e) => update("paymentReference", e.target.value)}
                      placeholder={t({
                        en: "Transfer reference or sender name",
                        ar: "رقم التحويل أو اسم المرسل",
                      })}
                      dir={dir}
                      className={inputClass}
                    />
                  </div>
                )}

                {form.paymentMethod === "e-wallet" && (
                  <div className="mt-4">
                    <FieldLabel label={t({
                      en: "Wallet phone (optional)",
                      ar: "رقم المحفظة (اختياري)",
                    })} />
                    <input
                      type="tel"
                      value={form.paymentPhone}
                      onChange={(e) => update("paymentPhone", e.target.value)}
                      placeholder="+20 1XX XXX XXXX"
                      dir="ltr"
                      className={inputClass}
                    />
                  </div>
                )}
              </div>

            </div>

            {/* ── Right: Summary ── */}
            <div>
              <div className="sticky top-[7.5rem] rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/72 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.32)]">
                <h2 className="mb-5 font-serif text-lg font-bold text-[#F5E6D8]">
                  {t({ en: "Order Summary", ar: "ملخص الطلب" })}
                </h2>

                <div className="mb-4 max-h-48 space-y-2.5 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#D6A373]/18 bg-[#D6A373]/8 text-[#D6A373]">
                        <ShoppingBag className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#F5E6D8]/85">{t(item.name)}</p>
                        <p className="truncate text-[10px] text-[#D6B79A]/42">{t(item.detail)}</p>
                      </div>
                      <span className="arabic-number shrink-0 text-xs font-bold text-[#D6A373]">
                        {item.pricePerUnit * item.qty}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mb-4 border-t border-[#B6885E]/12 pt-4">
                  <label
                    htmlFor="promo-code"
                    className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#D6B79A]/60"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    {t({ en: "Promo code", ar: "كود الخصم" })}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="promo-code"
                      value={promoCode}
                      onChange={(event) => {
                        setPromoCode(event.target.value.toUpperCase());
                        setPromoResult(null);
                      }}
                      maxLength={32}
                      autoComplete="off"
                      placeholder={t({ en: "Enter code", ar: "أدخل الكود" })}
                      className={cn(inputClass, "uppercase")}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={validatingPromo || !promoCode.trim()}
                      className="shrink-0 rounded-xl border border-[#D6A373]/25 px-4 text-xs font-semibold text-[#D6A373] transition hover:bg-[#D6A373]/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {validatingPromo
                        ? t({ en: "Checking…", ar: "جارٍ التحقق…" })
                        : t({ en: "Apply", ar: "تطبيق" })}
                    </button>
                  </div>
                  {promoResult && (
                    <p
                      role="status"
                      className={cn(
                        "mt-2 text-[11px]",
                        promoResult.status === "valid"
                          ? "text-emerald-400"
                          : "text-red-300",
                      )}
                    >
                      {promoResult.status === "valid"
                        ? t({
                            en: `${promoResult.code} applied — ${promoResult.discountTotal} EGP off products.`,
                            ar: `تم تطبيق ${promoResult.code} — خصم ${promoResult.discountTotal} ج.م على المنتجات.`,
                          })
                        : t({
                            en: promoResult.message,
                            ar: "كود الخصم غير صالح لهذا الطلب.",
                          })}
                    </p>
                  )}
                </div>

                <div className="space-y-2.5 border-t border-[#B6885E]/12 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#D6B79A]/58">{t({ en: "Subtotal", ar: "المجموع الجزئي" })}</span>
                    <span className="arabic-number font-semibold text-[#F5E6D8]">
                      {total} {t({ en: "EGP", ar: "ج.م" })}
                    </span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#D6B79A]/58">
                        {t({ en: "Product discount", ar: "خصم المنتجات" })}
                      </span>
                      <span className="arabic-number font-semibold text-emerald-400">
                        -{promoDiscount} {t({ en: "EGP", ar: "ج.م" })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#D6B79A]/58">{t({ en: "Delivery", ar: "التوصيل" })}</span>
                    {deliveryZone === null ? (
                      <span className="text-[#D6B79A]/45">
                        {t({ en: "Select address", ar: "اختر العنوان" })}
                      </span>
                    ) : deliveryZone.zone === "governorate_courier" ? (
                      <span className="font-semibold text-emerald-400">
                        {t({ en: "Paid to courier", ar: "يُدفع للمندوب" })}
                      </span>
                    ) : (
                      <span className="arabic-number font-semibold text-[#F5E6D8]">
                        {`${deliveryFee} ${t({ en: "EGP", ar: "ج.م" })}`}
                      </span>
                    )}
                  </div>
                  {deliveryZone?.zone === "governorate_courier" && (
                    <p className="text-[10px] leading-4 text-[#D6B79A]/42">
                      {t({
                        en: "Outside Cairo & Giza — the courier collects the delivery fee on arrival.",
                        ar: "خارج القاهرة والجيزة — يحصّل المندوب رسوم التوصيل عند الوصول.",
                      })}
                    </p>
                  )}
                  <div className="flex items-center justify-between border-t border-[#B6885E]/12 pt-3">
                    <span className="font-bold text-[#F5E6D8]">{t({ en: "Total", ar: "الإجمالي" })}</span>
                    <span className="arabic-number font-serif text-xl font-bold text-[#D6A373]">
                      {grandTotal} {t({ en: "EGP", ar: "ج.م" })}
                    </span>
                  </div>
                </div>

                {submitError && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="mt-5 rounded-xl border border-red-400/25 bg-red-400/8 px-4 py-3 text-sm leading-6 text-red-200"
                  >
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "premium-button mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold",
                    submitting && "opacity-60",
                  )}
                >
                  {submitting
                    ? t({ en: "Placing order…", ar: "جاري تقديم الطلب…" })
                    : t({ en: "Place Order", ar: "تأكيد الطلب" })}
                  {!submitting && (
                    <ArrowRight className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
                  )}
                </button>

                <p className="mt-3 text-center text-[10px] text-[#D6B79A]/32">
                  {form.paymentMethod === "cash"
                    ? t({ en: "Pay when delivered", ar: "الدفع عند الاستلام" })
                    : form.paymentMethod === "instapay"
                    ? t({ en: "InstaPay details sent after confirmation", ar: "تفاصيل إنستا باي بعد التأكيد" })
                    : t({ en: "Wallet details sent after confirmation", ar: "تفاصيل المحفظة بعد التأكيد" })}
                </p>
              </div>
            </div>

          </form>
        </div>
      </section>
    </div>
  );
}
