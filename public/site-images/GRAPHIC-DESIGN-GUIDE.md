# LINE COFFEE V3 — Graphic Design Image Guide

تاريخ المراجعة: 2026-08-05  
نطاق العمل: تحليل وقياس وتوثيق فقط. لم يتم تغيير أي Component أو CSS أو breakpoint أو صورة أو بيانات Supabase.

## 1. كيف تقرأ هذا الدليل

هناك أربعة مقاسات مختلفة لا ينبغي خلطها:

1. **Natural size**: أبعاد البكسلات داخل ملف الصورة نفسه.
2. **Recommended export size**: المقاس الذي يصمم ويصدر عليه الجرافيك ديزاينر.
3. **Full component size**: أبعاد الكارت أو السكشن كاملًا بعد الـrender.
4. **Image viewport**: فتحة عرض الصورة فقط داخل العنصر.

في `object-fit: cover` تُكبّر الصورة حتى تغطي الفتحة بالكامل، ثم يُقص الجزء الزائد. في `contain` تظهر الصورة كاملة ويظهر بدل القص فراغ داخل الفتحة. كل القياسات في هذا الملف وملف CSV هي **CSS pixels من `getBoundingClientRect()`**، وليست بكسلات Screenshot.

الملف التفصيلي القابل للفتح في Excel هو [`GRAPHIC-DESIGN-SIZES.csv`](./GRAPHIC-DESIGN-SIZES.csv)، والملخص السريع هو [`GRAPHIC-DESIGN-QUICK-SPECS.md`](./GRAPHIC-DESIGN-QUICK-SPECS.md).

## 2. بيئة ومنهج القياس

| اسم القياس | Browser viewport | عرض المحتوى المقاس | DPR | ملاحظة |
| --- | ---: | ---: | ---: | --- |
| Desktop | 1440 × 900 | 1425 px | 1 | 15 px محجوزة للـvertical scrollbar |
| Laptop | 1280 × 800 | 1265 px | 1 | 15 px محجوزة للـvertical scrollbar |
| Tablet | 768 × 1024 | 753 px | 1 | 15 px محجوزة للـvertical scrollbar |
| Mobile | 390 × 844 | 375 px | 1 | 15 px محجوزة للـvertical scrollbar |

- تم القياس بمتصفح Chromium بعد الـrender باستخدام `getBoundingClientRect()` مع قراءة `object-fit` و`object-position` و`overflow` و`border-radius` و`opacity` من computed styles.
- تم اختبار الصفحة الرئيسية بالإنجليزية والعربية لأن RTL يبدّل موضع النص، لكنه **لا يبدّل** `object-position` للصورة.
- صور Supabase لم تُنقل ولم تُعدل؛ تمت قراءة metadata فقط من الاستجابة العامة لقياس عينة حقيقية.
- عناصر Account وAdmin المحمية لم يمكن فتحها بلا جلسة مستخدم/إدارة. لذلك يميز CSV بوضوح بين `Browser measured` و`Code-defined / auth protected`، ولا يقدم رقمًا متخيلًا.
- لا توجد ملفات صور داخل CSS أو pseudo-elements. نتائج `url()` الوحيدة غير الصورية كانت gradients ومرجع SVG داخلي `url(#adminSalesGrad)`؛ gradients ليست ملفات صور.

## 3. Executive findings

- عينة `High Mood` المحلية أبعادها 1024×1536 بنسبة 2:3، بينما فتحة Product Card هي 8:5 على Desktop/Laptop وقرابة 1.82:1 على Tablet. ينتج عن ذلك قص رأسي مقداره 58.33%، 58.33%، و63.27% على الترتيب.
- على Mobile تصبح فتحة الكارت أقرب للطولية (163.5×176)، فينخفض القص إلى 28.24%. هذا يجعل القص **متغيرًا بقوة حسب الشاشة**.
- صورة Supabase الحقيقية لعينة `Cairo Nights` هي WebP بمقاس 736×1308 ونسبة 0.5627:1 وحجم 97,862 bytes. تعرضها Product Cards باستخدام `contain` فتظهر كاملة، لكن صورة التفاصيل الرئيسية تستخدم `cover` بنسبة 4:5 فتقص 29.66% من الارتفاع، والـthumbnail المربع يقص 43.73%.
- حقل المنتج الأساسي نفسه يُستخدم للكارت وأول صورة Gallery والـambient hero. لا يوجد حاليًا حقل مستقل لـCard Image أو Thumbnail Image.
- صورة Home Hero العريضة الأولى تفقد 76.30% من عرضها على Mobile. القياس يبرر art direction منفصلًا للموبايل مستقبلًا لهذه الصورة، دون تنفيذ أي تغيير الآن.
- مجلد `public/site-images` يحتوي 54 ملف صورة بإجمالي 96,655,546 bytes (92.18 MiB)، بينما البيانات الثنائية الفريدة 19,314,529 bytes (18.42 MiB). الزيادة داخل مجلد التنظيم بسبب النسخ المتطابقة 77,341,017 bytes (73.76 MiB).

## 4. Product Cards — أولوية قصوى

### High Mood / ProductCard على صفحة Products

