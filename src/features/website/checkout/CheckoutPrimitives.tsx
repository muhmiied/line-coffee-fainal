"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Shared field styling + primitives used across the checkout sections.

export const inputClass =
  "h-11 w-full rounded-xl border border-[#B6885E]/26 bg-[#120D09]/68 px-4 text-sm text-[#F5E6D8] placeholder-[#D6B79A]/28 outline-none shadow-[0_0_12px_rgba(182,136,94,0.08)] transition-all hover:border-[#D6A373]/38 focus:border-[#D6A373]/45 focus:shadow-[0_0_18px_rgba(182,136,94,0.16)] focus:ring-1 focus:ring-[#D6A373]/20";

export const errorClass = "mt-1.5 text-[11px] text-red-400";

export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[#D6B79A]/80">
      {label}
      {required && <span className="ml-1 text-[#D6A373]">*</span>}
    </label>
  );
}

export function CustomSelect({
  value, onChange, options, placeholder, disabled, dir, label,
}: {
  value:       string;
  onChange:    (v: string) => void;
  options:     Array<{ value: string; label: string }>;
  placeholder: string;
  disabled?:   boolean;
  dir:         string;
  /** Accessible name for the listbox trigger (e.g. the field's own label text). */
  label?:      string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref    = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const selectedIndex = options.findIndex((o) => o.value === value);

  const openAt = (index: number) => {
    setOpen(true);
    setActiveIndex(index >= 0 ? index : Math.max(0, selectedIndex));
  };

  const commit = (index: number) => {
    const opt = options[index];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openAt(selectedIndex);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, (i < 0 ? selectedIndex : i) + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, (i < 0 ? selectedIndex : i) - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(activeIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open ? "true" : "false"}
        aria-controls={listId}
        aria-label={label}
        onClick={() => !disabled && (open ? setOpen(false) : openAt(selectedIndex))}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          inputClass,
          "flex items-center justify-between gap-2",
          disabled && "cursor-not-allowed opacity-35",
          !disabled && "cursor-pointer",
        )}
      >
        <span className={cn("truncate text-start text-sm", selected ? "text-[#F5E6D8]" : "text-[#D6B79A]/28")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[#D6A373]/80 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && !disabled && (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 60,
            background: "linear-gradient(135deg,#130E09 0%,#0F0A06 100%)",
            border: "1px solid rgba(214,163,115,0.32)", borderRadius: 14,
            maxHeight: 240, overflowY: "auto",
            boxShadow: "0 16px 48px rgba(0,0,0,0.72), 0 0 0 1px rgba(182,136,94,0.10), 0 0 26px rgba(182,136,94,0.14)",
          }}
        >
          {options.map((opt, index) => {
            const isSel = opt.value === value;
            const isActive = index === activeIndex;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSel ? "true" : "false"}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(index)}
                className="w-full px-4 py-2.5 text-start transition-colors hover:bg-[#D6A373]/[0.08]"
                style={{
                  fontSize: 13,
                  color:      isSel ? "var(--gold)"              : "var(--cream)",
                  background: isActive ? "rgba(182,136,94,0.14)" : isSel ? "rgba(182,136,94,0.08)" : "transparent",
                  fontWeight: isSel ? 600                        : 400,
                  borderLeft:  isSel && dir === "ltr" ? "2px solid var(--gold)" : "none",
                  borderRight: isSel && dir === "rtl" ? "2px solid var(--gold)" : "none",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
