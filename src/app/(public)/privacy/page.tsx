"use client";

import {
  LegalPageLayout,
  type LegalSection,
} from "@/components/ui/LegalPageLayout";

const sections: LegalSection[] = [
  {
    title: { en: "Introduction", ar: "المقدمة" },
    paragraphs: [
      {
        en: "Line Coffee (\"we\", \"us\", or \"our\") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect the information you provide when you use our website or purchase our products.",
        ar: "تلتزم لاين كوفي (\"نحن\" أو \"الشركة\") بحماية معلوماتك الشخصية. تشرح سياسة الخصوصية هذه كيفية جمعنا واستخدامنا وتخزيننا وحمايتنا للمعلومات التي تقدمها عند استخدام موقعنا الإلكتروني أو شراء منتجاتنا.",
      },
      {
        en: "By visiting our website or placing an order, you agree to the practices described in this policy. If you do not agree, please discontinue use of our services.",
        ar: "بزيارتك لموقعنا الإلكتروني أو تقديم طلب، فإنك توافق على الممارسات الموضحة في هذه السياسة. إذا كنت لا توافق، يرجى التوقف عن استخدام خدماتنا.",
      },
    ],
  },
  {
    title: { en: "Information We Collect", ar: "المعلومات التي نجمعها" },
    paragraphs: [
      {
        en: "When you place an order, we collect your name, phone number, email address, and delivery address. This information is necessary to process your order and deliver your coffee.",
        ar: "عند تقديم طلب، نجمع اسمك ورقم هاتفك وعنوان بريدك الإلكتروني وعنوان التوصيل. هذه المعلومات ضرورية لمعالجة طلبك وتوصيل قهوتك.",
      },
      {
        en: "We may also collect non-personal browsing data such as pages visited, time spent on the site, and device type. This data is used only to improve our website experience.",
        ar: "قد نجمع أيضاً بيانات تصفح غير شخصية مثل الصفحات التي تمت زيارتها والوقت المقضي على الموقع ونوع الجهاز. تُستخدم هذه البيانات فقط لتحسين تجربة موقعنا الإلكتروني.",
      },
    ],
  },
  {
    title: {
      en: "How We Use Your Information",
      ar: "كيف نستخدم معلوماتك",
    },
    paragraphs: [
      {
        en: "Your personal information is used to: process and fulfill your orders, communicate with you about your order status, respond to your inquiries, and send occasional updates about new products or promotions (only with your consent).",
        ar: "تُستخدم معلوماتك الشخصية من أجل: معالجة طلباتك وتنفيذها، والتواصل معك بشأن حالة طلبك، والرد على استفساراتك، وإرسال تحديثات دورية عن المنتجات الجديدة أو العروض (بموافقتك فقط).",
      },
      {
        en: "We do not sell, rent, or share your personal information with third parties for marketing purposes.",
        ar: "لا نبيع أو نؤجر أو نشارك معلوماتك الشخصية مع أطراف ثالثة لأغراض تسويقية.",
      },
    ],
  },
  {
    title: {
      en: "Data Storage and Security",
      ar: "تخزين البيانات وأمانها",
    },
    paragraphs: [
      {
        en: "Your data is stored securely on our servers. We implement appropriate technical and organizational measures to protect your information against unauthorized access, loss, or disclosure.",
        ar: "يتم تخزين بياناتك بأمان على خوادمنا. نتخذ التدابير التقنية والتنظيمية المناسبة لحماية معلوماتك من الوصول غير المصرح به أو الفقدان أو الإفصاح.",
      },
      {
        en: "We retain your personal data only for as long as necessary to fulfill the purposes described in this policy, or as required by Egyptian law.",
        ar: "نحتفظ ببياناتك الشخصية فقط للمدة اللازمة لتحقيق الأغراض الموضحة في هذه السياسة، أو وفقاً لما يقتضيه القانون المصري.",
      },
    ],
  },
  {
    title: { en: "Cookies and Tracking", ar: "ملفات تعريف الارتباط والتتبع" },
    paragraphs: [
      {
        en: "Our website uses essential cookies to maintain your shopping cart session and language preference. We do not use third-party advertising cookies or cross-site tracking technologies.",
        ar: "يستخدم موقعنا ملفات تعريف الارتباط الأساسية للحفاظ على جلسة سلة التسوق وتفضيل اللغة. لا نستخدم ملفات تعريف ارتباط الإعلانات من أطراف ثالثة أو تقنيات التتبع عبر المواقع.",
      },
    ],
  },
  {
    title: { en: "Your Rights", ar: "حقوقك" },
    paragraphs: [
      {
        en: "You have the right to access, correct, or request deletion of your personal data at any time. To exercise these rights, please contact us at the address below.",
        ar: "يحق لك الوصول إلى بياناتك الشخصية أو تصحيحها أو طلب حذفها في أي وقت. لممارسة هذه الحقوق، يرجى التواصل معنا على العنوان أدناه.",
      },
      {
        en: "You may also unsubscribe from marketing communications at any time by contacting us directly or using the unsubscribe link in our emails.",
        ar: "يمكنك أيضاً إلغاء الاشتراك في الاتصالات التسويقية في أي وقت عن طريق التواصل معنا مباشرة أو استخدام رابط إلغاء الاشتراك في رسائل البريد الإلكتروني.",
      },
    ],
  },
  {
    title: { en: "Contact", ar: "التواصل" },
    paragraphs: [
      {
        en: "For questions about this Privacy Policy or your personal data, contact us at info@linecoffee.com or via WhatsApp at +20 100 476 1171.",
        ar: "للاستفسار عن سياسة الخصوصية هذه أو بياناتك الشخصية، تواصل معنا على info@linecoffee.com أو عبر واتساب على +20 100 476 1171.",
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      heroTitle={{ en: "Privacy Policy", ar: "سياسة الخصوصية" }}
      heroSubtitle={{
        en: "How we collect, use, and protect your personal information.",
        ar: "كيف نجمع معلوماتك الشخصية ونستخدمها ونحميها.",
      }}
      lastUpdated="2026-06-01"
      sections={sections}
    />
  );
}
