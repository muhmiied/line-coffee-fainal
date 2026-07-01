import type { LocalizedText } from "@/types/localization";
import {
  espressoBeans,
  type EspressoBean,
  type EspressoMetricKey,
  type EspressoMetrics,
} from "../data/espressoBeans";

export type BlendProfileId = "balanced" | "crema" | "chocolate" | "bright" | "strong";
export type BodyPreference = "medium" | "full";
export type BlendAdjustmentId = "crema" | "body" | "chocolate" | "strength" | "less-acidity";
export type PackageSize = "250g" | "500g" | "1kg";

export type BlendPreferences = {
  profileId: BlendProfileId;
  body: BodyPreference;
  arabicaOnly: boolean;
  budgetAware: boolean;
};

export type BlendRatio = {
  beanId: string;
  percent: number;
};

export type BlendAnalysis = {
  tone: "neutral" | "good" | "warning";
  message: LocalizedText;
};

export type BlendHealth = {
  score: number;
  tone: "neutral" | "good" | "warning";
  label: LocalizedText;
  detail: LocalizedText;
};

type BlendProfile = {
  id: BlendProfileId;
  label: LocalizedText;
  description: LocalizedText;
  target: EspressoMetrics;
  weights: Partial<Record<EspressoMetricKey, number>>;
};

export const BUDGET_TARGET_PER_KG = 1000;

export const packageWeights: Record<PackageSize, number> = {
  "250g": 0.25,
  "500g": 0.5,
  "1kg": 1,
};

export const blendProfiles: BlendProfile[] = [
  {
    id: "balanced",
    label: { en: "Balanced", ar: "متوازن" },
    description: {
      en: "Steady body, clean sweetness, and comfortable crema.",
      ar: "قوام ثابت وحلاوة نظيفة وكريما مريحة.",
    },
    target: { body: 3.7, crema: 3.4, acidity: 2.8, chocolate: 3.4, sweetness: 3.7, strength: 3.2 },
    weights: { body: 1.2, crema: 1.0, acidity: 0.8, chocolate: 0.8, sweetness: 1.0, strength: 0.8 },
  },
  {
    id: "crema",
    label: { en: "Crema", ar: "كريما عالية" },
    description: {
      en: "Thicker crema and fuller texture for espresso machines.",
      ar: "كريما أكثف وملمس ممتلئ لماكينات الإسبريسو.",
    },
    target: { body: 4.2, crema: 4.6, acidity: 2.0, chocolate: 3.4, sweetness: 3.0, strength: 4.0 },
    weights: { crema: 1.8, body: 1.2, strength: 1.0, acidity: 0.8 },
  },
  {
    id: "chocolate",
    label: { en: "Chocolate-Nutty", ar: "شوكولاتة ومكسرات" },
    description: {
      en: "Warm cocoa, nuts, and rounded sweetness.",
      ar: "كاكاو دافئ ومكسرات وحلاوة مستديرة.",
    },
    target: { body: 4.0, crema: 3.3, acidity: 2.2, chocolate: 4.6, sweetness: 3.9, strength: 3.2 },
    weights: { chocolate: 1.9, sweetness: 1.2, body: 1.1, acidity: 0.7 },
  },
  {
    id: "bright",
    label: { en: "Bright", ar: "مشرق" },
    description: {
      en: "Fruitier aroma and a lively specialty direction.",
      ar: "عطر فاكهي واتجاه مختص أكثر حيوية.",
    },
    target: { body: 3.0, crema: 2.7, acidity: 4.3, chocolate: 2.5, sweetness: 3.8, strength: 2.8 },
    weights: { acidity: 1.8, sweetness: 1.0, body: 0.8, strength: 0.6 },
  },
  {
    id: "strong",
    label: { en: "Strong", ar: "قوي" },
    description: {
      en: "Higher strength, lower acidity, and a bolder pull.",
      ar: "قوة أعلى وحموضة أقل واستخلاص أكثر جرأة.",
    },
    target: { body: 4.5, crema: 4.2, acidity: 1.8, chocolate: 3.3, sweetness: 2.8, strength: 4.8 },
    weights: { strength: 1.8, body: 1.4, crema: 1.2, acidity: 0.8 },
  },
];