| الشاشة | الكارت بالكامل | فتحة الصورة | منطقة النص والسعر | نسبة ارتفاع الصورة من الكارت | Grid | Gap | Fit / position |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| 1440×900 | 306.67×341.78 | 304.67×190.41 | 304.67×149.38 | 55.71% | 3 أعمدة | 20 | cover / 50% 50% |
| 1280×800 | 301.67×338.66 | 299.67×187.28 | 299.67×149.38 | 55.30% | 3 أعمدة | 20 | cover / 50% 50% |
| 768×1024 | 350.50×343.38 | 348.50×192.00 | 348.50×149.38 | 55.91% | عمودان | 20 | cover / 50% 50% |
| 390×844 | 165.50×326.25 | 163.50×176.00 | 163.50×148.25 | 53.91% | عمودان | 12 | cover / 50% 50% |

الكارت `overflow: hidden` ونصف قطره المقاس 20px. ارتفاع الصورة 176px على Mobile، و192px على Tablet، ويصبح بنسبة 8:5 عند `lg`. ارتفاع الكارت الكامل يتأثر بالنص، لذلك ليس نسبة ثابتة من عرضه.

### حساب القص لعينة High Mood (1024×1536، 2:3)

| الشاشة | Scale CSS px/source px | حجم الصورة بعد التكبير | الخارج عن الفتحة | الظاهر من الأصل | القص الكلي | القص من كل طرف |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1440×900 | 0.2975 | 304.67×457.01 | 266.60px رأسيًا | 41.67% | 58.33% | 29.17% أعلى + 29.17% أسفل |
| 1280×800 | 0.2926 | 299.67×449.51 | 262.23px رأسيًا | 41.67% | 58.33% | 29.17% أعلى + 29.17% أسفل |
| 768×1024 | 0.3403 | 348.50×522.75 | 330.75px رأسيًا | 36.73% | 63.27% | 31.64% أعلى + 31.64% أسفل |
| 390×844 | 0.1597 | 163.50×245.25 | 69.25px رأسيًا | 71.76% | 28.24% | 14.12% أعلى + 14.12% أسفل |

**Safe area مشتركة لـHigh Mood الحالية:** أفقيًا `15–85%` كمساحة تصميم عملية، ورأسيًا يجب أن تبقى العبوة داخل `31.64–68.36%` لضمان ظهورها في كل المقاسات. هذه مساحة رأسية ضيقة جدًا؛ لذلك لا ينبغي اعتماد ملف 2:3 ممتلئ حتى الحواف كتصميم كارت.

### Product Card recommendation

- Master المنتج: **1600×2000، 4:5، WebP، بحد أقصى 300KB**.
- ضع العبوة في المنتصف الأفقي `15–85%` والرأسي `10–90%`، مع هامش تنفس لا يقل عن 15% يمينًا ويسارًا.
- Product Cards للصور القادمة من Supabase تستخدم `contain` مع padding (12px في الشاشات الأكبر وقرابة 8–9px على Mobile)، لذلك تعرض الـMaster كاملًا.
- إذا احتاج التسويق Artwork يملأ الكارت بلا فراغ، فليكن له ملف مستقل **1600×1000، 8:5** مستقبلًا. هذه توصية بنيوية وليست تغييرًا منفذًا.

### Best Sellers carousel — Production build

يستخدم السكشن `ProductCard` نفسه، لكن عرض الكارت داخل المسار المتحرك مختلف عن Grid صفحة Products. القياسات التالية من نسخة الإنتاج بعد تحميل بيانات Supabase:

| الشاشة | الكارت بالكامل | فتحة الصورة | منطقة النص والسعر | Fit لـHigh Mood | قص High Mood 2:3 |
| --- | ---: | ---: | ---: | --- | ---: |
| 1440×900 | 261.99×312.73 | 260.01×162.51 | 148.23 | cover / center | 58.33% رأسيًا |
| 1280×800 | 261.95×312.68 | 259.97×162.48 | 148.20 | cover / center | 58.33% رأسيًا |
| 768×1024 | 246.03×340.65 | 244.05×190.48 | 148.17 | cover / center | 47.97% رأسيًا |
| 390×844 | 226.20×311.27 | 224.21×174.61 | 134.66 | cover / center | 48.08% رأسيًا |

صورة `Cairo Nights` المرفوعة تستخدم `contain` داخل الفتحة نفسها فتظل ظاهرة بنسبة 100%. ظهر في DOM عدد 28 link نتيجة تكرار مسار الـcarousel؛ القياس مأخوذ من أول كارت مرئي، لا من نسخة خارج الشاشة.

## 5. Product Details وجميع أماكن صور المنتجات

### Gallery الرئيسية — High Mood fallback

| الشاشة | Gallery card بالكامل | الصورة الرئيسية 4:5 | Thumbnail grid | كل thumbnail image | Main crop 2:3 | Square crop 2:3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1440×900 | 443.06×675.59 | 441.06×551.33 | 441.06×122.27 | 96.27×96.27 | 16.67% رأسي | 33.33% رأسي |
| 1280×800 | 435.38×664.06 | 433.38×541.72 | 433.38×120.34 | 94.34×94.34 | 16.67% رأسي | 33.33% رأسي |
| 768×1024 | 721.00×1092.50 | 719.00×898.75 | 719.00×191.75 | 165.75×165.75 | 16.67% رأسي | 33.33% رأسي |
| 390×844 | 343.00×525.50 | 341.00×426.25 | 341.00×97.25 | 71.25×71.25 | 16.67% رأسي | 33.33% رأسي |

الصورة الرئيسية والـthumbnails تستخدم `cover / 50% 50%` و`overflow: hidden`. ملف `03-dark-roast.png` العريض 1.8745:1 يفقد 57.32% أفقيًا داخل 4:5 و46.65% أفقيًا داخل المربع.

