"use client";

import { useState, useEffect } from "react";
import {
  X, Plus, Search, Eye, EyeOff, Settings2,
  Layers,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type FlavorCategory = "Chocolate" | "Nuts" | "Fruits" | "Desserts" | "Coffee & Special";

type Base = {
  slug:    string;
  nameEn:  string;
  nameAr:  string;
  descEn:  string;
  descAr:  string;
  visible: boolean;
};

type Flavor = {
  slug:           string;
  nameEn:         string;
  nameAr:         string;
  category:       FlavorCategory;
  costPerKg:      number;
  addOnPriceKg:   number;
  visible:        boolean;
  descEn:         string;
  descAr:         string;
};

type FlavorDrawerForm = Omit<Flavor, "slug">;

// ── Mock Bases ────────────────────────────────────────────────────────────────

const INITIAL_BASES: Base[] = [
  {
    slug: "turkish", nameEn: "Turkish Coffee", nameAr: "قهوة تركي",
    descEn: "Traditional fine-ground Turkish coffee base. Rich and strong.", descAr: "قاعدة القهوة التركية المطحونة الناعمة. غنية وقوية.", visible: true,
  },
  {
    slug: "coffee-mix", nameEn: "Coffee Mix", nameAr: "كوفي ميكس",
    descEn: "Pre-blended medium roast coffee mix. Balanced everyday base.", descAr: "خلطة قهوة متوسطة التحميص. قاعدة متوازنة للاستخدام اليومي.", visible: true,
  },
  {
    slug: "cappuccino", nameEn: "Cappuccino", nameAr: "كابتشينو",
    descEn: "Creamy cappuccino base with whole milk powder. Light and smooth.", descAr: "قاعدة كابتشينو كريمية مع حليب مجفف كامل الدسم. خفيفة وناعمة.", visible: true,
  },
  {
    slug: "hot-chocolate", nameEn: "Hot Chocolate", nameAr: "هوت شوكولت",
    descEn: "Rich dark chocolate flavored base. Indulgent and velvety.", descAr: "قاعدة غنية بنكهة الشوكولاتة الداكنة. فاخرة ومخملية.", visible: true,
  },
];

// ── Mock Flavors (30) ─────────────────────────────────────────────────────────

const INITIAL_FLAVORS: Flavor[] = [
  // Chocolate (5)
  { slug: "dark-chocolate",  nameEn: "Dark Chocolate",  nameAr: "شوكولاتة داكنة",  category: "Chocolate",       costPerKg: 25, addOnPriceKg: 45, visible: true,  descEn: "Intense bittersweet dark chocolate.",      descAr: "شوكولاتة داكنة مُرّة وغنية." },
  { slug: "milk-chocolate",  nameEn: "Milk Chocolate",  nameAr: "شوكولاتة حليب",  category: "Chocolate",       costPerKg: 22, addOnPriceKg: 40, visible: true,  descEn: "Creamy and sweet milk chocolate.",         descAr: "شوكولاتة حليب كريمية وحلوة." },
  { slug: "white-chocolate", nameEn: "White Chocolate", nameAr: "شوكولاتة بيضاء", category: "Chocolate",       costPerKg: 23, addOnPriceKg: 42, visible: true,  descEn: "Smooth buttery white chocolate.",          descAr: "شوكولاتة بيضاء ناعمة وزبدية." },
  { slug: "cocoa",           nameEn: "Cocoa",           nameAr: "كاكاو",           category: "Chocolate",       costPerKg: 19, addOnPriceKg: 35, visible: true,  descEn: "Pure natural cocoa powder notes.",         descAr: "نكهة مسحوق الكاكاو الطبيعي." },
  { slug: "mocha",           nameEn: "Mocha",           nameAr: "موكا",            category: "Chocolate",       costPerKg: 27, addOnPriceKg: 48, visible: true,  descEn: "Coffee and chocolate fusion.",             descAr: "مزيج القهوة والشوكولاتة." },
  // Nuts (4)
  { slug: "hazelnut",        nameEn: "Hazelnut",        nameAr: "هيزلنت",          category: "Nuts",            costPerKg: 36, addOnPriceKg: 65, visible: true,  descEn: "Rich roasted hazelnut warmth.",            descAr: "دفء البندق المحمص الغني." },
  { slug: "pistachio",       nameEn: "Pistachio",       nameAr: "فستق",            category: "Nuts",            costPerKg: 42, addOnPriceKg: 75, visible: true,  descEn: "Earthy and sweet pistachio.",              descAr: "فستق حلو وترابي الطعم." },
  { slug: "almond",          nameEn: "Almond",          nameAr: "لوز",             category: "Nuts",            costPerKg: 33, addOnPriceKg: 60, visible: true,  descEn: "Light and nutty almond essence.",          descAr: "جوهر اللوز الخفيف والمكسرات." },
  { slug: "walnut",          nameEn: "Walnut",          nameAr: "جوز",             category: "Nuts",            costPerKg: 30, addOnPriceKg: 55, visible: true,  descEn: "Deep and slightly bitter walnut.",         descAr: "جوز عميق الطعم وخفيف المرارة." },
  // Fruits (8)
  { slug: "mango",           nameEn: "Mango",           nameAr: "مانجو",           category: "Fruits",          costPerKg: 21, addOnPriceKg: 38, visible: true,  descEn: "Tropical ripe mango sweetness.",           descAr: "حلاوة المانجو الاستوائية الناضجة." },
  { slug: "strawberry",      nameEn: "Strawberry",      nameAr: "فراولة",          category: "Fruits",          costPerKg: 19, addOnPriceKg: 35, visible: true,  descEn: "Fresh and tangy strawberry.",              descAr: "فراولة طازجة وحامضة قليلاً." },
  { slug: "peach",           nameEn: "Peach",           nameAr: "خوخ",             category: "Fruits",          costPerKg: 22, addOnPriceKg: 40, visible: true,  descEn: "Soft and juicy summer peach.",             descAr: "خوخ صيفي طري وعصير." },
  { slug: "raspberry",       nameEn: "Raspberry",       nameAr: "توت أحمر",        category: "Fruits",          costPerKg: 25, addOnPriceKg: 45, visible: true,  descEn: "Bright and tart red berry.",               descAr: "توت أحمر لامع وحامض." },
  { slug: "blueberry",       nameEn: "Blueberry",       nameAr: "توت أزرق",        category: "Fruits",          costPerKg: 25, addOnPriceKg: 45, visible: false, descEn: "Sweet and deep blueberry.",               descAr: "توت أزرق حلو وعميق الطعم." },
  { slug: "passion-fruit",   nameEn: "Passion Fruit",   nameAr: "باشن فروت",       category: "Fruits",          costPerKg: 28, addOnPriceKg: 50, visible: true,  descEn: "Exotic and aromatic passion fruit.",       descAr: "باشن فروت غريب وعطري." },
  { slug: "lemon",           nameEn: "Lemon",           nameAr: "ليمون",           category: "Fruits",          costPerKg: 16, addOnPriceKg: 30, visible: true,  descEn: "Sharp and refreshing lemon zest.",         descAr: "حدة الليمون المنعشة." },
  { slug: "orange",          nameEn: "Orange",          nameAr: "برتقال",          category: "Fruits",          costPerKg: 18, addOnPriceKg: 32, visible: true,  descEn: "Sweet and citrusy orange blossom.",        descAr: "زهر البرتقال الحلو والحمضي." },
  // Desserts (7)
  { slug: "vanilla",         nameEn: "Vanilla",         nameAr: "فانيليا",         category: "Desserts",        costPerKg: 16, addOnPriceKg: 30, visible: true,  descEn: "Classic and smooth vanilla bean.",         descAr: "حبة فانيليا كلاسيكية وناعمة." },
  { slug: "caramel",         nameEn: "Caramel",         nameAr: "كراميل",          category: "Desserts",        costPerKg: 19, addOnPriceKg: 35, visible: true,  descEn: "Warm buttery caramel sweetness.",          descAr: "حلاوة الكراميل الزبدية الدافئة." },
  { slug: "lotus",           nameEn: "Lotus",           nameAr: "لوتس",            category: "Desserts",        costPerKg: 30, addOnPriceKg: 55, visible: true,  descEn: "Iconic caramelised biscuit flavor.",       descAr: "نكهة البسكويت الكراميلي الشهيرة." },
  { slug: "oreo",            nameEn: "Oreo",            nameAr: "أوريو",           category: "Desserts",        costPerKg: 28, addOnPriceKg: 50, visible: true,  descEn: "Cookies and cream Oreo blend.",            descAr: "مزيج الكوكيز والكريم أوريو." },
  { slug: "cinnamon",        nameEn: "Cinnamon",        nameAr: "قرفة",            category: "Desserts",        costPerKg: 15, addOnPriceKg: 28, visible: true,  descEn: "Warm and spicy cinnamon.",                 descAr: "قرفة دافئة وحارة." },
  { slug: "coconut",         nameEn: "Coconut",         nameAr: "جوز هند",         category: "Desserts",        costPerKg: 21, addOnPriceKg: 38, visible: true,  descEn: "Tropical creamy coconut.",                 descAr: "جوز هند استوائي كريمي." },
  { slug: "butterscotch",    nameEn: "Butterscotch",    nameAr: "بترسكوتش",        category: "Desserts",        costPerKg: 23, addOnPriceKg: 42, visible: false, descEn: "Rich buttery toffee notes.",              descAr: "نكهات التوفي الزبدية الغنية." },
  // Coffee & Special (6)
  { slug: "irish-cream",     nameEn: "Irish Cream",     nameAr: "آيريش كريم",      category: "Coffee & Special", costPerKg: 33, addOnPriceKg: 60, visible: true,  descEn: "Smooth cream liqueur character.",          descAr: "طابع الكريمة السلسة." },
  { slug: "turkish-delight", nameEn: "Turkish Delight", nameAr: "راحة الحلقوم",    category: "Coffee & Special", costPerKg: 30, addOnPriceKg: 55, visible: true,  descEn: "Rose-scented sweet confection.",           descAr: "حلوى عطرية برائحة الورد." },
  { slug: "saffron",         nameEn: "Saffron",         nameAr: "زعفران",          category: "Coffee & Special", costPerKg: 44, addOnPriceKg: 80, visible: true,  descEn: "Rare and luxurious saffron.",              descAr: "زعفران نادر وفاخر." },
  { slug: "rose",            nameEn: "Rose",            nameAr: "ورد",             category: "Coffee & Special", costPerKg: 25, addOnPriceKg: 45, visible: true,  descEn: "Delicate floral rose water.",              descAr: "ماء ورد زهري رقيق." },
  { slug: "cardamom",        nameEn: "Cardamom",        nameAr: "هيل",             category: "Coffee & Special", costPerKg: 19, addOnPriceKg: 35, visible: true,  descEn: "Aromatic green cardamom spice.",           descAr: "توابل الهيل الأخضر العطري." },
  { slug: "tiramisu",        nameEn: "Tiramisu",        nameAr: "تيراميسو",        category: "Coffee & Special", costPerKg: 32, addOnPriceKg: 58, visible: true,  descEn: "Italian mascarpone and coffee dessert.",   descAr: "حلوى المسكاربوني والقهوة الإيطالية." },
];

const ALL_CATEGORIES: FlavorCategory[] = ["Chocolate", "Nuts", "Fruits", "Desserts", "Coffee & Special"];
const FLAVOR_DRAWER_TABS = ["General", "Category", "Pricing", "Visibility"];

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 8,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.16)",
  color: "var(--cream)", outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 600, textTransform: "uppercase" as const,
  letterSpacing: "0.1em", color: "var(--cream-dim)", opacity: 0.55, marginBottom: 6, display: "block",
};

