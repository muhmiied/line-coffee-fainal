export interface LocalizedText {
  en: string;
  ar: string;
}

export type ArticleStatus = "Draft" | "Published" | "Archived";
export type ReviewStatus = "Pending" | "Approved" | "Rejected";
export type ReviewSource = "Manual" | "WhatsApp" | "Facebook" | "Instagram" | "Website";
export type ReviewDisplayTarget = "Product Page" | "Homepage Testimonials" | "Both";
export type LegalPageStatus = "Draft" | "Published";
export type ContactStatus = "New" | "In Progress" | "Replied" | "Archived";
export type ContactSource = "Contact Form" | "WhatsApp" | "Email" | "Facebook" | "Instagram";
export type ActivityTone = "gold" | "green" | "amber" | "red" | "cream";

export interface CmsArticle {
  id: string;
  slug: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  content: LocalizedText;
  category: LocalizedText;
  author: string;
  status: ArticleStatus;
  featured: boolean;
  views: number;
  publishDate?: string;
  readTime: LocalizedText;
  tags: LocalizedText[];
  heroImage: string;
  cardImage: string;
  featuredImage: string;
  seoTitle: LocalizedText;
  seoDescription: LocalizedText;
}

export interface CmsReview {
  id: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  product: string;
  rating: number;
  reviewText: LocalizedText;
  source: ReviewSource;
  proofScreenshot?: string;
  internalNotes: string;
  status: ReviewStatus;
  featured: boolean;
  hidden: boolean;
  showOn: ReviewDisplayTarget;
  date: string;
}

export interface CmsLegalPage {
  id: string;
  page: "Privacy Policy" | "Terms & Conditions" | "Shipping Policy" | "Returns Policy";
  content: LocalizedText;
  lastUpdated: string;
  version: string;
  status: LegalPageStatus;
}

export interface CmsContactMessage {
  id: string;
  name: string;
  phone: string;
  whatsApp: string;
  email: string;
  source: ContactSource;
  subject: string;
  message: string;
  date: string;
  status: ContactStatus;
  assignedAdmin: string;
  internalNotes: string;
}

export interface CmsActivity {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  tone: ActivityTone;
}

export const CMS_IMAGE_OPTIONS = [
  "/assets/story/roastery.png",
  "/assets/categories/espresso.png",
  "/assets/categories/turkish.png",
  "/assets/products/classic-pouch.png",
  "/assets/story/dark-roast.png",
  "/assets/story/portrait-roastery.png",
];

export const CMS_PROOF_IMAGE_OPTIONS = [
  "/assets/story/roastery.png",
  "/assets/products/classic-pouch.png",
  "/assets/categories/espresso.png",
];