### Supabase sample — Cairo Nights

| الاستخدام | فتحة العرض | Fit | الجزء الظاهر | القص | Safe area المطلوبة |
| --- | --- | --- | ---: | ---: | --- |
| Product Card / Best Sellers / Related | responsive كما في ProductCard | contain | 100% | 0% | H 15–85%; V 10–90% |
| Product Details main | 4:5؛ 441.06×551.33 على Desktop | cover | 70.34% | 29.66% رأسيًا؛ 14.83% من كل طرف | V 15–85% على الأقل |
| Product Details thumbnail | مربع؛ 96.27×96.27 على Desktop | cover | 56.27% | 43.73% رأسيًا؛ 21.87% من كل طرف | V 22–78% للصورة الحالية |
| Ambient hero | 1425×318.39 قبل transform على Desktop | cover + scale(1.06) | خلفية زخرفية شديدة القص | متغير جدًا | لا تعتمد عليه لعرض تفاصيل المنتج |

### Related Products (نفس ProductCard)

| الشاشة | الكارت بالكامل | فتحة الصورة | الجزء النصي التقريبي | Fit للصورة المرفوعة |
| --- | ---: | ---: | ---: | --- |
| 1440×900 | 297.60×334.92 | 295.62×184.76 | 148.18 | contain + 12px padding |
| 1280×800 | 293.88×332.60 | 291.90×182.43 | 148.18 | contain + 12px padding |
| 768×1024 | 227.82×340.63 | 225.83×190.46 | 148.18 | contain + 12px padding |
| 390×844 | 162.19×323.64 | 160.21×174.59 | 147.06 | contain + 9.11px computed padding |

### Category catalog/search card

| الشاشة | الكارت بالكامل | فتحة الصورة | Grid | Gap | Ratio / fit |
| --- | ---: | ---: | --- | ---: | --- |
| 1440×900 | 405.33×489.33 | 403.33×252.08 | 3 أعمدة | 16 | 8:5 / cover |
| 1280×800 | 400.33×486.20 | 398.33×248.95 | 3 أعمدة | 16 | 8:5 / cover |
| 768×1024 | 352.50×456.31 | 350.50×219.06 | عمودان | 16 | 8:5 / cover |
| 390×844 | 343.00×442.63 | 341.00×213.13 | عمود واحد | — | 8:5 / cover |

فلترة/بحث صفحة الـCategory يعيدان استخدام نفس `CatalogProductCard`، فلا توجد نسبة مستقلة للبحث. شريط Related Categories يستخدم 256×144 للكارت و254×142 لفتحة الصورة على المقاسات الأربعة، مع `cover`.

### أماكن المنتج الأخرى

| المكان | الحالة الحالية | فتحة/طريقة العرض |
| --- | --- | --- |
| Header wishlist panel | قابل للقياس من الكود؛ يعتمد حالة العميل | 48×48، cover |
| Customer wishlist | محمي بالجلسة | 64×64، cover |
| Cart | لا يعرض صورة منتج حاليًا | ShoppingBag icon فقط |
| Checkout summary | لا يعرض صورة منتج حاليًا | نص/أيقونة فقط |
| Order details / Account orders | لا توجد صورة منتج في التنفيذ الحالي | — |
| Admin product drawer | محمي | 44×44، contain مع 4px padding |
| Admin gallery preview | محمي | مربع، `sizes=220px`، contain مع 16px padding |
| Admin products grid | محمي | مربع responsive، contain مع 16px padding |
| Admin product details header | محمي | 128×128 على Desktop؛ ارتفاع 128px وعرض كامل على Mobile، cover |
| Admin inventory | محمي | 56×56، contain مع 6px padding |
| Admin best sellers preview | محمي | 40×40، contain مع 4px padding |

**نتيجة نموذج البيانات:** نفس `image_url` المخزن في Supabase يصبح صورة الكارت وأول صورة في Gallery والـambient hero. `gallery` تضيف صورًا أخرى، لكنها لا توفر Card Image أو Thumbnail Image منفصلين. أفضل Master مشترك هو 4:5؛ ودعم Card/Gallery/Thumbnail مستقل مستقبلًا مفيد فقط للـart direction والتحكم التام في الخلفية والقص.

## 6. Hero images

### Home Hero — أبعاد السكشن الفعلية

| الشاشة | السكشن/فتحة الصورة | Slide 01 wide visible | Slide 02/03 portrait visible | النص EN | النص AR |
| --- | ---: | ---: | ---: | --- | --- |
| 1440×900 | 1425×900 | 84.46%؛ قص 7.77% يمين/يسار | 42.11%؛ قص 28.95% أعلى/أسفل | العنوان x=64، w=846.39 | العنوان x=468.61، w=892.39 |
| 1280×800 | 1265×800 | 84.36%؛ قص 7.82% يمين/يسار | 42.16%؛ قص 28.92% أعلى/أسفل | العنوان x=64، w=846.39 | العنوان x=308.61، w=892.39 |
| 768×1024 | 753×1024 | 39.23%؛ قص 30.38% يمين/يسار | 90.66%؛ قص 4.67% أعلى/أسفل | العنوان x=32، w=689 | العنوان x=32، w=689 |
| 390×844 | 375×844 | 23.70%؛ قص 38.15% يمين/يسار | 66.64%؛ قص 16.68% يمين/يسار | العنوان x=20، w=335 | العنوان x=20، w=335 |