export const blendAdjustments: Array<{
  id: BlendAdjustmentId;
  label: LocalizedText;
  metric: EspressoMetricKey;
}> = [
  { id: "crema", label: { en: "More Crema", ar: "كريما أكثر" }, metric: "crema" },
  { id: "body", label: { en: "More Body", ar: "قوام أعلى" }, metric: "body" },
  { id: "chocolate", label: { en: "More Chocolate", ar: "شوكولاتة أكثر" }, metric: "chocolate" },
  { id: "strength", label: { en: "More Strength", ar: "قوة أعلى" }, metric: "strength" },
  { id: "less-acidity", label: { en: "Less Acidity", ar: "حموضة أقل" }, metric: "acidity" },
];

function clamp(value: number, min = 1, max = 5) {
  return Math.max(min, Math.min(max, value));
}

function roundMetric(value: number) {
  return Math.round(clamp(value) * 10) / 10;
}

function getProfile(profileId: BlendProfileId) {
  return blendProfiles.find((profile) => profile.id === profileId) ?? blendProfiles[0];
}

function metricDistance(bean: EspressoBean, preferences: BlendPreferences) {
  const profile = getProfile(preferences.profileId);
  const target = {
    ...profile.target,
    body: preferences.body === "full" ? Math.max(profile.target.body, 4.2) : profile.target.body,
  };

  return Object.entries(profile.weights).reduce((sum, [key, weight]) => {
    const metric = key as EspressoMetricKey;
    return sum + Math.abs(bean.metrics[metric] - target[metric]) * (weight ?? 1);
  }, 0);
}

function beanWeight(
  bean: EspressoBean,
  preferences: BlendPreferences,
  adjustment?: BlendAdjustmentId | null,
) {
  const profile = getProfile(preferences.profileId);
  let score = 10 - metricDistance(bean, preferences);

  score += bean.metrics.body * 0.42;
  score += bean.metrics.crema * 0.22;
  score += bean.metrics.chocolate * 0.24;
  score += bean.metrics.sweetness * 0.2;
  score += bean.metrics.strength * 0.16;

  if (profile.id === "crema" && bean.family === "robusta") score += 1.2;
  if (profile.id === "strong" && bean.family === "robusta") score += 1.5;
  if (profile.id === "bright" && bean.family === "arabica") score += 1.1;
  if (profile.id === "balanced" && bean.family === "arabica") score += 0.55;

  if (preferences.body === "full" && bean.metrics.body >= 4) score += 0.8;
  if (preferences.budgetAware) score -= Math.max(0, (bean.salePrice - 520) / 900);

  if (adjustment === "crema") score += bean.metrics.crema * 0.8;
  if (adjustment === "body") score += bean.metrics.body * 0.8;
  if (adjustment === "chocolate") score += bean.metrics.chocolate * 0.9 + bean.metrics.sweetness * 0.2;
  if (adjustment === "strength") score += bean.metrics.strength * 0.9;
  if (adjustment === "less-acidity") score += (5.5 - bean.metrics.acidity) * 1.05;

  return Math.max(0.8, score);
}

function cleanRatios(values: number[]) {
  if (values.length === 0) return [];

  const rounded = values.map((value) => Math.max(0, Math.round(value / 5) * 5));
  let total = rounded.reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    const equal = Math.floor(100 / values.length / 5) * 5;
    const next = values.map(() => equal);
    next[0] += 100 - next.reduce((sum, value) => sum + value, 0);
    return next;
  }

  rounded[0] += 100 - total;
  total = rounded.reduce((sum, value) => sum + value, 0);

  if (total !== 100) rounded[0] += 100 - total;
  return rounded;
}

function normalizeWeightsToRatios(beans: EspressoBean[], weights: number[]) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return cleanRatios(beans.map(() => 100 / beans.length));

  const base = weights.map((value) => (value / total) * 100);
  const minimum = beans.length >= 4 ? 10 : 15;
  return cleanRatios(base.map((value) => Math.max(minimum, value)));
}

