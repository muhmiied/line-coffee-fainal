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
  Pencil,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { cn } from "@/lib/utils/cn";
import {
  espressoBeans,
  metricLabels,
  type EspressoBean,
  type EspressoMetricKey,
  type EspressoMetrics,
} from "./data/espressoBeans";
import {
  BUDGET_TARGET_PER_KG,
  analyzeBlend,
  blendAdjustments,
  blendProfiles,
  calculateBlendMetrics,
  calculatePricePerKg,
  evaluateBlendHealth,
  formatPercent,
  isValidManualTotal,
  packageWeights,
  recommendSuggestedBlend,
  suggestSmartRatios,
  type BlendAdjustmentId,
  type BlendPreferences,
  type BlendRatio,
  type BodyPreference,
  type PackageSize,
} from "./lib/espressoBlendEngine";

type BlendMode = "smart" | "manual";

const metricOrder: EspressoMetricKey[] = [
  "body",
  "crema",
  "acidity",
  "chocolate",
  "sweetness",
  "strength",
];

const liveMetricOrder: EspressoMetricKey[] = ["body", "crema", "acidity", "chocolate", "strength"];
const packageSizes: PackageSize[] = ["250g", "500g", "1kg"];

function buildManualRatios(ratios: BlendRatio[]) {
  return Object.fromEntries(ratios.map((ratio) => [ratio.beanId, formatPercent(ratio.percent)]));
}

function getRatio(ratios: BlendRatio[], beanId: string) {
  return ratios.find((ratio) => ratio.beanId === beanId)?.percent ?? 0;
}

function roundMoney(value: number) {
  return Math.round(value);
}

function getFamilyLabel(family: EspressoBean["family"]) {
  return family === "arabica"
    ? { en: "Arabica", ar: "أرابيكا" }
    : { en: "Robusta", ar: "روبوستا" };
}

