// Shared FAQ content for /contact — imported by BOTH the client page (visible
// rendering) and its server layout (FAQPage JSON-LD), so the structured data
// can never diverge from what a visitor actually sees. Framework-agnostic,
// no "use client" needed.
//
// Content correctness notes (Phase 3):
//   - Delivery: matches the real zone engine (Cairo/Giza priced by Line
//     Coffee, other governorates via a courier partner paid on delivery) —
//     see /shipping and resolve_delivery_fee() in SQL.
//   - Freshness: does NOT claim in-house roasting. Regular catalog products
//     are bought finished, not roasted to order (Locked Decision 2); only
//     Make Your Espresso blends beans to a customer ratio (Decision 3).
//   - Returns: the 48-hour window matches /returns (the canonical policy),
//     not an unrelated number.

export type ContactFaqItem = {
  question: { en: string; ar: string };
  answer: { en: string; ar: string };
};

export const CONTACT_FAQ_ITEMS: ContactFaqItem[] = [
  {
    question: { en: "Do you deliver across Egypt?", ar: "هل تقومون بالتوصيل لجميع أنحاء مصر؟" },
    answer: {
      en: "Yes. Cairo and Giza are delivered by our own delivery zones, with the fee shown at checkout. For other governorates, your order is handed to a courier partner and its fee is collected separately, on delivery. Most orders arrive within 1–3 business days depending on location.",
      ar: "نعم. القاهرة والجيزة تُخدَّمان عبر مناطق التوصيل الخاصة بنا، وتظهر الرسوم عند إتمام الطلب. أما باقي المحافظات، فيُسلَّم طلبك لشريك شحن وتُحصَّل رسومه بشكل منفصل عند الاستلام. تصل معظم الطلبات خلال 1–3 أيام عمل حسب الموقع.",
    },
  },
  {
    question: { en: "How fresh is the coffee when it arrives?", ar: "ما مدى طازجية القهوة عند وصولها؟" },
    answer: {
      en: "We hand-pick and package every order with freshness in mind, sealed in one-way valve bags, and never let stock sit for long. If you want a fully custom blend, Make Your Espresso lets us build one to order for you.",
      ar: "نختار ونعبئ كل طلب بعناية مع مراعاة الطازجية، في أكياس ذات صمام أحادي الاتجاه، ولا نترك المخزون لفترة طويلة. وإذا أردت خلطة خاصة تماماً، يتيح لك 'اصنع إسبريسو خاصتك' تصميم خلطتك عند الطلب.",
    },
  },
  {
    question: { en: "Can I order a custom blend?", ar: "هل أستطيع طلب خلطة خاصة بي؟" },
    answer: {
      en: "Yes. Use our Make Your Espresso or Make Your Flavor studios to build your blend, then add it to your cart. We handle the ratios and packaging.",
      ar: "نعم. استخدم استوديو 'اصنع إسبريسو خاصتك' أو 'اصنع نكهتك' لتصميم خلطتك، ثم أضفها لسلة مشترياتك. نتولى نحن النسب والتعبئة.",
    },
  },
  {
    question: { en: "Do you offer wholesale pricing?", ar: "هل تتوفر أسعار الجملة؟" },
    answer: {
      en: "Yes, for cafes, offices, and resellers. Message us on WhatsApp with your expected monthly volume and we will send a tailored quote.",
      ar: "نعم، للمقاهي والمكاتب وتجار الجملة. راسلنا عبر واتساب بحجمك الشهري المتوقع وسنرسل لك عرض سعر مخصص.",
    },
  },
  {
    question: { en: "What is your return policy?", ar: "ما هي سياسة الاسترجاع؟" },
    answer: {
      en: "You may request a return or replacement within 48 hours of receiving your order if it arrived damaged, incorrect, or with a verifiable quality issue — see our Returns Policy for full details.",
      ar: "يمكنك طلب إرجاع أو استبدال خلال 48 ساعة من استلام طلبك إذا وصل تالفاً أو خاطئاً أو به عيب جودة قابل للتحقق — راجع سياسة الإرجاع لدينا للتفاصيل الكاملة.",
    },
  },
  {
    question: { en: "Can I visit the roastery?", ar: "هل يمكنني زيارة المحمصة؟" },
    answer: {
      en: "We receive visitors by appointment only. Reach out via WhatsApp to schedule a visit and a cupping session.",
      ar: "نستقبل الزوار بالموعد المسبق فقط. تواصل معنا عبر واتساب لترتيب زيارة وجلسة تذوق.",
    },
  },
];