الـHero يستخدم `cover / center` و`overflow: hidden`. الـimage opacity نفسها 1. توجد طبقات: black overlay بقيمة 0.44، vignette radial بقيمة قصوى 0.32، bottom gradient بقيمة قصوى 0.40، side gradient، وgold radial بقيمة 0.14. النص والأزرار حيّة فوق الصورة وليست جزءًا منها.

في الإنجليزية يبدأ العنوان من اليسار، وفي العربية ينتقل إلى اليمين على Desktop/Laptop. لذلك لا يوجد جانب واحد يمكن حجزه للنص في اللغتين. اترك الجانبين هادئين، ولا تضع نصًا مطبوعًا داخل الصورة. للصورة الحالية العريضة، التقاطع الآمن عبر كل الشاشات هو فقط `H 38.15–61.85%`. باستخدام Master متوازن 5:6 يصبح التقاطع العملي `H 23–77% / V 24–76%`.

**التوصية:** Master واحد 2000×2400 (5:6) ممكن إذا بقي العنصر في الوسط. لكن Slide 01 الحالية ذات عنصر بصري جانبي تفقد أكثر من ثلاثة أرباع عرضها على Mobile؛ لذلك يوصى مستقبلًا بـDesktop 1920×1200 وMobile 1080×2400 لهذه الحالة تحديدًا.

### بقية الـHeroes

| الصفحة/الصورة | 1440×900 | 1280×800 | 768×1024 | 390×844 | المصدر / الخطر |
| --- | ---: | ---: | ---: | ---: | --- |
| Products Hero | 1425×405 | 1265×360 | 753×460.80 | 375×379.80 | 2:3؛ قص رأسي 77.55% على Desktop |
| Category Hero | 1425×479 | 1265×479 | 753×479 | 375×399 | 2:3؛ قص رأسي ≈77.59% على Desktop |
| Contact Hero | 1425×325.39 | 1265×325.39 | 753×294.39 | 375×275.39 | 2:3؛ قص رأسي 84.78% على Desktop |
| Blog listing Hero | 1425×341.64 | 1265×341.64 | 753×341.64 | 375×309.64 | 2:3؛ قص رأسي ≈84.02% على Desktop |
| Blog article Hero (legacy image) | 1425×468 | 1265×416 | 753×532.47 | 375×354.47 | 2:3؛ قص رأسي ≈78.10% على Desktop |
| Legal Hero | 1425×292.39 | 1265×292.39 | 753×292.39 | 375×287.14 | wide؛ Desktop يقص 61.53% رأسيًا، Mobile 30.31% أفقيًا |
| About Hero background | 1425×954.53 | 1265×945.73 | 753×1145.92 | 375×1100.06 | wide؛ Mobile يظهر 18.19% فقط من العرض |
| About quote CTA | 1425×810.59 | 1265×810.59 | 753×810.59 | 375×874.56 | 2:3؛ اتجاه القص يتغير بين Desktop وMobile |

للـProducts/Category Hero استخدم 2400×1200 (2:1). للـContact/Blog listing/Legal استخدم 2400×1000 (12:5). للـBlog article استخدم 1920×1080. لا تضع العنصر المهم خارج منتصف 50% أفقيًا و60% رأسيًا.

## 7. Category cards, story, journal, and social gallery

### Category Cards

| الشاشة | الكارت | فتحة الصورة | النسبة | قص المصدر 2:3 |
| --- | ---: | ---: | ---: | ---: |
| 1440×900 | 246.02×328.01 | 244.03×326.03 | 3:4 | 11.11% رأسيًا |
| 1280×800 | 246.02×328.01 | 244.03×326.03 | 3:4 | 11.11% رأسيًا |
| 768×1024 | 230.14×306.85 | 228.16×304.87 | 3:4 | 11.11% رأسيًا |
| 390×844 | 174.59×232.78 | 172.61×230.79 | 3:4 | 11.11% رأسيًا |

النص والـgradient في أسفل الكارت. التصميم: 1200×1600 (3:4)، واجعل العنصر في `H 10–90% / V 10–65%` حتى لا يغطيه النص.

### Story/About portraits

Story image: 568.26×758.34 على Desktop، 560.83×748.44 على Laptop، 568.26×758.34 على Tablet، 337.59×450.77 على Mobile. About roastery: 547.11×730.14، 540.52×721.34، 382×510، 341×455.33. جميعها عمليًا 3:4 مع `cover`; مصدر 2:3 يفقد 11.11% رأسيًا. التوصية 1200×1600.

About sourcing image فتحتها 547.11×684.38، 540.52×676.14، 382×478، 341×426.75 (4:5). مصدرها عريض 1.8745:1، لذلك يظهر 42.68% فقط ويُقص 28.66% من كل جانب. المنطقة الآمنة `H 29–71% / V 10–90%`.

### Journal

فتحة الصورة: 397.45×222.21 Desktop، 392.49×222.21 Laptop، 223.20×222.21 Tablet، 338.27×206.34 Mobile. استخدام مصدر 2:3 يؤدي إلى ظهور نحو 37.26% فقط على Desktop. صمم 1600×1200 (4:3) مع Safe area `H/V 13–87%`.

### Social gallery

الصورة المميزة: 818.06×394.82، 808.14×394.82، 469.54×331.33، 338.27×132.93. الصور الثانوية: قرابة 400.10×188.48، 395.14×188.48، 225.85×156.74، 162.19×132.93. كلها `cover`. الصورة المميزة على Mobile شديدة العرض وتُبقي 26.20% فقط من مصدر 2:3. صمم 1600×1200، ولا تضع التفاصيل المهمة خارج `H 10–90% / V 24–76%`.