export const CMS_ARTICLES: CmsArticle[] = [
  {
    id: "ART-101",
    slug: "origins-of-arabic-coffee",
    featured: true,
    title: {
      en: "The Origins of Arabic Coffee Culture",
      ar: "جذور ثقافة القهوة العربية",
    },
    excerpt: {
      en: "From the highlands of Yemen to the coffee houses of Cairo, how a single seed became the backbone of Egyptian daily life.",
      ar: "من مرتفعات اليمن إلى مقاهي القاهرة، كيف أصبحت حبة القهوة جزءا أصيلا من الحياة اليومية المصرية.",
    },
    content: {
      en: "Coffee arrived in Egypt through Yemen more than five centuries ago, carried by Sufi scholars and merchants. The drink moved from places of study to Cairo coffee houses, becoming a daily signal of hospitality, conversation, and care.",
      ar: "وصلت القهوة إلى مصر عبر اليمن قبل أكثر من خمسة قرون، وحملها العلماء والتجار. انتقل المشروب من مجالس العلم إلى مقاهي القاهرة، وأصبح علامة يومية على الضيافة والحوار والاهتمام.",
    },
    heroImage: "/assets/story/roastery.png",
    cardImage: "/assets/story/roastery.png",
    featuredImage: "/assets/story/roastery.png",
    category: { en: "Origins", ar: "الأصول" },
    author: "Mohamed Sayed",
    status: "Published",
    views: 1284,
    publishDate: "2026-05-20",
    readTime: { en: "6 min read", ar: "٦ دقائق قراءة" },
    tags: [
      { en: "History", ar: "التاريخ" },
      { en: "Culture", ar: "الثقافة" },
    ],
    seoTitle: {
      en: "The Origins of Arabic Coffee Culture | Line Coffee",
      ar: "جذور ثقافة القهوة العربية | Line Coffee",
    },
    seoDescription: {
      en: "Explore the history and hospitality rituals behind Arabic coffee culture.",
      ar: "اكتشف تاريخ ثقافة القهوة العربية وطقوس الضيافة المرتبطة بها.",
    },
  },
  {
    id: "ART-102",
    slug: "roast-notes",
    title: {
      en: "Roast Notes: Reading Your Coffee's Personality",
      ar: "ملاحظات التحميص: قراءة شخصية قهوتك",
    },
    excerpt: {
      en: "Small coffee notes for a warmer daily cup. What the color, aroma, and surface of your beans tell you before the first sip.",
      ar: "ملاحظات قصيرة لكوب يومي أدفأ. ماذا يخبرك لون الحبوب ورائحتها وسطحها قبل الرشفة الأولى.",
    },
    content: {
      en: "Every bag of coffee carries a story written in color, aroma, and surface oils. Learning those signals helps customers understand whether a cup will be bright, deep, sweet, smoky, light, or heavy.",
      ar: "كل كيس قهوة يحمل قصة مكتوبة في اللون والرائحة والزيوت السطحية. فهم هذه العلامات يساعد العميل على معرفة إن كان الكوب مشرقا أو عميقا أو حلوا أو مدخنا أو خفيفا أو ثقيلا.",
    },
    heroImage: "/assets/story/roastery.png",
    cardImage: "/assets/story/roastery.png",
    featuredImage: "/assets/story/dark-roast.png",
    category: { en: "Craft", ar: "صناعة القهوة" },
    author: "Sara Hassan",
    status: "Draft",
    featured: false,
    views: 342,
    publishDate: "2026-05-10",
    readTime: { en: "4 min read", ar: "٤ دقائق قراءة" },
    tags: [
      { en: "Roasting", ar: "التحميص" },
      { en: "Craft", ar: "الصناعة" },
    ],
    seoTitle: {
      en: "Roast Notes: Reading Your Coffee's Personality",
      ar: "ملاحظات التحميص: قراءة شخصية قهوتك",
    },
    seoDescription: {
      en: "Learn how roast color, aroma, and oils shape coffee flavor.",
      ar: "تعلم كيف يؤثر لون التحميص والرائحة والزيوت على نكهة القهوة.",
    },
  },
  {
    id: "ART-103",
    slug: "blend-guide",
    title: {
      en: "The Blend Guide: Matching Roast Depth to Your Ritual",
      ar: "دليل الخلطات: مطابقة عمق التحميص مع طقسك",
    },
    excerpt: {
      en: "A quick guide to matching roast depth with your daily ritual. Turkish, espresso, or pour-over each has its ideal roast partner.",
      ar: "دليل سريع لاختيار عمق التحميص المناسب لطقسك اليومي. التركي والإسبريسو والبور أوفر لكل منها تحميصه المثالي.",
    },
    content: {
      en: "The most common mistake is using the wrong roast profile for the brewing method. Espresso needs pressure and sweetness, Turkish needs fine grind and slow heat, and pour-over rewards clarity.",
      ar: "أكثر خطأ شائع هو استخدام درجة تحميص غير مناسبة لطريقة التحضير. الإسبريسو يحتاج ضغطا وحلاوة، والتركي يحتاج طحنا ناعما وحرارة هادئة، والبور أوفر يكافئ الوضوح.",
    },
    heroImage: "/assets/categories/espresso.png",
    cardImage: "/assets/categories/espresso.png",
    featuredImage: "/assets/story/roastery.png",
    category: { en: "Guide", ar: "أدلة" },
    author: "Omar Ashraf",
    status: "Published",
    featured: false,
    views: 976,
    publishDate: "2026-04-28",
    readTime: { en: "5 min read", ar: "٥ دقائق قراءة" },
    tags: [
      { en: "Blending", ar: "الخلط" },
      { en: "Brewing", ar: "التحضير" },
    ],
    seoTitle: {
      en: "The Blend Guide | Line Coffee",
      ar: "دليل الخلطات | Line Coffee",
    },
    seoDescription: {
      en: "Match roast depth to Turkish coffee, espresso, and other daily rituals.",
      ar: "اختر عمق التحميص المناسب للقهوة التركية والإسبريسو والطقوس اليومية الأخرى.",
    },
  },
  {
    id: "ART-104",
    slug: "freshness",
    title: {
      en: "Keeping It Fresh: Storage Secrets for Better Coffee",
      ar: "الحفاظ على الطزاجة: أسرار التخزين لقهوة أفضل",
    },
    excerpt: {
      en: "How careful storage preserves aroma and body in every bag. The four enemies of coffee freshness and how to beat them.",
      ar: "كيف يحافظ التخزين الصحيح على الرائحة والقوام في كل كيس. أعداء الطزاجة الأربعة وكيف تتغلب عليهم.",
    },
    content: {
      en: "Freshly roasted coffee is alive. Oxygen, moisture, heat, and light quietly steal flavor, so airtight storage and careful grinding make a major difference in the daily cup.",
      ar: "القهوة المحمصة حديثا حية. الأكسجين والرطوبة والحرارة والضوء تسرق النكهة بهدوء، لذلك يصنع التخزين المحكم والطحن عند الحاجة فرقا كبيرا في الكوب اليومي.",
    },
    heroImage: "/assets/products/classic-pouch.png",
    cardImage: "/assets/products/classic-pouch.png",
    featuredImage: "/assets/story/portrait-roastery.png",
    category: { en: "Tips", ar: "نصائح" },
    author: "Nour El-Din",
    status: "Published",
    featured: false,
    views: 742,
    publishDate: "2026-04-15",
    readTime: { en: "3 min read", ar: "٣ دقائق قراءة" },
    tags: [
      { en: "Storage", ar: "التخزين" },
      { en: "Tips", ar: "نصائح" },
    ],
    seoTitle: {
      en: "Coffee Storage Secrets | Line Coffee",
      ar: "أسرار تخزين القهوة | Line Coffee",
    },
    seoDescription: {
      en: "Simple coffee storage habits that preserve aroma and flavor.",
      ar: "عادات تخزين بسيطة تحافظ على رائحة القهوة ونكهتها.",
    },
  },
  {
    id: "ART-105",
    slug: "turkish-ritual",
    title: {
      en: "The Turkish Coffee Ritual: Slow and Intentional",
      ar: "طقس القهوة التركية: بطء واهتمام",
    },
    excerpt: {
      en: "Why Turkish coffee is more than a brewing method. It is a pause, a conversation, and a very Egyptian way of caring for people.",
      ar: "لماذا القهوة التركية أكثر من طريقة تحضير. هي توقف قصير وحوار وطريقة مصرية جدا للاهتمام بالناس.",
    },
    content: {
      en: "In Egypt, asking someone if they want coffee is an invitation to sit and be present. The slow stir over low heat turns Turkish coffee into a ritual of patience and care.",
      ar: "في مصر، سؤال شخص إن كان يريد قهوة هو دعوة للجلوس والحضور. التقليب الهادئ على نار منخفضة يحول القهوة التركية إلى طقس من الصبر والاهتمام.",
    },
    heroImage: "/assets/categories/turkish.png",
    cardImage: "/assets/categories/turkish.png",
    featuredImage: "/assets/story/roastery.png",
    category: { en: "Ritual", ar: "الطقوس" },
    author: "Mariam Hesham",
    status: "Published",
    featured: false,
    views: 621,
    publishDate: "2026-04-03",
    readTime: { en: "4 min read", ar: "٤ دقائق قراءة" },
    tags: [
      { en: "Turkish", ar: "التركي" },
      { en: "Ritual", ar: "الطقوس" },
    ],
    seoTitle: {
      en: "The Turkish Coffee Ritual | Line Coffee",
      ar: "طقس القهوة التركية | Line Coffee",
    },
    seoDescription: {
      en: "A slower look at Turkish coffee preparation and Egyptian hospitality.",
      ar: "نظرة هادئة على تحضير القهوة التركية والضيافة المصرية.",
    },
  },
  {
    id: "ART-106",
    slug: "espresso-craft",
    title: {
      en: "Espresso Craft: Why Extraction Time Changes Everything",
      ar: "حرفة الإسبريسو: لماذا يغير وقت الاستخلاص كل شيء",
    },
    excerpt: {
      en: "The difference between an espresso that sings and one that stings is often measured in seconds. Here is how to listen.",
      ar: "الفرق بين إسبريسو متناغم وآخر لاذع يقاس غالبا بالثواني. إليك كيف تلاحظ ذلك.",
    },
    content: {
      en: "A standard espresso shot pulls in a narrow time window. Under-extraction tastes sour and thin, while over-extraction tastes bitter and dry. A few seconds can change the entire cup.",
      ar: "شوت الإسبريسو القياسي يتم استخلاصه في نافذة زمنية ضيقة. الاستخلاص الناقص يكون حامضا وخفيفا، والزائد يكون مرا وجافا. ثوان قليلة قد تغير الكوب بالكامل.",
    },
    heroImage: "/assets/categories/espresso.png",
    cardImage: "/assets/categories/espresso.png",
    featuredImage: "/assets/products/classic-pouch.png",
    category: { en: "Craft", ar: "صناعة القهوة" },
    author: "Ahmed Kamal",
    status: "Archived",
    featured: false,
    views: 498,
    publishDate: "2026-03-18",
    readTime: { en: "5 min read", ar: "٥ دقائق قراءة" },
    tags: [
      { en: "Espresso", ar: "الإسبريسو" },
      { en: "Extraction", ar: "الاستخلاص" },
    ],
    seoTitle: {
      en: "Espresso Extraction Time | Line Coffee",
      ar: "وقت استخلاص الإسبريسو | Line Coffee",
    },
    seoDescription: {
      en: "Understand how espresso extraction time changes flavor and balance.",
      ar: "افهم كيف يغير وقت استخلاص الإسبريسو النكهة والتوازن.",
    },
  },
];

