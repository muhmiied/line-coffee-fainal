"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { submitContactMessage } from "@/lib/cms/public-cms";
import {
  formatPublicPhone,
  getPublicSettings,
  resolvePublicPhone,
  toPhoneHref,
} from "@/lib/settings/public-site-settings";
import { assets, contactItems } from "@/lib/mock-data/visual-content";
import type { ContactItemKind, VisualContactItem } from "@/types/homepage";
import { SectionHeading } from "@/components/ui/SectionHeading";

const contactIconMap: Record<ContactItemKind, typeof MapPin> = {
  location: MapPin,
  phone: Phone,
  mail: Mail,
};

type ContactSectionProps = {
  items?: VisualContactItem[];
};

export function ContactSection({ items = contactItems }: ContactSectionProps) {
  const { t } = useLanguage();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fallbackPhone = resolvePublicPhone(
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "",
  );
  const [publicPhone, setPublicPhone] = useState<string | null>(fallbackPhone);
  const phoneDisplay = publicPhone ? formatPublicPhone(publicPhone) : null;
  const phoneHref = publicPhone ? toPhoneHref(publicPhone) : null;
  const resolvedItems = items.flatMap((item) =>
    item.kind !== "phone"
      ? [item]
      : phoneDisplay && phoneHref
        ? [{
            ...item,
            value: { en: phoneDisplay, ar: phoneDisplay },
            href: phoneHref,
          }]
        : [],
  );

  useEffect(() => {
    let active = true;
    getPublicSettings()
      .then((settings) => {
        if (!active) return;
        setPublicPhone(resolvePublicPhone(
          settings.contact.supportPhone,
          settings.contact.whatsappNumber,
          process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "",
        ));
      })
      .catch(() => {
        // The env fallback remains visible; otherwise the phone row stays hidden.
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitContactMessage({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        subject: String(form.get("subject") ?? ""),
        message: String(form.get("message") ?? ""),
        source: "homepage",
      });
      setSent(true);
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
    <>
      <section
        className="arabic-body cinematic-section section-bg-black relative overflow-hidden py-16 md:py-24"
      >
      <Image
        src={assets.backgrounds.contact}
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-[0.20]"
      />
      <div className="absolute inset-0 bg-[#0B0806]/76" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(182,136,94,0.06)_0%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-20">

          {/* ── Info column ─────────────────────────────────────────── */}
          <div className="reveal-on-scroll" data-reveal>
            <SectionHeading
              eyebrow={{ en: "Get In Touch", ar: "تواصل معنا" }}
              title={{ en: "We'd Love To Hear From You", ar: "يسعدنا أن نسمع منك" }}
              align="start"
            />

            <p className="mb-10 max-w-md text-[0.95rem] leading-[1.85] text-[#B79B85]/70">
              {t({
                en: "Have a question about products or bulk orders? Reach out and we will get back to you soon.",
                ar: "هل لديك سؤال عن المنتجات أو طلبات بالجملة؟ تواصل معنا وسنرد عليك في أقرب وقت.",
              })}
            </p>

            <div className="space-y-4">
              {resolvedItems.map((item) => {
                const Icon = contactIconMap[item.kind];
                const content = (
                  <div className="flex items-start gap-4">
                    <div className="line-card-icon-shell flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#B6885E]/22 bg-[#B6885E]/10">
                      <Icon className="line-card-icon h-4 w-4 text-[#B6885E]" />
                    </div>
                    <div>
                      <p className="mb-0.5 font-medium text-[#F5E6D8]">
                        {t(item.label)}
                      </p>
                      <p className={item.kind === "location" ? "text-sm text-[#B79B85]/65" : "numeric-symbol text-sm text-[#B79B85]/65"}>
                        {t(item.value)}
                      </p>
                    </div>
                  </div>
                );

                return item.href ? (
                  <a
                    key={item.kind}
                    href={item.href}
                    className="block transition-opacity hover:opacity-80"
                  >
                    {content}
                  </a>
                ) : (
                  <div key={item.kind}>{content}</div>
                );
              })}
            </div>
          </div>

          {/* ── Form column ─────────────────────────────────────────── */}
          <div
            className="luxury-panel reveal-on-scroll reveal-from-right rounded-2xl p-6 md:p-8"
            data-reveal
          >
            <h3 className="mb-6 text-xl font-semibold text-[#F5E6D8]">
              {t({ en: "Send Us a Message", ar: "أرسل لنا رسالة" })}
            </h3>

            {sent ? (
              <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#B6885E]/28 bg-[#B6885E]/10">
                  <Mail className="h-6 w-6 text-[#B6885E]" />
                </div>
                <p className="text-lg font-semibold text-[#F5E6D8]">
                  {t({ en: "Message received!", ar: "استلمنا رسالتك!" })}
                </p>
                <p className="text-sm text-[#B79B85]/65">
                  {t({ en: "We'll be in touch shortly.", ar: "سنتواصل معك قريبًا." })}
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-2 text-xs text-[#D6A373]/60 underline underline-offset-2 hover:text-[#D6A373]"
                >
                  {t({ en: "Send another", ar: "إرسال رسالة أخرى" })}
                </button>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="sr-only" htmlFor="contact-name">
                      {t({ en: "Your Name", ar: "اسمك" })}
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      required
                      placeholder={t({ en: "Your Name", ar: "اسمك" })}
                      className="line-input"
                    />
                  </div>
                  <div>
                    <label className="sr-only" htmlFor="contact-email">
                      {t({ en: "Your Email", ar: "بريدك الإلكتروني" })}
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      placeholder={t({ en: "Your Email", ar: "بريدك الإلكتروني" })}
                      className="line-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="sr-only" htmlFor="contact-subject">
                    {t({ en: "Subject", ar: "الموضوع" })}
                  </label>
                  <input
                    id="contact-subject"
                    name="subject"
                    required
                    placeholder={t({ en: "Subject", ar: "الموضوع" })}
                    className="line-input"
                  />
                </div>

                <div>
                  <label className="sr-only" htmlFor="contact-message">
                    {t({ en: "Your Message", ar: "رسالتك" })}
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    required
                    placeholder={t({ en: "Your Message", ar: "رسالتك" })}
                    className="line-input resize-none"
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
                  className="premium-button w-full rounded-full px-6 py-3 font-semibold tracking-wide disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {t({ en: "Send Message", ar: "إرسال الرسالة" })}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      </section>
    </>
  );
}