export function EspressoBlendStudio({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLanguage();
  const { addItem } = useCart();
  const [selectedIds, setSelectedIds] = useLocalStorage<string[]>("espresso-studio-beans", []);
  const [blendMode, setBlendMode] = useLocalStorage<BlendMode>("espresso-studio-mode", "smart");
  const [manualRatios, setManualRatios] = useLocalStorage<Record<string, string>>("espresso-studio-ratios", {});
  const [selectedSize, setSelectedSize] = useLocalStorage<PackageSize>("espresso-studio-size", "250g");
  const [quantity, setQuantity] = useLocalStorage<number>("espresso-studio-qty", 1);
  const [activeAdjustment, setActiveAdjustment] = useLocalStorage<BlendAdjustmentId | null>("espresso-studio-adjustment", null);
  const [preferences, setPreferences] = useLocalStorage<BlendPreferences>("espresso-studio-prefs", {
    profileId: "balanced",
    body: "medium",
    arabicaOnly: false,
    budgetAware: false,
  });
  const [pendingAdjustment, setPendingAdjustment] = useState<BlendAdjustmentId | null>(null);
  const [expandedFamilies, setExpandedFamilies] = useState<Record<EspressoBean["family"], boolean>>({
    arabica: false,
    robusta: false,
  });

  const selectedBeans = useMemo(
    () => selectedIds
      .map((id) => espressoBeans.find((bean) => bean.id === id))
      .filter((bean): bean is EspressoBean => Boolean(bean)),
    [selectedIds],
  );

  const suggestedBlend = useMemo(() => recommendSuggestedBlend(preferences), [preferences]);

  const smartRatios = useMemo(
    () => suggestSmartRatios(selectedBeans, preferences, activeAdjustment),
    [activeAdjustment, preferences, selectedBeans],
  );

  const activeRatios = useMemo<BlendRatio[]>(() => {
    if (blendMode === "smart") return smartRatios;

    return selectedBeans.map((bean) => ({
      beanId: bean.id,
      percent: Math.max(0, Number(manualRatios[bean.id] || 0)),
    }));
  }, [blendMode, manualRatios, selectedBeans, smartRatios]);

  const pendingRatios = useMemo(
    () => pendingAdjustment
      ? suggestSmartRatios(selectedBeans, preferences, pendingAdjustment)
      : [],
    [pendingAdjustment, preferences, selectedBeans],
  );

  const metrics = useMemo(
    () => calculateBlendMetrics(selectedBeans, activeRatios),
    [activeRatios, selectedBeans],
  );

  const pricePerKg = calculatePricePerKg(selectedBeans, activeRatios);
  const unitPrice = roundMoney(pricePerKg * packageWeights[selectedSize]);
  const totalPrice = unitPrice * quantity;
  const ratioTotal = activeRatios.reduce((sum, ratio) => sum + ratio.percent, 0);
  const manualTotalIsValid = blendMode === "smart" || isValidManualTotal(activeRatios);
  const canUseMockCta = selectedBeans.length > 0 && manualTotalIsValid;

  const resetStudio = () => {
    setSelectedIds([]);
    setBlendMode("smart");
    setManualRatios({});
    setSelectedSize("250g");
    setQuantity(1);
    setActiveAdjustment(null);
    setPreferences({ profileId: "balanced", body: "medium", arabicaOnly: false, budgetAware: false });
    setPendingAdjustment(null);

  };

  const handleAddToCart = () => {
    if (!canUseMockCta) return;
    const profile = blendProfiles.find((p) => p.id === preferences.profileId);
    const beanNamesEn = selectedBeans.map((b) => b.name.en).join(" + ");
    const beanNamesAr = selectedBeans.map((b) => b.name.ar).join(" + ");
    addItem({
      kind: "espresso-blend",
      name: { en: "Custom Espresso Blend", ar: "توليفة إسبريسو مخصصة" },
      detail: {
        en: `${selectedSize} · ${profile?.label.en ?? "Custom"} · ${beanNamesEn}`,
        ar: `${selectedSize} · ${profile?.label.ar ?? "مخصص"} · ${beanNamesAr}`,
      },
      pricePerUnit: unitPrice,
      qty: quantity,
    });
  };
  const analysis = analyzeBlend({
    beans: selectedBeans,
    ratios: activeRatios,
    preferences,
    manualMode: blendMode === "manual",
  });
  const blendHealth = evaluateBlendHealth({
    beans: selectedBeans,
    ratios: activeRatios,
    preferences,
    manualMode: blendMode === "manual",
  });

  const handleToggleBean = (bean: EspressoBean) => {
    if (preferences.arabicaOnly && bean.family === "robusta") return;


    setSelectedIds((current) => {
      const exists = current.includes(bean.id);
      if (exists) return current.filter((id) => id !== bean.id);
      return [...current, bean.id];
    });

    if (blendMode === "manual") {
      setManualRatios((current) => ({
        ...current,
        [bean.id]: current[bean.id] ?? "0",
      }));
    }
  };

  const updateProfile = (profileId: BlendPreferences["profileId"]) => {
    setPreferences((current) => ({ ...current, profileId }));
    setActiveAdjustment(null);
    setPendingAdjustment(null);
  };

  const updateBody = (body: BodyPreference) => {
    setPreferences((current) => ({ ...current, body }));
    setActiveAdjustment(null);
    setPendingAdjustment(null);
  };

  const toggleArabicaOnly = () => {
    setPreferences((current) => {
      const nextArabicaOnly = !current.arabicaOnly;
      if (nextArabicaOnly) {
        setSelectedIds((ids) =>
          ids.filter((id) => espressoBeans.find((bean) => bean.id === id)?.family === "arabica"),
        );
        setManualRatios((ratios) => {
          const next: Record<string, string> = {};
          Object.entries(ratios).forEach(([id, value]) => {
            if (espressoBeans.find((bean) => bean.id === id)?.family === "arabica") next[id] = value;
          });
          return next;
        });
      }
      return { ...current, arabicaOnly: nextArabicaOnly };
    });
    setActiveAdjustment(null);
    setPendingAdjustment(null);
  };

  const toggleBudgetAware = () => {
    setPreferences((current) => ({ ...current, budgetAware: !current.budgetAware }));
  };

  const applySuggestedBlend = () => {
    setSelectedIds(suggestedBlend.beans.map((bean) => bean.id));
    setManualRatios({});
    setBlendMode("smart");
    setActiveAdjustment(null);
    setPendingAdjustment(null);

  };

  const updateManualRatio = (beanId: string, value: string) => {
    const numeric = Number(value);
    const nextValue = value === "" || !Number.isFinite(numeric)
      ? ""
      : String(Math.max(0, Math.min(100, numeric)));

    setBlendMode("manual");
    setActiveAdjustment(null);

    setManualRatios((current) => ({ ...current, [beanId]: nextValue }));
  };

  const startManualEditing = () => {
    if (selectedBeans.length === 0) return;
    setBlendMode("manual");
    setActiveAdjustment(null);
    setPendingAdjustment(null);

    setManualRatios(buildManualRatios(activeRatios));
  };

  const restoreSmartBlend = () => {
    setBlendMode("smart");
    setManualRatios({});
    setPendingAdjustment(null);

  };

  const handleAdjustment = (adjustment: BlendAdjustmentId) => {

    if (selectedBeans.length === 0) return;

    if (blendMode === "smart") {
      setActiveAdjustment((current) => current === adjustment ? null : adjustment);
      setPendingAdjustment(null);
      return;
    }

    setPendingAdjustment((current) => current === adjustment ? null : adjustment);
  };

  const applyPendingSuggestion = () => {
    setManualRatios(buildManualRatios(pendingRatios));
    setPendingAdjustment(null);

  };

  const arabicaBeans = espressoBeans.filter((bean) => bean.family === "arabica");
  const robustaBeans = espressoBeans.filter((bean) => bean.family === "robusta");

  return (
    <div className={cn("arabic-body text-[#F5E6D8]", !embedded && "min-h-screen overflow-x-hidden bg-[#0B0806]")}>
      {embedded ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#D6A373]/18 bg-[#120D09]/60 px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D6A373]/24 bg-[#D6A373]/10 text-[#D6A373]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D6A373]">
              {t({ en: "Espresso Blend Studio", ar: "استوديو توليفة الإسبريسو" })}
            </p>
            <h2 className="font-serif text-xl font-bold text-[#F5E6D8]">
              {t({ en: "Build Your Custom Espresso Blend", ar: "كوّن خلطة الإسبريسو الخاصة بك" })}
            </h2>
          </div>
        </div>
      ) : (
        <section className="relative -mt-[6.4rem] min-h-[28rem] overflow-hidden border-b border-[#B6885E]/14 bg-[#0B0806] pb-12 pt-[calc(6.4rem+3rem)] sm:-mt-[7.2rem] sm:min-h-[30rem] sm:pb-14 sm:pt-[calc(7.2rem+3.5rem)] md:-mt-[8.9rem] md:min-h-[32rem] md:pb-16 md:pt-[calc(8.9rem+4rem)]">
          <div className="absolute inset-0 opacity-55" aria-hidden="true">
            <Image
              src="/assets/hero/dark-roast.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="-translate-y-12 scale-[1.14] object-cover object-[center_100%] sm:-translate-y-16 sm:scale-[1.16] md:-translate-y-20 md:scale-[1.18]"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,8,6,0.28)_0%,rgba(11,8,6,0.48)_44%,rgba(11,8,6,0.9)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(214,163,115,0.16),transparent_34%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D6A373]/34 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4">
            <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#B6885E]/22 bg-[#0B0806]/48 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#D6A373] backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                {t({ en: "Espresso Blend Studio", ar: "استوديو توليفة الإسبريسو" })}
              </p>
              <h1 className="font-serif text-4xl font-bold leading-tight text-[#F5E6D8] drop-shadow-[0_10px_34px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-6xl">
                {t({
                  en: "Build Your Custom Espresso Blend",
                  ar: "كوّن خلطة الإسبريسو الخاصة بك",
                })}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D6B79A]/82 sm:text-base">
                {t({
                  en: "Choose beans or a taste direction, and we will help you craft a balanced whole-bean espresso blend.",
                  ar: "اختر الحبوب أو اتجاه الطعم، وسنساعدك في تكوين توليفة حبوب كاملة متوازنة.",
                })}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className={cn(
        "grid gap-6",
        embedded
          ? "py-2 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start"
          : "mx-auto max-w-7xl px-4 py-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:py-8",
      )}>
        <div className="space-y-5 lg:col-start-1 lg:row-start-1">
          <GuidePanel
            preferences={preferences}
            suggestedBeans={suggestedBlend.beans}
            suggestedRatios={suggestedBlend.ratios}
            suggestedPrice={suggestedBlend.pricePerKg}
            onProfileChange={updateProfile}
            onBodyChange={updateBody}
            onArabicaOnlyToggle={toggleArabicaOnly}
            onBudgetAwareToggle={toggleBudgetAware}
            onApply={applySuggestedBlend}
          />
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <LiveBlendCart
            selectedBeans={selectedBeans}
            ratios={activeRatios}
            metrics={metrics}
            analysis={analysis}
            blendHealth={blendHealth}
            blendMode={blendMode}
            ratioTotal={ratioTotal}
            manualTotalIsValid={manualTotalIsValid}
            totalPrice={totalPrice}
            selectedSize={selectedSize}
            quantity={quantity}
            canUseMockCta={canUseMockCta}
            onSizeChange={setSelectedSize}
            onQuantityChange={setQuantity}
            onStartManualEditing={startManualEditing}
            onManualRatioChange={updateManualRatio}
            onAddToCart={handleAddToCart}
            onReset={resetStudio}
          />
        </div>

        <div className="space-y-5 lg:col-start-1 lg:row-start-2">
          <SmartBlendConsole
            selectedCount={selectedBeans.length}
            blendMode={blendMode}
            activeAdjustment={activeAdjustment}
            pendingAdjustment={pendingAdjustment}
            pendingRatios={pendingRatios}
            selectedBeans={selectedBeans}
            onAdjustment={handleAdjustment}
            onApplyPending={applyPendingSuggestion}
            onRestoreSmart={restoreSmartBlend}
          />

          <BeanLibrary
            title={t({ en: "Arabica Library", ar: "قسم الأرابيكا" })}
            description={t({
              en: "Select origins, then let Smart Blend balance the ratios.",
              ar: "اختر المناشئ، واترك التوليفة الذكية توازن النسب.",
            })}
            beans={arabicaBeans}
            family="arabica"
            selectedIds={selectedIds}
            ratios={activeRatios}
            arabicaOnly={preferences.arabicaOnly}
            blendMode={blendMode}
            expanded={expandedFamilies.arabica}
            onExpandedChange={() => setExpandedFamilies((current) => ({ ...current, arabica: !current.arabica }))}
            onToggle={handleToggleBean}
            onManualRatioChange={updateManualRatio}
          />

          <BeanLibrary
            title={t({ en: "Robusta Support", ar: "دعم الروبوستا" })}
            description={t({
              en: "Use small amounts for crema, body, and strength.",
              ar: "استخدم نسبًا بسيطة للكريما والقوام والقوة.",
            })}
            beans={robustaBeans}
            family="robusta"
            selectedIds={selectedIds}
            ratios={activeRatios}
            arabicaOnly={preferences.arabicaOnly}
            blendMode={blendMode}
            expanded={expandedFamilies.robusta}
            onExpandedChange={() => setExpandedFamilies((current) => ({ ...current, robusta: !current.robusta }))}
            onToggle={handleToggleBean}
            onManualRatioChange={updateManualRatio}
          />
        </div>
      </section>
    </div>
  );
}

function GuidePanel({
  preferences,
  suggestedBeans,
  suggestedRatios,
  suggestedPrice,
  onProfileChange,
  onBodyChange,
  onArabicaOnlyToggle,
  onBudgetAwareToggle,
  onApply,
}: {
  preferences: BlendPreferences;
  suggestedBeans: EspressoBean[];
  suggestedRatios: BlendRatio[];
  suggestedPrice: number;
  onProfileChange: (profileId: BlendPreferences["profileId"]) => void;
  onBodyChange: (body: BodyPreference) => void;
  onArabicaOnlyToggle: () => void;
  onBudgetAwareToggle: () => void;
  onApply: () => void;
}) {
  const { t } = useLanguage();
  const activeProfile = blendProfiles.find((profile) => profile.id === preferences.profileId) ?? blendProfiles[0];

  return (
    <section className="luxury-panel overflow-hidden rounded-2xl">
      <div className="border-b border-[#B6885E]/14 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[#D6A373]">
              <Sparkles className="h-5 w-5" />
              <h2 className="font-serif text-xl font-bold text-[#F5E6D8]">
                {t({ en: "Guide Me", ar: "رشح لي" })}
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[#D6B79A]/68">
              {t({
                en: "Pick a taste direction and constraints. The suggested custom blend updates instantly.",
                ar: "اختر اتجاه الطعم والقيود، وستتحدث التوليفة المقترحة فورًا.",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onApply}
            className="premium-button inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
          >
            <Check className="h-4 w-4" />
            {t({ en: "Apply Suggested Blend", ar: "طبّق التوليفة المقترحة" })}
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-5">
            {blendProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => onProfileChange(profile.id)}
                className={cn(
                  "min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-200",
                  preferences.profileId === profile.id
                    ? "border-[#D6A373]/55 bg-[#D6A373] text-[#0B0806] shadow-[0_12px_26px_rgba(182,136,94,0.18)]"
                    : "border-[#B6885E]/16 bg-[#0B0806]/42 text-[#D6B79A]/78 hover:border-[#D6A373]/34 hover:text-[#F5E6D8]",
                )}
              >
                {t(profile.label)}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="grid grid-cols-2 gap-2 md:w-72">
              {[
                { id: "medium" as const, label: { en: "Medium Body", ar: "قوام متوسط" } },
                { id: "full" as const, label: { en: "Full Body", ar: "قوام ممتلئ" } },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onBodyChange(option.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-semibold transition-all",
                    preferences.body === option.id
                      ? "border-[#D6A373]/45 bg-[#D6A373]/14 text-[#D6A373]"
                      : "border-[#B6885E]/16 bg-[#0B0806]/42 text-[#D6B79A]/70 hover:border-[#D6A373]/32",
                  )}
                >
                  {t(option.label)}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <ToggleChip
                active={preferences.arabicaOnly}
                label={{ en: "100% Arabica", ar: "100% أرابيكا" }}
                onClick={onArabicaOnlyToggle}
              />
              <ToggleChip
                active={preferences.budgetAware}
                label={{ en: "Budget-aware", ar: "اقتصادي" }}
                onClick={onBudgetAwareToggle}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#B6885E]/12 bg-[#0B0806]/38 p-4">
            <p className="text-sm leading-6 text-[#D6B79A]/76">{t(activeProfile.description)}</p>
            {preferences.budgetAware && (
              <p className="mt-2 text-xs text-[#D6A373]/78">
                {t({
                  en: `Suggested blends target ${BUDGET_TARGET_PER_KG} EGP/kg or less.`,
                  ar: `الاقتراحات تستهدف ${BUDGET_TARGET_PER_KG} ج.م/كجم أو أقل.`,
                })}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#D6A373]/18 bg-[#120D09]/56 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#D6A373]">
            {t({ en: "Current suggestion", ar: "الاقتراح الحالي" })}
          </p>
          <div className="space-y-2.5">
            {suggestedBeans.map((bean) => (
              <div key={bean.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-[#F5E6D8]/84">{t(bean.name)}</span>
                <span className="shrink-0 font-bold text-[#D6A373]">
                  {formatPercent(getRatio(suggestedRatios, bean.id))}%
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-[#B6885E]/12 pt-3 text-xs text-[#D6B79A]/68">
            <span>{t({ en: "Estimated", ar: "تقديري" })}: </span>
            <span className="arabic-number font-bold text-[#D6A373]">{roundMoney(suggestedPrice)} {t({ en: "EGP/kg", ar: "ج.م/كجم" })}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: { en: string; ar: string };
  onClick: () => void;
}) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-2 text-xs font-semibold transition-all",
        active
          ? "border-[#D6A373]/45 bg-[#D6A373]/16 text-[#D6A373]"
          : "border-[#B6885E]/16 bg-[#0B0806]/42 text-[#D6B79A]/70 hover:border-[#D6A373]/32 hover:text-[#F5E6D8]",
      )}
    >
      {t(label)}
    </button>
  );
}

function SmartBlendConsole({
  selectedCount,
  blendMode,
  activeAdjustment,
  pendingAdjustment,
  pendingRatios,
  selectedBeans,
  onAdjustment,
  onApplyPending,
  onRestoreSmart,
}: {
  selectedCount: number;
  blendMode: BlendMode;
  activeAdjustment: BlendAdjustmentId | null;
  pendingAdjustment: BlendAdjustmentId | null;
  pendingRatios: BlendRatio[];
  selectedBeans: EspressoBean[];
  onAdjustment: (adjustment: BlendAdjustmentId) => void;
  onApplyPending: () => void;
  onRestoreSmart: () => void;
}) {
  const { t } = useLanguage();

  if (selectedCount === 0) return null;

  return (
    <section className="rounded-2xl border border-[#D6A373]/18 bg-[#120D09]/70 p-4 shadow-[0_18px_52px_rgba(0,0,0,0.24)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D6A373]/24 bg-[#D6A373]/10 text-[#D6A373]">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D6A373]">
              {blendMode === "smart"
                ? t({ en: "Smart Blend Active", ar: "التوليفة الذكية مفعّلة" })
                : t({ en: "Manual Blend", ar: "توليفة يدوية" })}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#D6B79A]/68">
              {blendMode === "smart"
                ? t({
                    en: "Adjust the character and ratios will move intelligently.",
                    ar: "عدّل طابع التوليفة وستتحرك النسب بذكاء.",
                  })
                : t({
                    en: "Manual ratios are protected. Adjustments need explicit confirmation.",
                    ar: "النسب اليدوية محفوظة. أي تعديل ذكي يحتاج تأكيدًا منك.",
                  })}
            </p>
          </div>
        </div>

        {blendMode === "manual" && (
          <button
            type="button"
            onClick={onRestoreSmart}
            className="premium-button-outline rounded-full px-4 py-2 text-xs font-semibold"
          >
            {t({ en: "Return to Smart Blend", ar: "العودة للتوليفة الذكية" })}
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {blendAdjustments.map((adjustment) => (
          <button
            key={adjustment.id}
            type="button"
            onClick={() => onAdjustment(adjustment.id)}
            className={cn(
              "rounded-full border px-3 py-2 text-xs font-semibold transition-all",
              activeAdjustment === adjustment.id || pendingAdjustment === adjustment.id
                ? "border-[#D6A373]/50 bg-[#D6A373]/16 text-[#D6A373]"
                : "border-[#B6885E]/16 bg-[#0B0806]/38 text-[#D6B79A]/72 hover:border-[#D6A373]/34 hover:text-[#F5E6D8]",
            )}
          >
            {t(adjustment.label)}
          </button>
        ))}
      </div>

      {blendMode === "manual" && pendingAdjustment && pendingRatios.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#D6A373]/18 bg-[#0B0806]/38 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[#D6B79A]/72">
            {t({ en: "Suggested ratio", ar: "النسبة المقترحة" })}:{" "}
            {selectedBeans.map((bean) => `${t(bean.name)} ${formatPercent(getRatio(pendingRatios, bean.id))}%`).join(" · ")}
          </p>
          <button
            type="button"
            onClick={onApplyPending}
            className="premium-button shrink-0 rounded-full px-4 py-2 text-xs font-semibold"
          >
            {t({ en: "Apply suggestion", ar: "طبّق الاقتراح" })}
          </button>
        </div>
      )}
    </section>
  );
}

function BeanLibrary({
  title,
  description,
  beans,
  family,
  selectedIds,
  ratios,
  arabicaOnly,
  blendMode,
  expanded,
  onExpandedChange,
  onToggle,
  onManualRatioChange,
}: {
  title: string;
  description: string;
  beans: EspressoBean[];
  family: EspressoBean["family"];
  selectedIds: string[];
  ratios: BlendRatio[];
  arabicaOnly: boolean;
  blendMode: BlendMode;
  expanded: boolean;
  onExpandedChange: () => void;
  onToggle: (bean: EspressoBean) => void;
  onManualRatioChange: (beanId: string, value: string) => void;
}) {
  const { t } = useLanguage();
  const visibleBeans = expanded ? beans : beans.slice(0, 3);
  const hiddenCount = Math.max(0, beans.length - visibleBeans.length);

  return (
    <section>
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#F5E6D8]">{title}</h2>
          <p className="mt-1 text-sm text-[#D6B79A]/62">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-fit rounded-full border border-[#B6885E]/16 bg-[#120D09]/54 px-3 py-1 text-xs text-[#D6A373]">
            {t(getFamilyLabel(family))}
          </span>
          <span className="w-fit rounded-full border border-[#B6885E]/16 bg-[#120D09]/54 px-3 py-1 text-xs text-[#D6B79A]/70">
            {visibleBeans.length}/{beans.length} {t({ en: "origins", ar: "منشأ" })}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleBeans.map((bean) => {
          const selected = selectedIds.includes(bean.id);
          const disabled = arabicaOnly && bean.family === "robusta";
          const percent = getRatio(ratios, bean.id);

          return (
            <article
              key={bean.id}
              role={disabled ? undefined : "button"}
              tabIndex={disabled ? -1 : 0}
              aria-disabled={disabled}
              aria-pressed={selected}
              onClick={() => {
                if (!disabled) onToggle(bean);
              }}
              onKeyDown={(event) => {
                if (disabled) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggle(bean);
                }
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-serif text-base font-bold text-[#F5E6D8]">
                      {t(bean.name)}
                    </h3>
                  </div>
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

                <p className="mt-2 line-clamp-2 text-xs leading-[1.55] text-[#D6B79A]/70">
                  {t(bean.tasteHint)}
                </p>

                {selected && blendMode === "manual" && (
                  <label
                    className="mt-2 flex w-fit items-center gap-2 rounded-xl border border-[#D6A373]/22 bg-[#0B0806]/44 px-2.5 py-1.5 text-xs text-[#D6A373]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span className="text-[#D6B79A]/62">{t({ en: "Ratio", ar: "النسبة" })}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={String(percent)}
                      onChange={(event) => onManualRatioChange(bean.id, event.target.value)}
                      className="h-7 w-14 rounded-lg border border-[#B6885E]/18 bg-[#120D09]/90 px-2 text-center text-xs font-bold text-[#F5E6D8] outline-none transition-colors focus:border-[#D6A373]/60"
                      aria-label={`${t(bean.name)} ratio`}
                    />
                    <span className="font-bold">%</span>
                  </label>
                )}

                {disabled && (
                  <p className="mt-2 rounded-xl border border-[#D6A373]/16 bg-[#D6A373]/8 px-3 py-2 text-xs leading-5 text-[#D6A373]">
                    {t({
                      en: "Not available with 100% Arabica",
                      ar: "غير متاح مع اختيار 100% أرابيكا",
                    })}
                  </p>
                )}

                <div className="mt-auto pt-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-[#D6B79A]/58">{t({ en: "Sale", ar: "السعر" })}</span>
                    <span className="arabic-number font-bold text-[#D6A373]">{bean.salePrice} {t({ en: "EGP/kg", ar: "ج.م/كجم" })}</span>
                  </div>

                  <div className="mt-2 grid gap-1">
                    {metricOrder.map((metric) => (
                      <MetricBar
                        key={metric}
                        label={t(metricLabels[metric])}
                        value={bean.metrics[metric]}
                        compact
                      />
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {beans.length > 3 && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onExpandedChange}
            className="premium-button inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold"
          >
            {expanded
              ? t({ en: "Show Less", ar: "إظهار أقل" })
              : t({ en: "View All", ar: "عرض الكل" })}
            {!expanded && hiddenCount > 0 && (
              <span className="arabic-number text-[#D6A373]">+{hiddenCount}</span>
            )}
          </button>
        </div>
      )}
    </section>
  );
}

function LiveBlendCart({
  selectedBeans,
  ratios,
  metrics,
  analysis,
  blendHealth,
  blendMode,
  ratioTotal,
  manualTotalIsValid,
  totalPrice,
  selectedSize,
  quantity,
  canUseMockCta,
  onSizeChange,
  onQuantityChange,
  onStartManualEditing,
  onManualRatioChange,
  onAddToCart,
  onReset,
}: {
  selectedBeans: EspressoBean[];
  ratios: BlendRatio[];
  metrics: EspressoMetrics | null;
  analysis: ReturnType<typeof analyzeBlend>;
  blendHealth: ReturnType<typeof evaluateBlendHealth>;
  blendMode: BlendMode;
  ratioTotal: number;
  manualTotalIsValid: boolean;
  totalPrice: number;
  selectedSize: PackageSize;
  quantity: number;
  canUseMockCta: boolean;
  onSizeChange: (size: PackageSize) => void;
  onQuantityChange: (quantity: number) => void;
  onStartManualEditing: () => void;
  onManualRatioChange: (beanId: string, value: string) => void;
  onAddToCart: () => void;
  onReset: () => void;
}) {
  const { t } = useLanguage();

  return (
    <aside className="lg:sticky lg:top-[9.25rem]">
      <div className="luxury-panel overflow-hidden rounded-2xl">

        {/* ── TOP: Price + Weight + Qty + CTA ──────────────────────── */}
        <div className="p-5">
          {/* Price row */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6A373]">
                {t({ en: "Live Blend Cart", ar: "كارت التوليفة الحي" })}
              </p>
              <p className="mt-2 font-serif text-4xl font-bold text-[#D6A373]">
                <span className="arabic-number">{totalPrice || 0}</span>{" "}
                <span className="text-xl">{t({ en: "EGP", ar: "ج.م" })}</span>
              </p>
            </div>
          </div>

          {/* Weight */}
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-semibold text-[#D6B79A]/70">{t({ en: "Weight", ar: "الوزن" })}</p>
            <div className="grid grid-cols-3 gap-2">
              {packageSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onSizeChange(size)}
                  className={cn(
                    "rounded-xl border py-2.5 text-sm font-semibold transition-all",
                    selectedSize === size
                      ? "border-[#D6A373]/55 bg-[#D6A373] text-[#0B0806]"
                      : "border-[#B6885E]/16 bg-[#120D09]/70 text-[#D6B79A]/75 hover:border-[#D6A373]/38",
                  )}
                >
                  {size}
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
            disabled={!canUseMockCta}
            className="premium-button flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
          >
            <ShoppingBag className="h-5 w-5" />
            {t({ en: "Add blend to cart", ar: "أضف التوليفة للعربة" })}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-[#B6885E]/16 py-2.5 text-xs font-semibold text-[#D6B79A]/50 transition-all hover:border-red-500/22 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t({ en: "Reset studio", ar: "إعادة ضبط الاستوديو" })}
          </button>
        </div>

        {/* ── Divider ──────────────────────────────────────────────── */}
        <div className="h-px bg-[#B6885E]/14" />

        {/* ── BOTTOM: Beans + Analysis ──────────────────────────────── */}
        <div className="space-y-4 p-5">

          {/* Blend mode badge + edit toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-bold",
              blendMode === "smart"
                ? "border-[#D6A373]/28 bg-[#D6A373]/10 text-[#D6A373]"
                : "border-[#F59E0B]/24 bg-[#F59E0B]/10 text-[#F4C16D]",
            )}>
              {blendMode === "smart"
                ? t({ en: "Smart Blend", ar: "التوليفة الذكية" })
                : t({ en: "Manual Blend", ar: "توليفة يدوية" })}
            </span>
            {blendMode === "smart" && selectedBeans.length > 0 && (
              <button
                type="button"
                onClick={onStartManualEditing}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#B6885E]/18 px-3 py-1.5 text-[11px] font-semibold text-[#D6A373] transition-colors hover:border-[#D6A373]/38 hover:bg-[#D6A373]/10"
              >
                <Pencil className="h-3 w-3" />
                {t({ en: "Edit Ratios", ar: "تعديل النسب" })}
              </button>
            )}
          </div>

          {/* Beans list */}
          {selectedBeans.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#B6885E]/24 px-4 py-5 text-center text-sm text-[#D6B79A]/58">
              {t({ en: "Select beans to start your blend.", ar: "اختر الحبوب لبدء التوليفة." })}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex h-2 overflow-hidden rounded-full bg-[#0B0806]/70">
                {selectedBeans.map((bean) => (
                  <span
                    key={bean.id}
                    className={bean.family === "arabica" ? "bg-[#D6A373]" : "bg-[#8A5A37]"}
                    style={{ flexBasis: `${Math.max(0, getRatio(ratios, bean.id))}%` }}
                  />
                ))}
              </div>
              {selectedBeans.map((bean) => {
                const percent = getRatio(ratios, bean.id);
                return (
                  <div key={bean.id} className="rounded-xl border border-[#B6885E]/12 bg-[#0B0806]/34 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#F5E6D8]/88">{t(bean.name)}</p>
                        <p className="text-[10px] text-[#D6B79A]/48">{t(getFamilyLabel(bean.family))}</p>
                      </div>
                      {blendMode === "manual" ? (
                        <label className="flex shrink-0 items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={String(percent)}
                            onChange={(event) => onManualRatioChange(bean.id, event.target.value)}
                            className="h-8 w-16 rounded-lg border border-[#B6885E]/18 bg-[#120D09]/80 px-2 text-center text-xs font-bold text-[#F5E6D8] outline-none focus:border-[#D6A373]/60"
                            aria-label={`${t(bean.name)} ratio`}
                          />
                          <span className="text-xs font-bold text-[#D6A373]">%</span>
                        </label>
                      ) : (
                        <span className="arabic-number shrink-0 rounded-full border border-[#D6A373]/22 bg-[#D6A373]/10 px-2.5 py-1 text-xs font-bold text-[#D6A373]">
                          {formatPercent(percent)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Manual total warning */}
          {blendMode === "manual" && selectedBeans.length > 0 && (
            <div className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              manualTotalIsValid
                ? "border-[#D6A373]/18 bg-[#D6A373]/8 text-[#D6A373]"
                : "border-[#F59E0B]/26 bg-[#F59E0B]/10 text-[#F6D59B]",
            )}>
              {t({ en: "Total", ar: "المجموع" })}:{" "}
              <span className="arabic-number font-bold">{formatPercent(ratioTotal)}%</span>
              {!manualTotalIsValid && (
                <span className="ms-2">{t({ en: "Must equal 100%.", ar: "يجب أن يساوي 100%." })}</span>
              )}
            </div>
          )}

          {/* Blend quality */}
          <div className={cn(
            "rounded-2xl border px-4 py-3",
            blendHealth.tone === "warning"
              ? "border-[#F59E0B]/24 bg-[#F59E0B]/10"
              : blendHealth.tone === "good"
                ? "border-[#D6A373]/22 bg-[#D6A373]/10"
                : "border-[#B6885E]/14 bg-[#0B0806]/38",
          )}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D6A373]">
                  {t({ en: "Blend Quality", ar: "جودة التوليفة" })}
                </p>
                <p className="mt-1 font-serif text-xl font-bold text-[#F5E6D8]">
                  {t(blendHealth.label)}
                </p>
              </div>
              <p className="arabic-number shrink-0 text-3xl font-bold text-[#D6A373]">
                {blendHealth.score}
                <span className="text-sm text-[#D6B79A]/55">/100</span>
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#0B0806]/70">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  blendHealth.tone === "warning" ? "bg-[#F4C16D]" : "bg-[#D6A373]",
                )}
                style={{ width: `${blendHealth.score}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-[#D6B79A]/68">
              {t(blendHealth.detail)}
            </p>
          </div>

          {/* Metric bars */}
          {metrics && (
            <div>
              <p className="mb-2 text-xs font-semibold text-[#D6B79A]/70">
                {t({ en: "Blend profile", ar: "تقييم التوليفة" })}
              </p>
              <div className="space-y-2">
                {liveMetricOrder.map((metric) => (
                  <MetricBar
                    key={metric}
                    label={t(metricLabels[metric])}
                    value={metrics[metric]}
                  />
                ))}
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
              {analysis.tone === "warning" ? <AlertTriangle className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t({ en: "Smart comment", ar: "تعليق ذكي" })}
            </div>
            {t(analysis.message)}
          </div>
        </div>
      </div>
    </aside>
  );
}

function MetricBar({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number;
  compact?: boolean;
}) {
  const width = `${Math.max(0, Math.min(100, value / 5 * 100))}%`;

  return (
    <div>
      <div className={cn(
        "mb-1 flex items-center justify-between gap-2 font-medium text-[#D6B79A]/62",
        compact ? "text-[10px]" : "text-[11px]",
      )}>
        <span className="truncate">{label}</span>
        <span className="arabic-number shrink-0 text-[#D6A373]">{value}/5</span>
      </div>
      <div className={cn("overflow-hidden rounded-full bg-[#B6885E]/12", compact ? "h-1" : "h-1.5")}>
        <div
          className="h-full rounded-full bg-[#D6A373] transition-all duration-500 ease-out"
          style={{ width }}
        />
      </div>
    </div>
  );
}