function capRobustaShare(
  beans: EspressoBean[],
  ratios: number[],
  preferences: BlendPreferences,
) {
  const robustaIndexes = beans
    .map((bean, index) => (bean.family === "robusta" ? index : -1))
    .filter((index) => index >= 0);

  if (robustaIndexes.length === 0 || robustaIndexes.length === beans.length) return ratios;

  const cap = preferences.profileId === "crema" || preferences.profileId === "strong" ? 40 : 25;
  const robustaTotal = robustaIndexes.reduce((sum, index) => sum + (ratios[index] ?? 0), 0);
  if (robustaTotal <= cap) return ratios;

  const next = [...ratios];
  robustaIndexes.forEach((index) => {
    next[index] = Math.max(10, Math.round(((next[index] ?? 0) / robustaTotal * cap) / 5) * 5);
  });

  const arabicaIndexes = beans
    .map((bean, index) => (bean.family === "arabica" ? index : -1))
    .filter((index) => index >= 0);
  const arabicaTotal = arabicaIndexes.reduce((sum, index) => sum + (next[index] ?? 0), 0);
  const remaining = 100 - robustaIndexes.reduce((sum, index) => sum + (next[index] ?? 0), 0);

  arabicaIndexes.forEach((index) => {
    next[index] = Math.round(((next[index] ?? 0) / Math.max(1, arabicaTotal) * remaining) / 5) * 5;
  });

  return cleanRatios(next);
}

export function suggestSmartRatios(
  beans: EspressoBean[],
  preferences: BlendPreferences,
  adjustment?: BlendAdjustmentId | null,
): BlendRatio[] {
  if (beans.length === 0) return [];
  if (beans.length === 1) return [{ beanId: beans[0].id, percent: 100 }];

  const ordered = beans
    .map((bean, index) => ({
      bean,
      index,
      weight: beanWeight(bean, preferences, adjustment),
    }))
    .sort((a, b) => b.weight - a.weight);

  const capped = capRobustaShare(
    ordered.map((entry) => entry.bean),
    normalizeWeightsToRatios(
      ordered.map((entry) => entry.bean),
      ordered.map((entry) => entry.weight),
    ),
    preferences,
  );

  return ordered
    .map((entry, orderIndex) => ({
      beanId: entry.bean.id,
      index: entry.index,
      percent: capped[orderIndex] ?? 0,
    }))
    .sort((a, b) => a.index - b.index)
    .map(({ beanId, percent }) => ({ beanId, percent }));
}

export function calculateBlendMetrics(
  beans: EspressoBean[],
  ratios: BlendRatio[],
): EspressoMetrics | null {
  if (beans.length === 0 || ratios.length === 0) return null;

  const byId = new Map(ratios.map((ratio) => [ratio.beanId, ratio.percent]));
  const totals: EspressoMetrics = {
    body: 0,
    crema: 0,
    acidity: 0,
    chocolate: 0,
    sweetness: 0,
    strength: 0,
  };

  beans.forEach((bean) => {
    const weight = Math.max(0, byId.get(bean.id) ?? 0) / 100;
    (Object.keys(totals) as EspressoMetricKey[]).forEach((metric) => {
      totals[metric] += bean.metrics[metric] * weight;
    });
  });

  return {
    body: roundMetric(totals.body),
    crema: roundMetric(totals.crema),
    acidity: roundMetric(totals.acidity),
    chocolate: roundMetric(totals.chocolate),
    sweetness: roundMetric(totals.sweetness),
    strength: roundMetric(totals.strength),
  };
}

export function calculatePricePerKg(beans: EspressoBean[], ratios: BlendRatio[]) {
  const byId = new Map(ratios.map((ratio) => [ratio.beanId, ratio.percent]));
  return beans.reduce((sum, bean) => sum + bean.salePrice * Math.max(0, byId.get(bean.id) ?? 0) / 100, 0);
}

function ratioTotal(ratios: BlendRatio[]) {
  return ratios.reduce((sum, ratio) => sum + ratio.percent, 0);
}

function robustaShare(beans: EspressoBean[], ratios: BlendRatio[]) {
  const byId = new Map(ratios.map((ratio) => [ratio.beanId, ratio.percent]));
  return beans
    .filter((bean) => bean.family === "robusta")
    .reduce((sum, bean) => sum + Math.max(0, byId.get(bean.id) ?? 0), 0);
}

