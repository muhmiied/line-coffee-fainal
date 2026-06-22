"use client";

import { useMemo, useState } from "react";
import { Check, Mail, MessageSquare, Search, Users, X } from "lucide-react";
import {
  ADMIN_CUSTOMERS,
  getSegments,
  type AdminCustomer,
  type CustomerSegment,
} from "@/lib/mock-data/admin/customers-mock";

type CustomerPickerFilter = "all" | "guest" | "registered" | CustomerSegment;

interface Props {
  open: boolean;
  onClose: () => void;
  mode: "select" | "send";
  promoCode?: string;
  selectedIds: string[];
  onConfirm?: (ids: string[]) => void;
}

const FILTERS: { key: CustomerPickerFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "guest", label: "Guest" },
  { key: "registered", label: "Registered" },
  { key: "vip", label: "VIP" },
  { key: "repeat", label: "Repeat" },
  { key: "new", label: "New" },
  { key: "inactive", label: "Inactive" },
  { key: "at-risk", label: "At Risk" },
  { key: "wholesale-potential", label: "Wholesale" },
];

const SEGMENT_LABEL: Record<CustomerSegment, string> = {
  vip: "VIP",
  repeat: "Repeat",
  new: "New",
  inactive: "Inactive",
  "at-risk": "At Risk",
  "wholesale-potential": "Wholesale",
};

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function buildWhatsAppHref(customer: AdminCustomer, promoCode?: string) {
  const phone = normalizePhone(customer.whatsapp || customer.phone);
  if (!promoCode) return `https://wa.me/${phone}`;

  const message = [
    `مرحبا ${customer.name}،`,
    `عندك كود خصم خاص من Line Coffee: ${promoCode}`,
    "استخدمه في طلبك القادم.",
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function buildEmailHref(customer: AdminCustomer, promoCode?: string) {
  if (!customer.email) return "#";
  if (!promoCode) return `mailto:${customer.email}`;

  const subject = "كود خصم خاص من Line Coffee";
  const body = [
    `مرحبا ${customer.name}،`,
    "",
    `عندك كود خصم خاص من Line Coffee: ${promoCode}`,
    "استخدمه في طلبك القادم.",
  ].join("\n");

  return `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function customerMatchesFilter(customer: AdminCustomer, filter: CustomerPickerFilter) {
  if (filter === "all") return true;
  if (filter === "guest" || filter === "registered") return customer.type === filter;
  return getSegments(customer).includes(filter);
}

export default function CustomerPickerModal({
  open,
  onClose,
  mode,
  promoCode,
  selectedIds,
  onConfirm,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CustomerPickerFilter>("all");

  const displayedCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return ADMIN_CUSTOMERS.filter((customer) => {
      if (!customerMatchesFilter(customer, filter)) return false;
      if (!query) return true;

      return (
        customer.name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        customer.whatsapp.toLowerCase().includes(query) ||
        (customer.email ?? "").toLowerCase().includes(query)
      );
    });
  }, [filter, search]);

  const toggleCustomer = (id: string) => {
    const nextSelection = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    onConfirm?.(nextSelection);
  };

  const handleClose = () => {
    setSearch("");
    setFilter("all");
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center px-3"
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative z-10 admin-surface flex max-h-[84vh] w-full max-w-[760px] flex-col overflow-hidden rounded-xl border border-[#2a2018]"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "select" ? "Select customers" : "Send promo code to customers"}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#2a2018] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Users size={15} className="text-[#b6885e]" />
            <span className="truncate text-sm font-medium text-[#f5e6d8]">
              {mode === "select" ? "Select Customers" : "Send to Customers"}
            </span>
            {mode === "send" && promoCode && (
              <span className="rounded border border-[#2a2018] bg-[#15100b] px-2 py-0.5 font-mono text-xs text-[#b6885e]">
                {promoCode}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[#b79b85] transition-colors hover:bg-white/5 hover:text-[#f5e6d8]"
            aria-label="Close customer picker"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-2.5 border-b border-[#2a2018] px-4 py-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b5744]" />
            <input
              type="text"
              placeholder="Search name, phone, WhatsApp, email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-[#2a2018] bg-[#15100b] py-2 pl-8 pr-3 text-xs text-[#f5e6d8] outline-none transition-colors placeholder:text-[#4a3828] focus:border-[#b6885e]"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {FILTERS.map((item) => {
              const active = filter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  aria-pressed={active}
                  className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                    active
                      ? "border-[#b6885e] bg-[#b6885e]/15 text-[#b6885e]"
                      : "border-[#2a2018] text-[#b79b85] hover:border-[#b6885e]/40"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="admin-scrollbar flex-1 overflow-y-auto">
          {displayedCustomers.length === 0 ? (
            <p className="py-10 text-center text-xs text-[#6b5744]">No customers match this search.</p>
          ) : (
            displayedCustomers.map((customer) => {
              const segments = getSegments(customer);
              const selected = selectedIds.includes(customer.id);

              return (
                <div
                  key={customer.id}
                  className={`flex items-center gap-3 border-b border-[#1b140f] px-4 py-3 transition-colors hover:bg-[#15100b] ${
                    selected ? "bg-[#1b140f]" : ""
                  }`}
                >
                  {mode === "select" && (
                    <button
                      type="button"
                      onClick={() => toggleCustomer(customer.id)}
                      className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded border transition-colors ${
                        selected
                          ? "border-[#b6885e] bg-[#b6885e]"
                          : "border-[#4a3828] hover:border-[#b6885e]/60"
                      }`}
                      aria-label={`Select ${customer.name}`}
                      aria-pressed={selected}
                    >
                      {selected && <Check size={11} className="text-[#0b0806]" />}
                    </button>
                  )}

                  <div
                    className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-[11px] font-bold text-[#0b0806] ${
                      customer.type === "guest" ? "bg-[#6b5744]" : "bg-[#b6885e]"
                    }`}
                    aria-hidden="true"
                  >
                    {customer.name.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-[#f5e6d8]">{customer.name}</span>
                      <span className="font-mono text-[10px] text-[#4a3828]">{customer.id}</span>
                      <span className="rounded-full bg-[#2a2018] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[#8b735b]">
                        {customer.type}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-[#b79b85]">{customer.phone}</span>
                      {customer.email && <span className="text-[10px] text-[#6b5744]">{customer.email}</span>}
                      {segments.slice(0, 3).map((segment) => (
                        <span
                          key={segment}
                          className="rounded-full border border-[#2a2018] bg-[#1b140f] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[#b6885e]"
                        >
                          {SEGMENT_LABEL[segment]}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <a
                      href={buildWhatsAppHref(customer, promoCode)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 transition-colors hover:bg-[#25D366]/20"
                      title="Send via WhatsApp"
                      aria-label={`Send WhatsApp to ${customer.name}`}
                    >
                      <MessageSquare size={13} className="text-[#25D366]" />
                    </a>
                    {customer.email && (
                      <a
                        href={buildEmailHref(customer, promoCode)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[#b6885e]/30 bg-[#b6885e]/10 transition-colors hover:bg-[#b6885e]/20"
                        title="Send via Email"
                        aria-label={`Send email to ${customer.name}`}
                      >
                        <Mail size={13} className="text-[#b6885e]" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {mode === "select" ? (
          <div className="flex items-center justify-between gap-3 border-t border-[#2a2018] px-4 py-3">
            <span className="text-xs text-[#b79b85]">{selectedIds.length} selected</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-[#2a2018] px-3 py-1.5 text-xs text-[#b79b85] transition-colors hover:border-[#b6885e]/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                }}
                className="rounded-lg bg-[#b6885e] px-3 py-1.5 text-xs font-semibold text-[#0b0806] transition-colors hover:bg-[#d6a373]"
              >
                Confirm ({selectedIds.length})
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-[#2a2018] px-4 py-3">
            <p className="text-[10px] text-[#6b5744]">
              WhatsApp and email buttons open prepared mock messages for individual customers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