export const CMS_REVIEWS: CmsReview[] = [
  {
    id: "REV-041",
    customer: { name: "Ahmed Kamal", phone: "+20 100 332 1188", email: "ahmed.kamal@example.com" },
    product: "Turkish Silk",
    rating: 5,
    reviewText: {
      en: "The Turkish Silk is bold, smooth, and endlessly aromatic.",
      ar: "تركي سيلك قوي وناعم ورائحته مميزة جدا.",
    },
    source: "WhatsApp",
    proofScreenshot: "/assets/story/roastery.png",
    internalNotes: "Customer sent a cup photo on WhatsApp. Strong candidate for homepage testimonials.",
    status: "Approved",
    featured: true,
    hidden: false,
    showOn: "Both",
    date: "2026-06-19",
  },
  {
    id: "REV-042",
    customer: { name: "Sara Hassan", phone: "+20 111 712 8822", email: "sara.hassan@example.com" },
    product: "High Mood",
    rating: 5,
    reviewText: {
      en: "Perfect espresso kick. I make it every morning and cannot start my day without it.",
      ar: "إسبريسو قوي ومظبوط. بعمله كل صباح ومبقاش يومي يبدأ من غيره.",
    },
    source: "Website",
    proofScreenshot: "/assets/categories/espresso.png",
    internalNotes: "Pending moderation. Tone is positive and clear.",
    status: "Pending",
    featured: false,
    hidden: false,
    showOn: "Product Page",
    date: "2026-06-20",
  },
  {
    id: "REV-043",
    customer: { name: "Omar Ashraf", phone: "+20 122 449 3311", email: "omar.ashraf@example.com" },
    product: "Heavy Crema",
    rating: 4,
    reviewText: {
      en: "Great crema, exactly what I wanted for latte art. Smooth and balanced.",
      ar: "كريما ممتازة ومناسبة جدا للاتيه آرت. الطعم ناعم ومتوازن.",
    },
    source: "Instagram",
    proofScreenshot: "/assets/products/classic-pouch.png",
    internalNotes: "Approved. Useful for espresso product page.",
    status: "Approved",
    featured: false,
    hidden: false,
    showOn: "Product Page",
    date: "2026-06-18",
  },
  {
    id: "REV-044",
    customer: { name: "Mariam Hesham", phone: "+20 101 904 5520", email: "mariam.h@example.com" },
    product: "Cairo Nights",
    rating: 3,
    reviewText: {
      en: "Nice blend but I expected a stronger cardamom note. Still enjoyable.",
      ar: "الخلطة لطيفة لكن كنت متوقعة نكهة هيل أقوى. ما زالت تجربة جيدة.",
    },
    source: "Facebook",
    internalNotes: "Approved but not featured. Balanced critical feedback.",
    status: "Approved",
    featured: false,
    hidden: false,
    showOn: "Product Page",
    date: "2026-06-17",
  },
  {
    id: "REV-045",
    customer: { name: "Nour El-Din", phone: "+20 115 700 9912", email: "nour@example.com" },
    product: "Black Label",
    rating: 5,
    reviewText: {
      en: "This is the real deal. Complex, bold, and beautiful.",
      ar: "دي قهوة تقيلة فعلا. معقدة وقوية وجميلة.",
    },
    source: "Manual",
    proofScreenshot: "/assets/story/roastery.png",
    internalNotes: "Manual review added from customer call. Could be featured after approval.",
    status: "Pending",
    featured: false,
    hidden: false,
    showOn: "Homepage Testimonials",
    date: "2026-06-20",
  },
  {
    id: "REV-046",
    customer: { name: "Khaled Samir", phone: "+20 120 619 4400", email: "khaled.samir@example.com" },
    product: "Classic Line",
    rating: 2,
    reviewText: {
      en: "Too sweet for my taste. I prefer something drier.",
      ar: "حلوة زيادة بالنسبة لذوقي. أفضل حاجة أقل حلاوة.",
    },
    source: "Website",
    internalNotes: "Rejected from public display because it references an older recipe.",
    status: "Rejected",
    featured: false,
    hidden: true,
    showOn: "Product Page",
    date: "2026-06-15",
  },
];

