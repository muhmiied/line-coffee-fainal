"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { useCart } from "@/lib/context/cart";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { cn } from "@/lib/utils/cn";
import {
  flavorBases,
  flavorItems,
  flavorPresets,
  metricLabels,
  packageWeights,
  type FlavorBase,
  type FlavorCategory,
  type FlavorItem,
  type FlavorMetricKey,
  type FlavorPreset,
  type PackageWeight,
} from "./data/flavorData";
import {
  analyzeFlavorMix,
  computeBalance,
  computeMixMetrics,
  computeMixScore,
  computePricePerKg,
  getMixHealth,
} from "./lib/flavorEngine";

// ─── Tab type ─────────────────────────────────────────────────────────────────

type ActiveTab = "all" | FlavorCategory;

const TABS: { id: ActiveTab; label: { en: string; ar: string } }[] = [
  { id: "all",           label: { en: "All",             ar: "الكل"        } },
  { id: "chocolate",     label: { en: "Chocolate",       ar: "شوكولاتة"   } },
  { id: "fruits",        label: { en: "Fruits",          ar: "فاكهة"      } },
  { id: "nuts",          label: { en: "Nuts",            ar: "مكسرات"     } },
  { id: "desserts",      label: { en: "Desserts",        ar: "حلويات"     } },
  { id: "coffee-shisha", label: { en: "Coffee & Shisha", ar: "قهوة وشيشة" } },
];

const METRIC_ORDER: FlavorMetricKey[] = [
  "sweetness",
  "creaminess",
  "chocolate",
  "fruitiness",
  "nutty",
  "intensity",
];

// ─── Main component ───────────────────────────────────────────────────────────

