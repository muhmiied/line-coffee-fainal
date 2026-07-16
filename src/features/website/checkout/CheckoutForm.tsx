"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { useCart } from "@/lib/context/cart";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  checkoutResultStorageKey,
  createCheckoutAttemptId,
  getOrCreateGuestId,
  isCheckoutOrderResult,
  type CheckoutOrderHandoff,
  validatePromoCode,
} from "@/lib/checkout";
import type { PromoValidationResult } from "@/lib/types/marketing";
import {
  getCustomerAddresses,
  getCustomerProfile,
  type CustomerAddress,
} from "@/lib/account/customer-account";
import { resolveDeliveryFee } from "@/lib/delivery";
import {
  getPublicSettings,
  resolvePublicPhone,
  toWhatsAppHref,
  type StorefrontSettings,
} from "@/lib/settings/public-site-settings";
import { supabase } from "@/lib/supabase/client";
import { isValidEgyptianPhone } from "@/lib/validation/phone";
import { EGYPT_GOVERNORATES as GOVS } from "@/lib/checkout/governorates";
import { AddressSection } from "./AddressSection";
import { PaymentSection } from "./PaymentSection";
import { OrderSummary } from "./OrderSummary";
import { buildCheckoutItem, type CheckoutRpcItem } from "./checkout-rpc";
import {
  EMPTY_FORM,
  type FormData,
  type FormErrors,
  type TranslateFn,
} from "./types";

function resolveSavedAddress(address: CustomerAddress) {
  const governorateValue = address.governorate.trim();
  const governorate = GOVS.find(
    (option) =>
      option.en.toLowerCase() === governorateValue.toLowerCase() ||
      option.ar === governorateValue,
  );
  const savedArea = (address.area ?? "").trim();
  const areaValue =
    savedArea &&
    savedArea.toLowerCase() !== "other" &&
    savedArea !== "أخرى"
      ? savedArea
      : address.city.trim();
  const area = governorate?.areas.find(
    (option) =>
      option.en.toLowerCase() === areaValue.toLowerCase() ||
      option.ar === areaValue,
  );

  return { governorate, area, areaValue };
}

function getPreferredSavedAddress(addresses: CustomerAddress[]) {
  const isValid = (address: CustomerAddress) => {
    const { governorate, area, areaValue } = resolveSavedAddress(address);
    return Boolean(governorate && (area || areaValue) && address.street.trim());
  };

  return (
    addresses.find((address) => address.isDefault && isValid(address)) ??
    addresses.find(isValid) ??
    addresses.find((address) => address.isDefault) ??
    addresses[0] ??
    null
  );
}