export function analyzeBlend({
  beans,
  ratios,
  preferences,
  manualMode,
}: {
  beans: EspressoBean[];
  ratios: BlendRatio[];
  preferences: BlendPreferences;
  manualMode: boolean;
}): BlendAnalysis {
  if (beans.length === 0) {
    return {
      tone: "neutral",
      message: {
        en: "Select beans to start your blend.",
        ar: "اختر الحبوب لبدء التوليفة.",
      },
    };
  }

  const total = ratioTotal(ratios);
  if (manualMode && Math.round(total * 10) / 10 !== 100) {
    return {
      tone: "warning",
      message: {
        en: "Manual ratios must total exactly 100% before this blend can be added.",
        ar: "يجب أن يكون مجموع النسب اليدوية 100% بالضبط قبل إضافة التوليفة.",
      },
    };
  }

  const pricePerKg = calculatePricePerKg(beans, ratios);
  if (preferences.budgetAware && pricePerKg > BUDGET_TARGET_PER_KG) {
    return {
      tone: "warning",
      message: {
        en: "This blend is expensive. Budget-aware suggestions will stay closer to a calmer price.",
        ar: "هذه التوليفة مرتفعة التكلفة. الاقتراح الاقتصادي سيحافظ على سعر أهدأ.",
      },
    };
  }

  const metrics = calculateBlendMetrics(beans, ratios);
  const robusta = robustaShare(beans, ratios);

  if (robusta > 35 && preferences.profileId !== "crema" && preferences.profileId !== "strong") {
    return {
      tone: "warning",
      message: {
        en: "Robusta is high; it may give more crema and strength, but can increase bitterness.",
        ar: "نسبة الروبوستا مرتفعة؛ قد تمنحك كريما وقوة أعلى، لكنها قد تزيد المرارة.",
      },
    };
  }

  if (metrics && metrics.acidity >= 4) {
    return {
      tone: "neutral",
      message: {
        en: "Acidity is noticeable in this blend. Good for a brighter, fruitier espresso.",
        ar: "الحموضة واضحة في هذه التوليفة. مناسبة لمن يحب الطابع الفاكهي والمشرق.",
      },
    };
  }

  if (metrics && metrics.crema < 3) {
    return {
      tone: "warning",
      message: {
        en: "Crema may be lower than expected. Add a small Robusta percentage to improve it.",
        ar: "الكريما قد تكون أقل من المتوقع. أضف نسبة روبوستا بسيطة لتحسينها.",
      },
    };
  }

  return {
    tone: "good",
    message: {
      en: "This blend is balanced, with good crema and body for espresso and milk drinks.",
      ar: "هذه التوليفة متوازنة، بكريما جيدة وقوام مناسب للإسبريسو والمشروبات اللبنية.",
    },
  };
}

function scoreBlend(
  beans: EspressoBean[],
  ratios: BlendRatio[],
  preferences: BlendPreferences,
) {
  const profile = getProfile(preferences.profileId);
  const metrics = calculateBlendMetrics(beans, ratios);
  if (!metrics) return -Infinity;

  const distance = (Object.keys(profile.target) as EspressoMetricKey[]).reduce((sum, metric) => {
    const weight = profile.weights[metric] ?? 0.7;
    return sum + Math.abs(metrics[metric] - profile.target[metric]) * weight;
  }, 0);
  const price = calculatePricePerKg(beans, ratios);
  const arabicaCount = beans.filter((bean) => bean.family === "arabica").length;
  const robustaCount = beans.length - arabicaCount;
  const diversityBonus = beans.length === 3 ? 0.65 : beans.length === 4 ? 0.35 : 0.2;
  const familyBonus = robustaCount > 0 && arabicaCount > 0 && profile.id !== "bright" ? 0.45 : 0;
  const budgetPenalty = preferences.budgetAware ? Math.max(0, (price - 650) / 600) : 0;

  return 12 - distance + diversityBonus + familyBonus - budgetPenalty;
}