## 8. Background images and overlays

| الخلفية | Opacity المقاسة/المعرفة | 1440 | 1280 | 768 | 390 | ملاحظة القص |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Home Categories | 0.08 | 1425×690.61 | 1265×690.61 | 753×669.28 | 375×520.81 | wide source؛ Mobile يقص 61.58% أفقيًا |
| Home Features | 0.07 | 1425×524.41 | 1265×524.41 | 753×752.05 | 375×794.50 | portrait source؛ Desktop يقص 75.47% رأسيًا، Mobile يقص 29.20% أفقيًا |
| Home Best Sellers | 0.16 | 1425×480.77 | 1265×480.77 | 753×480.77 | 375×398.97 | portrait source؛ Desktop يقص 77.51% رأسيًا |
| Home Testimonials | 0.10 في الكود | غير mounted | غير mounted | غير mounted | غير mounted | Component موجود لكنه غير مستخدم حاليًا |
| Home Contact | 0.20 | 1425×639 | 1265×639 | 753×1066.02 | 375×1071.13 | wide source؛ Mobile يقص 81.32% أفقيًا |
| Story section | 0.08 | 1425×1024 | 1265×1014 | 753×1669.78 | 375×1428.03 | portrait source؛ Desktop يقص 52.09% رأسيًا، Mobile يقص 60.61% أفقيًا |
| Footer | 0.06 | 1425×425.50 | 1265×425.50 | 753×724.25 | 375×1108.25 | wide source؛ Mobile يقص 81.97% أفقيًا |
| Auth | 0.14 | 1425×900 | 1265×823.75 | 753×1024 | 375×844 | wide source؛ Mobile يقص 76.30% أفقيًا |
| Account | 0.075 في الكود | محمي | محمي | محمي | محمي | خلفية زخرفية فقط |
| Admin welcome | 0.45 + dark gradient | محمي | محمي | محمي | محمي | card min-height 180px، cover |

الخلفيات الزخرفية لا ينبغي أن تحمل شعارًا أو نصًا أو تفاصيل حاسمة. استخدم 2000×1600 (5:4) WebP حتى 250KB، وضع أي ملمح مهم داخل منتصف 50% فقط.

## 9. Logos

| الاستخدام | الملف | Desktop | Laptop | Tablet | Mobile | Fit / position |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Public Header | white SVG | 192×64 | 192×64 | 128.86×64 | 112×40 | contain / left في EN، اتجاه الحاوية يتأثر RTL |
| Footer | white SVG | 288×96 | 288×96 | 288×96 | 256×80 | contain / object-left |
| Auth | white SVG | 192×64 | 192×64 | 192×64 | 192×64 | contain |
| Admin expanded | white SVG | code-defined 176×46 | — | — | — | contain؛ protected |
| Admin collapsed | colored SVG | code-defined 32×32 | — | — | — | contain؛ protected |

الملفان الرسميان 709×304. لا تعِد رسم الشعار، لا تغير نسبته، ولا تنشئ نسخة جديدة. استخدم `/site-images/shared/logos/line-coffee-white.svg` و`line-coffee-colored.svg` فقط حسب الخلفية.

## 10. Open Graph and metadata

`/site-images/shared/metadata/default-og.png` هو حاليًا نسخة من dark-roast بمقاس 1717×916 ونسبة 1.8745:1 وحجم 1,673,560 bytes. لا يدخل DOM ولا يملك browser viewport. التوصية القياسية: **1200×630، 1.91:1، WebP، ≤250KB، sRGB**، مع الشعار/العنوان داخل `H/V 10–90%`. لا تعدّل الملف في هذه المهمة.

## 11. Complete local image inventory

القيم التالية من ملفات الصور نفسها. المسارات المتعددة ذات المقاس والحجم نفسيهما هي نسخ byte-for-byte وفق `MIGRATION-MAP.md`.

