"use client";

import { useEffect, useState, type ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { useLanguage } from "@/lib/context/language";
import { submitContactMessage } from "@/lib/cms/public-cms";
import {
  DEFAULT_ADMIN_SETTINGS,
  formatPublicPhone,
  getPublicSettings,
  resolvePublicPhone,
  toEmailHref,
  toPhoneHref,
  toWhatsAppHref,
} from "@/lib/admin/admin-settings";
import { cn } from "@/lib/utils/cn";

// ─── Static mock content ──────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: { en: "Do you deliver across Egypt?",           ar: "هل تقومون بالتوصيل لجميع أنحاء مصر؟" },
    a: {
      en: "Yes, we deliver to all Egyptian governorates. Orders typically arrive within 1–3 business days depending on your location.",
      ar: "نعم، نوصل لجميع محافظات مصر. تصل الطلبات عادةً في غضون 1–3 أيام عمل حسب موقعك.",
    },
  },
  {
    q: { en: "How fresh is the coffee when it arrives?", ar: "ما مدى طازجية القهوة عند وصولها؟" },
    a: {
      en: "Every order is roasted within 72 hours of shipment. We never sell pre-roasted stock. You receive coffee at its peak.",
      ar: "كل طلب يُحمَّص في غضون 72 ساعة من الشحن. لا نبيع قهوة محمصة مسبقاً أبداً. تصلك قهوتك في ذروة طازجيتها.",
    },
  },
  {
    q: { en: "Can I order a custom blend?",             ar: "هل أستطيع طلب خلطة خاصة بي؟" },
    a: {
      en: "Yes. Use our Make Your Espresso or Make Your Flavor studios to build your blend, then add it to your cart. We handle the ratios and roasting.",
      ar: "نعم. استخدم استوديو 'اصنع إسبريسو خاصتك' أو 'اصنع نكهتك' لتصميم خلطتك، ثم أضفها لسلة مشترياتك. نتولى نحن النسب والتحميص.",
    },
  },
  {
    q: { en: "Do you offer wholesale pricing?",         ar: "هل تتوفر أسعار الجملة؟" },
    a: {
      en: "Yes, for cafes, offices, and resellers. Message us on WhatsApp with your expected monthly volume and we will send a tailored quote.",
      ar: "نعم، للمقاهي والمكاتب وتجار الجملة. راسلنا عبر واتساب بحجمك الشهري المتوقع وسنرسل لك عرض سعر مخصص.",
    },
  },
  {
    q: { en: "What is your return policy?",             ar: "ما هي سياسة الاسترجاع؟" },
    a: {
      en: "We accept returns within 7 days for unopened products. For freshness concerns, contact us immediately and we will make it right.",
      ar: "نقبل الاسترجاع خلال 7 أيام للمنتجات غير المفتوحة. لأي مخاوف تتعلق بالطازجية، تواصل معنا فوراً وسنحل المشكلة.",
    },
  },
  {
    q: { en: "Can I visit the roastery?",               ar: "هل يمكنني زيارة المحمصة؟" },
    a: {
      en: "We receive visitors by appointment only. Reach out via WhatsApp to schedule a visit and a cupping session.",
      ar: "نستقبل الزوار بالموعد المسبق فقط. تواصل معنا عبر واتساب لترتيب زيارة وجلسة تذوق.",
    },
  },
];

// ─── Contact info card ────────────────────────────────────────────────────────

function ContactCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  label: { en: string; ar: string };
  value: string | { en: string; ar: string };
  href?: string;
}) {
  const { t } = useLanguage();
  const display = typeof value === "string" ? value : t(value);

  const inner = (
    <div className="luxury-panel flex items-start gap-4 rounded-2xl p-5">
      <div className="pub-icon-circle h-11 w-11 shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#D6A373]/80">
          {t(label)}
        </p>
        <p className="break-all text-sm font-semibold text-[#F5E6D8]">{display}</p>
      </div>
    </div>
  );

  if (!href) return <div>{inner}</div>;

  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="block"
    >
      {inner}
    </a>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

type FormFields = {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
};

const EMPTY_FORM: FormFields = { name: "", phone: "", email: "", subject: "", message: "" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const { dir, t } = useLanguage();
  const isRtl = dir === "rtl";

  const [form, setForm]           = useState<FormFields>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openFaq, setOpenFaq]     = useState<number | null>(null);
  const [settings, setSettings] = useState(DEFAULT_ADMIN_SETTINGS);
  const whatsappNumber = resolvePublicPhone(
    settings.contact.whatsappNumber,
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "",
  );
  // No WhatsApp fallback here — a Phone card only appears for a real, distinct
  // support line, so the same number is never shown twice.
  const supportPhone = resolvePublicPhone(settings.contact.supportPhone);
  const whatsappDisplay = whatsappNumber ? formatPublicPhone(whatsappNumber) : null;
  const supportPhoneDisplay = supportPhone ? formatPublicPhone(supportPhone) : null;
  const phoneIsDistinct =
    Boolean(supportPhone) && supportPhoneDisplay !== whatsappDisplay;
  const phoneDisplay = phoneIsDistinct ? supportPhoneDisplay : null;
  const phoneHref = phoneIsDistinct && supportPhone ? toPhoneHref(supportPhone) : null;
  const emailHref = toEmailHref(settings.contact.supportEmail);
  const whatsappHref = toWhatsAppHref(
    whatsappNumber ?? "",
    settings.social.whatsapp,
  );
  const hasContact =
    Boolean(whatsappHref) ||
    Boolean(phoneHref) ||
    Boolean(emailHref) ||
    Boolean(settings.contact.businessAddress.trim());

  useEffect(() => {
    let active = true;
    getPublicSettings()
      .then((next) => {
        if (active) setSettings(next);
      })
      .catch(() => {
        // The contact form remains available without inventing contact details.
      });
    return () => {
      active = false;
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!form.name.trim() || !form.subject || !form.message.trim()) {
      setSubmitError(t({
        en: "Please complete the required fields.",
        ar: "يرجى استكمال الحقول المطلوبة.",
      }));
      return;
    }

    if (!form.phone.trim() && !form.email.trim()) {
      setSubmitError(t({
        en: "Please add a phone number or email.",
        ar: "يرجى إضافة رقم هاتف أو بريد إلكتروني.",
      }));
      return;
    }

    setSubmitting(true);
    try {
      await submitContactMessage({
        ...form,
        source: "contact_page",
      });
      setSubmitted(true);
    } catch {
      setSubmitError(t({
        en: "We could not send your message. Please try again.",
        ar: "تعذر إرسال رسالتك. يرجى المحاولة مرة أخرى.",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="arabic-body min-h-screen bg-[#0B0806] text-[#F5E6D8]">

      {/* ── 1. Hero ───────────────────────────────────────────────── */}
      <section className="products-hero relative overflow-hidden pb-14 pt-28 sm:pb-16 lg:pb-20 lg:pt-36">
        <Image
          src="/assets/story/roastery.png"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center brightness-[0.52] saturate-[0.90]"
        />
        <div className="absolute inset-0 bg-[#0B0806]/48" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,8,6,0.3)_0%,rgba(11,8,6,0.82)_70%,#0B0806_100%)]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_30%,rgba(182,136,94,0.12),transparent_65%)]"
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <h1 className="pub-display mb-4 font-serif text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {t({ en: "Get in Touch", ar: "تواصل معنا" })}
          </h1>
          <p className="mx-auto max-w-xl text-base leading-7 text-[#D6B79A]/70">
            {t({
              en: "Questions about your order, custom blends, or wholesale? We are here.",
              ar: "أسئلة عن طلبك، خلطة خاصة، أو الجملة؟ نحن هنا.",
            })}
          </p>
        </div>
      </section>

      {/* ── 2. Form + Info ────────────────────────────────────────── */}
      {/*
        Explicit order: Form lg:order-1 (left LTR / right RTL),
        Info lg:order-2 (right LTR / left RTL).
        Same direction-sensitive order pattern as /about.
      */}
      <section className="cinematic-section section-bg-warm relative overflow-hidden py-16 md:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_30%_50%,rgba(182,136,94,0.06),transparent_65%)]"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">

            {/* ── Contact Form — order-1 ────────────────────────── */}
            <div className="flex-1 lg:order-1">
              <div className="luxury-panel rounded-2xl p-6 sm:p-8">
                {submitted ? (
                  /* Success state */
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="pub-icon-circle mb-5 h-16 w-16">
                      <MessageCircle className="h-7 w-7" />
                    </div>
                    <h2 className="mb-2 font-serif text-2xl font-bold text-[#F5E6D8]">
                      {t({ en: "Message Sent", ar: "تم إرسال رسالتك" })}
                    </h2>
                    <p className="mb-8 max-w-sm text-sm leading-7 text-[#D6B79A]/85">
                      {t({
                        en: "Thank you for reaching out. We will get back to you within 24 hours.",
                        ar: "شكراً على تواصلك. سنرد عليك في غضون 24 ساعة.",
                      })}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setForm(EMPTY_FORM); setSubmitted(false); }}
                      className="premium-button-outline rounded-full px-6 py-2.5 text-sm font-semibold"
                    >
                      {t({ en: "Send another message", ar: "إرسال رسالة أخرى" })}
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="mb-6 font-serif text-2xl font-bold text-[#F5E6D8]">
                      {t({ en: "Send a Message", ar: "أرسل رسالة" })}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4" dir={dir} noValidate>
                      {/* Name + Phone */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A373]/72">
                            {t({ en: "Full Name", ar: "الاسم الكامل" })}
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            placeholder={t({ en: "Your name", ar: "اسمك" })}
                            className="line-input w-full"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A373]/72">
                            {t({ en: "Phone", ar: "رقم الهاتف" })}
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="01xxxxxxxxx"
                            dir="ltr"
                            className="line-input w-full"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A373]/72">
                          {t({ en: "Email", ar: "البريد الإلكتروني" })}
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="you@example.com"
                          dir="ltr"
                          className="line-input w-full"
                        />
                      </div>

                      {/* Subject */}
                      <div>
                        <label htmlFor="contact-subject" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A373]/72">
                          {t({ en: "Subject", ar: "الموضوع" })}
                        </label>
                        <div className="relative">
                          <select
                            id="contact-subject"
                            name="subject"
                            value={form.subject}
                            onChange={handleChange}
                            required
                            className="line-select w-full"
                          >
                            <option value="" disabled>
                              {t({ en: "Select a topic", ar: "اختر موضوعاً" })}
                            </option>
                            <option value="general">{t({ en: "General inquiry", ar: "استفسار عام" })}</option>
                            <option value="order">{t({ en: "Order issue", ar: "مشكلة في الطلب" })}</option>
                            <option value="wholesale">{t({ en: "Wholesale", ar: "جملة" })}</option>
                            <option value="custom">{t({ en: "Custom blend", ar: "خلطة خاصة" })}</option>
                            <option value="other">{t({ en: "Other", ar: "أخرى" })}</option>
                          </select>
                        </div>
                      </div>

                      {/* Message */}
                      <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A373]/72">
                          {t({ en: "Message", ar: "الرسالة" })}
                        </label>
                        <textarea
                          name="message"
                          value={form.message}
                          onChange={handleChange}
                          required
                          rows={5}
                          placeholder={t({ en: "How can we help?", ar: "كيف يمكننا مساعدتك؟" })}
                          className="line-input w-full resize-none"
                        />
                      </div>

                      {submitError && (
                        <p className="text-sm text-[#f87171]" role="alert">
                          {submitError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="premium-button mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {t({ en: "Send Message", ar: "إرسال الرسالة" })}
                        <ArrowRight className={cn("h-4 w-4 shrink-0", isRtl && "rotate-180")} />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>

            {/* ── Contact Info — order-2 ────────────────────────── */}
            <div className="flex flex-col gap-3 lg:order-2 lg:w-[22rem] lg:shrink-0">
              <h2 className="mb-1 font-serif text-xl font-bold text-[#F5E6D8]">
                {t({ en: "Contact Info", ar: "معلومات التواصل" })}
              </h2>

              {whatsappHref && <ContactCard
                icon={WhatsAppIcon}
                label={{ en: "WhatsApp", ar: "واتساب" }}
                value={whatsappDisplay || "WhatsApp"}
                href={whatsappHref}
              />}
              {phoneHref && phoneDisplay && <ContactCard
                icon={Phone}
                label={{ en: "Phone", ar: "هاتف" }}
                value={phoneDisplay}
                href={phoneHref}
              />}
              {emailHref && <ContactCard
                icon={Mail}
                label={{ en: "Email", ar: "بريد إلكتروني" }}
                value={settings.contact.supportEmail}
                href={emailHref}
              />}
              {settings.contact.businessAddress.trim() && <ContactCard
                icon={MapPin}
                label={{ en: "Location", ar: "الموقع" }}
                value={settings.contact.businessAddress}
              />}
              {!hasContact && (
                <div className="luxury-panel rounded-2xl p-5 text-sm leading-6 text-[#D6B79A]/70">
                  {t({
                    en: "Contact details are not available yet. You can still send us a message using the form.",
                    ar: "بيانات التواصل غير متاحة حالياً. لا يزال بإمكانك إرسال رسالة عبر النموذج.",
                  })}
                </div>
              )}

              {(whatsappHref || emailHref) && <div className="luxury-panel mt-1 rounded-2xl p-5">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#D6A373]/85">
                  {t({ en: "Response time", ar: "وقت الرد" })}
                </p>
                <p className="text-sm leading-6 text-[#D6B79A]/70">
                  {t({
                    en: "We typically respond within a few hours on WhatsApp, or within 24 hours by email.",
                    ar: "نرد عادةً في غضون ساعات قليلة على واتساب، أو خلال 24 ساعة عبر البريد الإلكتروني.",
                  })}
                </p>
              </div>}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. WhatsApp Feature Strip ─────────────────────────────── */}
      {whatsappHref && <section className="cinematic-section relative overflow-hidden py-16 md:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a04] via-[#120d09] to-[#0b0806]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_50%_50%,rgba(158,59,28,0.16),transparent_65%)]"
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#9e3b1c]/40 bg-[#9e3b1c]/14">
            <WhatsAppIcon className="h-6 w-6 text-[#f5cdb2]" />
          </div>

          <h2 className="pub-display mb-3 font-serif text-3xl font-bold sm:text-4xl">
            {t({ en: "Prefer WhatsApp?", ar: "تفضل واتساب؟" })}
          </h2>

          <p className="mx-auto mb-6 max-w-md text-base leading-7 text-[#D6B79A]/85">
            {t({
              en: "Most customers reach us faster on WhatsApp. Click below to start a conversation.",
              ar: "معظم عملائنا يصلونا بشكل أسرع عبر واتساب. اضغط أدناه لبدء محادثة.",
            })}
          </p>

          <p className="mb-7 text-2xl font-bold tracking-wide text-[#f5cdb2]" dir="ltr">
            {whatsappDisplay || "WhatsApp"}
          </p>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="studio-espresso-btn inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold"
          >
            {t({ en: "Chat on WhatsApp", ar: "تحدث عبر واتساب" })}
            <ArrowRight className={cn("h-4 w-4 shrink-0", isRtl && "rotate-180")} />
          </a>
        </div>
      </section>}

      {/* ── 4. FAQ + CTA ──────────────────────────────────────────── */}
      <section className="cinematic-section section-bg-black relative overflow-hidden py-16 md:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_55%_at_50%_20%,rgba(182,136,94,0.06),transparent_62%)]"
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4">
          <div className="mb-10 text-center">
            <p className="premium-section-kicker mx-auto mb-5">
              {t({ en: "FAQ", ar: "الأسئلة الشائعة" })}
            </p>
            <h2 className="pub-display font-serif text-3xl font-bold sm:text-4xl">
              {t({ en: "Common Questions", ar: "أسئلة شائعة" })}
            </h2>
          </div>

          <div className="space-y-2">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={item.q.en}
                  className={cn(
                    "overflow-hidden rounded-xl border transition-colors duration-200",
                    isOpen
                      ? "border-[#D6A373]/28 bg-[#1B140F]/80"
                      : "border-[#B6885E]/14 bg-[#120D09]/60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen ? "true" : "false"}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
                  >
                    <span className="text-sm font-semibold text-[#F5E6D8]">
                      {t(item.q)}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-[#D6A373] transition-transform duration-300",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#B6885E]/14 px-5 pb-5 pt-4">
                      <p className="text-sm leading-7 text-[#D6B79A]/85">
                        {t(item.a)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-14 text-center">
            <p className="mb-5 text-sm text-[#D6B79A]/78">
              {t({ en: "Ready to explore the range?", ar: "مستعد لاستكشاف المجموعة؟" })}
            </p>
            <Link
              href="/products"
              className="premium-button inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              {t({ en: "Explore Products", ar: "استكشف المنتجات" })}
              <ArrowRight className={cn("h-4 w-4 shrink-0", isRtl && "rotate-180")} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