export function evaluateBlendHealth({
  beans,
  ratios,
  preferences,
  manualMode,
}: {
  beans: EspressoBean[];
  ratios: BlendRatio[];
  preferences: BlendPreferences;
  manualMode: boolean;
}): BlendHealth {
  if (beans.length === 0) {
    return {
      score: 0,
      tone: "neutral",
      label: { en: "No Blend Yet", ar: "لا توجد توليفة بعد" },
      detail: {
        en: "Select two or three beans to let the studio evaluate the recipe.",
        ar: "اختر نوعين أو ثلاثة من الحبوب ليبدأ الاستوديو في تقييم التوليفة.",
      },
    };
  }

  const profile = getProfile(preferences.profileId);
  const metrics = calculateBlendMetrics(beans, ratios);
  const total = ratioTotal(ratios);
  const robusta = robustaShare(beans, ratios);
  const pricePerKg = calculatePricePerKg(beans, ratios);
  let score = 100;

  if (manualMode) {
    const totalGap = Math.abs(total - 100);
    if (totalGap > 0.1) score -= Math.min(35, 15 + totalGap * 1.1);
  }

  if (beans.length === 1) score -= 14;
  if (beans.length === 2) score -= 3;
  if (beans.length === 3) score += 3;
  if (beans.length > 4) score -= 12;

  const allowedRobusta = preferences.profileId === "crema" || preferences.profileId === "strong" ? 45 : 30;
  if (robusta > allowedRobusta) score -= Math.min(22, (robusta - allowedRobusta) * 1.25);
  if (robusta > 55) score -= 10;

  if (metrics) {
    const distance = (Object.keys(profile.target) as EspressoMetricKey[]).reduce((sum, metric) => {
      const weight = profile.weights[metric] ?? 0.65;
      return sum + Math.abs(metrics[metric] - profile.target[metric]) * weight;
    }, 0);

    score -= Math.min(24, distance * 3.4);
    if (metrics.acidity >= 4.1 && preferences.profileId !== "bright") score -= 9;
    if (metrics.crema < 3 && preferences.profileId !== "bright") score -= 7;
    if (metrics.body < 3 && preferences.body === "full") score -= 8;
  }

  if (preferences.budgetAware && pricePerKg > BUDGET_TARGET_PER_KG) score -= 7;

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  if (normalizedScore >= 90) {
    return {
      score: normalizedScore,
      tone: "good",
      label: { en: "Excellent Blend", ar: "توليفة ممتازة" },
      detail: {
        en: "The recipe has strong harmony, balanced ratios, and a confident espresso profile.",
        ar: "التوليفة متناغمة بقوة، بنسب متوازنة وشخصية إسبريسو واثقة.",
      },
    };
  }

  if (normalizedScore >= 78) {
    return {
      score: normalizedScore,
      tone: "good",
      label: { en: "Balanced Blend", ar: "توليفة متوازنة" },
      detail: {
        en: "The blend reads balanced and should feel smooth with clear body and crema.",
        ar: "التوليفة تبدو متوازنة ومتوقع أن تعطي قواما ناعما وكريما واضحة.",
      },
    };
  }

  return {
    score: normalizedScore,
    tone: "warning",
    label: { en: "Needs Improvement", ar: "تحتاج تحسين" },
    detail: {
      en: "The studio sees room to improve harmony, ratio balance, or intensity.",
      ar: "الاستوديو يرى فرصة لتحسين التناغم أو توازن النسب أو شدة الطعم.",
    },
  };
}

type RecommendationCandidate = {
  beans: EspressoBean[];
  ratios: BlendRatio[];
  score: number;
  pricePerKg: number;
};

function getCombinations<T>(items: T[], size: number) {
  const results: T[][] = [];

  function walk(start: number, picked: T[]) {
    if (picked.length === size) {
      results.push(picked);
      return;
    }

    for (let index = start; index < items.length; index += 1) {
      walk(index + 1, [...picked, items[index]]);
    }
  }

  walk(0, []);
  return results;
}

export function recommendSuggestedBlend(
  preferences: BlendPreferences,
): {
  beans: EspressoBean[];
  ratios: BlendRatio[];
  pricePerKg: number;
  profile: BlendProfile;
} {
  const candidates = espressoBeans.filter((bean) => !preferences.arabicaOnly || bean.family === "arabica");
  const profile = getProfile(preferences.profileId);
  const combos = [2, 3, 4].flatMap((size) => getCombinations(candidates, size));
  let best: RecommendationCandidate | undefined;

  for (const beans of combos) {
    const ratios = suggestSmartRatios(beans, preferences);
    const pricePerKg = calculatePricePerKg(beans, ratios);
    if (preferences.budgetAware && pricePerKg > BUDGET_TARGET_PER_KG) continue;
    const score = scoreBlend(beans, ratios, preferences);
    if (!best || score > best.score) best = { beans, ratios, score, pricePerKg };
  }

  const fallbackBeans = candidates.slice(0, 3);
  const selected = best;
  const beans = selected ? selected.beans : fallbackBeans;
  const ratios = selected ? selected.ratios : suggestSmartRatios(beans, preferences);

  return {
    beans,
    ratios,
    pricePerKg: selected ? selected.pricePerKg : calculatePricePerKg(beans, ratios),
    profile,
  };
}

export function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function isValidManualTotal(ratios: BlendRatio[]) {
  return Math.abs(ratioTotal(ratios) - 100) < Number.EPSILON * 100;
}
