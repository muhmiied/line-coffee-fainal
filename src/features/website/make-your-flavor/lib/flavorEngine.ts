import type { FlavorBase, FlavorItem, FlavorMetricKey, FlavorMetrics } from "../data/flavorData";

// ─── Pricing ──────────────────────────────────────────────────────────────────

export function computePricePerKg(
  base: FlavorBase | null,
  flavors: FlavorItem[],
): number {
  if (!base) return 0;
  return base.pricePerKg + flavors.reduce((sum, f) => sum + f.addOnPerKg, 0);
}

// ─── Mix metrics (averaged across selected flavors) ───────────────────────────

export function computeMixMetrics(flavors: FlavorItem[]): FlavorMetrics | null {
  if (flavors.length === 0) return null;
  const n = flavors.length;
  const avg = (key: FlavorMetricKey) =>
    Math.round((flavors.reduce((s, f) => s + f.metrics[key], 0) / n) * 10) / 10;
  return {
    sweetness:  avg("sweetness"),
    creaminess: avg("creaminess"),
    chocolate:  avg("chocolate"),
    fruitiness: avg("fruitiness"),
    nutty:      avg("nutty"),
    intensity:  avg("intensity"),
  };
}

// ─── Balance bar (0–5, computed for the mix, not per-flavor) ─────────────────

export function computeBalance(flavors: FlavorItem[]): number {
  if (flavors.length === 0) return 0;
  const n = flavors.length;
  const dims = [
    flavors.reduce((s, f) => s + f.metrics.chocolate,  0) / n,
    flavors.reduce((s, f) => s + f.metrics.fruitiness, 0) / n,
    flavors.reduce((s, f) => s + f.metrics.nutty,      0) / n,
    flavors.reduce((s, f) => s + f.metrics.creaminess, 0) / n,
  ];
  const max = Math.max(...dims);
  const mean = dims.reduce((s, v) => s + v, 0) / dims.length;
  // dominance ratio: 1 = perfectly even, higher = one dim dominates
  const dominance = mean > 0 ? max / mean : 1;
  // Balance 0–5: less dominance → higher balance
  const balance = Math.max(0, Math.min(5, 5 - (dominance - 1) * 1.8));
  return Math.round(balance * 10) / 10;
}

// ─── Mix score (0–100) ────────────────────────────────────────────────────────