| المسار | الاستخدام الأساسي | Natural px | Aspect | الحجم bytes |
| --- | --- | ---: | ---: | ---: |
| `/site-images/about/hero-section/background.png` | About hero background | 1717×916 | 1.8745 | 1,673,560 |
| `/site-images/about/hero-section/roastery.png` | About hero portrait | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/about/quote-cta-section/background.png` | About quote CTA | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/about/sourcing-section/coffee-beans.png` | About sourcing | 1717×916 | 1.8745 | 1,673,560 |
| `/site-images/admin/dashboard/welcome-background.png` | Admin welcome | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/admin/sidebar/roastery-thumbnail.png` | Admin sidebar thumbnail | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/blog/article-fallbacks/default.png` | Blog fallback | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/blog/hero-section/background.png` | Blog listing hero | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/contact/hero-section/background.png` | Contact hero | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/home/background-decoration/best-sellers-section.png` | Best Sellers background | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/home/background-decoration/categories-section.png` | Categories background | 1717×916 | 1.8745 | 1,673,560 |
| `/site-images/home/background-decoration/contact-section.png` | Contact background | 1717×916 | 1.8745 | 1,673,560 |
| `/site-images/home/background-decoration/features-section.png` | Features background | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/home/background-decoration/testimonials-section.png` | Testimonials background (unmounted) | 1717×916 | 1.8745 | 1,673,560 |
| `/site-images/home/categories-section/cappuccino.png` | Category card | 1024×1536 | 0.6667 | 1,937,689 |
| `/site-images/home/categories-section/coffee-mix.png` | Category card | 1024×1536 | 0.6667 | 2,173,874 |
| `/site-images/home/categories-section/easy-coffee.png` | Category card | 1024×1536 | 0.6667 | 1,937,689 |
| `/site-images/home/categories-section/espresso-blends.png` | Category card | 1024×1536 | 0.6667 | 2,122,431 |
| `/site-images/home/categories-section/flavor-coffee.png` | Category card | 1024×1536 | 0.6667 | 1,757,726 |
| `/site-images/home/categories-section/make-your-espresso.png` | Category card | 1086×1448 | 0.7500 | 2,000,481 |
| `/site-images/home/categories-section/turkish-blends.png` | Category card | 1024×1536 | 0.6667 | 1,878,760 |
| `/site-images/home/hero-section/01-dark-roast.png` | Home Hero slide 01 | 1717×916 | 1.8745 | 1,673,560 |
| `/site-images/home/hero-section/02-espresso-studio.png` | Home Hero slide 02 | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/home/hero-section/03-flavor-studio.png` | Home Hero slide 03 | 1024×1536 | 0.6667 | 1,757,726 |
| `/site-images/home/journal-section/01-roast-notes.png` | Journal card | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/home/journal-section/02-blend-guide.png` | Journal card | 1024×1536 | 0.6667 | 2,122,431 |
| `/site-images/home/journal-section/03-keeping-it-fresh.png` | Journal card | 1024×1536 | 0.6667 | 2,173,874 |
| `/site-images/home/social-gallery-section/01-flavor.png` | Social featured | 1024×1536 | 0.6667 | 1,757,726 |
| `/site-images/home/social-gallery-section/02-espresso.png` | Social tile | 1024×1536 | 0.6667 | 2,122,431 |
| `/site-images/home/social-gallery-section/03-classic-pouch.png` | Social tile | 1024×1536 | 0.6667 | 2,173,874 |
| `/site-images/home/social-gallery-section/04-roastery.png` | Social tile | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/home/social-gallery-section/05-flavor-pouch.png` | Social tile | 1122×1402 | 0.8003 | 1,851,762 |
| `/site-images/home/social-gallery-section/06-turkish.png` | Social tile | 1024×1536 | 0.6667 | 1,878,760 |
| `/site-images/home/story-section/story-roastery.png` | Story portrait | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/products/builders/espresso/background.png` | Espresso builder background | 1717×916 | 1.8745 | 1,673,560 |
| `/site-images/products/builders/flavor/background.png` | Flavor builder background | 1024×1536 | 0.6667 | 1,757,726 |
| `/site-images/products/categories/cappuccino/fallback.png` | Product fallback | 1122×1402 | 0.8003 | 1,999,822 |
| `/site-images/products/categories/coffee-mix/fallback.png` | Product fallback | 1024×1536 | 0.6667 | 2,173,874 |
| `/site-images/products/categories/easy-coffee/fallback.png` | Product fallback | 1086×1448 | 0.7500 | 2,000,481 |
| `/site-images/products/categories/espresso-blends/fallback.png` | Product fallback | 1024×1536 | 0.6667 | 2,122,431 |
| `/site-images/products/categories/flavor-coffee/fallback.png` | Product fallback | 1122×1402 | 0.8003 | 1,851,762 |
| `/site-images/products/categories/hot-chocolate/fallback.png` | Product fallback | 1122×1402 | 0.8003 | 1,999,822 |
| `/site-images/products/categories/turkish-blends/fallback.png` | Product fallback / High Mood | 1024×1536 | 0.6667 | 1,878,760 |
| `/site-images/products/hero-section/background.png` | Products Hero | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/products/product-detail/gallery-fallbacks/02-roastery.png` | Product gallery fallback | 1024×1536 | 0.6667 | 1,812,504 |
| `/site-images/products/product-detail/gallery-fallbacks/03-dark-roast.png` | Product gallery fallback | 1717×916 | 1.8745 | 1,673,560 |
| `/site-images/products/shared/default-product.png` | Default product image | 1024×1536 | 0.6667 | 2,173,874 |
| `/site-images/shared/account/background.png` | Account background | 1717×916 | 1.8745 | 1,673,560 |
| `/site-images/shared/auth/background.png` | Auth background | 1717×916 | 1.8745 | 1,673,560 |
| `/site-images/shared/footer/background.png` | Footer background | 1717×916 | 1.8745 | 1,673,560 |
| `/site-images/shared/legal/background.png` | Legal background | 1717×916 | 1.8745 | 1,673,560 |
| `/site-images/shared/logos/line-coffee-colored.svg` | Official colored logo | 709×304 | 2.3322 | 53,154 |
| `/site-images/shared/logos/line-coffee-white.svg` | Official white logo | 709×304 | 2.3322 | 52,766 |
| `/site-images/shared/metadata/default-og.png` | Default Open Graph | 1717×916 | 1.8745 | 1,673,560 |

## 12. Legacy and dynamic image findings

- المدونة الحالية ما زالت تعرض مسارات قديمة محفوظة في البيانات: `/assets/story/roastery.png` و`/assets/categories/espresso.png` و`/assets/products/classic-pouch.png` و`/assets/categories/turkish.png`. هذه ليست 404، لكنها قد تحمل نفس البيانات مرة أخرى تحت URL مختلف عن `site-images`.
- `src/lib/mock-data/product-catalog.ts` يعرف مسارات `/assets/...` لكنه غير مستورد حاليًا.
- إعدادات Admin CMS تعرض خيارات قديمة منها `/assets/story/portrait-roastery.png` و`/assets/story/dark-roast.png`، والملفان غير موجودين. المسارات dormant الآن، لكنها ستصبح 404 إذا اختيرت مستقبلًا.
- الصفحات العامة التي تم تشغيلها لم تُظهر Image 404. أخطاء WebSocket/HMR الخاصة بخادم التطوير ليست أخطاء صور.

