-- =====================================================================
-- Migration:  20260703150000_phase13a_seed_launch_blog
-- Project:    Line Coffee V3
-- Phase:      13A micro-fix (unify Admin CMS Blog + public Blog)
-- Runs after: 20260703140000_phase13a_cms_real_data
-- =====================================================================
--
-- PURPOSE
--   Move the six existing public launch articles out of the frontend static
--   dataset and into the real `public.blog_posts` source used by Admin CMS.
--
-- SAFETY
--   * Additive data migration only; no schema or policy changes.
--   * Idempotent by slug (`on conflict (slug) do nothing`).
--   * Existing CMS-authored rows always win and are never overwritten.
--   * Every seeded row is published intentionally because these exact articles
--     were already public before this migration.
--   * No random/fabricated content and no destructive statements.
-- =====================================================================

insert into public.blog_posts (
  slug,
  title_en,
  title_ar,
  excerpt_en,
  excerpt_ar,
  content_en,
  content_ar,
  category_en,
  category_ar,
  author,
  status,
  featured,
  published_at,
  read_time_en,
  read_time_ar,
  tags,
  hero_image,
  card_image,
  featured_image,
  seo_title_en,
  seo_title_ar,
  seo_description_en,
  seo_description_ar
)
values
  (
    'origins-of-arabic-coffee',
    'The Origins of Arabic Coffee Culture',
    'جذور ثقافة القهوة العربية',
    'From the highlands of Yemen to the coffee houses of Cairo — how a single seed became the backbone of Egyptian daily life.',
    'من مرتفعات اليمن إلى مقاهي القاهرة — كيف أصبحت حبة القهوة ركيزة الحياة اليومية المصرية.',
    'Coffee arrived in Egypt through Yemen more than five centuries ago, carried by Sufi scholars who relied on its energy during long nights of prayer and study. The drink spread quickly from the mosques of Cairo to the bustling coffee houses lining the city''s trade routes.

## The Yemeni Connection

The port city of Mocha in Yemen was once the world''s primary coffee export hub. Ships from Egypt, Persia, and India docked there to carry sacks of green coffee beans back home. Egyptian merchants were among the first to experiment with different roast levels, discovering that darker roasts produced a richer body suited to the country''s intense heat.

## Cairo''s Coffee House Legacy

By the 18th century, Cairo had hundreds of coffee houses known as qahawi. These weren''t just places to drink — they were centers of intellectual life, political debate, and artistic performance. Poets recited verses, merchants struck deals, and chess players spent hours over a single cup. The culture embedded itself so deeply into Egyptian identity that even today, the first act of hospitality in any Egyptian home is to offer coffee.

At Line Coffee, we see ourselves as part of this long tradition — roasting each batch with the same care and attention that defined Egyptian coffee culture for generations.',
    'وصلت القهوة إلى مصر عبر اليمن قبل أكثر من خمسة قرون، حملها العلماء الصوفيون الذين كانوا يعتمدون عليها في ليالي الدراسة والعبادة الطويلة. انتشر الشراب بسرعة من مساجد القاهرة إلى المقاهي المزدحمة التي كانت تصطف على طرق التجارة في المدينة.

## الصلة اليمنية

كانت ميناء المخا في اليمن ذات يوم المركز الرئيسي لتصدير القهوة في العالم. كانت السفن من مصر وفارس والهند ترسو هناك لحمل أكياس حبوب القهوة الخضراء إلى بلدانها. كان التجار المصريون من أوائل الذين جربوا درجات تحميص مختلفة، واكتشفوا أن التحميص الداكن ينتج قواماً أكثر ثراءً يناسب حرارة البلاد الشديدة.

## إرث مقاهي القاهرة

بحلول القرن الثامن عشر، كانت القاهرة تضم مئات المقاهي المعروفة بالقهاوي. لم تكن هذه الأماكن مجرد أماكن للشرب، بل كانت مراكز للحياة الفكرية والنقاش السياسي والأداء الفني. كان الشعراء يلقون قصائدهم، والتجار يبرمون صفقاتهم، وعشاق الشطرنج يقضون ساعات على كوب واحد. تجذّرت هذه الثقافة في الهوية المصرية بعمق لدرجة أن أول فعل ترحيب في أي منزل مصري حتى اليوم هو تقديم القهوة.

في لاين كوفي، نرى أنفسنا جزءاً من هذا التقليد الطويل — نحمص كل دفعة بنفس العناية والاهتمام الذي ميّز ثقافة القهوة المصرية لأجيال.',
    'Origins',
    'الأصول',
    'Line Coffee',
    'published',
    true,
    '2026-05-20T12:00:00Z'::timestamptz,
    '6 min read',
    '٦ دقائق قراءة',
    '[{"en":"History","ar":"التاريخ"},{"en":"Culture","ar":"الثقافة"}]'::jsonb,
    '/assets/story/roastery.png',
    '/assets/story/roastery.png',
    '/assets/story/roastery.png',
    'The Origins of Arabic Coffee Culture',
    'جذور ثقافة القهوة العربية',
    'From the highlands of Yemen to the coffee houses of Cairo — how a single seed became the backbone of Egyptian daily life.',
    'من مرتفعات اليمن إلى مقاهي القاهرة — كيف أصبحت حبة القهوة ركيزة الحياة اليومية المصرية.'
  ),
  (
    'roast-notes',
    'Roast Notes: Reading Your Coffee''s Personality',
    'ملاحظات التحميص: قراءة شخصية قهوتك',
    'Small coffee notes for a warmer daily cup. What the color, aroma, and surface of your beans tell you before the first sip.',
    'ملاحظات قصيرة لكوب يومي أكثر دفئًا وعمقًا. ما يخبرك به لون وعطر وسطح حبوبك قبل الرشفة الأولى.',
    'Every bag of coffee carries a story written in its color, oil level, and aroma. Learning to read those signals turns you from a coffee drinker into a coffee taster — someone who understands what they''re holding before the first brew.

## Light vs Dark: More Than Color

A light roast retains more of the bean''s origin character — floral, fruity, and bright with higher acidity. A dark roast trades those origin notes for roast-developed flavors: chocolate, caramel, and a heavier body that coats the palate. Neither is superior; they speak to different moods and brewing methods.

## Surface Oils: A Roast Indicator

Glossy beans signal a dark roast where cellular oils have migrated to the surface. Matte, dry beans sit in the light-to-medium range. For Turkish coffee, a medium-dark roast with slight surface sheen gives you the depth and crema that define a perfect cup.',
    'كل كيس قهوة يحمل قصة مكتوبة في لونه ومستوى زيوته وعطره. تعلّم قراءة تلك الإشارات يحولك من شارب قهوة إلى متذوق قهوة — شخص يفهم ما يحمله قبل التحضير الأول.

## الفاتح مقابل الداكن: أكثر من مجرد لون

يحتفظ التحميص الفاتح بالمزيد من خصائص مصدر الحبة — زهري وفاكهي ومشرق مع حموضة أعلى. يتبادل التحميص الداكن تلك النكهات الأصلية مقابل نكهات تطورت من التحميص: الشوكولاتة والكراميل وقوام أثقل يغلف الحنك. لا يعلو أي منهما على الآخر؛ فكل منهما يتحدث عن مزاج مختلف وطريقة تحضير مختلفة.

## الزيوت السطحية: مؤشر التحميص

الحبوب اللامعة تشير إلى تحميص داكن حيث هاجرت الزيوت الخلوية إلى السطح. الحبوب غير اللامعة والجافة تقع في النطاق الفاتح إلى المتوسط. بالنسبة للقهوة التركية، يمنحك التحميص المتوسط الداكن مع لمعان طفيف على السطح العمق والكريما التي تميز الكوب المثالي.',
    'Craft',
    'صناعة القهوة',
    'Line Coffee',
    'published',
    false,
    '2026-05-10T12:00:00Z'::timestamptz,
    '4 min read',
    '٤ دقائق قراءة',
    '[{"en":"Roasting","ar":"التحميص"},{"en":"Craft","ar":"الصناعة"}]'::jsonb,
    '/assets/story/roastery.png',
    '/assets/story/roastery.png',
    '/assets/story/roastery.png',
    'Roast Notes: Reading Your Coffee''s Personality',
    'ملاحظات التحميص: قراءة شخصية قهوتك',
    'Small coffee notes for a warmer daily cup. What the color, aroma, and surface of your beans tell you before the first sip.',
    'ملاحظات قصيرة لكوب يومي أكثر دفئًا وعمقًا. ما يخبرك به لون وعطر وسطح حبوبك قبل الرشفة الأولى.'
  ),
  (
    'blend-guide',
    'The Blend Guide: Matching Roast Depth to Your Ritual',
    'دليل الخلطات: مطابقة عمق التحميص مع طقسك',
    'A quick guide to matching roast depth with your daily ritual. Turkish, espresso, or pour-over — each method has its ideal roast partner.',
    'دليل سريع لاختيار عمق التحميص المناسب لطقسك اليومي. التركي أو الإسبريسو أو البور أوفر — لكل طريقة شريكها المثالي من التحميص.',
    'The most common mistake coffee drinkers make is using the wrong roast profile for their brewing method. Espresso demands pressure and concentrated extraction, Turkish coffee needs fine grind and slow heat, and pour-over rewards clarity. Each method amplifies different qualities in the bean.

## For Turkish Coffee

Medium-dark to dark roast, ground to a fine powder. You want body, sweetness, and low acidity. Brazilian and Ethiopian beans work beautifully here. Our Turkish Silk and Cairo Nights blends are calibrated exactly for this ritual.

## For Espresso

Medium to dark roast, ground to resistance point. You need beans with natural sweetness and enough density to hold up under pressure without turning bitter. Our espresso blends balance Arabica and Robusta to achieve a thick crema with a clean finish.',
    'الخطأ الأكثر شيوعاً الذي يرتكبه شاربو القهوة هو استخدام ملف التحميص الخاطئ لطريقة تحضيرهم. يتطلب الإسبريسو الضغط والاستخلاص المركّز، وتحتاج القهوة التركية إلى طحن ناعم وحرارة بطيئة، والبور أوفر يكافئ الوضوح. كل طريقة تضخم صفات مختلفة في الحبة.

## للقهوة التركية

تحميص متوسط داكن إلى داكن، مطحون إلى مسحوق ناعم. تريد قواماً وحلاوة وحموضة منخفضة. تعمل حبوب البرازيل والحبشة بشكل جميل هنا. خلطتا التركي سيلك وقهوة الليالي القاهرية لدينا محسوبتان بدقة لهذا الطقس.

## للإسبريسو

تحميص متوسط إلى داكن، مطحون إلى نقطة المقاومة. تحتاج إلى حبوب ذات حلاوة طبيعية وكثافة كافية لتحمل الضغط دون أن تصبح مرة. تُوازن خلطات الإسبريسو لدينا بين الأرابيكا والروبوستا لتحقيق كريما سميكة مع نهاية نظيفة.',
    'Guide',
    'أدلة',
    'Line Coffee',
    'published',
    false,
    '2026-04-28T12:00:00Z'::timestamptz,
    '5 min read',
    '٥ دقائق قراءة',
    '[{"en":"Blending","ar":"الخلط"},{"en":"Brewing","ar":"التحضير"}]'::jsonb,
    '/assets/categories/espresso.png',
    '/assets/categories/espresso.png',
    '/assets/categories/espresso.png',
    'The Blend Guide: Matching Roast Depth to Your Ritual',
    'دليل الخلطات: مطابقة عمق التحميص مع طقسك',
    'A quick guide to matching roast depth with your daily ritual. Turkish, espresso, or pour-over — each method has its ideal roast partner.',
    'دليل سريع لاختيار عمق التحميص المناسب لطقسك اليومي. التركي أو الإسبريسو أو البور أوفر — لكل طريقة شريكها المثالي من التحميص.'
  ),
  (
    'freshness',
    'Keeping It Fresh: Storage Secrets for Better Coffee',
    'الحفاظ على الطزاجة: أسرار التخزين لقهوة أفضل',
    'How careful storage preserves aroma and body in every bag. The four enemies of coffee freshness — and how to beat them.',
    'كيف يساعد التخزين الصحيح في الحفاظ على رائحة البن وقوامه. الأعداء الأربعة لطزاجة القهوة — وكيف تتغلب عليهم.',
    'Freshly roasted coffee is alive. For the first 72 hours after roasting, carbon dioxide is actively releasing from the beans — a process called degassing. During this window, the bean is at its most expressive. After that, four silent forces begin to steal flavor: oxygen, moisture, heat, and light.

## The Right Container

Use an airtight container with a one-way valve if possible. The valve lets CO₂ escape without letting oxygen in. Avoid glass containers on counters — they invite light. Ceramic or opaque stainless steel canisters are ideal. Never freeze whole beans unless you''re storing them for more than a month.

## Ground Coffee: Use Immediately

Ground coffee has 100 times more surface area than whole beans, meaning it goes stale 100 times faster. If you buy whole beans, grind only what you need for each session. If you buy pre-ground, finish the bag within 2–3 weeks for best results.',
    'القهوة المحمصة الطازجة حية. في أول ٧٢ ساعة بعد التحميص، يتحرر ثاني أكسيد الكربون بنشاط من الحبوب — وهو ما يسمى عملية إطلاق الغاز. خلال هذه الفترة، تكون الحبة في أعلى مستويات تعبيرها. بعد ذلك، تبدأ أربع قوى صامتة في سرقة النكهة: الأكسجين والرطوبة والحرارة والضوء.

## الحاوية المناسبة

استخدم حاوية محكمة الإغلاق مع صمام أحادي الاتجاه إن أمكن. يسمح الصمام لثاني أكسيد الكربون بالخروج دون السماح للأكسجين بالدخول. تجنب الحاويات الزجاجية على المنضدة — فهي تجذب الضوء. الأواني الخزفية أو الفولاذية غير الشفافة مثالية. لا تجمّد الحبوب الكاملة أبداً ما لم تكن تخزنها لأكثر من شهر.

## القهوة المطحونة: استخدمها فوراً

القهوة المطحونة لها مساحة سطح أكبر بـ ١٠٠ مرة من الحبوب الكاملة، مما يعني أنها تفقد نضارتها بسرعة أكبر بـ ١٠٠ مرة. إذا اشتريت حبوباً كاملة، اطحن ما تحتاجه فقط لكل جلسة. إذا اشتريت مطحونة مسبقاً، أنهِ الكيس خلال ٢-٣ أسابيع للحصول على أفضل نتيجة.',
    'Tips',
    'نصائح',
    'Line Coffee',
    'published',
    false,
    '2026-04-15T12:00:00Z'::timestamptz,
    '3 min read',
    '٣ دقائق قراءة',
    '[{"en":"Storage","ar":"التخزين"},{"en":"Tips","ar":"نصائح"}]'::jsonb,
    '/assets/products/classic-pouch.png',
    '/assets/products/classic-pouch.png',
    '/assets/products/classic-pouch.png',
    'Keeping It Fresh: Storage Secrets for Better Coffee',
    'الحفاظ على الطزاجة: أسرار التخزين لقهوة أفضل',
    'How careful storage preserves aroma and body in every bag. The four enemies of coffee freshness — and how to beat them.',
    'كيف يساعد التخزين الصحيح في الحفاظ على رائحة البن وقوامه. الأعداء الأربعة لطزاجة القهوة — وكيف تتغلب عليهم.'
  ),
  (
    'turkish-ritual',
    'The Turkish Coffee Ritual: Slow and Intentional',
    'طقس القهوة التركية: البطء والتأمل',
    'Why Turkish coffee is more than a brewing method — it''s a pause, a conversation, and a very Egyptian way of caring for people.',
    'لماذا القهوة التركية أكثر من مجرد طريقة تحضير — إنها توقف وحوار وطريقة مصرية جداً للاهتمام بالناس.',
    'In Egypt, asking someone if they want coffee is rarely a question about caffeine. It''s an invitation to sit, slow down, and be present. The Turkish coffee preparation — that slow, careful stir over low heat — is the physical form of that intention.

## The Kanaka and the Heat

The kanaka (rakwa) is the narrow-waisted copper pot central to the Turkish brewing process. Cold water, finely ground coffee, and sugar go in together, then the pot sits over the lowest possible flame. You stir gently until the surface begins to marble with fine foam. The moment before it boils is the moment of perfection — pull it off the heat and pour slowly.

Line Coffee blends like Turkish Silk are designed around this method. The blend ratio accounts for the long contact time and high temperature — delivering sweetness and body without the bitterness that ruins an unbalanced cup.',
    'في مصر، سؤال شخص ما إن كان يريد قهوة نادراً ما يكون سؤالاً عن الكافيين. إنه دعوة للجلوس والتباطؤ والتواجد. تحضير القهوة التركية — ذلك التقليب البطيء والحذر على نار هادئة — هو الشكل المادي لتلك النية.

## الكنكة والحرارة

الكنكة (الركوة) هي الوعاء النحاسي ذو الخصر الضيق المحوري في عملية التحضير التركي. تضع الماء البارد والقهوة المطحونة الناعمة والسكر معاً، ثم توضع الوعاء على أهدأ لهب ممكن. تقلّب بلطف حتى يبدأ السطح في اكتساب رغوة ناعمة. اللحظة قبيل الغليان هي لحظة الكمال — أبعدها عن الحرارة واسكب ببطء.

خلطات لاين كوفي مثل التركي سيلك مصممة حول هذه الطريقة. تأخذ نسبة الخلطة في الاعتبار وقت التلامس الطويل ودرجة الحرارة العالية — تمنحك الحلاوة والقوام دون المرارة التي تفسد الكوب غير المتوازن.',
    'Ritual',
    'الطقوس',
    'Line Coffee',
    'published',
    false,
    '2026-04-03T12:00:00Z'::timestamptz,
    '4 min read',
    '٤ دقائق قراءة',
    '[{"en":"Turkish","ar":"التركي"},{"en":"Ritual","ar":"الطقوس"}]'::jsonb,
    '/assets/categories/turkish.png',
    '/assets/categories/turkish.png',
    '/assets/categories/turkish.png',
    'The Turkish Coffee Ritual: Slow and Intentional',
    'طقس القهوة التركية: البطء والتأمل',
    'Why Turkish coffee is more than a brewing method — it''s a pause, a conversation, and a very Egyptian way of caring for people.',
    'لماذا القهوة التركية أكثر من مجرد طريقة تحضير — إنها توقف وحوار وطريقة مصرية جداً للاهتمام بالناس.'
  ),
  (
    'espresso-craft',
    'Espresso Craft: Why Extraction Time Changes Everything',
    'حرفة الإسبريسو: لماذا يغيّر وقت الاستخلاص كل شيء',
    'The difference between an espresso that sings and one that stings is often measured in seconds. Here''s how to listen.',
    'الفرق بين إسبريسو يُغني وآخر يُلسع يُقاس في أغلب الأحيان بالثواني. إليك كيف تُنصت.',
    'A standard espresso shot pulls in 25 to 30 seconds under approximately 9 bars of pressure. Within that narrow window, hot water dissolves hundreds of compounds from finely ground coffee — and the order in which they dissolve defines the flavor you taste.

## Under-Extraction: Sour and Hollow

The first compounds to dissolve are fruity acids — pleasant in small amounts, overwhelming when dominant. A shot that pulls too fast (under 20 seconds) is under-extracted: sour, thin, and lacking the caramel complexity that defines a great espresso.

## Over-Extraction: Bitter and Ashy

A shot that runs too long (over 35 seconds) pulls the harsh, bitter compounds that should stay behind in the puck. The result is a dry, ashy finish that no amount of milk or sugar can fully correct. The fix is usually a coarser grind to reduce resistance and shorten the pull.

Line Coffee espresso blends are calibrated for 25–28 second pulls on commercial machines. At home with a moka pot, aim for a low flame and a 4–5 minute total brew time — the equivalent principle, different equipment.',
    'يُستخلص شوت الإسبريسو القياسي في ٢٥ إلى ٣٠ ثانية تحت ضغط حوالي ٩ بار. خلال تلك الفترة الضيقة، يُذيب الماء الساخن مئات المركبات من القهوة المطحونة الناعمة — والترتيب الذي تنحل به يحدد النكهة التي تتذوقها.

## الاستخلاص الناقص: حامض وفارغ

أول المركبات التي تنحل هي الأحماض الفاكهية — لطيفة بكميات صغيرة، ساحقة عندما تكون هي السائدة. الشوت الذي يُستخلص بسرعة كبيرة (أقل من ٢٠ ثانية) يكون استخلاصه ناقصاً: حامض ورقيق ويفتقر إلى التعقيد الكراميلي الذي يميز الإسبريسو الرائع.

## الاستخلاص الزائد: مر ورمادي

الشوت الذي يعمل لفترة طويلة جداً (أكثر من ٣٥ ثانية) يستخلص المركبات المرة القاسية التي يجب أن تبقى في البك. النتيجة نهاية جافة ورمادية لا يمكن لأي كمية من الحليب أو السكر أن تصلحها بالكامل. الحل عادةً هو طحن أخشن لتقليل المقاومة وتقصير الاستخلاص.

خلطات الإسبريسو في لاين كوفي معايرة للاستخلاص خلال ٢٥-٢٨ ثانية على الآلات التجارية. في المنزل مع موكا بوت، استهدف لهباً هادئاً وإجمالي وقت تحضير ٤-٥ دقائق — المبدأ مماثل، الأجهزة مختلفة.',
    'Craft',
    'صناعة القهوة',
    'Line Coffee',
    'published',
    false,
    '2026-03-18T12:00:00Z'::timestamptz,
    '5 min read',
    '٥ دقائق قراءة',
    '[{"en":"Espresso","ar":"الإسبريسو"},{"en":"Extraction","ar":"الاستخلاص"}]'::jsonb,
    '/assets/categories/espresso.png',
    '/assets/categories/espresso.png',
    '/assets/categories/espresso.png',
    'Espresso Craft: Why Extraction Time Changes Everything',
    'حرفة الإسبريسو: لماذا يغيّر وقت الاستخلاص كل شيء',
    'The difference between an espresso that sings and one that stings is often measured in seconds. Here''s how to listen.',
    'الفرق بين إسبريسو يُغني وآخر يُلسع يُقاس في أغلب الأحيان بالثواني. إليك كيف تُنصت.'
  )
on conflict (slug) do nothing;
