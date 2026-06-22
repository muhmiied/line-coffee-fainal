"use client";

import { useState, useEffect } from "react";
import {
  X, Plus, Search, Eye, EyeOff, AlertTriangle,
  FlaskConical, Archive, ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type BeanType = "arabica" | "robusta";
type CharKey  = "body" | "crema" | "acidity" | "chocolate" | "sweetness" | "strength";

type Bean = {
  slug:          string;
  nameEn:        string;
  nameAr:        string;
  origin:        string;
  beanType:      BeanType;
  costPerKg:     number;
  salePriceKg:   number;
  stock:         number;
  lowStockAlert: number;
  visible:       boolean;
  archived:      boolean;
  descEn:        string;
  descAr:        string;
  characteristics: Record<CharKey, number>;
};

type DrawerForm = Omit<Bean, "slug" | "characteristics"> & Record<CharKey, number>;

// ── Mock Bean Data ────────────────────────────────────────────────────────────

const INITIAL_BEANS: Bean[] = [
  // ── Arabica (17) ──────────────────────────────────────────────────────────
  {
    slug: "indian-arabica", nameEn: "Indian Arabica", nameAr: "هندي",
    origin: "India", beanType: "arabica", costPerKg: 599, salePriceKg: 720, stock: 30, lowStockAlert: 8,
    visible: true, archived: false,
    descEn: "Nutty base with steady body.", descAr: "قاعدة مكسرات بقوام ثابت.",
    characteristics: { body: 4.0, crema: 3.1, acidity: 2.6, chocolate: 3.4, sweetness: 3.2, strength: 3.0 },
  },
  {
    slug: "brazilian-arabica", nameEn: "Brazilian Arabica", nameAr: "برازيلي",
    origin: "Brazil", beanType: "arabica", costPerKg: 482, salePriceKg: 580, stock: 35, lowStockAlert: 8,
    visible: true, archived: false,
    descEn: "Soft chocolate and low acidity.", descAr: "شوكولاتة ناعمة وحموضة منخفضة.",
    characteristics: { body: 4.1, crema: 3.3, acidity: 2.1, chocolate: 4.4, sweetness: 3.8, strength: 2.8 },
  },
  {
    slug: "colombian-arabica", nameEn: "Colombian Arabica", nameAr: "كولومبي",
    origin: "Colombia", beanType: "arabica", costPerKg: 705, salePriceKg: 850, stock: 22, lowStockAlert: 8,
    visible: true, archived: false,
    descEn: "Caramel balance with gentle fruit.", descAr: "توازن كراميل مع فاكهة هادئة.",
    characteristics: { body: 3.7, crema: 3.0, acidity: 3.2, chocolate: 3.5, sweetness: 4.0, strength: 3.0 },
  },
  {
    slug: "ethiopian-arabica", nameEn: "Ethiopian Arabica", nameAr: "حبشي",
    origin: "Ethiopia", beanType: "arabica", costPerKg: 487, salePriceKg: 585, stock: 20, lowStockAlert: 8,
    visible: true, archived: false,
    descEn: "Floral aroma and bright fruit.", descAr: "عطر زهري وفاكهة مشرقة.",
    characteristics: { body: 2.8, crema: 2.4, acidity: 4.6, chocolate: 2.2, sweetness: 3.9, strength: 2.7 },
  },
  {
    slug: "indian-plantation", nameEn: "Indian Plantation", nameAr: "هندي بلانتيشن",
    origin: "India", beanType: "arabica", costPerKg: 682, salePriceKg: 820, stock: 15, lowStockAlert: 8,
    visible: true, archived: false,
    descEn: "Polished body with warm depth.", descAr: "قوام مصقول بعمق دافئ.",
    characteristics: { body: 4.2, crema: 3.4, acidity: 2.4, chocolate: 3.6, sweetness: 3.3, strength: 3.3 },
  },
  {
    slug: "guatemala", nameEn: "Guatemala", nameAr: "جواتيمالا",
    origin: "Guatemala", beanType: "arabica", costPerKg: 835, salePriceKg: 1000, stock: 18, lowStockAlert: 8,
    visible: true, archived: false,
    descEn: "Dark chocolate with warm sweetness.", descAr: "شوكولاتة داكنة بحلاوة دافئة.",
    characteristics: { body: 3.9, crema: 3.2, acidity: 3.1, chocolate: 4.2, sweetness: 3.7, strength: 3.2 },
  },
  {
    slug: "yemeni", nameEn: "Yemeni", nameAr: "يمني",
    origin: "Yemen", beanType: "arabica", costPerKg: 1187, salePriceKg: 1425, stock: 7, lowStockAlert: 5,
    visible: true, archived: false,
    descEn: "Spiced depth and complex cocoa.", descAr: "عمق متبل وكاكاو معقد.",
    characteristics: { body: 4.3, crema: 3.1, acidity: 3.4, chocolate: 4.5, sweetness: 4.0, strength: 3.7 },
  },
  {
    slug: "peru", nameEn: "Peru", nameAr: "بيرو",
    origin: "Peru", beanType: "arabica", costPerKg: 835, salePriceKg: 1000, stock: 12, lowStockAlert: 6,
    visible: true, archived: false,
    descEn: "Clean cup with soft sweetness.", descAr: "كوب نظيف بحلاوة ناعمة.",
    characteristics: { body: 3.5, crema: 2.8, acidity: 3.0, chocolate: 3.3, sweetness: 3.9, strength: 2.8 },
  },
  {
    slug: "costa-rica", nameEn: "Costa Rica", nameAr: "كوستاريكا",
    origin: "Costa Rica", beanType: "arabica", costPerKg: 835, salePriceKg: 1000, stock: 14, lowStockAlert: 6,
    visible: true, archived: false,
    descEn: "Lively sweetness and elegant acidity.", descAr: "حلاوة حيوية وحموضة أنيقة.",
    characteristics: { body: 3.4, crema: 2.8, acidity: 3.8, chocolate: 3.0, sweetness: 4.1, strength: 2.9 },
  },
  {
    slug: "tanzanian-arabica", nameEn: "Tanzanian Arabica", nameAr: "أرابيكا تنزاني",
    origin: "Tanzania", beanType: "arabica", costPerKg: 360, salePriceKg: 435, stock: 25, lowStockAlert: 8,
    visible: true, archived: false,
    descEn: "Bright fruit with a lighter body.", descAr: "فاكهة مشرقة بقوام أخف.",
    characteristics: { body: 2.9, crema: 2.3, acidity: 4.4, chocolate: 2.3, sweetness: 3.5, strength: 2.8 },
  },
  {
    slug: "kenyan-arabica", nameEn: "Kenyan Arabica", nameAr: "أرابيكا كيبي",
    origin: "Kenya", beanType: "arabica", costPerKg: 350, salePriceKg: 420, stock: 20, lowStockAlert: 8,
    visible: true, archived: false,
    descEn: "Sharp brightness and red fruit.", descAr: "إشراق واضح ولمسة فاكهة حمراء.",
    characteristics: { body: 3.0, crema: 2.2, acidity: 4.7, chocolate: 2.1, sweetness: 3.7, strength: 3.0 },
  },
  {
    slug: "nicaragua-arabica", nameEn: "Nicaragua Arabica", nameAr: "أرابيكا نيكاراغوا",
    origin: "Nicaragua", beanType: "arabica", costPerKg: 630, salePriceKg: 760, stock: 16, lowStockAlert: 8,
    visible: true, archived: false,
    descEn: "Brown sugar, nuts, and balance.", descAr: "سكر بني ومكسرات وتوازن.",
    characteristics: { body: 3.6, crema: 3.0, acidity: 3.2, chocolate: 3.7, sweetness: 4.0, strength: 3.0 },
  },
  {
    slug: "indian-washed-arabica", nameEn: "Indian Washed Arabica", nameAr: "أرابيكا هندي مغسول",
    origin: "India", beanType: "arabica", costPerKg: 510, salePriceKg: 615, stock: 28, lowStockAlert: 8,
    visible: true, archived: false,
    descEn: "Clean nutty cup with low bitterness.", descAr: "كوب نظيف بمكسرات ومرارة منخفضة.",
    characteristics: { body: 3.7, crema: 3.0, acidity: 2.7, chocolate: 3.3, sweetness: 3.4, strength: 3.0 },
  },
  {
    slug: "brazil-17-18", nameEn: "Brazil 17-18", nameAr: "برازيلي 17-18",
    origin: "Brazil", beanType: "arabica", costPerKg: 385, salePriceKg: 460, stock: 40, lowStockAlert: 10,
    visible: true, archived: false,
    descEn: "Daily chocolate body with calm acidity.", descAr: "قوام شوكولاتة يومي بحموضة هادئة.",
    characteristics: { body: 4.0, crema: 3.3, acidity: 2.0, chocolate: 4.2, sweetness: 3.6, strength: 2.8 },
  },
  {
    slug: "ethiopia-lekempti", nameEn: "Ethiopia Lekempti", nameAr: "حبشي لقمتي",
    origin: "Ethiopia", beanType: "arabica", costPerKg: 390, salePriceKg: 470, stock: 22, lowStockAlert: 8,
    visible: true, archived: false,
    descEn: "Floral brightness with a clean finish.", descAr: "إشراق زهري ونهاية نظيفة.",
    characteristics: { body: 2.9, crema: 2.3, acidity: 4.5, chocolate: 2.3, sweetness: 3.8, strength: 2.8 },
  },
  {
    slug: "santos-fine-cup", nameEn: "Santos Fine Cup", nameAr: "سانتوس فاين كاب",
    origin: "Brazil", beanType: "arabica", costPerKg: 500, salePriceKg: 600, stock: 30, lowStockAlert: 8,
    visible: true, archived: false,
    descEn: "Chocolate, nuts, and a rounded base.", descAr: "شوكولاتة ومكسرات وقاعدة مستديرة.",
    characteristics: { body: 4.2, crema: 3.5, acidity: 2.0, chocolate: 4.3, sweetness: 3.7, strength: 2.9 },
  },
  {
    slug: "colombian-18", nameEn: "Colombian 18", nameAr: "كولومبي 18",
    origin: "Colombia", beanType: "arabica", costPerKg: 560, salePriceKg: 670, stock: 18, lowStockAlert: 8,
    visible: true, archived: false,
    descEn: "Caramel sweetness with elegant body.", descAr: "حلاوة كراميل بقوام أنيق.",
    characteristics: { body: 3.8, crema: 3.1, acidity: 3.1, chocolate: 3.6, sweetness: 4.0, strength: 3.1 },
  },
  // ── Robusta (10) ──────────────────────────────────────────────────────────
  {
    slug: "indonesian", nameEn: "Indonesian", nameAr: "اندونيسي",
    origin: "Indonesia", beanType: "robusta", costPerKg: 340, salePriceKg: 410, stock: 50, lowStockAlert: 12,
    visible: true, archived: false,
    descEn: "Heavy crema and earthy body.", descAr: "كريما ثقيلة وقوام أرضي.",
    characteristics: { body: 4.7, crema: 4.5, acidity: 1.5, chocolate: 3.4, sweetness: 2.5, strength: 4.5 },
  },
  {
    slug: "indonesian-xl", nameEn: "Indonesian XL", nameAr: "اندونيسي XL",
    origin: "Indonesia", beanType: "robusta", costPerKg: 346, salePriceKg: 415, stock: 45, lowStockAlert: 12,
    visible: true, archived: false,
    descEn: "Extra body, crema, and strength.", descAr: "قوام وكريما وقوة أعلى.",
    characteristics: { body: 4.9, crema: 4.7, acidity: 1.3, chocolate: 3.3, sweetness: 2.3, strength: 4.8 },
  },
  {
    slug: "indian-robusta", nameEn: "Indian Robusta", nameAr: "هندي",
    origin: "India", beanType: "robusta", costPerKg: 376, salePriceKg: 450, stock: 40, lowStockAlert: 12,
    visible: true, archived: false,
    descEn: "Classic robusta crema support.", descAr: "دعم كلاسيكي للكريما من الروبوستا.",
    characteristics: { body: 4.5, crema: 4.5, acidity: 1.7, chocolate: 3.5, sweetness: 2.7, strength: 4.4 },
  },
  {
    slug: "vietnamese", nameEn: "Vietnamese", nameAr: "فيتناي",
    origin: "Vietnam", beanType: "robusta", costPerKg: 346, salePriceKg: 415, stock: 55, lowStockAlert: 15,
    visible: true, archived: false,
    descEn: "High caffeine and strong crema.", descAr: "كافيين عال وكريما قوية.",
    characteristics: { body: 4.6, crema: 4.8, acidity: 1.2, chocolate: 3.0, sweetness: 2.0, strength: 5.0 },
  },
  {
    slug: "vietnamese-washed", nameEn: "Vietnamese Washed", nameAr: "فيتناي (مغسول)",
    origin: "Vietnam", beanType: "robusta", costPerKg: 376, salePriceKg: 450, stock: 30, lowStockAlert: 10,
    visible: true, archived: false,
    descEn: "Cleaner robusta strength.", descAr: "قوة روبوستا أنظف.",
    characteristics: { body: 4.4, crema: 4.6, acidity: 1.5, chocolate: 3.1, sweetness: 2.3, strength: 4.7 },
  },
  {
    slug: "indonesian-large", nameEn: "Indonesian Large", nameAr: "إندونيسي كبير",
    origin: "Indonesia", beanType: "robusta", costPerKg: 270, salePriceKg: 325, stock: 60, lowStockAlert: 15,
    visible: true, archived: false,
    descEn: "Broad body with a budget edge.", descAr: "قوام عريض بسعر هادئ.",
    characteristics: { body: 4.7, crema: 4.6, acidity: 1.4, chocolate: 3.2, sweetness: 2.2, strength: 4.6 },
  },
  {
    slug: "indonesian-medium", nameEn: "Indonesian Medium", nameAr: "إندونيسي وسط",
    origin: "Indonesia", beanType: "robusta", costPerKg: 260, salePriceKg: 315, stock: 65, lowStockAlert: 15,
    visible: true, archived: false,
    descEn: "Affordable crema with steady body.", descAr: "كريما اقتصادية وقوام ثابت.",
    characteristics: { body: 4.3, crema: 4.3, acidity: 1.6, chocolate: 3.1, sweetness: 2.4, strength: 4.2 },
  },
  {
    slug: "ugandan-18", nameEn: "Ugandan 18", nameAr: "أوغندي 18",
    origin: "Uganda", beanType: "robusta", costPerKg: 280, salePriceKg: 340, stock: 35, lowStockAlert: 10,
    visible: true, archived: false,
    descEn: "Dark cocoa with clean strength.", descAr: "كاكاو داكن وقوة نظيفة.",
    characteristics: { body: 4.4, crema: 4.4, acidity: 1.8, chocolate: 3.6, sweetness: 2.7, strength: 4.4 },
  },
  {
    slug: "indian-robusta-aa", nameEn: "Indian Robusta AA", nameAr: "روبوستا هندي AA",
    origin: "India", beanType: "robusta", costPerKg: 290, salePriceKg: 350, stock: 45, lowStockAlert: 12,
    visible: true, archived: false,
    descEn: "Bold crema with cocoa support.", descAr: "كريما جريئة بدعم كاكاو.",
    characteristics: { body: 4.6, crema: 4.7, acidity: 1.6, chocolate: 3.7, sweetness: 2.7, strength: 4.6 },
  },
  {
    slug: "vietnamese-clean", nameEn: "Vietnamese Clean", nameAr: "فيتناي Clean",
    origin: "Vietnam", beanType: "robusta", costPerKg: 265, salePriceKg: 320, stock: 50, lowStockAlert: 12,
    visible: true, archived: false,
    descEn: "Clean strength and thick crema.", descAr: "قوة نظيفة وكريما كثيفة.",
    characteristics: { body: 4.3, crema: 4.5, acidity: 1.4, chocolate: 3.0, sweetness: 2.2, strength: 4.5 },
  },
];

const CHAR_KEYS: CharKey[] = ["body", "crema", "acidity", "chocolate", "sweetness", "strength"];

// ── Helper: init drawer form ──────────────────────────────────────────────────

function initForm(b: Bean): DrawerForm {
  return {
    nameEn: b.nameEn, nameAr: b.nameAr, origin: b.origin, beanType: b.beanType,
    costPerKg: b.costPerKg, salePriceKg: b.salePriceKg, stock: b.stock, lowStockAlert: b.lowStockAlert,
    visible: b.visible, archived: b.archived, descEn: b.descEn, descAr: b.descAr,
    body: b.characteristics.body, crema: b.characteristics.crema,
    acidity: b.characteristics.acidity, chocolate: b.characteristics.chocolate,
    sweetness: b.characteristics.sweetness, strength: b.characteristics.strength,
  };
}

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

const DRAWER_TABS = ["General", "Characteristics", "Pricing", "Stock", "Visibility"];

// ── BeanDrawer ────────────────────────────────────────────────────────────────

function BeanDrawer({
  bean, isOpen, onClose, onSave,
}: {
  bean:    Bean | null;
  isOpen:  boolean;
  onClose: () => void;
  onSave:  (slug: string, partial: Partial<Bean>) => void;
}) {
  const [tab,   setTab]   = useState("General");
  const [form,  setForm]  = useState<DrawerForm | null>(null);
  const [saved, setSaved] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (bean) { setForm(initForm(bean)); setTab("General"); setSaved(false); } }, [bean?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!bean || !form) return null;

  function setF(key: keyof DrawerForm, value: unknown) {
    setForm(prev => prev ? { ...prev, [key]: value } as DrawerForm : null);
  }

  function handleSave() {
    if (!form) return;
    onSave(bean!.slug, {
      nameEn: form.nameEn, nameAr: form.nameAr, origin: form.origin,
      beanType: form.beanType, costPerKg: form.costPerKg, salePriceKg: form.salePriceKg,
      stock: form.stock, lowStockAlert: form.lowStockAlert, visible: form.visible, archived: form.archived,
      descEn: form.descEn, descAr: form.descAr,
      characteristics: {
        body: form.body, crema: form.crema, acidity: form.acidity,
        chocolate: form.chocolate, sweetness: form.sweetness, strength: form.strength,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  const typeColor = bean.beanType === "arabica" ? "var(--gold)" : "#4ade80";
  const typeBg    = bean.beanType === "arabica" ? "rgba(182,136,94,0.15)" : "rgba(74,222,128,0.12)";

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 200ms",
        }}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 101,
        width: "clamp(320px, 42vw, 560px)",
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
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--cream)" }}>{bean.slug === "__new__" ? "New Bean" : (form.nameEn || "Bean")}</p>
              <p style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.5, marginTop: 2 }}>{form.nameAr}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: typeBg, color: typeColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {form.beanType}
              </span>
              <button type="button" onClick={onClose} style={{ padding: 6, color: "var(--cream-dim)", opacity: 0.45 }}>
                <X size={16} />
              </button>
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            {DRAWER_TABS.map(t => (
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
              <div>
                <span style={labelStyle}>Origin Country</span>
                <input value={form.origin} onChange={e => setF("origin", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Bean Type</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["arabica", "robusta"] as BeanType[]).map(type => {
                    const active = form.beanType === type;
                    const c = type === "arabica" ? "var(--gold)" : "#4ade80";
                    const bg = type === "arabica" ? "rgba(182,136,94,0.18)" : "rgba(74,222,128,0.14)";
                    return (
                      <button key={type} type="button" onClick={() => setF("beanType", type)} style={{
                        flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                        textTransform: "capitalize",
                        background: active ? bg : "rgba(255,255,255,0.04)",
                        color: active ? c : "var(--cream-dim)",
                        border: active ? `1px solid ${c}40` : "1px solid rgba(255,255,255,0.08)",
                      }}>{type}</button>
                    );
                  })}
                </div>
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

          {/* CHARACTERISTICS */}
          {tab === "Characteristics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <p style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.45 }}>
                Flavor profile used by the Blend Simulator. Scale 1–10.
              </p>
              {CHAR_KEYS.map(key => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, textTransform: "capitalize", color: "var(--cream)" }}>{key}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{form[key]}<span style={{ fontSize: 10, fontWeight: 400, opacity: 0.45 }}>/5</span></span>
                  </div>
                  <input
                    type="range" min={0} max={5} step={0.1} value={form[key]}
                    onChange={e => setF(key, Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--gold)" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                    <span style={{ fontSize: 9, color: "var(--cream-dim)", opacity: 0.3 }}>Low</span>
                    <span style={{ fontSize: 9, color: "var(--cream-dim)", opacity: 0.3 }}>High</span>
                  </div>
                </div>
              ))}
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
                <span style={labelStyle}>Sale Price / KG (EGP)</span>
                <input type="number" value={form.salePriceKg} onChange={e => setF("salePriceKg", Number(e.target.value))} style={inputStyle} />
                <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.35, marginTop: 5 }}>سعر البيع — shown to customers in the builder.</p>
              </div>
              {form.salePriceKg > 0 && form.costPerKg > 0 && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(182,136,94,0.06)", border: "1px solid rgba(182,136,94,0.14)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.55 }}>Margin</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>
                      {Math.round(((form.salePriceKg - form.costPerKg) / form.salePriceKg) * 100)}%
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.55 }}>Profit / KG</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>
                      +{form.salePriceKg - form.costPerKg} EGP
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STOCK */}
          {tab === "Stock" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <span style={labelStyle}>Current Stock (KG)</span>
                <input type="number" value={form.stock} onChange={e => setF("stock", Number(e.target.value))} style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Low Stock Alert Threshold (KG)</span>
                <input type="number" value={form.lowStockAlert} onChange={e => setF("lowStockAlert", Number(e.target.value))} style={inputStyle} />
              </div>
              {form.stock <= form.lowStockAlert && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <AlertTriangle size={14} color="#fbbf24" />
                  <span style={{ fontSize: 12, color: "#fbbf24" }}>Bean is currently below the low stock threshold</span>
                </div>
              )}
            </div>
          )}

          {/* VISIBILITY */}
          {tab === "Visibility" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.5 }}>
                Controls whether this bean appears in the Make Your Espresso builder.
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
              <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(182,136,94,0.10)", marginTop: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", marginBottom: 4 }}>Archive Bean</p>
                <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.42, marginBottom: 10 }}>
                  Archived beans are removed from the catalog. Existing blend history is not affected.
                </p>
                <button type="button" onClick={() => setF("archived", !form.archived)} style={{
                  padding: "7px 14px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                  background: form.archived ? "rgba(156,163,175,0.12)" : "rgba(239,68,68,0.08)",
                  color: form.archived ? "#9ca3af" : "#f87171",
                  border: form.archived ? "1px solid rgba(156,163,175,0.2)" : "1px solid rgba(239,68,68,0.18)",
                }}>
                  <Archive size={12} />
                  {form.archived ? "Unarchive Bean" : "Archive Bean"}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(182,136,94,0.10)", display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: "rgba(255,255,255,0.04)", color: "var(--cream-dim)", border: "1px solid rgba(255,255,255,0.08)",
          }}>Cancel</button>
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

