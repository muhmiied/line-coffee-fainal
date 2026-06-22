export type Locale = "ar" | "en";

export type Direction = "rtl" | "ltr";

export type LocalizedText = {
  ar: string;
  en: string;
};

export type BilingualFields<
  FieldName extends string,
  Value = string,
> = Record<`${FieldName}_ar` | `${FieldName}_en`, Value>;

export const localeDirections: Record<Locale, Direction> = {
  ar: "rtl",
  en: "ltr",
};

export const defaultLocale: Locale = "en";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "ar" || value === "en";
}

export function normalizeLocale(
  value: string | null | undefined,
  fallback: Locale = defaultLocale,
): Locale {
  return isLocale(value) ? value : fallback;
}

export function getLocaleDirection(locale: Locale): Direction {
  return localeDirections[locale];
}

export function createLocalizedText(ar: string, en: string): LocalizedText {
  return { ar, en };
}

export function getLocalizedText(
  text: LocalizedText | null | undefined,
  locale: Locale,
  fallback = "",
): string {
  if (!text) {
    return fallback;
  }

  return text[locale] || text.en || text.ar || fallback;
}

export function getLocalizedField(
  source: Record<string, unknown>,
  fieldName: string,
  locale: Locale,
  fallback = "",
): string {
  const localizedValue = source[`${fieldName}_${locale}`];
  const englishValue = source[`${fieldName}_en`];
  const arabicValue = source[`${fieldName}_ar`];
  const value = localizedValue || englishValue || arabicValue;

  return typeof value === "string" ? value : fallback;
}