export function computeMixScore(
  flavors: FlavorItem[],
  base: FlavorBase | null,
): number {
  if (!base || flavors.length === 0) return 0;

  const n = flavors.length;
  const avg = (key: FlavorMetricKey) =>
    flavors.reduce((s, f) => s + f.metrics[key], 0) / n;

  const avgSweetness  = avg("sweetness");
  const avgIntensity  = avg("intensity");
  const avgChocolate  = avg("chocolate");
  const avgFruitiness = avg("fruitiness");
  const avgNutty      = avg("nutty");
  const avgCreaminess = avg("creaminess");

  let score = 50;

  // Bonus per flavor selected (max +20 for 4 flavors)
  score += n * 5;

  // Diversity bonus — how many flavor dimensions are "active" (>1.5)
  const activeDims = [avgChocolate, avgFruitiness, avgNutty, avgCreaminess].filter(
    (v) => v > 1.5,
  ).length;
  score += activeDims * 4; // max +16

  // Cross-dimension bonus: 2+ active dimensions working together
  if (activeDims >= 2) score += 6;

  // Penalty: excessive sweetness
  if (avgSweetness > 4.4)      score -= 14;
  else if (avgSweetness > 4.0) score -= 7;

  // Penalty: excessive intensity
  if (avgIntensity > 4.4)      score -= 12;
  else if (avgIntensity > 4.0) score -= 6;

  // Penalty: mono-direction (one dimension >> everything else)
  const dims = [avgChocolate, avgFruitiness, avgNutty, avgCreaminess];
  const maxDim = Math.max(...dims);
  if (maxDim > 4.2 && n >= 2) {
    const uniqueCategories = new Set(flavors.map((f) => f.category)).size;
    score -= uniqueCategories === 1 ? 12 : 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Mix health label ─────────────────────────────────────────────────────────

export type MixHealthTone = "good" | "warning" | "neutral";

export type MixHealth = {
  score: number;
  label: { en: string; ar: string };
  detail: { en: string; ar: string };
  tone: MixHealthTone;
};

export function getMixHealth(score: number): MixHealth {
  if (score >= 85) {
    return {
      score,
      label: { en: "Excellent Mix",  ar: "خلطة ممتازة"   },
      detail: { en: "Well-balanced flavors with great depth.", ar: "نكهات متوازنة بعمق رائع." },
      tone: "good",
    };
  }
  if (score >= 65) {
    return {
      score,
      label: { en: "Balanced Mix",   ar: "خلطة متوازنة"  },
      detail: { en: "Good combination — try adding one more flavor for extra depth.", ar: "تركيبة جيدة — جرب إضافة نكهة أخرى لمزيد من العمق." },
      tone: "good",
    };
  }
  return {
    score,
    label: { en: "Needs Balance",  ar: "تحتاج توازن"   },
    detail: { en: "Consider mixing different flavor families for better balance.", ar: "فكر في دمج نكهات من فئات مختلفة لتوازن أفضل." },
    tone: "warning",
  };
}

// ─── Smart comment ────────────────────────────────────────────────────────────

export type AnalysisResult = {
  message: { en: string; ar: string };
  tone: MixHealthTone;
};

export function analyzeFlavorMix(
  flavors: FlavorItem[],
  base: FlavorBase | null,
): AnalysisResult {
  if (!base) {
    return {
      message: { en: "Select a base to start building your custom mix.", ar: "اختر قاعدة لبدء تكوين خلطتك المخصصة." },
      tone: "neutral",
    };
  }
  if (flavors.length === 0) {
    return {
      message: { en: "Pick at least one flavor to create your mix.", ar: "اختر نكهة واحدة على الأقل لتكوين خلطتك." },
      tone: "neutral",
    };
  }

  const n = flavors.length;
  const avg = (key: FlavorMetricKey) =>
    flavors.reduce((s, f) => s + f.metrics[key], 0) / n;

  const avgSweetness  = avg("sweetness");
  const avgFruitiness = avg("fruitiness");
  const avgChocolate  = avg("chocolate");
  const avgNutty      = avg("nutty");
  const avgCreaminess = avg("creaminess");
  const avgIntensity  = avg("intensity");

  // Warning conditions first
  if (avgSweetness > 4.3 && avgIntensity > 3.8) {
    return {
      message: { en: "Very sweet and intense — consider a neutral or nutty flavor to balance it out.", ar: "حلو جداً وقوي — فكر في إضافة نكهة محايدة أو مكسرات للتوازن." },
      tone: "warning",
    };
  }
  if (avgSweetness > 4.3) {
    return {
      message: { en: "Rich and sweet — try a nut or coffee flavor to add depth.", ar: "غني وحلو — جرب مكسرات أو نكهة قهوة لإضافة عمق." },
      tone: "warning",
    };
  }
  if (avgIntensity > 4.3) {
    return {
      message: { en: "Bold intensity — pairs best with a strong base like Turkish Coffee.", ar: "نكهة قوية جداً — تتناسب أكثر مع قاعدة قوية كالتركي." },
      tone: "warning",
    };
  }

  // Positive direction comments
  if (avgFruitiness > 3.5 && avgCreaminess > 2) {
    return {
      message: { en: "Fresh and creamy fruity blend — a refreshing signature mix.", ar: "خلطة فاكهية منعشة وكريمية — توقيع مميز." },
      tone: "good",
    };
  }
  if (avgFruitiness > 3.5) {
    return {
      message: { en: "Fresh and vibrant fruity blend — pairs beautifully with a light base.", ar: "خلطة فاكهية منعشة وحيوية — تتناسب مع قاعدة خفيفة." },
      tone: "good",
    };
  }
  if (avgChocolate > 3.5 && avgNutty > 2) {
    return {
      message: { en: "Chocolate and nuts — a timeless premium pairing.", ar: "شوكولاتة ومكسرات — تركيبة فاخرة خالدة." },
      tone: "good",
    };
  }
  if (avgChocolate > 3.5) {
    return {
      message: { en: "Deep chocolate-forward mix — an indulgent choice.", ar: "خلطة شوكولاتة غنية — خيار مدلل بامتياز." },
      tone: "good",
    };
  }
  if (avgNutty > 3.5) {
    return {
      message: { en: "Warm and nutty mix — perfect for a cozy afternoon.", ar: "خلطة مكسرات دافئة — مثالية لاستراحة بعد الظهر." },
      tone: "good",
    };
  }
  if (avgCreaminess > 3.5) {
    return {
      message: { en: "Smooth and creamy mix — a velvety dessert experience.", ar: "خلطة ناعمة وكريمية — تجربة حلوى مخملية." },
      tone: "good",
    };
  }

  // Generic good
  return {
    message: { en: "Well-rounded mix with great flavor depth and balance.", ar: "خلطة متكاملة بعمق نكهات رائع وتوازن ممتاز." },
    tone: "good",
  };
}
