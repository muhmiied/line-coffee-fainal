// Egyptian governorates + their selectable areas for the checkout address form.
// Extracted out of the checkout page so the ~190 lines of static data live on
// their own and can be reused/tested independently. The values are display +
// matching data only; the authoritative delivery-zone fee is computed server
// side by create_checkout_order (mirrored for preview in src/lib/delivery.ts).

export type GovernorateArea = { en: string; ar: string };

export type Governorate = {
  en: string;
  ar: string;
  areas: GovernorateArea[];
};

export const EGYPT_GOVERNORATES: Governorate[] = [
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
