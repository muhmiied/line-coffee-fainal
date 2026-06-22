"use client";

import {
  LegalPageLayout,
  type LegalSection,
} from "@/components/ui/LegalPageLayout";

const sections: LegalSection[] = [
  {
    title: { en: "Acceptance of Terms", ar: "قبول الشروط" },
    paragraphs: [
      {
        en: "By accessing or using the Line Coffee website, placing an order, or using any of our services, you agree to be bound by these Terms of Use. If you do not agree, please discontinue use immediately.",
        ar: "بالوصول إلى موقع لاين كوفي أو استخدامه أو تقديم طلب أو استخدام أي من خدماتنا، فإنك توافق على الالتزام بشروط الاستخدام هذه. إذا كنت لا توافق، يرجى التوقف عن الاستخدام فوراً.",
      },
      {
        en: "We reserve the right to update or modify these terms at any time. Continued use of the website after any changes constitutes acceptance of the revised terms.",
        ar: "نحتفظ بالحق في تحديث أو تعديل هذه الشروط في أي وقت. الاستمرار في استخدام الموقع بعد أي تغييرات يمثل قبولاً للشروط المعدّلة.",
      },
    ],
  },
  {
    title: { en: "Products and Pricing", ar: "المنتجات والأسعار" },
    paragraphs: [
      {
        en: "All product descriptions, images, and prices on our website are for informational purposes. We reserve the right to modify prices, discontinue products, or correct pricing errors without prior notice.",
        ar: "جميع أوصاف المنتجات والصور والأسعار على موقعنا هي لأغراض إعلامية. نحتفظ بالحق في تعديل الأسعار أو وقف المنتجات أو تصحيح أخطاء التسعير دون إشعار مسبق.",
      },
      {
        en: "Product availability is subject to change. In the event a product is unavailable after your order is placed, we will contact you promptly to offer an alternative or a full refund.",
        ar: "توافر المنتجات عرضة للتغيير. في حال عدم توفر منتج بعد تقديم طلبك، سنتواصل معك على الفور لتقديم بديل أو استرداد كامل.",
      },
    ],
  },
  {
    title: { en: "Orders and Payment", ar: "الطلبات والدفع" },
    paragraphs: [
      {
        en: "Orders are confirmed upon receipt of payment. We currently accept cash on delivery as our primary payment method. Electronic payment options may be introduced in future updates.",
        ar: "يتم تأكيد الطلبات عند استلام الدفع. نقبل حالياً الدفع عند الاستلام كطريقة دفع أساسية. قد يتم تقديم خيارات الدفع الإلكتروني في تحديثات مستقبلية.",
      },
      {
        en: "All prices are listed in Egyptian Pounds (EGP) and are inclusive of applicable taxes unless stated otherwise.",
        ar: "جميع الأسعار مدرجة بالجنيه المصري (ج.م) وتشمل الضرائب المعمول بها ما لم يُذكر خلاف ذلك.",
      },
    ],
  },
  {
    title: { en: "Delivery and Shipping", ar: "التوصيل والشحن" },
    paragraphs: [
      {
        en: "Delivery times and fees are outlined in our Shipping Policy. We make every effort to deliver within the promised timeframe, but delays due to circumstances beyond our control (weather, logistics) may occur.",
        ar: "أوقات التوصيل والرسوم موضحة في سياسة الشحن لدينا. نبذل كل جهد ممكن للتوصيل خلال الإطار الزمني المحدد، ولكن قد تحدث تأخيرات بسبب ظروف خارجة عن إرادتنا (الطقس، اللوجستيات).",
      },
    ],
  },
  {
    title: { en: "Intellectual Property", ar: "الملكية الفكرية" },
    paragraphs: [
      {
        en: "All content on the Line Coffee website — including text, images, logos, blend names, and visual design — is the exclusive intellectual property of Line Coffee and is protected under Egyptian and international copyright law.",
        ar: "جميع المحتويات على موقع لاين كوفي — بما في ذلك النصوص والصور والشعارات وأسماء الخلطات والتصميم المرئي — هي ملكية فكرية حصرية للاين كوفي ومحمية بموجب قانون حقوق النشر المصري والدولي.",
      },
      {
        en: "You may not reproduce, copy, republish, or distribute any content from this website without our prior written consent.",
        ar: "لا يجوز لك إعادة إنتاج أو نسخ أو إعادة نشر أو توزيع أي محتوى من هذا الموقع دون موافقتنا الخطية المسبقة.",
      },
    ],
  },
  {
    title: {
      en: "Limitation of Liability",
      ar: "تحديد المسؤولية",
    },
    paragraphs: [
      {
        en: "Line Coffee shall not be liable for any indirect, incidental, or consequential damages arising from the use of our website or products, to the fullest extent permitted by applicable law.",
        ar: "لا تتحمل لاين كوفي المسؤولية عن أي أضرار غير مباشرة أو عرضية أو تبعية تنشأ عن استخدام موقعنا أو منتجاتنا، إلى أقصى حد يسمح به القانون المعمول به.",
      },
    ],
  },
  {
    title: { en: "Governing Law", ar: "القانون المطبق" },
    paragraphs: [
      {
        en: "These Terms of Use are governed by and construed in accordance with the laws of the Arab Republic of Egypt. Any disputes shall be subject to the exclusive jurisdiction of the courts of Cairo, Egypt.",
        ar: "تخضع شروط الاستخدام هذه وتُفسَّر وفقاً لقوانين جمهورية مصر العربية. تخضع أي نزاعات للاختصاص القضائي الحصري لمحاكم القاهرة، مصر.",
      },
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPageLayout
      heroTitle={{ en: "Terms of Use", ar: "شروط الاستخدام" }}
      heroSubtitle={{
        en: "Please read these terms carefully before using our website or placing an order.",
        ar: "يرجى قراءة هذه الشروط بعناية قبل استخدام موقعنا أو تقديم طلب.",
      }}
      lastUpdated="2026-06-01"
      sections={sections}
    />
  );
}
