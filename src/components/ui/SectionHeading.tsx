"use client";

import { useLanguage, type LocalizedValue } from "@/lib/context/language";
import { cn } from "@/lib/utils/cn";

type SectionHeadingProps = {
  eyebrow: LocalizedValue;
  title: LocalizedValue;
  /**
   * center — centres text + adds mb-14 bottom margin (standalone headings)
   * flush  — centres text, no margin (parent controls spacing)
   * start  — centres on mobile, left-aligns on desktop
   */
  align?: "center" | "flush" | "start";
};

export function SectionHeading({ eyebrow, title, align = "center" }: SectionHeadingProps) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        align === "center" && "mb-12 text-center md:mb-14",
        align === "flush"  && "text-center",
        align === "start"  && "text-center md:text-start",
      )}
    >
      {/* Eyebrow kicker with flanking lines */}
      <div
        className={cn(
          "mb-4 flex items-center gap-3",
          align === "start" ? "justify-center md:justify-start" : "justify-center",
        )}
      >
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#B6885E]/60" />
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#D6A373] md:text-[0.72rem]">
          {t(eyebrow)}
        </span>
        <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#B6885E]/60" />
      </div>

      {/* Main heading — CSS handles Arabic size via .premium-heading-shimmer override */}
      <h2 className="arabic-display premium-heading-shimmer font-serif text-[2.15rem] font-bold leading-[1.16] text-[#F5E6D8] sm:text-[2.5rem] md:text-[3rem]">
        {t(title)}
      </h2>
    </div>
  );
}