export const CMS_LEGAL_PAGES: CmsLegalPage[] = [
  {
    id: "LEGAL-PRIVACY",
    page: "Privacy Policy",
    content: {
      en: "Line Coffee collects only the information needed to process orders, respond to customer messages, and improve the shopping experience. Customer data is handled with care and is not sold to third parties.",
      ar: "تجمع Line Coffee المعلومات اللازمة فقط لمعالجة الطلبات والرد على رسائل العملاء وتحسين تجربة التسوق. يتم التعامل مع بيانات العملاء بعناية ولا يتم بيعها لأي طرف ثالث.",
    },
    lastUpdated: "2026-06-18",
    version: "1.4",
    status: "Published",
  },
  {
    id: "LEGAL-TERMS",
    page: "Terms & Conditions",
    content: {
      en: "By placing an order with Line Coffee, customers agree to provide accurate contact and delivery information. Product availability, prices, and delivery timelines may change before final confirmation.",
      ar: "عند تقديم طلب من Line Coffee، يوافق العميل على تقديم بيانات تواصل وتوصيل صحيحة. قد تتغير إتاحة المنتجات والأسعار ومواعيد التوصيل قبل التأكيد النهائي.",
    },
    lastUpdated: "2026-06-16",
    version: "1.3",
    status: "Published",
  },
  {
    id: "LEGAL-SHIPPING",
    page: "Shipping Policy",
    content: {
      en: "Orders are prepared with freshness in mind. Delivery timelines depend on destination, order volume, and courier availability. Customers receive confirmation before dispatch.",
      ar: "يتم تجهيز الطلبات مع مراعاة الطزاجة. تعتمد مدة التوصيل على المنطقة وحجم الطلبات وتوفر شركة الشحن. يحصل العميل على تأكيد قبل خروج الطلب.",
    },
    lastUpdated: "2026-06-14",
    version: "1.2",
    status: "Published",
  },
  {
    id: "LEGAL-RETURNS",
    page: "Returns Policy",
    content: {
      en: "Returns are reviewed case by case. Food products can only be returned when sealed, incorrect, damaged, or affected by a confirmed quality issue.",
      ar: "تتم مراجعة الإرجاع حسب كل حالة. لا يمكن إرجاع المنتجات الغذائية إلا إذا كانت مغلقة أو غير صحيحة أو تالفة أو بها مشكلة جودة مؤكدة.",
    },
    lastUpdated: "2026-06-12",
    version: "1.1",
    status: "Draft",
  },
];