// ── Blend Simulator ───────────────────────────────────────────────────────────

function BlendSimulator({ beans }: { beans: Bean[] }) {
  const [slots, setSlots] = useState<{ slug: string; pct: number }[]>([]);

  const total  = slots.reduce((s, b) => s + b.pct, 0);
  const valid  = total === 100 && slots.length >= 2;

  const result: Record<CharKey, number> | null = valid
    ? Object.fromEntries(
        CHAR_KEYS.map(key => [
          key,
          slots.reduce((s, slot) => {
            const b = beans.find(x => x.slug === slot.slug);
            return s + (b ? b.characteristics[key] * slot.pct / 100 : 0);
          }, 0),
        ])
      ) as Record<CharKey, number>
    : null;

  function addBean(slug: string) {
    if (slots.some(s => s.slug === slug) || slots.length >= 4) return;
    const used = slots.reduce((s, b) => s + b.pct, 0);
    setSlots([...slots, { slug, pct: Math.max(10, 100 - used) }]);
  }

  function setPct(slug: string, pct: number) {
    setSlots(slots.map(s => s.slug === slug ? { ...s, pct: Math.max(1, Math.min(99, pct)) } : s));
  }

  function remove(slug: string) {
    setSlots(slots.filter(s => s.slug !== slug));
  }

  const available = beans.filter(b => !b.archived && !slots.some(s => s.slug === b.slug));

  return (
    <div style={{ marginTop: 32, padding: 24, borderRadius: 16, background: "rgba(182,136,94,0.04)", border: "1px solid rgba(182,136,94,0.13)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <FlaskConical size={18} color="var(--gold)" />
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
          Blend Simulator
        </h2>
        <span style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.4 }}>
          — Preview blend profile before using in the builder
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Left: composition */}
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cream-dim)", opacity: 0.45, marginBottom: 10 }}>
            Composition ({slots.length}/4 beans)
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {slots.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.32, padding: "10px 0" }}>
                Add beans from the list below to start simulating.
              </p>
            )}
            {slots.map(slot => {
              const b = beans.find(x => x.slug === slot.slug)!;
              return (
                <div key={slot.slug} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)" }}>
                  <span style={{ flex: 1, fontSize: 12.5, color: "var(--cream)", fontWeight: 500 }}>{b.nameEn}</span>
                  <input
                    type="number" value={slot.pct} min={1} max={99}
                    onChange={e => setPct(slot.slug, Number(e.target.value))}
                    style={{ width: 50, textAlign: "center", padding: "4px 6px", borderRadius: 6, fontSize: 12, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(182,136,94,0.2)", color: "var(--gold)", outline: "none" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.35 }}>%</span>
                  <button type="button" onClick={() => remove(slot.slug)} style={{ padding: 3, color: "var(--cream-dim)", opacity: 0.35 }}>
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Total bar */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "7px 12px", borderRadius: 8, marginBottom: 14,
            background: total === 100 ? "rgba(74,222,128,0.08)" : total > 100 ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${total === 100 ? "rgba(74,222,128,0.2)" : total > 100 ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.07)"}`,
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--cream)" }}>Total</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: total === 100 ? "#4ade80" : total > 100 ? "#f87171" : "var(--cream-dim)" }}>
              {total}%
            </span>
          </div>

          {/* Add bean list */}
          {slots.length < 4 && available.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cream-dim)", opacity: 0.4, marginBottom: 6 }}>
                Add Bean
              </p>
              <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
                {available.map(b => (
                  <button key={b.slug} type="button" onClick={() => addBean(b.slug)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "6px 10px", borderRadius: 7, fontSize: 11.5,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    color: "var(--cream-dim)", textAlign: "left",
                  }}>
                    <span>{b.nameEn}</span>
                    <Plus size={11} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: result profile */}
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cream-dim)", opacity: 0.45, marginBottom: 10 }}>
            Blend Profile
          </p>
          {result ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {CHAR_KEYS.map(key => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, textTransform: "capitalize", color: "var(--cream)" }}>{key}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gold)" }}>{result[key].toFixed(1)}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      width: `${(result[key] / 5) * 100}%`,
                      background: "linear-gradient(90deg,var(--gold) 0%,var(--gold-light) 100%)",
                      transition: "width 300ms ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ paddingTop: 28, textAlign: "center" }}>
              <FlaskConical size={32} style={{ margin: "0 auto 10px", color: "rgba(182,136,94,0.2)" }} />
              <p style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.32 }}>
                {slots.length < 2
                  ? "Add at least 2 beans to preview"
                  : "Adjust percentages to total 100% to see the blend profile"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type FilterTab = "all" | "arabica" | "robusta" | "hidden";

export default function EspressoManagerPage() {
  const [filter,        setFilter]        = useState<FilterTab>("all");
  const [search,        setSearch]        = useState("");
  const [openSlug,      setOpenSlug]      = useState<string | null>(null);
  const [metaOverrides, setMetaOverrides] = useState<Record<string, Partial<Bean>>>({});
  const [customBeans,   setCustomBeans]   = useState<Bean[]>([]);

  const NEW_BEAN_SLUG = "__new__";
  const newBeanTemplate: Bean = {
    slug: NEW_BEAN_SLUG, nameEn: "", nameAr: "", origin: "", beanType: "arabica",
    costPerKg: 0, salePriceKg: 0, stock: 0, lowStockAlert: 10,
    visible: true, archived: false, descEn: "", descAr: "",
    characteristics: { body: 3, crema: 3, acidity: 3, chocolate: 3, sweetness: 3, strength: 3 },
  };

  const allBeans = [
    ...INITIAL_BEANS.map(b => ({ ...b, ...(metaOverrides[b.slug] ?? {}) })),
    ...customBeans.map(b => ({ ...b, ...(metaOverrides[b.slug] ?? {}) })),
  ];

  const arabicaCount  = allBeans.filter(b => !b.archived && b.beanType === "arabica").length;
  const robustaCount  = allBeans.filter(b => !b.archived && b.beanType === "robusta").length;
  const lowStockCount = allBeans.filter(b => !b.archived && b.stock <= b.lowStockAlert).length;
  const totalCount    = allBeans.filter(b => !b.archived).length;
  const hiddenCount   = allBeans.filter(b => !b.archived && !b.visible).length;

  const filtered = allBeans.filter(b => {
    if (b.archived) return false;
    if (filter === "arabica" && b.beanType !== "arabica") return false;
    if (filter === "robusta" && b.beanType !== "robusta") return false;
    if (filter === "hidden"  && b.visible) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !b.nameEn.toLowerCase().includes(q) &&
        !b.nameAr.includes(q) &&
        !b.origin.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const openBean = openSlug === NEW_BEAN_SLUG
    ? newBeanTemplate
    : (allBeans.find(b => b.slug === openSlug) ?? null);

  function handleSave(slug: string, partial: Partial<Bean>) {
    if (slug === NEW_BEAN_SLUG) {
      const name = (partial.nameEn ?? "").trim() || "New Bean";
      const newSlug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now().toString().slice(-4);
      const newBean: Bean = { ...newBeanTemplate, ...partial, slug: newSlug };
      setCustomBeans(prev => [...prev, newBean]);
      setOpenSlug(newSlug);
    } else {
      setMetaOverrides(prev => ({ ...prev, [slug]: { ...(prev[slug] ?? {}), ...partial } }));
    }
  }

  const KPI_CARDS = [
    { label: "Total Beans",   value: totalCount,    color: "var(--gold)" },
    { label: "Arabica Beans", value: arabicaCount,  color: "var(--gold-light)" },
    { label: "Robusta Beans", value: robustaCount,  color: "#4ade80" },
    { label: "Low Stock",     value: lowStockCount, color: lowStockCount > 0 ? "#fbbf24" : "var(--cream-dim)" },
  ];

  const FILTER_OPTIONS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",     label: "All",     count: totalCount },
    { key: "arabica", label: "Arabica", count: arabicaCount },
    { key: "robusta", label: "Robusta", count: robustaCount },
    { key: "hidden",  label: "Hidden",  count: hiddenCount },
  ];

  return (
    <div style={{ padding: 24, minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
            Espresso Manager
          </h1>
          <p style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.42, marginTop: 4 }}>
            Manage beans available in the Make Your Espresso builder
          </p>
        </div>
        <button type="button" onClick={() => setOpenSlug(NEW_BEAN_SLUG)} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
          background: "rgba(182,136,94,0.16)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.28)",
        }}>
          <Plus size={14} /> Add Bean
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {KPI_CARDS.map(card => (
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

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {FILTER_OPTIONS.map(f => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)} style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
              background: filter === f.key ? "rgba(182,136,94,0.18)" : "rgba(255,255,255,0.04)",
              color: filter === f.key ? "var(--gold)" : "var(--cream-dim)",
              border: filter === f.key ? "1px solid rgba(182,136,94,0.3)" : "1px solid transparent",
            }}>
              {f.label} <span style={{ opacity: 0.5 }}>({f.count})</span>
            </button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--cream-dim)", opacity: 0.38 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search beans…"
            style={{ paddingLeft: 28, paddingRight: 12, height: 34, borderRadius: 9, fontSize: 12.5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.16)", color: "var(--cream)", outline: "none", width: 200 }}
          />
        </div>
      </div>

      {/* Bean Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
        {filtered.map(bean => {
          const isLow     = bean.stock <= bean.lowStockAlert;
          const typeColor = bean.beanType === "arabica" ? "#D6A373" : "#4ade80";
          const typeBg    = bean.beanType === "arabica" ? "rgba(182,136,94,0.18)" : "rgba(74,222,128,0.14)";
          return (
            <article
              key={bean.slug}
              role="button"
              tabIndex={0}
              onClick={() => setOpenSlug(bean.slug)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenSlug(bean.slug); } }}
              style={{
                borderRadius: 16,
                border: "1px solid rgba(182,136,94,0.15)",
                background: "linear-gradient(to bottom,rgba(27,20,15,0.92) 0%,rgba(18,13,9,0.86) 50%,rgba(11,8,6,0.92) 100%)",
                padding: 12,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                transition: "all 300ms",
                outline: "none",
              }}
            >
              {/* Badge row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 99, background: typeBg, color: typeColor }}>
                  {bean.beanType}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  {!bean.visible && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: "rgba(239,68,68,0.15)", color: "#f87171" }}>HIDDEN</span>}
                  {isLow         && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>LOW</span>}
                </div>
              </div>

              {/* Name + chevron */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 15, fontWeight: 700, color: "#F5E6D8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {bean.nameEn}
                  </h3>
                </div>
                <span style={{ display: "flex", width: 26, height: 26, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "50%", border: "1px solid rgba(182,136,94,0.24)" }}>
                  <ChevronRight size={12} color="#D6A373" />
                </span>
              </div>

              {/* Taste hint */}
              <p style={{ fontSize: 11, lineHeight: 1.55, color: "rgba(214,183,154,0.70)", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                {bean.descEn}
              </p>

              {/* Footer */}
              <div style={{ marginTop: "auto", paddingTop: 10 }}>
                {/* Price + stock */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 10.5, color: "rgba(214,183,154,0.58)" }}>Cost</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#D6A373" }}>{bean.costPerKg} EGP/kg</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 10.5, color: isLow ? "#fbbf24" : "rgba(214,183,154,0.58)" }}>Stock</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: isLow ? "#fbbf24" : "rgba(214,183,154,0.70)" }}>{bean.stock} kg</span>
                </div>

                {/* Metric bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {CHAR_KEYS.map(key => (
                    <div key={key}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(214,183,154,0.62)", textTransform: "capitalize" }}>{key}</span>
                        <span style={{ fontSize: 10, color: "#D6A373" }}>{bean.characteristics[key]}/5</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: "rgba(182,136,94,0.12)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(bean.characteristics[key] / 5) * 100}%`, borderRadius: 2, background: "#D6A373", transition: "width 500ms ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "48px 0", color: "var(--cream-dim)", opacity: 0.3, fontSize: 13 }}>
            No beans match your filter.
          </div>
        )}
      </div>

      {/* Blend Simulator */}
      <BlendSimulator beans={allBeans} />

      {/* Drawer */}
      <BeanDrawer bean={openBean} isOpen={openSlug !== null} onClose={() => setOpenSlug(null)} onSave={handleSave} />
    </div>
  );
}