function mergeSavedAddress(
  current: FormData,
  address: CustomerAddress,
  t: TranslateFn,
  overwriteAddress: boolean,
): FormData {
  const { governorate, area, areaValue } = resolveSavedAddress(address);
  const floorApt = [
    address.floor && `${t({ en: "Floor", ar: "الدور" })} ${address.floor}`,
    address.apartment && `${t({ en: "Apt", ar: "شقة" })} ${address.apartment}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const fill = (existing: string, saved: string) =>
    overwriteAddress || !existing.trim() ? saved : existing;

  return {
    ...current,
    name: current.name.trim() ? current.name : (address.recipientName ?? ""),
    phone: current.phone.trim() ? current.phone : (address.phone ?? ""),
    governorate: governorate
      ? fill(current.governorate, governorate.en)
      : current.governorate,
    area: governorate
      ? area
        ? fill(current.area, area.en)
        : areaValue
          ? "Other"
          : overwriteAddress
            ? ""
            : current.area
      : current.area,
    manualArea:
      governorate && !area && areaValue
        ? fill(current.manualArea, areaValue)
        : overwriteAddress
          ? ""
          : current.manualArea,
    street: fill(current.street, address.street || current.street),
    building: overwriteAddress
      ? (address.building ?? "")
      : fill(current.building, address.building ?? ""),
    floorApt: floorApt
      ? fill(current.floorApt, floorApt)
      : current.floorApt,
    googleMapsUrl: overwriteAddress
      ? (address.locationUrl ?? "")
      : fill(current.googleMapsUrl, address.locationUrl ?? ""),
  };
}

export function CheckoutForm() {
  const { t, dir, language } = useLanguage();
  const { items, total, clearCart } = useCart();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const checkoutAttemptId = useRef<string | null>(null);
  const submitInFlight = useRef(false);
  const profilePrefillOwnerRef = useRef<string | null>(null);
  const ownerKey = isAuthLoading ? "loading" : (user?.id ?? "guest");

  const [ownedForm, setOwnedForm] = useState<{
    ownerKey: string;
    value: FormData;
  }>({ ownerKey, value: EMPTY_FORM });
  const form = ownedForm.ownerKey === ownerKey ? ownedForm.value : EMPTY_FORM;
  const [errors,     setErrors]     = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [storefront, setStorefront] = useState<StorefrontSettings | null>(null);
  const [whatsappHref, setWhatsappHref] = useState<string | null>(() =>
    toWhatsAppHref(process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? ""),
  );
  const closedNotice =
    storefront && !storefront.storeOpen
      ? storefront.closedNotice.trim() ||
        t({ en: "The store is currently closed.", ar: "المتجر مغلق حالياً." })
      : null;
  // Server-side enforcement lives in create_checkout_order (Phase 18B); this
  // flag only gives instant feedback and blocks a pointless round-trip when we
  // already know the store is closed. It is NOT the authoritative gate.
  const storeClosed = Boolean(storefront && !storefront.storeOpen);

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

  const setForm = useCallback((action: React.SetStateAction<FormData>) => {
    setOwnedForm((current) => {
      const currentValue = current.ownerKey === ownerKey ? current.value : EMPTY_FORM;
      const value =
        typeof action === "function" ? action(currentValue) : action;
      return { ownerKey, value };
    });
  }, [ownerKey]);

  useEffect(() => {
    let active = true;
    getPublicSettings()
      .then((settings) => {
        if (active) {
          const whatsappNumber = resolvePublicPhone(
            settings.contact.whatsappNumber,
            process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "",
          );
          setStorefront(settings.storefront);
          setWhatsappHref(
            toWhatsAppHref(whatsappNumber ?? "", settings.social.whatsapp),
          );
        }
      })
      .catch(() => {
        if (active) setStorefront(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;

    const ownerId = user?.id ?? null;
    if (!ownerId) {
      profilePrefillOwnerRef.current = null;
      return;
    }
    if (profilePrefillOwnerRef.current === ownerId) return;

    let active = true;
    const authName = user?.name !== user?.email ? (user?.name ?? "") : "";

    Promise.all([getCustomerProfile(), getCustomerAddresses()])
      .then(([profile, rows]) => {
        if (!active) return;

        const preferredAddress = getPreferredSavedAddress(rows);
        profilePrefillOwnerRef.current = ownerId;
        setSavedAddressState({ ownerId, rows });
        setSelectedAddressId(preferredAddress?.id ?? null);
        setForm((current) => {
          const withProfile = {
            ...current,
            name: profile?.name.trim() || authName,
            email: profile?.email?.trim() || user?.email || "",
            phone: profile?.phone?.trim() || "",
            whatsapp: profile?.whatsapp?.trim() || "",
          };

          return preferredAddress
            ? mergeSavedAddress(withProfile, preferredAddress, t, false)
            : withProfile;
        });
      })
      .catch(() => {
        if (active) setSavedAddressState({ ownerId, rows: [] });
      });
    return () => { active = false; };
  }, [isAuthLoading, setForm, t, user?.email, user?.id, user?.name]);

  // Map a saved address onto the checkout form. Address fields overwrite; identity
  // fields fill only when empty (don't clobber what the user already typed).
  // Governorate/area are matched against the known options so the zone preview
  // still resolves; an unmatched value is left for the user to pick manually.
  function applySavedAddress(a: CustomerAddress) {
    setSelectedAddressId(a.id);
    setSubmitError(null);
    setErrors({});
    setForm((current) => mergeSavedAddress(current, a, t, true));
  }

  // Zone-based delivery (Decisions 10 + 11). This mirrors the server for an
  // accurate preview; create_checkout_order recomputes the authoritative fee.
  // Resolvable only once both governorate AND area are chosen.
  const resolvedArea =
    form.area === "Other" ? form.manualArea.trim() : form.area;
  const deliveryZone =
    form.governorate && form.area
      ? resolveDeliveryFee(
          form.governorate,
          resolvedArea || "Other",
        )
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
      setForm((prev) => ({
        ...prev,
        governorate: value,
        area: "",
        manualArea: "",
      }));
      setErrors((prev) => ({
        ...prev,
        governorate: undefined,
        area: undefined,
        manualArea: undefined,
      }));
    } else if (field === "area") {
      setForm((prev) => ({
        ...prev,
        area: value,
        manualArea: value === "Other" ? prev.manualArea : "",
      }));
      setErrors((prev) => ({
        ...prev,
        area: undefined,
        manualArea: undefined,
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): FormErrors {
    const req = t({ en: "Required", ar: "مطلوب" });
    const invalidPhone = t({
      en: "Enter a valid Egyptian number (e.g. 01012345678)",
      ar: "أدخل رقماً مصرياً صحيحاً (مثال: 01012345678)",
    });
    const e: FormErrors = {};
    if (!form.name.trim())        e.name        = req;
    if (!form.phone.trim())       e.phone       = req;
    else if (!isValidEgyptianPhone(form.phone)) e.phone = invalidPhone;
    if (!form.whatsapp.trim())    e.whatsapp    = req;
    else if (!isValidEgyptianPhone(form.whatsapp)) e.whatsapp = invalidPhone;
    if (!form.governorate.trim()) e.governorate = req;
    if (!form.area.trim())        e.area        = req;
    if (form.area === "Other" && !form.manualArea.trim()) e.manualArea = req;
    if (!form.street.trim())      e.street      = req;
    if (form.googleMapsUrl.trim()) {
      try {
        const url = new URL(form.googleMapsUrl.trim());
        if (!["http:", "https:"].includes(url.protocol)) {
          e.googleMapsUrl = t({
            en: "Enter a valid Google Maps link",
            ar: "أدخل رابط Google Maps صالحاً",
          });
        }
      } catch {
        e.googleMapsUrl = t({
          en: "Enter a valid Google Maps link",
          ar: "أدخل رابط Google Maps صالحاً",
        });
      }
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = t({ en: "Enter a valid email", ar: "أدخل بريداً إلكترونياً صحيحاً" });
    }
    return e;
  }

  function getCheckoutError(message?: string) {
    if (message?.includes("Store is closed")) {
      return t({
        en: "The store is currently closed and is not accepting new orders. Please try again later.",
        ar: "المتجر مغلق حالياً ولا يستقبل طلبات جديدة. يرجى المحاولة لاحقاً.",
      });
    }
    if (message?.includes("Promo code has expired")) {
      return t({
        en: "This promo code has expired.",
        ar: "انتهت صلاحية كود الخصم.",
      });
    }
    if (message?.includes("Promo code is inactive")) {
      return t({
        en: "This promo code is inactive.",
        ar: "كود الخصم غير نشط.",
      });
    }
    if (message?.includes("Promo code is not active yet")) {
      return t({
        en: "This promo code is not active yet.",
        ar: "كود الخصم غير متاح للاستخدام بعد.",
      });
    }
    if (message?.includes("promo minimum")) {
      return t({
        en: "Your product subtotal does not meet this promo code's minimum.",
        ar: "قيمة المنتجات لا تحقق الحد الأدنى المطلوب لهذا الكود.",
      });
    }
    if (message?.includes("your usage limit")) {
      return t({
        en: "You have reached the usage limit for this promo code.",
        ar: "لقد وصلت إلى الحد المسموح لاستخدام كود الخصم.",
      });
    }
    if (message?.includes("usage limit")) {
      return t({
        en: "This promo code has reached its usage limit.",
        ar: "وصل كود الخصم إلى الحد الأقصى للاستخدام.",
      });
    }
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
    if (message?.includes("must total 100")) {
      return t({
        en: "Your custom espresso blend ratios must total 100%. Please adjust it in the studio and add it again.",
        ar: "يجب أن يكون مجموع نسب توليفة الإسبريسو المخصصة 100%. يرجى تعديلها في الاستوديو وإضافتها مرة أخرى.",
      });
    }
    if (
      message?.includes("is missing its bean selection") ||
      message?.includes("is missing its flavor selection") ||
      message?.includes("is missing its base") ||
      message?.includes("Invalid espresso blend") ||
      message?.includes("Invalid flavor selection") ||
      message?.includes("Duplicate bean") ||
      message?.includes("Duplicate flavor") ||
      message?.includes("cannot use more than")
    ) {
      return t({
        en: "Your custom blend/mix could not be validated. Please remove it and add it again from the studio.",
        ar: "تعذر التحقق من التوليفة/الخلطة المخصصة. يرجى حذفها وإضافتها مرة أخرى من الاستوديو.",
      });
    }
    if (message?.includes("Invalid email")) {
      return t({ en: "Enter a valid email address.", ar: "أدخل بريداً إلكترونياً صحيحاً." });
    }
    if (message?.includes("Invalid Google Maps URL")) {
      return t({
        en: "Enter a valid Google Maps link.",
        ar: "أدخل رابط Google Maps صالحاً.",
      });
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

  function handlePromoCodeChange(rawValue: string) {
    setPromoCode(rawValue.toUpperCase());
    setPromoResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitInFlight.current) return;
    setSubmitError(null);
    if (storeClosed) {
      setSubmitError(getCheckoutError("Store is closed"));
      return;
    }
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const mappedItems = items.map(buildCheckoutItem);
    if (mappedItems.some((item) => item === null)) {
      setSubmitError(t({
        en: "A cart item is missing its details. Remove it and add it again.",
        ar: "بيانات أحد عناصر السلة غير مكتملة. احذفه ثم أضفه مرة أخرى.",
      }));
      return;
    }
    const checkoutItems = mappedItems.filter(
      (item): item is CheckoutRpcItem => item !== null,
    );

    submitInFlight.current = true;
    setSubmitting(true);
    let orderPlaced = false;
    try {
      checkoutAttemptId.current ??= createCheckoutAttemptId();
      const notificationAttemptId = checkoutAttemptId.current;
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
            area: resolvedArea,
            city: resolvedArea,
            street: form.street.trim(),
            building: form.building.trim() || null,
            floor: form.floorApt.trim() || null,
            googleMapsUrl: form.googleMapsUrl.trim() || null,
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

      const handoff: CheckoutOrderHandoff = {
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          whatsapp: form.whatsapp.trim(),
        },
        address: {
          governorate: form.governorate,
          area: resolvedArea,
          street: form.street.trim(),
          building: form.building.trim(),
          floorApt: form.floorApt.trim(),
        },
        items: items.map((item) => ({
          name: t(item.name),
          detail: t(item.detail),
          quantity: item.qty,
        })),
        whatsappHref,
        telegramStatus: "failed",
      };

      try {
        const notificationResponse = await fetch("/api/order-notifications/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: data.order_id,
            checkoutAttemptId: notificationAttemptId,
          }),
        });
        handoff.telegramStatus = notificationResponse.ok ? "sent" : "failed";
        if (!notificationResponse.ok) {
          console.warn("[checkout] Order saved, but Telegram notification failed.");
        }
      } catch {
        console.warn("[checkout] Order saved, but Telegram notification failed.");
      }

      try {
        window.sessionStorage.setItem(
          checkoutResultStorageKey(data.order_id),
          JSON.stringify({ ...data, handoff }),
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
      if (!orderPlaced) {
        submitInFlight.current = false;
        setSubmitting(false);
      }
    }
  }

  if (items.length === 0 && !submitting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0806] px-4 text-center">
        <ShoppingBag className="mb-4 h-12 w-12 text-[#D6A373]/70" />
        <h1 className="mb-2 font-serif text-xl font-bold text-[#F5E6D8]">
          {t({ en: "Your cart is empty", ar: "سلتك فارغة" })}
        </h1>
        <p className="mb-6 text-sm text-[#D6B79A]/75">
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
          {closedNotice && (
            <p
              role="status"
              className="mt-4 max-w-2xl rounded-xl border border-[#D6A373]/25 bg-[#D6A373]/10 px-4 py-3 text-sm leading-6 text-[#F5E6D8]"
            >
              {closedNotice}
            </p>
          )}
        </div>
      </section>

      {/* Form + Summary */}
      <section className="cinematic-section section-bg-warm pb-24 pt-12">
        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-3">

            {/* ── Left: Form ── */}
            <div className="space-y-6 lg:col-span-2">
              <AddressSection
                t={t}
                dir={dir}
                form={form}
                errors={errors}
                update={update}
                user={user}
                savedAddresses={savedAddresses}
                selectedAddressId={selectedAddressId}
                applySavedAddress={applySavedAddress}
                govOptions={govOptions}
                areaOptions={areaOptions}
              />
              <PaymentSection t={t} dir={dir} form={form} update={update} />
            </div>

            {/* ── Right: Summary ── */}
            <div>
              <OrderSummary
                t={t}
                dir={dir}
                items={items}
                total={total}
                promoDiscount={promoDiscount}
                deliveryZone={deliveryZone}
                deliveryFee={deliveryFee}
                grandTotal={grandTotal}
                submitting={submitting}
                storeClosed={storeClosed}
                submitError={submitError}
                paymentMethod={form.paymentMethod}
                promoCode={promoCode}
                onPromoCodeChange={handlePromoCodeChange}
                onApplyPromo={handleApplyPromo}
                validatingPromo={validatingPromo}
                promoResult={promoResult}
                promoMatchesSubtotal={promoMatchesSubtotal}
              />
            </div>

          </form>
        </div>
      </section>
    </div>
  );
}