export const CMS_CONTACT_MESSAGES: CmsContactMessage[] = [
  {
    id: "MSG-1201",
    name: "Youssef Adel",
    phone: "+20 100 889 4410",
    whatsApp: "+20 100 889 4410",
    email: "youssef.adel@example.com",
    source: "Contact Form",
    subject: "Wholesale inquiry",
    message: "I own a small cafe in Nasr City and want to ask about wholesale espresso options and minimum order quantities.",
    internalNotes: "Send wholesale starter sheet and ask about monthly volume.",
    assignedAdmin: "Ahmed",
    status: "New",
    date: "2026-06-21",
  },
  {
    id: "MSG-1202",
    name: "Dina Youssef",
    phone: "+20 111 302 6601",
    whatsApp: "+20 111 302 6601",
    email: "dina.youssef@example.com",
    source: "WhatsApp",
    subject: "Order delivery timing",
    message: "Can my order arrive before Thursday evening? It is for a family gathering.",
    internalNotes: "Coordinate with delivery before replying.",
    assignedAdmin: "Sara",
    status: "In Progress",
    date: "2026-06-20",
  },
  {
    id: "MSG-1203",
    name: "Karim Lotfy",
    phone: "+20 122 771 3344",
    whatsApp: "+20 122 771 3344",
    email: "karim.lotfy@example.com",
    source: "Instagram",
    subject: "Flavor recommendation",
    message: "I like hazelnut but want something less sweet. What should I order?",
    internalNotes: "Recommend Hazelnut Cappuccino with lower sweetness or vanilla blend.",
    assignedAdmin: "Mohamed",
    status: "Replied",
    date: "2026-06-19",
  },
  {
    id: "MSG-1204",
    name: "Farah Nabil",
    phone: "+20 101 881 9900",
    whatsApp: "+20 101 881 9900",
    email: "farah.nabil@example.com",
    source: "Email",
    subject: "Return request",
    message: "I received the wrong grind size. Can I exchange the bag if it is still sealed?",
    internalNotes: "Ask for order number and bag photo.",
    assignedAdmin: "Sara",
    status: "New",
    date: "2026-06-18",
  },
  {
    id: "MSG-1205",
    name: "Hany Maher",
    phone: "+20 115 221 6630",
    whatsApp: "+20 115 221 6630",
    email: "hany.maher@example.com",
    source: "Facebook",
    subject: "Partnership follow-up",
    message: "Following up on the tasting samples sent last week. We would like to discuss next steps.",
    internalNotes: "Archived after handoff to sales.",
    assignedAdmin: "Ahmed",
    status: "Archived",
    date: "2026-06-14",
  },
];

export const CMS_ACTIVITY: CmsActivity[] = [
  {
    id: "ACT-001",
    actor: "Ahmed",
    action: "approved review",
    target: "Turkish Silk",
    time: "12 min ago",
    tone: "green",
  },
  {
    id: "ACT-002",
    actor: "Mohamed",
    action: "published article",
    target: "The Origins of Arabic Coffee Culture",
    time: "38 min ago",
    tone: "gold",
  },
  {
    id: "ACT-003",
    actor: "Sara",
    action: "replied to contact message",
    target: "Flavor recommendation",
    time: "1 h ago",
    tone: "cream",
  },
  {
    id: "ACT-004",
    actor: "Mariam",
    action: "updated legal page",
    target: "Returns Policy",
    time: "2 h ago",
    tone: "amber",
  },
  {
    id: "ACT-005",
    actor: "Omar",
    action: "featured article",
    target: "The Origins of Arabic Coffee Culture",
    time: "Yesterday",
    tone: "gold",
  },
];
