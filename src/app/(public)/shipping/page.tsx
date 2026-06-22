"use client";

import {
  LegalPageLayout,
  type LegalSection,
} from "@/components/ui/LegalPageLayout";

const sections: LegalSection[] = [
  {
    title: { en: "Delivery Areas", ar: "مناطق التوصيل" },
    paragraphs: [
      {
        en: "We currently deliver to all governorates within Greater Cairo (Cairo, Giza, Qalyubia), as well as Alexandria, Mansoura, Tanta, Asyut, and Fayoum. Deliveries to other governorates are available on request — please contact us via WhatsApp before placing your order.",
        ar: "نوصّل حالياً إلى جميع محافظات القاهرة الكبرى (القاهرة والجيزة والقليوبية)، فضلاً عن الإسكندرية والمنصورة وطنطا وأسيوط والفيوم. التوصيل إلى المحافظات الأخرى متاح عند الطلب — يرجى التواصل معنا عبر واتساب قبل تقديم طلبك.",
      },
    ],
  },
  {
    title: { en: "Delivery Times", ar: "أوقات التوصيل" },
    paragraphs: [
      {
        en: "Standard delivery within Greater Cairo takes 1–2 business days from the time your order is confirmed. Deliveries to other cities typically take 3–5 business days.",
        ar: "يستغرق التوصيل القياسي داخل القاهرة الكبرى من 1 إلى 2 يوم عمل من وقت تأكيد طلبك. يستغرق التوصيل إلى المدن الأخرى عادةً من 3 إلى 5 أيام عمل.",
      },
      {
        en: "Express delivery (same-day or next-day) is available in select Cairo districts for orders placed before 12:00 PM. An additional fee applies — see Delivery Fees below.",
        ar: "التوصيل السريع (في نفس اليوم أو في اليوم التالي) متاح في أحياء مختارة من القاهرة للطلبات المقدمة قبل الساعة 12:00 ظهراً. تُطبق رسوم إضافية — راجع رسوم التوصيل أدناه.",
      },
      {
        en: "All delivery times are estimates and may be affected by high demand periods, weather conditions, or logistical delays outside our control.",
        ar: "جميع أوقات التوصيل تقديرية وقد تتأثر بفترات الطلب المرتفع أو الظروف الجوية أو التأخيرات اللوجستية خارج نطاق سيطرتنا.",
      },
    ],
  },
  {
    title: { en: "Delivery Fees", ar: "رسوم التوصيل" },
    paragraphs: [
      {
        en: "Standard delivery is free for orders of 500 EGP or more within Greater Cairo. For orders below 500 EGP, a flat fee of 50 EGP applies.",
        ar: "التوصيل القياسي مجاني للطلبات بقيمة 500 ج.م أو أكثر داخل القاهرة الكبرى. للطلبات أقل من 500 ج.م، تُطبق رسوم ثابتة قدرها 50 ج.م.",
      },
      {
        en: "Express delivery carries a fixed fee of 80 EGP regardless of order value. Delivery to other cities is calculated based on your location and order weight — exact fees are communicated at checkout.",
        ar: "يحمل التوصيل السريع رسوماً ثابتة قدرها 80 ج.م بغض النظر عن قيمة الطلب. يتم احتساب التوصيل إلى المدن الأخرى بناءً على موقعك ووزن الطلب — يتم إبلاغك بالرسوم الدقيقة عند الدفع.",
      },
    ],
  },
  {
    title: { en: "Order Tracking", ar: "تتبع الطلب" },
    paragraphs: [
      {
        en: "Once your order is dispatched, our team will send you a confirmation via WhatsApp or phone call with an estimated delivery window. You can reach us at any time during business hours to inquire about your order status.",
        ar: "بمجرد شحن طلبك، سيرسل فريقنا تأكيداً عبر واتساب أو مكالمة هاتفية بنافذة التوصيل المقدّرة. يمكنك التواصل معنا في أي وقت خلال ساعات العمل للاستفسار عن حالة طلبك.",
      },
    ],
  },
  {
    title: {
      en: "Failed Delivery Attempts",
      ar: "محاولات التوصيل الفاشلة",
    },
    paragraphs: [
      {
        en: "If a delivery attempt fails due to an incorrect address or the recipient being unavailable, our courier will contact you to arrange a re-delivery. A re-delivery fee of 30 EGP may apply for a second attempt.",
        ar: "إذا فشلت محاولة توصيل بسبب عنوان غير صحيح أو غياب المستلم، سيتواصل مندوبنا معك لترتيب إعادة توصيل. قد تُطبق رسوم إعادة توصيل بقيمة 30 ج.م للمحاولة الثانية.",
      },
    ],
  },
  {
    title: {
      en: "Freshness Guarantee",
      ar: "ضمان الطزاجة",
    },
    paragraphs: [
      {
        en: "All Line Coffee products are roasted within 72 hours of shipping. We package using one-way valve bags to preserve freshness during transit. If your order arrives in unsatisfactory condition, please contact us within 24 hours of receipt.",
        ar: "يتم تحميص جميع منتجات لاين كوفي خلال 72 ساعة من الشحن. نستخدم أكياساً ذات صمام أحادي الاتجاه للحفاظ على الطزاجة أثناء النقل. إذا وصل طلبك في حالة غير مرضية، يرجى التواصل معنا خلال 24 ساعة من الاستلام.",
      },
    ],
  },
];

export default function ShippingPage() {
  return (
    <LegalPageLayout
      heroTitle={{ en: "Shipping Policy", ar: "سياسة الشحن" }}
      heroSubtitle={{
        en: "Delivery areas, times, fees, and our freshness guarantee.",
        ar: "مناطق التوصيل والأوقات والرسوم وضمان الطزاجة.",
      }}
      lastUpdated="2026-06-01"
      sections={sections}
    />
  );
}
