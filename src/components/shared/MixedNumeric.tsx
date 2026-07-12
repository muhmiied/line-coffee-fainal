import type { ReactNode } from "react";

// Splits an already-formatted display string into safe render runs so mixed
// numeric/symbol values (e.g. "100%", "35+", "50 EGP", "72h", "-1.4%") never
// hit a missing glyph in the Arabic display font. Digit runs render with
// .arabic-number (LTR, tabular, brand Arabic font); ASCII letter/symbol runs
// (%, +, EGP, kg, h, g...) render with .numeric-symbol (LTR, safe Latin
// fallback). Arabic text and separators pass through untouched. Purely
// visual — never changes the underlying formatted value.
//
// Uses matchAll with a fresh regex literal (never a shared/mutated stateful
// regex) so this stays a pure render — no external state is touched.
export function MixedNumeric({ text }: { text: string | number | null | undefined }) {
  const str = text === null || text === undefined ? "" : String(text);
  if (!str) return null;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of str.matchAll(/(-?[0-9]+(?:[.,][0-9]+)*)|([A-Za-z%+]+)/g)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push(str.slice(lastIndex, index));
    }
    if (match[1]) {
      parts.push(
        <span key={key++} className="arabic-number">
          {match[1]}
        </span>,
      );
    } else if (match[2]) {
      parts.push(
        <span key={key++} className="numeric-symbol">
          {match[2]}
        </span>,
      );
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < str.length) {
    parts.push(str.slice(lastIndex));
  }

  return <>{parts}</>;
}