export function FlavorMixStudio({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLanguage();
  const { addItem } = useCart();
  const [selectedBaseId, setSelectedBaseId] = useLocalStorage<string | null>("flavor-studio-base", null);
  const [selectedFlavorIds, setSelectedFlavorIds] = useLocalStorage<string[]>("flavor-studio-flavors", []);
  const [selectedWeight, setSelectedWeight] = useLocalStorage<PackageWeight>("flavor-studio-weight", "250g");
  const [quantity, setQuantity] = useLocalStorage<number>("flavor-studio-qty", 1);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");

  const selectedBase = useMemo(
    () => flavorBases.find((b) => b.id === selectedBaseId) ?? null,
    [selectedBaseId],
  );

  const selectedFlavors = useMemo(
    () =>
      selectedFlavorIds
        .map((id) => flavorItems.find((f) => f.id === id))
        .filter((f): f is FlavorItem => f !== undefined),
    [selectedFlavorIds],
  );

  const pricePerKg = computePricePerKg(selectedBase, selectedFlavors);
  const unitPrice  = Math.round(pricePerKg * packageWeights[selectedWeight]);
  const totalPrice = unitPrice * quantity;

  const mixMetrics = useMemo(() => computeMixMetrics(selectedFlavors), [selectedFlavors]);
  const mixScore   = useMemo(() => computeMixScore(selectedFlavors, selectedBase), [selectedFlavors, selectedBase]);
  const mixHealth  = getMixHealth(mixScore);
  const analysis   = useMemo(() => analyzeFlavorMix(selectedFlavors, selectedBase), [selectedFlavors, selectedBase]);
  const balance    = useMemo(() => computeBalance(selectedFlavors), [selectedFlavors]);

  const canOrder     = selectedBase !== null && selectedFlavors.length >= 1;
  const atMaxFlavors = selectedFlavorIds.length >= 4;

  const resetStudio = () => {
    setSelectedBaseId(null);
    setSelectedFlavorIds([]);
    setSelectedWeight("250g");
    setQuantity(1);
    setActiveTab("all");
  };

  const handleAddToCart = () => {
    if (!canOrder || !selectedBase) return;
    const flavorNamesEn = selectedFlavors.map((f) => f.name.en).join(" + ");
    const flavorNamesAr = selectedFlavors.map((f) => f.name.ar).join(" + ");
    addItem({
      kind: "flavor-mix",
      name: { en: "Custom Flavor Mix", ar: "خلطة نكهات مخصصة" },
      detail: {
        en: `${selectedWeight} · ${selectedBase.name.en} · ${flavorNamesEn}`,
        ar: `${selectedWeight} · ${selectedBase.name.ar} · ${flavorNamesAr}`,
      },
      pricePerUnit: unitPrice,
      qty: quantity,
      customData: {
        kind: "flavor-mix",
        packageSize: selectedWeight,
        baseKey: selectedBase.id,
        flavorKeys: selectedFlavorIds,
      },
    });
  };

  const visibleFlavors = useMemo(
    () => (activeTab === "all" ? flavorItems : flavorItems.filter((f) => f.category === activeTab)),
    [activeTab],
  );

  const handleToggleFlavor = (flavor: FlavorItem) => {

    setSelectedFlavorIds((prev) => {
      if (prev.includes(flavor.id)) return prev.filter((id) => id !== flavor.id);
      if (prev.length >= 4) return prev;
      return [...prev, flavor.id];
    });
  };

  const handleApplyPreset = (preset: FlavorPreset) => {

    if (!selectedBaseId) setSelectedBaseId(preset.defaultBaseId);
    setSelectedFlavorIds(preset.flavorIds);
  };

  const handleSelectBase = (baseId: string) => {

    setSelectedBaseId((prev) => (prev === baseId ? null : baseId));
  };

  return (
    <div className={cn("arabic-body text-[#F5E6D8]", !embedded && "min-h-screen overflow-x-hidden bg-[#0B0806]")}>

      {/* ── Hero / compact header ─────────────────────────────────── */}
      {embedded ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#D6A373]/18 bg-[#120D09]/60 px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D6A373]/24 bg-[#D6A373]/10 text-[#D6A373]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D6A373]">
              {t({ en: "Flavor Mix Studio", ar: "استوديو خلطة النكهات" })}
            </p>
            <h2 className="font-serif text-xl font-bold text-[#F5E6D8]">
              {t({ en: "Build Your Custom Flavor Mix", ar: "كوّن خلطة النكهات الخاصة بك" })}
            </h2>
          </div>
        </div>
      ) : (
        <section className="relative -mt-[6.4rem] min-h-[28rem] overflow-hidden border-b border-[#B6885E]/14 bg-[#0B0806] pb-12 pt-[calc(6.4rem+3rem)] sm:-mt-[7.2rem] sm:min-h-[30rem] sm:pb-14 sm:pt-[calc(7.2rem+3.5rem)] md:-mt-[8.9rem] md:min-h-[32rem] md:pb-16 md:pt-[calc(8.9rem+4rem)]">
          <div className="absolute inset-0 opacity-50" aria-hidden="true">
            <Image
              src="/assets/categories/flavor.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="scale-[1.08] object-cover object-center"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,8,6,0.32)_0%,rgba(11,8,6,0.52)_44%,rgba(11,8,6,0.92)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(214,163,115,0.14),transparent_34%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D6A373]/34 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4">
            <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#B6885E]/22 bg-[#0B0806]/48 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#D6A373] backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                {t({ en: "Flavor Mix Studio", ar: "استوديو خلطة النكهات" })}
              </p>
              <h1 className="font-serif text-4xl font-bold leading-tight text-[#F5E6D8] drop-shadow-[0_10px_34px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-6xl">
                {t({ en: "Build Your Custom Flavor Mix", ar: "كوّن خلطة النكهات الخاصة بك" })}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D6B79A]/82 sm:text-base">
                {t({
                  en: "Choose a base, pick up to 4 flavors, and craft your signature mix with live pricing.",
                  ar: "اختر القاعدة وأضف حتى 4 نكهات، وكوّن خلطتك المميزة مع تسعير فوري.",
                })}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Studio grid ──────────────────────────────────────────── */}
      <section
        className={cn(
          "grid gap-6",
          embedded
            ? "py-2 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
            : "mx-auto max-w-7xl px-4 py-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:py-8",
        )}
      >
        {/* Left col row 1 — Base Selector first, then Guide Me */}
        <div className="space-y-4 lg:col-start-1 lg:row-start-1">
          <BaseSelector
            selectedBaseId={selectedBaseId}
            onSelect={handleSelectBase}
          />
          <GuidePanel onApply={handleApplyPreset} />
        </div>

        {/* Right col — sticky cart */}
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <LiveFlavorCart
            selectedBase={selectedBase}
            selectedFlavors={selectedFlavors}
            mixMetrics={mixMetrics}
            mixHealth={mixHealth}
            analysis={analysis}
            balance={balance}
            totalPrice={totalPrice}
            selectedWeight={selectedWeight}
            quantity={quantity}
            canOrder={canOrder}
            onWeightChange={setSelectedWeight}
            onQuantityChange={setQuantity}
            onAddToCart={handleAddToCart}
            onReset={resetStudio}
          />
        </div>

        {/* Left col row 2 — Flavor Library */}
        <div className="lg:col-start-1 lg:row-start-2">
          <FlavorLibrary
            visibleFlavors={visibleFlavors}
            selectedIds={selectedFlavorIds}
            activeTab={activeTab}
            atMax={atMaxFlavors}
            onTabChange={setActiveTab}
            onToggle={handleToggleFlavor}
          />
        </div>
      </section>
    </div>
  );
}

