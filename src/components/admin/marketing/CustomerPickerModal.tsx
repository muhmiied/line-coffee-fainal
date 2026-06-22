"use client";

import { useState, useEffect } from "react";
import { Search, X, MessageSquare, Mail, Check, Users } from "lucide-react";
import { ADMIN_CUSTOMERS, getSegments } from "@/lib/mock-data/admin/customers-mock";

interface Props {
  open: boolean;
  onClose: () => void;
  mode: "select" | "send";
  promoCode?: string;
  selectedIds: string[];
  onConfirm?: (ids: string[]) => void;
}

export default function CustomerPickerModal({ open, onClose, mode, promoCode, selectedIds, onConfirm }: Props) {
  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState<"all" | "registered" | "guest">("all");
  const [localSel, setLocalSel]       = useState<string[]>([]);

  useEffect(() => { setLocalSel(selectedIds); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!open) { setSearch(""); setTypeFilter("all"); } }, [open]);

  const displayed = ADMIN_CUSTOMERS.filter(c => {
    if (typeFilter === "registered" && c.type !== "registered") return false;
    if (typeFilter === "guest" && c.type !== "guest") return false;
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email ?? "").toLowerCase().includes(q);
  });

  const toggle = (id: string) =>
    setLocalSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 admin-surface rounded-xl border border-[#2a2018] flex flex-col mx-4"
        style={{ width: "min(680px, 95vw)", maxHeight: "82vh" }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2018]">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-[#b6885e]" />
            <span className="text-sm font-medium text-[#f5e6d8]">
              {mode === "select" ? "Select Customers" : "Send to Customers"}
            </span>
            {mode === "send" && promoCode && (
              <span className="text-xs bg-[#15100b] border border-[#2a2018] rounded px-2 py-0.5 text-[#b6885e] font-mono">
                {promoCode}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-[#b79b85] hover:text-[#f5e6d8]">
            <X size={15} />
          </button>
        </div>

        {/* search + filter */}
        <div className="px-4 py-2.5 border-b border-[#2a2018] flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b5744]" />
            <input
              type="text"
              placeholder="Search name, phone, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#15100b] border border-[#2a2018] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#f5e6d8] placeholder-[#4a3828] outline-none focus:border-[#b6885e] transition-colors"
            />
          </div>
          {(["all", "registered", "guest"] as const).map(t => (
            <button
              key={t} type="button"
              onClick={() => setTypeFilter(t)}
              aria-pressed={typeFilter === t ? "true" : "false"}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors flex-shrink-0 ${
                typeFilter === t
                  ? "bg-[#b6885e]/15 border-[#b6885e] text-[#b6885e]"
                  : "border-[#2a2018] text-[#b79b85] hover:border-[#b6885e]/40"
              }`}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* list */}
        <div className="overflow-y-auto flex-1 admin-scrollbar">
          {displayed.length === 0 ? (
            <p className="py-10 text-center text-xs text-[#6b5744]">No customers match your search.</p>
          ) : displayed.map(c => {
            const segs = getSegments(c);
            const phone = c.whatsapp.replace(/\D/g, "");
            const waText = promoCode
              ? encodeURIComponent(`مرحبًا ${c.name}،\nعندك كود خصم خاص من Line Coffee 🎁\nالكود: ${promoCode}\nاطلب الآن على linecoffee.eg`)
              : "";
            const isSelected = localSel.includes(c.id);

            return (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-2.5 border-b border-[#1b140f] hover:bg-[#15100b] transition-colors ${isSelected ? "bg-[#1b140f]" : ""}`}
              >
                {/* checkbox (select mode) */}
                {mode === "select" && (
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      isSelected ? "bg-[#b6885e] border-[#b6885e]" : "border-[#4a3828] hover:border-[#b6885e]/60"
                    }`}
                  >
                    {isSelected && <Check size={9} className="text-[#0b0806]" />}
                  </button>
                )}

                {/* avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-[#0b0806] ${
                    c.type === "guest" ? "bg-[#6b5744]" : "bg-[#b6885e]"
                  }`}
                >
                  {c.name.charAt(0)}
                </div>

                {/* info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-[#f5e6d8] truncate">{c.name}</span>
                    <span className="text-[10px] text-[#4a3828]">{c.id}</span>
                    {c.type === "guest" && (
                      <span className="text-[9px] bg-[#2a2018] text-[#6b5744] px-1.5 py-0.5 rounded-full">Guest</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#b79b85]">{c.phone}</span>
                    {segs.slice(0, 2).map(s => (
                      <span key={s} className="text-[9px] bg-[#1b140f] text-[#b6885e] border border-[#2a2018] px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a
                    href={`https://wa.me/${phone}${waText ? `?text=${waText}` : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center transition-colors"
                    title="Send via WhatsApp"
                  >
                    <MessageSquare size={12} className="text-[#25D366]" />
                  </a>
                  {c.email && (
                    <a
                      href={`mailto:${c.email}${promoCode ? `?subject=كود خصم من Line Coffee&body=مرحبًا ${c.name}، كود الخصم الخاص بك: ${promoCode}` : ""}`}
                      className="w-7 h-7 rounded-lg bg-[#b6885e]/10 hover:bg-[#b6885e]/20 border border-[#b6885e]/30 flex items-center justify-center transition-colors"
                      title="Send via Email"
                    >
                      <Mail size={12} className="text-[#b6885e]" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* footer (select mode) */}
        {mode === "select" && (
          <div className="px-4 py-3 border-t border-[#2a2018] flex items-center justify-between">
            <span className="text-xs text-[#b79b85]">{localSel.length} selected</span>
            <div className="flex items-center gap-2">
              <button
                type="button" onClick={onClose}
                className="px-3 py-1.5 text-xs border border-[#2a2018] text-[#b79b85] rounded-lg hover:border-[#b6885e]/40 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { onConfirm?.(localSel); onClose(); }}
                className="px-3 py-1.5 text-xs bg-[#b6885e] hover:bg-[#d6a373] text-[#0b0806] font-semibold rounded-lg transition-colors"
              >
                Confirm ({localSel.length})
              </button>
            </div>
          </div>
        )}

        {/* footer (send mode) */}
        {mode === "send" && (
          <div className="px-4 py-3 border-t border-[#2a2018]">
            <p className="text-[10px] text-[#6b5744]">
              Click WA / Email icons to send the promo code to individual customers. Registered customers with email can also receive by email.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
