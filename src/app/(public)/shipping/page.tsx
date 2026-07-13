// Server component: it only supplies static bilingual data to the (client)
// LegalPageLayout, so it needs no "use client" of its own.
import {
  LegalPageLayout,
  type LegalSection,
} from "@/components/ui/LegalPageLayout";

const sections: LegalSection[] = [
  {
    title: { en: "Delivery Areas", ar: "مناطق التوصيل" },
    paragraphs: [
      {
        en: "We deliver to all governorates across Egypt — simply choose your governorate and area at checkout. Cairo and Giza are served by our own delivery zones. For governorates outside Cairo and Giza, your order is handed to a courier partner and the delivery fee is settled directly with the courier on arrival, separately from your Line Coffee order total.",
        ar: "نوصّل إلى جميع محافظات مصر — يكفي اختيار محافظتك ومنطقتك عند إتمام الطلب. القاهرة والجيزة تُخدَّمان عبر مناطق التوصيل الخاصة بنا. أما المحافظات خارج القاهرة والجيزة، فيُسلَّم طلبك لشريك شحن، ويتم تحصيل رسوم التوصيل مباشرة من المندوب عند الوصول، بشكل منفصل عن إجمالي طلبك في لاين كوفي.",
      },
    ],
  },
  {
    title: { en: "Delivery Times", ar: "أوقات التوصيل" },
    paragraphs: [
      {
        en: "Standard delivery within Greater Cairo typically takes 1–2 business days from the time your order is confirmed. Deliveries to other governorates typically take longer and depend on the courier partner serving your area.",
        ar: "يستغرق التوصيل القياسي داخل القاهرة الكبرى عادةً من 1 إلى 2 يوم عمل من وقت تأكيد طلبك. يستغرق التوصيل إلى المحافظات الأخرى وقتاً أطول عادةً، ويعتمد على شريك الشحن الذي يخدم منطقتك.",
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
        en: "Your exact delivery fee is calculated automatically from your governorate and area once you enter your address at checkout — you'll always see it before placing your order.",
        ar: "يتم احتساب رسوم التوصيل الخاصة بك تلقائياً بناءً على محافظتك ومنطقتك بمجرد إدخال عنوانك عند إتمام الطلب — ستظهر لك الرسوم دائماً قبل تأكيد الطلب.",
      },
      {
        en: "El-Shorouk and Madinaty: 30 EGP. Haram, 6th of October, and Sheikh Zayed: 100 EGP. The rest of Cairo and Giza: 50 EGP.",
        ar: "الشروق ومدينتي: 30 ج.م. الهرم و6 أكتوبر والشيخ زايد: 100 ج.م. باقي القاهرة والجيزة: 50 ج.م.",
      },
      {
        en: "For all other governorates, delivery is handled by a courier partner and its fee is not included in your Line Coffee order total — you pay the courier directly on delivery.",
        ar: "بالنسبة لباقي المحافظات، يتم التوصيل عبر شريك شحن، ولا تُدرَج رسومه ضمن إجمالي طلبك في لاين كوفي — يتم دفع الرسوم للمندوب مباشرة عند الاستلام.",
      },
    ],
  },
  {
    title: { en: "Order Tracking", ar: "تتبع الطلب" },
    paragraphs: [
      {
        en: "After you place your order, you can follow its status from your account's Orders page, and our team may reach out via WhatsApp with updates. You can contact us at any time to ask about your order status.",
        ar: "بعد تقديم طلبك، يمكنك متابعة حالته من صفحة الطلبات في حسابك، وقد يتواصل فريقنا معك عبر واتساب لتحديثك بمستجدات الطلب. يمكنك التواصل معنا في أي وقت للاستفسار عن حالة طلبك.",
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
        en: "If a delivery attempt fails due to an incorrect address or the recipient being unavailable, our team or courier will contact you to arrange another attempt.",
        ar: "إذا فشلت محاولة توصيل بسبب عنوان غير صحيح أو غياب المستلم، سيتواصل معك فريقنا أو المندوب لترتيب محاولة أخرى.",
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
      pageType="shipping"
      heroTitle={{ en: "Shipping Policy", ar: "سياسة الشحن" }}
      heroSubtitle={{
        en: "Delivery areas, times, fees, and our freshness guarantee.",
        ar: "مناطق التوصيل والأوقات والرسوم وضمان الطزاجة.",
      }}
      lastUpdated="2026-07-13"
      sections={sections}
    />
  );
}
