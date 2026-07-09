// Egyptian mobile-number validation + normalization.
//
// Valid Egyptian mobiles are 11 digits: `01` + operator digit (0/1/2/5) + 8
// digits, e.g. 01012345678. We accept common written forms (spaces, dashes,
// +20 / 0020 / 20 international prefixes, or a missing leading 0) and normalize
// them to the canonical local `0XXXXXXXXXX` form.

const EGYPTIAN_MOBILE_RE = /^01[0125]\d{8}$/;

/**
 * Normalize a raw phone input to canonical `0XXXXXXXXXX`, or `null` if it is not
 * a valid Egyptian mobile number.
 */
export function normalizeEgyptianPhone(raw: string | null | undefined): string | null {
  let digits = (raw ?? "").replace(/\D/g, "");

  // Strip international prefixes down to the local form.
  if (digits.startsWith("0020")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("20") && digits.length === 12) {
    digits = digits.slice(2);
  }

  // A 10-digit number starting with 1 is missing its leading 0.
  if (digits.length === 10 && digits.startsWith("1")) {
    digits = `0${digits}`;
  }

  return EGYPTIAN_MOBILE_RE.test(digits) ? digits : null;
}

/** True when `raw` is a recognizable Egyptian mobile number. */
export function isValidEgyptianPhone(raw: string | null | undefined): boolean {
  return normalizeEgyptianPhone(raw) !== null;
}
