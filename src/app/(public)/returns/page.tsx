"use client";

import {
  LegalPageLayout,
  type LegalSection,
} from "@/components/ui/LegalPageLayout";

const sections: LegalSection[] = [
  {
    title: { en: "Our Return Policy", ar: "سياسة الإرجاع لدينا" },
    paragraphs: [
      {
        en: "At Line Coffee, your satisfaction is our priority. We accept returns and offer refunds or replacements under specific conditions outlined below. Because our products are consumable food items, returns must be handled promptly and carefully.",
        ar: "في لاين كوفي، رضاك أولويتنا. نقبل الإرجاع ونقدم استرداداً أو استبدالاً في ظروف محددة موضحة أدناه. نظراً لأن منتجاتنا مواد غذائية استهلاكية، يجب التعامل مع الإرجاعات بسرعة وعناية.",
      },
    ],
  },
  {
    title: { en: "Eligible Returns", ar: "الإرجاعات المؤهلة" },
    paragraphs: [
      {
        en: "You may request a return or replacement within 48 hours of receiving your order in the following situations: the product arrived damaged or with a broken seal, you received the wrong product or quantity, or the product has a verifiable quality defect.",
        ar: "يمكنك طلب إرجاع أو استبدال خلال 48 ساعة من استلام طلبك في الحالات التالية: وصل المنتج تالفاً أو بختم مكسور، أو تلقيت منتجاً أو كمية خاطئة، أو كان المنتج يحتوي على عيب جودة قابل للتحقق.",
      },
      {
        en: "Eligible returns must be in their original, unopened packaging. We cannot accept returns of opened bags for food safety reasons.",
        ar: "يجب أن تكون الإرجاعات المؤهلة في عبوتها الأصلية غير المفتوحة. لا يمكننا قبول إرجاع الأكياس المفتوحة لأسباب تتعلق بسلامة الغذاء.",
      },
    ],
  },
  {
    title: { en: "Non-Returnable Items", ar: "العناصر غير القابلة للإرجاع" },
    paragraphs: [
      {
        en: "The following items are not eligible for return: opened coffee bags, products purchased on final sale or promotional discount, custom espresso or flavor blends built through our studio builders, and orders where the delivery address was incorrect at the time of placement.",
        ar: "العناصر التالية غير مؤهلة للإرجاع: أكياس القهوة المفتوحة، والمنتجات المشتراة بعروض نهائية أو خصومات ترويجية، وخلطات الإسبريسو أو النكهات المخصصة المُنشأة من خلال أدوات البناء لدينا، والطلبات التي كان عنوان التوصيل فيها غير صحيح عند تقديمها.",
      },
    ],
  },
  {
    title: {
      en: "How to Initiate a Return",
      ar: "كيفية بدء الإرجاع",
    },
    paragraphs: [
      {
        en: "To initiate a return, contact us within 48 hours of delivery via WhatsApp at +20 100 476 1171 or by email at info@linecoffee.com. Please include your order number, a description of the issue, and photos of the product where applicable.",
        ar: "لبدء الإرجاع، تواصل معنا خلال 48 ساعة من التوصيل عبر واتساب على +20 100 476 1171 أو بالبريد الإلكتروني على info@linecoffee.com. يرجى تضمين رقم طلبك ووصف المشكلة وصور المنتج عند الاقتضاء.",
      },
      {
        en: "Our team will review your request within one business day and coordinate the return pickup or replacement dispatch at no additional cost to you.",
        ar: "سيراجع فريقنا طلبك خلال يوم عمل واحد وسينسق استلام الإرجاع أو شحن الاستبدال دون أي تكلفة إضافية عليك.",
      },
    ],
  },
  {
    title: { en: "Refund Processing", ar: "معالجة الاسترداد" },
    paragraphs: [
      {
        en: "Approved refunds are processed within 3–5 business days. Refunds for cash-on-delivery orders are issued via bank transfer or mobile wallet, using the details you provide to our support team.",
        ar: "تُعالج المبالغ المستردة الموافق عليها خلال 3–5 أيام عمل. تُصدر المبالغ المستردة للطلبات المدفوعة عند الاستلام عبر تحويل بنكي أو محفظة إلكترونية، باستخدام التفاصيل التي تقدمها لفريق الدعم.",
      },
    ],
  },
  {
    title: {
      en: "Damaged or Incorrect Items",
      ar: "العناصر التالفة أو الخاطئة",
    },
    paragraphs: [
      {
        en: "If you receive a damaged item or an incorrect product, we will arrange a replacement shipment or a full refund at no additional charge. We may ask you to return the original item; in that case, we will provide a prepaid return pickup.",
        ar: "إذا تلقيت عنصراً تالفاً أو منتجاً خاطئاً، سنرتب شحن بديل أو استرداداً كاملاً دون رسوم إضافية. قد نطلب منك إعادة العنصر الأصلي؛ في هذه الحالة، سنوفر استلاماً مدفوع الرسوم مسبقاً للإرجاع.",
      },
    ],
  },
  {
    title: { en: "Contact Us", ar: "تواصل معنا" },
    paragraphs: [
      {
        en: "For all returns, refunds, or product concerns, reach us at info@linecoffee.com or WhatsApp +20 100 476 1171. Our team is available Saturday–Thursday, 10:00 AM – 8:00 PM.",
        ar: "لجميع الإرجاعات والمبالغ المستردة أو مخاوف المنتجات، تواصل معنا على info@linecoffee.com أو واتساب +20 100 476 1171. فريقنا متاح من السبت إلى الخميس، من 10:00 صباحاً إلى 8:00 مساءً.",
      },
    ],
  },
];

export default function ReturnsPage() {
  return (
    <LegalPageLayout
      heroTitle={{ en: "Returns Policy", ar: "سياسة الإرجاع" }}
      heroSubtitle={{
        en: "Our commitment to quality means every cup should meet your expectations.",
        ar: "التزامنا بالجودة يعني أن كل كوب يجب أن يلبي توقعاتك.",
      }}
      lastUpdated="2026-06-01"
      sections={sections}
    />
  );
}