## 13. How crop was calculated

لصورة مصدرها `Ws × Hs` وفتحتها `Wv × Hv`:

- `scale = max(Wv/Ws, Hv/Hs)` عند `cover`.
- الحجم بعد التكبير: `Wr = Ws×scale`, `Hr = Hs×scale`.
- الخارج أفقيًا: `Wr−Wv`، والخارج رأسيًا: `Hr−Hv`.
- مع `object-position: 50% 50%` ينقسم الخارج بالتساوي على الجانبين.
- إذا كان المصدر أضيق من الفتحة: `visible = SourceAR / DisplayAR`؛ القص رأسي.
- إذا كان المصدر أعرض: `visible = DisplayAR / SourceAR`؛ القص أفقي.

قيم CSV محسوبة بهذه المعادلات من natural size والفتحة المقاسة، لا من Screenshots.

## 14. Safe Area recommendations

| النوع | Horizontal safe area | Vertical safe area | تعليمات للمصمم |
| --- | --- | --- | --- |
| Product master 4:5 | 15–85% | 10–90% | العبوة في المركز؛ 15% هامش جانبي |
| High Mood 2:3 الحالية عبر ProductCard | 15–85% | 31.64–68.36% | مساحة ضيقة؛ لا تستخدم هذا التكوين لملف جديد |
| Home Hero master 5:6 | 23–77% | 24–76% | لا نص baked-in؛ الجانبان هادئان للـEN/AR |
| Home Hero slide 01 الحالي | 38.15–61.85% | 10–90% | Mobile يظهر 23.70% فقط من العرض |
| Category card | 10–90% | 10–65% | اترك أسفل الصورة للنص والـgradient |
| Story/About portrait | 10–90% | 10–90% | المنتصف هو الأضمن |
| About sourcing 4:5 من wide source | 29–71% | 10–90% | لا تفاصيل عند الجانبين |
| Journal | 13–87% | 13–87% | تعامل مع اختلاف النسب بين Tablet وDesktop |
| Social gallery | 10–90% | 24–76% | التصميم يجب أن ينجح في tile عريض جدًا |
| Decorative backgrounds | 25–75% | 25–75% | لا تعتمد عليها للمعلومات |

## 15. Conflicting image uses

| نفس المصدر | النسب المتعارضة | النتيجة |
| --- | --- | --- |
| Product primary Supabase | contain في card؛ 4:5 cover في detail؛ 1:1 cover في thumbnails؛ wide ambient cover | Master 4:5 هو أفضل حل مشترك، مع Safe V 10–90% |
| Turkish fallback / High Mood | 8:5 و≈1.82:1 و≈0.93:1 في cards؛ 4:5 و1:1 في gallery | لا توجد نسبة واحدة تملأ الجميع بلا قص؛ 4:5 + contain في cards أفضل compromise |
| Roastery 2:3 | Heroes عريضة، portraits 3:4، journal/social/blog | النسخ الحالية تحمل نفس composition رغم اختلاف الفتحات؛ التفاصيل الطرفية تضيع |
| Dark roast 1.8745:1 | desktop backgrounds وmobile backgrounds الطويلة و4:5 sourcing | Mobile/portrait usage شديد القص؛ اجعله زخرفيًا أو وفر art direction مستقبلًا |
| Official logo | header/footer/auth/admin بأحجام مختلفة | SVG الحالي مناسب للجميع؛ لا حاجة لنسخ raster |

## 16. Storage and performance

### الأحجام

| البند | Bytes | MiB |
| --- | ---: | ---: |
| صور `public/site-images` (54 ملفًا) | 96,655,546 | 92.18 |
| مجلد `public/site-images` شامل README/MAP وقت القياس | 96,661,189 | 92.18 |
| المصادر القديمة الـ12 التي نُسخت منها | 19,314,529 | 18.42 |
| البيانات الثنائية الفريدة داخل `site-images` | 19,314,529 | 18.42 |
| زيادة النسخ المتعددة داخل `site-images` | 77,341,017 | 73.76 |
| الزيادة الصافية في repo من مجلد التنظيم | 96,661,189 | 92.18 |

### أكبر 10 ملفات

1. `home/social-gallery-section/03-classic-pouch.png` — 2,173,874 bytes.
2. `home/categories-section/coffee-mix.png` — 2,173,874 bytes.
3. `products/categories/coffee-mix/fallback.png` — 2,173,874 bytes.
4. `home/journal-section/03-keeping-it-fresh.png` — 2,173,874 bytes.
5. `products/shared/default-product.png` — 2,173,874 bytes.
6. `home/social-gallery-section/02-espresso.png` — 2,122,431 bytes.
7. `home/journal-section/02-blend-guide.png` — 2,122,431 bytes.
8. `home/categories-section/espresso-blends.png` — 2,122,431 bytes.
9. `products/categories/espresso-blends/fallback.png` — 2,122,431 bytes.
10. `home/categories-section/make-your-espresso.png` — 2,000,481 bytes.

### مجموعات التطابق