// ── Category color map ────────────────────────────────────────────────────────

const CAT_COLOR: Record<FlavorCategory, string> = {
  "Chocolate":       "#92400e",
  "Nuts":            "#78350f",
  "Fruits":          "#166534",
  "Desserts":        "#6d28d9",
  "Coffee & Special":"#92400e",
};

const CAT_TEXT: Record<FlavorCategory, string> = {
  "Chocolate":       "#fde68a",
  "Nuts":            "#fcd34d",
  "Fruits":          "#86efac",
  "Desserts":        "#c4b5fd",
  "Coffee & Special":"#d6a373",
};

// ── FlavorDrawer ──────────────────────────────────────────────────────────────

function FlavorDrawer({
  flavor, isOpen, onClose, onSave,
}: {
  flavor:  Flavor | null;
  isOpen:  boolean;
  onClose: () => void;
  onSave:  (slug: string, partial: Partial<Flavor>) => void;
}) {
  const [tab,   setTab]   = useState("General");
  const [form,  setForm]  = useState<FlavorDrawerForm | null>(null);
  const [saved, setSaved] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (flavor) { setForm({ nameEn: flavor.nameEn, nameAr: flavor.nameAr, category: flavor.category, costPerKg: flavor.costPerKg, addOnPriceKg: flavor.addOnPriceKg, visible: flavor.visible, descEn: flavor.descEn, descAr: flavor.descAr }); setTab("General"); setSaved(false); } }, [flavor?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!flavor || !form) return null;

  function setF(key: keyof FlavorDrawerForm, value: unknown) {
    setForm(prev => prev ? { ...prev, [key]: value } as FlavorDrawerForm : null);
  }

  function handleSave() {
    if (!form) return;
    onSave(flavor!.slug, { ...form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
        opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none", transition: "opacity 200ms",
      }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 101,
        width: "clamp(300px, 40vw, 520px)",
        background: "linear-gradient(135deg,#130E09 0%,#0F0A06 100%)",
        borderLeft: "1px solid rgba(182,136,94,0.16)",
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 300ms cubic-bezier(0.22,1,0.36,1)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px 0", borderBottom: "1px solid rgba(182,136,94,0.10)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--cream)" }}>{flavor.slug === "__new__" ? "New Flavor" : (form.nameEn || "Flavor")}</p>
              <p style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.5, marginTop: 2 }}>{form.nameAr}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.07em",
                background: `${CAT_COLOR[form.category]}40`, color: CAT_TEXT[form.category],
              }}>{form.category}</span>
              <button type="button" onClick={onClose} style={{ padding: 6, color: "var(--cream-dim)", opacity: 0.45 }}>
                <X size={16} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            {FLAVOR_DRAWER_TABS.map(t => (
              <button key={t} type="button" onClick={() => setTab(t)} style={{
                padding: "6px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                borderRadius: "6px 6px 0 0",
                color: tab === t ? "var(--gold)" : "var(--cream-dim)",
                background: tab === t ? "rgba(182,136,94,0.10)" : "transparent",
                borderBottom: tab === t ? "2px solid var(--gold)" : "2px solid transparent",
                opacity: tab === t ? 1 : 0.5,
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

          {/* GENERAL */}
          {tab === "General" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <span style={labelStyle}>English Name</span>
                <input value={form.nameEn} onChange={e => setF("nameEn", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Arabic Name</span>
                <input value={form.nameAr} onChange={e => setF("nameAr", e.target.value)} dir="rtl" style={inputStyle} />
              </div>
              <div style={{ borderTop: "1px solid rgba(182,136,94,0.10)", paddingTop: 14 }}>
                <span style={labelStyle}>English Description</span>
                <textarea value={form.descEn} onChange={e => setF("descEn", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" as const }} />
              </div>
              <div>
                <span style={labelStyle}>Arabic Description</span>
                <textarea value={form.descAr} onChange={e => setF("descAr", e.target.value)} rows={3} dir="rtl" style={{ ...inputStyle, resize: "vertical" as const }} />
              </div>
            </div>
          )}

          {/* CATEGORY */}
          {tab === "Category" && (
            <div>
              <span style={labelStyle}>Flavor Category</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {ALL_CATEGORIES.map(cat => (
                  <button key={cat} type="button" onClick={() => setF("category", cat)}
                    aria-pressed={form.category === cat ? "true" : "false"}
                    style={{
                      padding: "11px 14px", borderRadius: 10, textAlign: "left", fontSize: 13, fontWeight: 600,
                      background: form.category === cat ? `${CAT_COLOR[cat]}30` : "rgba(255,255,255,0.04)",
                      color: form.category === cat ? CAT_TEXT[cat] : "var(--cream-dim)",
                      border: form.category === cat ? `1px solid ${CAT_COLOR[cat]}60` : "1px solid rgba(255,255,255,0.08)",
                    }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PRICING */}
          {tab === "Pricing" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <span style={labelStyle}>Purchase Price / KG (EGP)</span>
                <input type="number" value={form.costPerKg} onChange={e => setF("costPerKg", Number(e.target.value))} style={inputStyle} />
                <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.35, marginTop: 5 }}>سعر الشراء — internal, not shown to customers.</p>
              </div>
              <div>
                <span style={labelStyle}>Sale Add-on / KG (EGP)</span>
                <input type="number" value={form.addOnPriceKg} onChange={e => setF("addOnPriceKg", Number(e.target.value))} style={inputStyle} />
                <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.35, marginTop: 5 }}>سعر البيع — added on top of base price, shown in the builder.</p>
              </div>
              {form.addOnPriceKg > 0 && form.costPerKg > 0 && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(182,136,94,0.06)", border: "1px solid rgba(182,136,94,0.14)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.55 }}>Margin</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>
                      {Math.round(((form.addOnPriceKg - form.costPerKg) / form.addOnPriceKg) * 100)}%
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.55 }}>Profit / KG</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>
                      +{form.addOnPriceKg - form.costPerKg} EGP
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VISIBILITY */}
          {tab === "Visibility" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.48 }}>
                Controls whether this flavor appears in the Make Your Flavor builder.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {([true, false] as const).map(v => {
                  const active = form.visible === v;
                  return (
                    <button key={String(v)} type="button" onClick={() => setF("visible", v)}
                      aria-pressed={active ? "true" : "false"}
                      style={{
                        flex: 1, padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 600,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        background: active ? (v ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.10)") : "rgba(255,255,255,0.04)",
                        color: active ? (v ? "#4ade80" : "#f87171") : "var(--cream-dim)",
                        border: active ? (v ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(239,68,68,0.2)") : "1px solid rgba(255,255,255,0.08)",
                      }}>
                      {v ? <><Eye size={13} /> Show In Builder</> : <><EyeOff size={13} /> Hide From Builder</>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(182,136,94,0.10)", display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.04)", color: "var(--cream-dim)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} style={{
            flex: 2, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: saved ? "rgba(74,222,128,0.14)" : "rgba(182,136,94,0.18)",
            color: saved ? "#4ade80" : "var(--gold)",
            border: saved ? "1px solid rgba(74,222,128,0.28)" : "1px solid rgba(182,136,94,0.3)",
          }}>{saved ? "✓ Saved" : "Save Changes"}</button>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type FlavorFilter = "All" | FlavorCategory;

export default function FlavorManagerPage() {
  const [catFilter,       setCatFilter]       = useState<FlavorFilter>("All");
  const [search,          setSearch]          = useState("");
  const [openSlug,        setOpenSlug]        = useState<string | null>(null);
  const [flavorOverrides, setFlavorOverrides] = useState<Record<string, Partial<Flavor>>>({});
  const [customFlavors,   setCustomFlavors]   = useState<Flavor[]>([]);
  const [baseOverrides,   setBaseOverrides]   = useState<Record<string, Partial<Base>>>({});
  const [rules,           setRules]           = useState({ maxFlavors: 5, showRecommended: true, requireBase: true });

  const NEW_SLUG = "__new__";
  const newFlavorTemplate: Flavor = {
    slug: NEW_SLUG, nameEn: "", nameAr: "", category: "Chocolate",
    costPerKg: 0, addOnPriceKg: 0, visible: true, descEn: "", descAr: "",
  };

  const allFlavors = [
    ...INITIAL_FLAVORS.map(f => ({ ...f, ...(flavorOverrides[f.slug] ?? {}) })),
    ...customFlavors.map(f => ({ ...f, ...(flavorOverrides[f.slug] ?? {}) })),
  ];
  const allBases   = INITIAL_BASES.map(b => ({ ...b, ...(baseOverrides[b.slug] ?? {}) }));

  const totalFlavors  = allFlavors.length;
  const hiddenFlavors = allFlavors.filter(f => !f.visible).length;
  const totalBases    = allBases.filter(b => b.visible).length;
  const totalCats     = ALL_CATEGORIES.length;

  const filtered = allFlavors.filter(f => {
    if (catFilter !== "All" && f.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!f.nameEn.toLowerCase().includes(q) && !f.nameAr.includes(q)) return false;
    }
    return true;
  });

  const openFlavor = openSlug === NEW_SLUG
    ? newFlavorTemplate
    : (allFlavors.find(f => f.slug === openSlug) ?? null);

  function saveFlavor(slug: string, partial: Partial<Flavor>) {
    if (slug === NEW_SLUG) {
      const name = (partial.nameEn ?? "").trim() || "New Flavor";
      const newSlug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now().toString().slice(-4);
      const newFlavor: Flavor = { ...newFlavorTemplate, ...partial, slug: newSlug };
      setCustomFlavors(prev => [...prev, newFlavor]);
      setOpenSlug(newSlug);
    } else {
      setFlavorOverrides(prev => ({ ...prev, [slug]: { ...(prev[slug] ?? {}), ...partial } }));
    }
  }

  function toggleBase(slug: string) {
    const base = allBases.find(b => b.slug === slug);
    if (!base) return;
    setBaseOverrides(prev => ({ ...prev, [slug]: { ...(prev[slug] ?? {}), visible: !base.visible } }));
  }

  const FILTER_OPTIONS: FlavorFilter[] = ["All", ...ALL_CATEGORIES];

  const catCounts = Object.fromEntries(
    ALL_CATEGORIES.map(cat => [cat, allFlavors.filter(f => f.category === cat).length])
  );

  return (
    <div style={{ padding: 24, minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
            Flavor Manager
          </h1>
          <p style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.42, marginTop: 4 }}>
            Manage flavors and bases available in the Make Your Flavor builder
          </p>
        </div>
        <button type="button" onClick={() => setOpenSlug(NEW_SLUG)} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
          background: "rgba(182,136,94,0.16)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.28)",
        }}>
          <Plus size={14} /> Add Flavor
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Flavors",    value: totalFlavors,  color: "var(--gold)" },
          { label: "Total Categories", value: totalCats,     color: "var(--gold-light)" },
          { label: "Active Bases",     value: totalBases,    color: "#4ade80" },
          { label: "Hidden Flavors",   value: hiddenFlavors, color: hiddenFlavors > 0 ? "#f87171" : "var(--cream-dim)" },
        ].map(card => (
          <div key={card.label} className="admin-kpi-card" style={{ position: "relative" }}>
            <p style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cream-dim)", opacity: 0.48, marginBottom: 8 }}>
              {card.label}
            </p>
            <p style={{ fontSize: 30, fontWeight: 800, color: card.color, fontFamily: "var(--font-playfair)", lineHeight: 1 }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Bases Section ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Layers size={15} color="var(--gold)" />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--cream)" }}>Bases</h2>
          <span style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.38 }}>— customers select one base before choosing flavors</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {allBases.map(base => (
            <div key={base.slug} style={{
              borderRadius: 14, border: `1px solid ${base.visible ? "rgba(182,136,94,0.18)" : "rgba(255,255,255,0.07)"}`,
              background: base.visible ? "rgba(182,136,94,0.05)" : "rgba(255,255,255,0.02)",
              padding: 16, opacity: base.visible ? 1 : 0.55,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--cream)" }}>{base.nameEn}</p>
                  <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.45 }}>{base.nameAr}</p>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                  background: base.visible ? "rgba(74,222,128,0.12)" : "rgba(156,163,175,0.12)",
                  color: base.visible ? "#4ade80" : "#9ca3af",
                }}>
                  {base.visible ? "ACTIVE" : "HIDDEN"}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.4, marginBottom: 12, lineHeight: 1.5 }}>
                {base.descEn}
              </p>
              <button type="button" onClick={() => toggleBase(base.slug)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                background: base.visible ? "rgba(239,68,68,0.08)" : "rgba(74,222,128,0.10)",
                color: base.visible ? "#f87171" : "#4ade80",
                border: base.visible ? "1px solid rgba(239,68,68,0.18)" : "1px solid rgba(74,222,128,0.2)",
              }}>
                {base.visible ? <><EyeOff size={11} /> Hide Base</> : <><Eye size={11} /> Show Base</>}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Flavor Grid ── */}
      <div>
        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {FILTER_OPTIONS.map(f => (
              <button key={f} type="button" onClick={() => setCatFilter(f)} style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                background: catFilter === f ? "rgba(182,136,94,0.18)" : "rgba(255,255,255,0.04)",
                color: catFilter === f ? "var(--gold)" : "var(--cream-dim)",
                border: catFilter === f ? "1px solid rgba(182,136,94,0.3)" : "1px solid transparent",
              }}>
                {f === "All" ? `All (${totalFlavors})` : `${f} (${catCounts[f]})`}
              </button>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--cream-dim)", opacity: 0.38 }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search flavors…"
              style={{ paddingLeft: 28, paddingRight: 12, height: 34, borderRadius: 9, fontSize: 12.5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.16)", color: "var(--cream)", outline: "none", width: 190 }}
            />
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
          {filtered.map(flavor => (
            <div
              key={flavor.slug}
              onClick={() => setOpenSlug(flavor.slug)}
              style={{
                borderRadius: 13, border: "1px solid rgba(182,136,94,0.12)",
                background: "rgba(255,255,255,0.02)", cursor: "pointer",
                overflow: "hidden", opacity: flavor.visible ? 1 : 0.6,
                transition: "border-color 180ms",
              }}
            >
              {/* Color band */}
              <div style={{ height: 6, background: `${CAT_COLOR[flavor.category]}80` }} />
              {/* Info */}
              <div style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--cream)" }}>{flavor.nameEn}</p>
                  {!flavor.visible && <EyeOff size={11} color="#f87171" />}
                </div>
                <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.44, marginBottom: 6 }}>{flavor.nameAr}</p>
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: `${CAT_COLOR[flavor.category]}35`, color: CAT_TEXT[flavor.category] }}>
                  {flavor.category}
                </span>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gold)", marginTop: 8 }}>
                  +{flavor.addOnPriceKg} EGP/kg
                </p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: "var(--cream-dim)", opacity: 0.3, fontSize: 13 }}>
              No flavors match your filter.
            </div>
          )}
        </div>
      </div>

      {/* ── Builder Rules ── */}
      <div style={{ marginTop: 32, padding: 24, borderRadius: 16, background: "rgba(182,136,94,0.04)", border: "1px solid rgba(182,136,94,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Settings2 size={16} color="var(--gold)" />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--cream)" }}>Builder Rules</h2>
          <span style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.38 }}>— configure the Make Your Flavor experience</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {/* Max Flavors */}
          <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(182,136,94,0.10)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cream-dim)", opacity: 0.48, marginBottom: 8 }}>
              Max Flavors Allowed
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" onClick={() => setRules(r => ({ ...r, maxFlavors: Math.max(1, r.maxFlavors - 1) }))} style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(255,255,255,0.06)", color: "var(--cream)", fontSize: 16, fontWeight: 700 }}>−</button>
              <span style={{ fontSize: 24, fontWeight: 800, color: "var(--gold)", fontFamily: "var(--font-playfair)", minWidth: 28, textAlign: "center" }}>{rules.maxFlavors}</span>
              <button type="button" onClick={() => setRules(r => ({ ...r, maxFlavors: Math.min(10, r.maxFlavors + 1) }))} style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(255,255,255,0.06)", color: "var(--cream)", fontSize: 16, fontWeight: 700 }}>+</button>
            </div>
            <p style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.35, marginTop: 6 }}>flavors per order</p>
          </div>

          {/* Show Recommended */}
          <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(182,136,94,0.10)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cream-dim)", opacity: 0.48, marginBottom: 8 }}>
              Show Recommended
            </p>
            <button
              type="button"
              onClick={() => setRules(r => ({ ...r, showRecommended: !r.showRecommended }))}
              aria-pressed={rules.showRecommended ? "true" : "false"}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: rules.showRecommended ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)",
                color: rules.showRecommended ? "#4ade80" : "var(--cream-dim)",
                border: rules.showRecommended ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(255,255,255,0.08)",
              }}>
              {rules.showRecommended ? "Enabled" : "Disabled"}
            </button>
            <p style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.35, marginTop: 6 }}>Show &ldquo;Recommended&rdquo; tags in builder</p>
          </div>

          {/* Require Base */}
          <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(182,136,94,0.10)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cream-dim)", opacity: 0.48, marginBottom: 8 }}>
              Require Base Selection
            </p>
            <button
              type="button"
              onClick={() => setRules(r => ({ ...r, requireBase: !r.requireBase }))}
              aria-pressed={rules.requireBase ? "true" : "false"}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: rules.requireBase ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)",
                color: rules.requireBase ? "#4ade80" : "var(--cream-dim)",
                border: rules.requireBase ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(255,255,255,0.08)",
              }}>
              {rules.requireBase ? "Required" : "Optional"}
            </button>
            <p style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.35, marginTop: 6 }}>Customer must pick a base before flavors</p>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <FlavorDrawer flavor={openFlavor} isOpen={openSlug !== null} onClose={() => setOpenSlug(null)} onSave={saveFlavor} />
    </div>
  );
}