// ─── BaseSelector ─────────────────────────────────────────────────────────────

function BaseSelector({
  selectedBaseId,
  onSelect,
}: {
  selectedBaseId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useLanguage();

  return (
    <section className="luxury-panel overflow-hidden rounded-2xl">
      <div className="border-b border-[#B6885E]/14 px-4 py-3 sm:px-5">
        <h2 className="font-serif text-lg font-bold text-[#F5E6D8]">
          {t({ en: "Choose Your Base", ar: "اختر قاعدتك" })}
        </h2>
        <p className="mt-0.5 text-sm text-[#D6B79A]/68">
          {t({ en: "One base only — you can switch anytime.", ar: "قاعدة واحدة فقط — يمكنك التغيير في أي وقت." })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
        {flavorBases.map((base) => {
          const active = selectedBaseId === base.id;
          return (
            <button
              key={base.id}
              type="button"
              onClick={() => onSelect(base.id)}
              className={cn(
                "flex flex-col rounded-xl border px-3 py-3 text-left transition-all duration-200",
                active
                  ? "border-[#D6A373]/55 bg-[#D6A373]/14 shadow-[0_8px_24px_rgba(182,136,94,0.14)]"
                  : "border-[#B6885E]/16 bg-[#0B0806]/38 hover:border-[#D6A373]/32 hover:bg-[#D6A373]/8",
              )}
            >
              {active && (
                <span className="mb-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#D6A373] text-[#0B0806]">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <span className={cn("font-serif text-sm font-bold", active ? "text-[#D6A373]" : "text-[#F5E6D8]/88")}>
                {t(base.name)}
              </span>
              <span className="arabic-number mt-1 text-[11px] font-bold text-[#D6A373]">
                {base.pricePerKg} {t({ en: "EGP/kg", ar: "ج.م/كجم" })}
              </span>
              <span className="mt-1 text-[10px] leading-[1.4] text-[#D6B79A]/55">
                {t(base.hint)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─── GuidePanel ───────────────────────────────────────────────────────────────

function GuidePanel({ onApply }: { onApply: (preset: FlavorPreset) => void }) {
  const { t } = useLanguage();

  return (
    <section className="luxury-panel overflow-hidden rounded-2xl">
      <div className="border-b border-[#B6885E]/14 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-[#D6A373]">
          <Sparkles className="h-4 w-4" />
          <h2 className="font-serif text-base font-bold text-[#F5E6D8]">
            {t({ en: "Mix Inspirations", ar: "وحي الخلطات" })}
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-[#D6B79A]/62">
          {t({
            en: "Apply a ready-made mix and adjust it your way.",
            ar: "طبّق خلطة جاهزة وعدّلها على ذوقك.",
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-4">
        {flavorPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApply(preset)}
            className="group flex flex-col rounded-lg border border-[#B6885E]/14 bg-[#0B0806]/38 px-2.5 py-2 text-left transition-all duration-200 hover:border-[#D6A373]/32 hover:bg-[#D6A373]/8"
          >
            <span className="font-serif text-xs font-bold text-[#F5E6D8] group-hover:text-[#D6A373]">
              {t(preset.name)}
            </span>
            <span className="mt-0.5 text-[10px] leading-tight text-[#D6A373]/60">
              {t(preset.mood)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── FlavorLibrary ────────────────────────────────────────────────────────────

function FlavorLibrary({
  visibleFlavors,
  selectedIds,
  activeTab,
  atMax,
  onTabChange,
  onToggle,
}: {
  visibleFlavors: FlavorItem[];
  selectedIds: string[];
  activeTab: ActiveTab;
  atMax: boolean;
  onTabChange: (tab: ActiveTab) => void;
  onToggle: (flavor: FlavorItem) => void;
}) {
  const { t } = useLanguage();

  return (
    <section>
      {/* Header */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#F5E6D8]">
            {t({ en: "Flavor Library", ar: "مكتبة النكهات" })}
          </h2>
          <p className="mt-0.5 text-sm text-[#D6B79A]/62">
            {t({ en: "Pick 1–4 flavors to build your mix.", ar: "اختر من 1 إلى 4 نكهات لتكوين خلطتك." })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#B6885E]/16 bg-[#120D09]/54 px-3 py-1 text-xs text-[#D6A373]">
            <span className="arabic-number">{selectedIds.length}</span>/4 {t({ en: "selected", ar: "محددة" })}
          </span>
          {atMax && (
            <span className="rounded-full border border-[#F59E0B]/24 bg-[#F59E0B]/10 px-3 py-1 text-[10px] font-bold text-[#F6D59B]">
              {t({ en: "Max reached", ar: "الحد الأقصى" })}
            </span>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="-mx-0.5 mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
              activeTab === tab.id
                ? "border-[#D6A373]/50 bg-[#D6A373]/16 text-[#D6A373]"
                : "border-[#B6885E]/16 bg-[#0B0806]/38 text-[#D6B79A]/72 hover:border-[#D6A373]/30 hover:text-[#F5E6D8]",
            )}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {/* Flavor cards — premium, typography-first, matching bean card pattern */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleFlavors.map((flavor) => {
          const selected = selectedIds.includes(flavor.id);
          const disabled = atMax && !selected;

          return (
            <article
              key={flavor.id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-disabled={disabled ? "true" : undefined}
              aria-pressed={selected ? "true" : "false"}
              onClick={() => { if (!disabled) onToggle(flavor); }}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(flavor); }
              }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-3 text-start transition-all duration-300",
                "bg-gradient-to-b from-[#1B140F]/92 via-[#120D09]/86 to-[#0B0806]/92",
                selected
                  ? "border-[#D6A373]/52 shadow-[0_18px_48px_rgba(0,0,0,0.34),0_0_30px_rgba(182,136,94,0.12)]"
                  : "border-[#B6885E]/15 hover:-translate-y-1 hover:border-[#D6A373]/34",
                disabled ? "cursor-not-allowed opacity-50 grayscale" : "cursor-pointer",
              )}
            >
              <div className="flex h-full flex-col">
                {/* Name + badge */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-base font-bold text-[#F5E6D8]">
                    {t(flavor.name)}
                  </h3>
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                      selected
                        ? "border-[#D6A373] bg-[#D6A373] text-[#0B0806]"
                        : "border-[#B6885E]/24 text-[#D6A373]",
                    )}
                  >
                    {selected ? <Check className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </span>
                </div>

                {/* Taste hint */}
                <p className="mt-2 line-clamp-2 text-xs leading-[1.55] text-[#D6B79A]/70">
                  {t(flavor.hint)}
                </p>

                {/* Price */}
                <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-xs">
                  <span className="text-[#D6B79A]/52">{t({ en: "Add-on", ar: "إضافة" })}</span>
                  <span className="arabic-number font-bold text-[#D6A373]">
                    +{flavor.addOnPerKg} {t({ en: "EGP/kg", ar: "ج.م/كجم" })}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ─── LiveFlavorCart ───────────────────────────────────────────────────────────

function LiveFlavorCart({
  selectedBase,
  selectedFlavors,
  mixMetrics,
  mixHealth,
  analysis,
  balance,
  totalPrice,
  selectedWeight,
  quantity,
  canOrder,
  onWeightChange,
  onQuantityChange,
  onAddToCart,
  onReset,
}: {
  selectedBase: FlavorBase | null;
  selectedFlavors: FlavorItem[];
  mixMetrics: ReturnType<typeof computeMixMetrics>;
  mixHealth: ReturnType<typeof getMixHealth>;
  analysis: ReturnType<typeof analyzeFlavorMix>;
  balance: number;
  totalPrice: number;
  selectedWeight: PackageWeight;
  quantity: number;
  canOrder: boolean;
  onWeightChange: (w: PackageWeight) => void;
  onQuantityChange: (q: number) => void;
  onAddToCart: () => void;
  onReset: () => void;
}) {
  const { t } = useLanguage();

  return (
    <aside className="lg:sticky lg:top-[9.25rem]">
      <div className="luxury-panel overflow-hidden rounded-2xl">

        {/* ── Top: Price + Weight + Qty + CTA ─────────────────────── */}
        <div className="p-5">
          {/* Price */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6A373]">
                {t({ en: "Live Flavor Cart", ar: "كارت النكهة الحي" })}
              </p>
              <p className="mt-2 font-serif text-4xl font-bold text-[#D6A373]">
                <span className="arabic-number">{totalPrice || 0}</span>{" "}
                <span className="text-xl">{t({ en: "EGP", ar: "ج.م" })}</span>
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#D6A373]/22 bg-[#D6A373]/10 text-[#D6A373]">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          {/* Weight */}
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-semibold text-[#D6B79A]/70">{t({ en: "Weight", ar: "الوزن" })}</p>
            <div className="grid grid-cols-3 gap-2">
              {(["250g", "500g", "1kg"] as PackageWeight[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onWeightChange(w)}
                  className={cn(
                    "rounded-xl border py-2.5 text-sm font-semibold transition-all",
                    selectedWeight === w
                      ? "border-[#D6A373]/55 bg-[#D6A373] text-[#0B0806]"
                      : "border-[#B6885E]/16 bg-[#120D09]/70 text-[#D6B79A]/75 hover:border-[#D6A373]/38",
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold text-[#D6B79A]/70">{t({ en: "Quantity", ar: "الكمية" })}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={t({ en: "Decrease quantity", ar: "تقليل الكمية" })}
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#B6885E]/22 bg-[#120D09]/70 text-[#D6B79A] transition-all hover:border-[#D6A373]/40 hover:text-[#F5E6D8] disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="arabic-number w-8 text-center text-base font-semibold text-[#F5E6D8]">{quantity}</span>
              <button
                type="button"
                aria-label={t({ en: "Increase quantity", ar: "زيادة الكمية" })}
                onClick={() => onQuantityChange(quantity + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#B6885E]/22 bg-[#120D09]/70 text-[#D6B79A] transition-all hover:border-[#D6A373]/40 hover:text-[#F5E6D8]"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={onAddToCart}
            disabled={!canOrder}
            className="premium-button flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
          >
            <ShoppingBag className="h-5 w-5" />
            {t({ en: "Add mix to cart", ar: "أضف الخلطة للعربة" })}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#B6885E]/16 py-2.5 text-xs font-semibold text-[#D6B79A]/50 transition-all hover:border-red-500/22 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t({ en: "Reset studio", ar: "إعادة ضبط الاستوديو" })}
          </button>
        </div>

        {/* ── Divider ──────────────────────────────────────────────── */}
        <div className="h-px bg-[#B6885E]/14" />

        {/* ── Bottom: Summary + Analysis ───────────────────────────── */}
        <div className="space-y-4 p-5">

          {/* Selected base */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-[#D6B79A]/70">
              {t({ en: "Base", ar: "القاعدة" })}
            </p>
            {selectedBase ? (
              <div className="flex items-center justify-between rounded-xl border border-[#D6A373]/20 bg-[#D6A373]/8 px-3 py-2.5">
                <span className="text-sm font-semibold text-[#F5E6D8]/88">{t(selectedBase.name)}</span>
                <span className="arabic-number text-xs font-bold text-[#D6A373]">{selectedBase.pricePerKg} {t({ en: "EGP/kg", ar: "ج.م/كجم" })}</span>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-[#B6885E]/24 px-4 py-2.5 text-center text-xs text-[#D6B79A]/55">
                {t({ en: "No base selected", ar: "لم تختر قاعدة بعد" })}
              </p>
            )}
          </div>

          {/* Selected flavors */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-[#D6B79A]/70">
              {t({ en: "Flavors", ar: "النكهات" })}
            </p>
            {selectedFlavors.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#B6885E]/24 px-4 py-3 text-center text-xs text-[#D6B79A]/58">
                {t({ en: "Select flavors to start your mix.", ar: "اختر النكهات لبدء خلطتك." })}
              </p>
            ) : (
              <div className="space-y-1.5">
                {selectedFlavors.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-xl border border-[#B6885E]/12 bg-[#0B0806]/34 px-3 py-2">
                    <span className="min-w-0 truncate text-sm text-[#F5E6D8]/88">{t(f.name)}</span>
                    <span className="arabic-number shrink-0 text-xs font-bold text-[#D6A373]">+{f.addOnPerKg} {t({ en: "EGP/kg", ar: "ج.م/كجم" })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mix quality score */}
          <div className={cn(
            "rounded-2xl border px-4 py-3",
            mixHealth.tone === "warning"
              ? "border-[#F59E0B]/24 bg-[#F59E0B]/10"
              : mixHealth.tone === "good"
                ? "border-[#D6A373]/22 bg-[#D6A373]/10"
                : "border-[#B6885E]/14 bg-[#0B0806]/38",
          )}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D6A373]">
                  {t({ en: "Mix Quality", ar: "جودة الخلطة" })}
                </p>
                <p className="mt-1 font-serif text-xl font-bold text-[#F5E6D8]">
                  {t(mixHealth.label)}
                </p>
              </div>
              <p className="arabic-number shrink-0 text-3xl font-bold text-[#D6A373]">
                {mixHealth.score}
                <span className="text-sm text-[#D6B79A]/55">/100</span>
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#0B0806]/70">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  mixHealth.tone === "warning" ? "bg-[#F4C16D]" : "bg-[#D6A373]",
                )}
                style={{ width: `${mixHealth.score}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-[#D6B79A]/68">
              {t(mixHealth.detail)}
            </p>
          </div>

          {/* Mix profile bars */}
          {mixMetrics && (
            <div>
              <p className="mb-2 text-xs font-semibold text-[#D6B79A]/70">
                {t({ en: "Flavor profile", ar: "بروفايل النكهة" })}
              </p>
              <div className="space-y-2">
                {METRIC_ORDER.map((key) => (
                  <MetricBar
                    key={key}
                    label={t(metricLabels[key])}
                    value={mixMetrics[key]}
                  />
                ))}
                <MetricBar
                  label={t({ en: "Balance", ar: "التوازن" })}
                  value={balance}
                />
              </div>
            </div>
          )}

          {/* Smart comment */}
          <div className={cn(
            "rounded-xl border px-4 py-3 text-sm leading-6",
            analysis.tone === "warning"
              ? "border-[#F59E0B]/24 bg-[#F59E0B]/10 text-[#F6D59B]"
              : analysis.tone === "good"
                ? "border-[#D6A373]/20 bg-[#D6A373]/10 text-[#F5E6D8]/82"
                : "border-[#B6885E]/14 bg-[#0B0806]/38 text-[#D6B79A]/72",
          )}>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#D6A373]">
              {analysis.tone === "warning"
                ? <AlertTriangle className="h-3.5 w-3.5" />
                : <Sparkles className="h-3.5 w-3.5" />}
              {t({ en: "Smart comment", ar: "تعليق ذكي" })}
            </div>
            {t(analysis.message)}
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── MetricBar ────────────────────────────────────────────────────────────────

function MetricBar({ label, value }: { label: string; value: number }) {
  const width = `${Math.max(0, Math.min(100, (value / 5) * 100))}%`;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-medium text-[#D6B79A]/62">
        <span className="truncate">{label}</span>
        <span className="arabic-number shrink-0 text-[#D6A373]">{value}/5</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#B6885E]/12">
        <div
          className="h-full rounded-full bg-[#D6A373] transition-all duration-500 ease-out"
          style={{ width }}
        />
      </div>
    </div>
  );
}