- Roastery: 15 مسارًا متطابقًا.
- Dark roast: 13 مسارًا.
- Classic pouch: 5.
- Flavor category: 4.
- Espresso category: 4.
- Turkish category: 3.
- Flavor pouch، cappuccino sachets، espresso pouch، cappuccino visual: مساران لكل مجموعة.

نسخ الملفات تزيد Deployment size بوضوح. في المتصفح، كل path مختلف يولد URL مختلفًا في Next Image Optimizer ومفتاح cache مختلفًا، فلا يحدث deduplication حسب hash. داخل الصفحة الرئيسية رُصد 26 resource entry من `_next/image`; قياس session الدافئ ليس cold-download benchmark، لكنه أكد وجود cache objects منفصلة للمسارات المختلفة. هذا قد يزيد Vercel image optimization work والـbandwidth عند أول طلب لكل variant.

الحلول المقترحة فقط: manifest مركزي يشير إلى أصل واحد، أو hard-link/build-time dedupe، أو تخزين source واحد مع aliases منطقية، ثم ضغط/تحويل WebP مدروس. لا يُحذف أو يُضغط شيء قبل مراجعة أثر المسارات التاريخية وSupabase/DB.

## 17. General Export Rules for Graphic Designer

1. حافظ على Aspect Ratio المحددة لكل نوع؛ لا تمدد الصورة يدويًا.
2. لا تضع نصوصًا داخل الصور إلا عند ضرورة تسويقية مؤكدة؛ النص الحي يتبدل EN/AR ويظل أوضح وأكثر وصولًا.
3. اترك هوامش حول العبوات: 15% يمينًا ويسارًا و10% أعلى وأسفل للـProduct Master.
4. لا تضع شعارًا أو تفصيلة مهمة قرب الحواف أو خارج الـSafe Area.
5. استخدم WebP للصور الفوتوغرافية، PNG فقط عند الحاجة الفعلية للشفافية، وSVG للشعارات والعناصر المتجهة.
6. استخدم color profile ‏sRGB، وأزل metadata غير الضرورية عند التصدير.
7. جودة WebP المقترحة 75–82؛ افحص التفاصيل والحواف عند 100% قبل التسليم.
8. التزم بالحد الأقصى المدرج في Quick Specs. إذا تجاوز الملف الحد، قلل الجودة تدريجيًا لا الأبعاد أولًا.
9. سمِّ الملفات بأحرف إنجليزية صغيرة و`kebab-case` ووصف واضح، مثل `turkish-blend-card.webp`.
10. لا تغيّر الامتداد مع إبقاء الاسم فقط؛ يجب إجراء export حقيقي للصيغة الجديدة ثم تحديث المرجع بعد مراجعة هندسية منفصلة.
11. حافظ على أبعاد ونسبة موحدة بين جميع صور المنتجات؛ لا تخلط 2:3 و9:16 و4:5 في نفس المجموعة.
12. لا تضف لوجو جديدًا ولا تعِد رسم LINE COFFEE. استخدم ملفات SVG الرسمية الموجودة في المشروع فقط.
13. لا تضف baked-in shadows أو نصوصًا تقطعها الفتحات responsive؛ اختبر crop preview بنسبة 8:5 و4:5 و1:1 قبل التسليم.
14. سلّم Master عالي الجودة ونسخة WebP النهائية، ولا تستبدل ملفات الموقع قبل مراجعة المطور.

## 18. Validation record

| الفحص | النتيجة |
| --- | --- |
| `npx tsc --noEmit` | نجح؛ exit code 0 |
| `npm run lint` | نجح بعد حذف سكربتات القياس المؤقتة؛ 0 errors و0 warnings |
| `npm run build` | نجح؛ Next.js 16.2.11، compiled successfully، TypeScript نجح، وتم توليد 42 static page entry |
| `git diff --check` | نجح؛ exit code 0. ظهرت فقط رسائل Git الخاصة بتحويل LF إلى CRLF في ملفات العمل السابقة، وليست whitespace errors |
| CSV import | نجح باستخدام spreadsheet artifact tool؛ 398 صفًا شامل header و42 عمودًا، range ‏`A1:AP398` |
| Playwright production matrix | 40 حالة: 10 صفحات × 4 viewports؛ جميع المستندات HTTP 200، DPR=1، ولا broken images ولا image/document responses بحالة ≥400 |
| RTL/LTR | Home EN/LTR ضمن مصفوفة القياس؛ Home AR/RTL تحقق على 1440×900 و390×844، `lang=ar` و0 broken images |

المسارات الإنتاجية المختبرة: `/`، `/products`، `/products/category/turkish-blends`، `/products/high-mood`، `/about`، `/blog`، `/blog/roast-notes`، `/contact`، `/auth/login`، `/terms`.

ملاحظات غير حاجبة:

- build استخدم fallback ‏`https://linecoffee.eg` لأن `NEXT_PUBLIC_SITE_URL` غير معرف في بيئة الاختبار.
- المتصفح لم يسجل console errors. سجل warning بأن Footer background تم preload له ولم يُستخدم خلال ثوانٍ قليلة من load؛ هذه ملاحظة أداء فقط ولم تُغير في هذه المهمة.
- لا توجد 404 في الصفحات العامة المختبرة. المساران الغائبان في Admin CMS المذكوران في القسم 12 هما خيارات dormant غير مطلوبة في الصفحات الحالية.
- Account/Admin measurements التي تحتاج هوية ظلت موثقة كـcode-defined/protected بدل اختلاق جلسة أو أرقام.
- لم يبق أي سكربت قياس مؤقت في المشروع.
