"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  BarChart2,
  Check,
  ChevronRight,
  Copy,
  Edit3,
  Eye,
  Gift,
  Link as LinkIcon,
  Megaphone,
  MessageSquare,
  Pause,
  Percent,
  Play,
  Plus,
  Send,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";
import CustomerPickerModal from "@/components/admin/marketing/CustomerPickerModal";
import {
  ANNOUNCEMENT_MESSAGES,
  OFFERS,
  PROMO_CODES,
  USAGE_RECORDS,
  type AnnouncementAnimation,
  type AnnouncementMessage,
  type AudienceType,
  type CampaignStatus,
  type DiscountType,
  type Offer,
  type OfferStatus,
  type OfferType,
  type PromoCode,
  type PromoStatus,
  type UsageRule,
} from "@/lib/mock-data/admin/marketing-mock";

type ActiveTab = "offers" | "promos" | "announcements" | "performance";
type CampaignKind = "offer" | "promo";
type OperationalFilter = "Active" | "Paused";

const TODAY = new Date("2026-06-22T00:00:00");

const TAB_OPTIONS: { key: ActiveTab; label: string }[] = [
  { key: "offers", label: "Offers" },
  { key: "promos", label: "Promo Codes" },
  { key: "announcements", label: "Announcement Bar" },
  { key: "performance", label: "Performance" },
];

const AUDIENCE_OPTIONS: { value: AudienceType; label: string }[] = [
  { value: "all", label: "All Customers" },
  { value: "vip", label: "VIP" },
  { value: "repeat", label: "Repeat Customers" },
  { value: "new", label: "New Customers" },
  { value: "inactive", label: "Inactive Customers" },
  { value: "at-risk", label: "At Risk Customers" },
  { value: "wholesale-potential", label: "Wholesale Potential" },
  { value: "specific", label: "Specific Customers" },
];

const OFFER_TYPE_OPTIONS: {
  value: OfferType;
  label: string;
  detail: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}[] = [
  { value: "free-shipping", label: "Free Shipping", detail: "Delivery discount by order value or governorate.", icon: Truck },
  { value: "percentage", label: "Percentage Discount", detail: "A percentage off products, categories, or orders.", icon: Percent },
  { value: "fixed", label: "Fixed Amount Discount", detail: "A fixed EGP discount with a minimum order.", icon: Tag },
  { value: "gift", label: "Gift With Order", detail: "A free gift when the order meets a rule.", icon: Gift },
  { value: "first-order", label: "First Order Offer", detail: "A first purchase incentive for new customers.", icon: Sparkles },
];

const ANIMATION_OPTIONS: { value: AnnouncementAnimation; label: string }[] = [
  { value: "slide", label: "Slide" },
  { value: "fade", label: "Fade" },
  { value: "marquee", label: "Marquee" },
];

const STATUS_TONE: Record<CampaignStatus, string> = {
  Active: "border-[#4ade80]/25 bg-[#4ade80]/10 text-[#4ade80]",
  Paused: "border-[#fbbf24]/25 bg-[#fbbf24]/10 text-[#fbbf24]",
  Archived: "border-[#6b5744]/30 bg-[#2a2018] text-[#8b735b]",
};

function fmt(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function money(value: number) {
  return `${fmt(value)} EGP`;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function numberOrZero(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getAudienceLabel(audience: AudienceType) {
  return AUDIENCE_OPTIONS.find((option) => option.value === audience)?.label ?? audience;
}

function getOfferTypeLabel(type: OfferType) {
  return OFFER_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function getDateBadge(startDate: string, endDate: string, status: CampaignStatus) {
  if (status === "Archived") return null;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);
  if (start > TODAY) return "Scheduled";
  if (end < TODAY) return "Expired";
  return null;
}

function hasActiveAnnouncementForOffer(offer: Offer, messages: AnnouncementMessage[]) {
  return messages.some((message) => message.active && (message.relatedOfferId === offer.id || message.id === offer.announcementId));
}

function hasActiveAnnouncementForPromo(code: PromoCode, messages: AnnouncementMessage[]) {
  return messages.some((message) => message.active && (message.relatedPromoId === code.id || message.id === code.announcementId));
}

function buildPromoDiscountLabel(code: PromoCode) {
  return code.type === "percentage" ? `${code.value}%` : money(code.value);
}

function buildOfferValueLabel(offer: Offer) {
  if (offer.offerType === "free-shipping") return "Free shipping";
  if (offer.offerType === "percentage") return `${offer.discountPct ?? 0}%`;
  if (offer.offerType === "fixed" || offer.offerType === "first-order") {
    if (offer.discountPct) return `${offer.discountPct}%`;
    if (offer.discountAmount) return money(offer.discountAmount);
  }
  if (offer.offerType === "gift") return offer.giftName ?? "Gift";
  return getOfferTypeLabel(offer.offerType);
}

function suggestedOfferAnnouncement(offer: Offer) {
  if (offer.offerType === "free-shipping") {
    const amount = offer.minOrder ?? 0;
    return {
      title: `Announcement - ${offer.title.en}`,
      en: `Free delivery on orders above ${amount} EGP.`,
      ar: `شحن مجاني للطلبات فوق ${amount} جنيه.`,
    };
  }

  if (offer.offerType === "percentage") {
    return {
      title: `Announcement - ${offer.title.en}`,
      en: `Get ${offer.discountPct ?? 0}% off with ${offer.title.en}.`,
      ar: `احصل على خصم ${offer.discountPct ?? 0}% مع عرض ${offer.title.ar}.`,
    };
  }

  if (offer.offerType === "fixed" || offer.offerType === "first-order") {
    return {
      title: `Announcement - ${offer.title.en}`,
      en: `Save ${offer.discountAmount ?? 0} EGP on your next Line Coffee order.`,
      ar: `وفر ${offer.discountAmount ?? 0} جنيه على طلبك القادم من Line Coffee.`,
    };
  }

  return {
    title: `Announcement - ${offer.title.en}`,
    en: `${offer.title.en} is now active at Line Coffee.`,
    ar: `${offer.title.ar} متاح الآن في Line Coffee.`,
  };
}

function suggestedPromoAnnouncement(code: PromoCode) {
  return {
    title: `Announcement - ${code.code}`,
    en: `Use code ${code.code} for ${buildPromoDiscountLabel(code)} off your next Line Coffee order.`,
    ar: `استخدم كود ${code.code} واحصل على خصم ${buildPromoDiscountLabel(code)} على طلبك من Line Coffee.`,
  };
}

function getAverage(total: number, count: number) {
  return count > 0 ? Math.round(total / count) : 0;
}

function StatusPill({ status }: { status: CampaignStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[status]}`}>
      {status}
    </span>
  );
}

function DateStatePill({ startDate, endDate, status }: { startDate: string; endDate: string; status: CampaignStatus }) {
  const badge = getDateBadge(startDate, endDate, status);
  if (!badge) return null;

  return (
    <span className="inline-flex items-center rounded-full border border-[#60a5fa]/20 bg-[#60a5fa]/10 px-2 py-0.5 text-[10px] font-semibold text-[#60a5fa]">
      {badge}
    </span>
  );
}

function AnnouncementPill({ hasAnnouncement }: { hasAnnouncement: boolean }) {
  return hasAnnouncement ? (
    <span className="inline-flex items-center rounded-full border border-[#4ade80]/20 bg-[#4ade80]/10 px-2 py-0.5 text-[10px] font-semibold text-[#4ade80]">
      Has announcement
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-[#fbbf24]/25 bg-[#fbbf24]/10 px-2 py-0.5 text-[10px] font-semibold text-[#fbbf24]">
      No Bar Message
    </span>
  );
}

function AudiencePill({ audience, count }: { audience: AudienceType; count?: number }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#2a2018] bg-[#15100b] px-2 py-0.5 text-[10px] font-semibold text-[#b79b85]">
      {audience === "specific" && typeof count === "number" ? `${count} selected customers` : getAudienceLabel(audience)}
    </span>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "cream",
  onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone?: "cream" | "gold" | "green" | "red" | "amber";
  onClick?: () => void;
}) {
  const color =
    tone === "gold" ? "text-[#b6885e]" :
    tone === "green" ? "text-[#4ade80]" :
    tone === "red" ? "text-[#f87171]" :
    tone === "amber" ? "text-[#fbbf24]" :
    "text-[#f5e6d8]";

  const content = (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#b79b85]/50">{label}</p>
        <Icon size={14} className={color} />
      </div>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-[10px] text-[#6b5744]">{sub}</p>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="admin-kpi-card py-3 text-left transition-colors hover:border-[#b6885e]/30">
        {content}
      </button>
    );
  }

  return <div className="admin-kpi-card py-3">{content}</div>;
}

function SectionTitle({
  icon: Icon,
  title,
  right,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#2a2018] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon size={14} className="flex-shrink-0 text-[#b6885e]" />
        <p className="truncate text-xs font-semibold uppercase tracking-wider text-[#b79b85]/70">{title}</p>
      </div>
      {right}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#b79b85]/55">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-[#2a2018] bg-[#15100b] px-3 py-2 text-xs text-[#f5e6d8] outline-none transition-colors placeholder:text-[#4a3828] focus:border-[#b6885e]"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  dir,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      dir={dir}
      onChange={(event) => onChange(event.target.value)}
      rows={3}
      className="w-full resize-none rounded-lg border border-[#2a2018] bg-[#15100b] px-3 py-2 text-xs leading-5 text-[#f5e6d8] outline-none transition-colors placeholder:text-[#4a3828] focus:border-[#b6885e]"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-[#2a2018] bg-[#15100b] px-3 py-2 text-xs text-[#f5e6d8] outline-none transition-colors focus:border-[#b6885e]"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function FormActions({
  onClose,
  submitLabel,
}: {
  onClose: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-[#2a2018] px-4 py-3">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-[#2a2018] px-4 py-2 text-xs font-semibold text-[#b79b85] transition-colors hover:border-[#b6885e]/40"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="rounded-lg bg-[#b6885e] px-4 py-2 text-xs font-bold text-[#0b0806] transition-colors hover:bg-[#d6a373]"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center px-3"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="admin-surface relative z-10 flex max-h-[88vh] w-full max-w-[900px] flex-col overflow-hidden rounded-lg border border-[#2a2018]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#2a2018] px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-[#f5e6d8]" style={{ fontFamily: "var(--font-playfair)" }}>
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-[#b79b85]/55">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[#b79b85] transition-colors hover:bg-white/5 hover:text-[#f5e6d8]"
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DrawerShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[180] flex justify-end"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <aside
        className="admin-surface relative z-10 flex h-full w-full max-w-[680px] flex-col overflow-hidden rounded-none border-l border-[#2a2018]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#2a2018] px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-[#f5e6d8]" style={{ fontFamily: "var(--font-playfair)" }}>
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-[#b79b85]/55">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-[#b79b85] transition-colors hover:bg-white/5 hover:text-[#f5e6d8]"
            aria-label="Close drawer"
          >
            <X size={15} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function MetricStrip({
  original,
  discount,
  paid,
  used,
  orders,
}: {
  original: number;
  discount: number;
  paid: number;
  used: number;
  orders: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {[
        { label: "Used", value: used, tone: "text-[#f5e6d8]" },
        { label: "Orders", value: orders, tone: "text-[#f5e6d8]" },
        { label: "Before Discount", value: money(original), tone: "text-[#b79b85]" },
        { label: "Discount Given", value: money(discount), tone: "text-[#f87171]" },
        { label: "Paid Revenue", value: money(paid), tone: "text-[#4ade80]" },
      ].map((item) => (
        <div key={item.label} className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#6b5744]">{item.label}</p>
          <p className={`mt-1 text-sm font-bold tabular-nums ${item.tone}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

interface OfferBuilderModalProps {
  initialOffer?: Offer;
  onClose: () => void;
  onSave: (offer: Offer) => void;
}

function OfferBuilderModal({ initialOffer, onClose, onSave }: OfferBuilderModalProps) {
  const [offerType, setOfferType] = useState<OfferType>(initialOffer?.offerType ?? "free-shipping");
  const [titleEn, setTitleEn] = useState(initialOffer?.title.en ?? "");
  const [titleAr, setTitleAr] = useState(initialOffer?.title.ar ?? "");
  const [discountPct, setDiscountPct] = useState(initialOffer?.discountPct?.toString() ?? "");
  const [discountAmount, setDiscountAmount] = useState(initialOffer?.discountAmount?.toString() ?? "");
  const [maxDiscount, setMaxDiscount] = useState(initialOffer?.maxDiscount?.toString() ?? "");
  const [minOrder, setMinOrder] = useState(initialOffer?.minOrder?.toString() ?? "");
  const [applyTo, setApplyTo] = useState(initialOffer?.applyTo ?? "All products");
  const [giftName, setGiftName] = useState(initialOffer?.giftName ?? "");
  const [giftDescription, setGiftDescription] = useState(initialOffer?.giftDescription ?? "");
  const [governorates, setGovernorates] = useState((initialOffer?.governorates ?? ["All"]).join(", "));
  const [firstOrderDiscountType, setFirstOrderDiscountType] = useState<DiscountType | "free-shipping">(
    initialOffer?.discountPct ? "percentage" : initialOffer?.discountAmount ? "fixed" : "free-shipping",
  );
  const [audience, setAudience] = useState<AudienceType>(
    initialOffer?.audience ?? (initialOffer?.offerType === "first-order" ? "new" : "all"),
  );
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>(initialOffer?.specificCustomerIds ?? []);
  const [startDate, setStartDate] = useState(initialOffer?.startDate ?? "2026-06-22");
  const [endDate, setEndDate] = useState(initialOffer?.endDate ?? "2026-12-31");
  const [status, setStatus] = useState<OfferStatus>(initialOffer?.status === "Archived" ? "Paused" : initialOffer?.status ?? "Active");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

  const handleTypeSelect = (type: OfferType) => {
    setOfferType(type);
    if (type === "first-order") setAudience("new");
  };

  const conditionEn = useMemo(() => {
    const amount = optionalNumber(minOrder);
    if (offerType === "free-shipping") {
      return amount ? `Free shipping on orders above ${amount} EGP.` : "Free shipping on all orders.";
    }
    if (offerType === "percentage") {
      return `${numberOrZero(discountPct)}% off ${applyTo.toLowerCase()}${amount ? ` above ${amount} EGP` : ""}.`;
    }
    if (offerType === "fixed") {
      return `${numberOrZero(discountAmount)} EGP off ${applyTo.toLowerCase()}${amount ? ` above ${amount} EGP` : ""}.`;
    }
    if (offerType === "gift") {
      return `${giftName || "Gift"} with ${applyTo.toLowerCase()}${amount ? ` above ${amount} EGP` : ""}.`;
    }
    if (firstOrderDiscountType === "free-shipping") {
      return amount ? `Free shipping on first order above ${amount} EGP.` : "Free shipping on first order.";
    }
    return `${firstOrderDiscountType === "percentage" ? `${numberOrZero(discountPct)}%` : `${numberOrZero(discountAmount)} EGP`} off first order${amount ? ` above ${amount} EGP` : ""}.`;
  }, [applyTo, discountAmount, discountPct, firstOrderDiscountType, giftName, minOrder, offerType]);

  const conditionAr = useMemo(() => {
    const amount = optionalNumber(minOrder);
    if (offerType === "free-shipping") {
      return amount ? `شحن مجاني للطلبات فوق ${amount} جنيه.` : "شحن مجاني لكل الطلبات.";
    }
    if (offerType === "percentage") {
      return `خصم ${numberOrZero(discountPct)}%${amount ? ` للطلبات فوق ${amount} جنيه` : ""}.`;
    }
    if (offerType === "fixed") {
      return `خصم ${numberOrZero(discountAmount)} جنيه${amount ? ` للطلبات فوق ${amount} جنيه` : ""}.`;
    }
    if (offerType === "gift") {
      return `${giftName || "هدية"} مع الطلب${amount ? ` فوق ${amount} جنيه` : ""}.`;
    }
    if (firstOrderDiscountType === "free-shipping") {
      return amount ? `شحن مجاني لأول طلب فوق ${amount} جنيه.` : "شحن مجاني لأول طلب.";
    }
    return firstOrderDiscountType === "percentage"
      ? `خصم ${numberOrZero(discountPct)}% على أول طلب.`
      : `خصم ${numberOrZero(discountAmount)} جنيه على أول طلب.`;
  }, [discountAmount, discountPct, firstOrderDiscountType, giftName, minOrder, offerType]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextOffer: Offer = {
      id: initialOffer?.id ?? `offer-${Date.now()}`,
      title: {
        en: titleEn.trim() || getOfferTypeLabel(offerType),
        ar: titleAr.trim() || "عرض جديد",
      },
      offerType,
      conditionEn,
      conditionAr,
      discountPct: offerType === "percentage" || firstOrderDiscountType === "percentage" ? optionalNumber(discountPct) : undefined,
      discountAmount: offerType === "fixed" || firstOrderDiscountType === "fixed" ? optionalNumber(discountAmount) : undefined,
      maxDiscount: optionalNumber(maxDiscount),
      minOrder: optionalNumber(minOrder),
      applyTo,
      governorates: offerType === "free-shipping" ? governorates.split(",").map((item) => item.trim()).filter(Boolean) : undefined,
      giftName: offerType === "gift" ? giftName.trim() : undefined,
      giftDescription: offerType === "gift" ? giftDescription.trim() : undefined,
      audience,
      specificCustomerIds: audience === "specific" ? selectedCustomerIds : undefined,
      startDate,
      endDate,
      status,
      announcementId: initialOffer?.announcementId,
      usedCount: initialOffer?.usedCount ?? 0,
      ordersGenerated: initialOffer?.ordersGenerated ?? 0,
      originalRevenue: initialOffer?.originalRevenue ?? 0,
      discountGiven: initialOffer?.discountGiven ?? 0,
      paidRevenue: initialOffer?.paidRevenue ?? 0,
    };

    onSave(nextOffer);
    onClose();
  };

  return (
    <ModalShell
      title={initialOffer ? "Edit Offer" : "New Offer"}
      subtitle="Choose the offer type first, then define rules and audience."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="admin-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#b79b85]/55">Offer Type</p>
            <div className="grid gap-2 md:grid-cols-5">
              {OFFER_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = offerType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleTypeSelect(option.value)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      active ? "border-[#b6885e] bg-[#b6885e]/10" : "border-[#2a2018] bg-[#0b0806] hover:border-[#b6885e]/40"
                    }`}
                  >
                    <Icon size={16} className={active ? "text-[#b6885e]" : "text-[#6b5744]"} />
                    <p className="mt-2 text-xs font-bold text-[#f5e6d8]">{option.label}</p>
                    <p className="mt-1 text-[10px] leading-4 text-[#6b5744]">{option.detail}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Title EN">
              <TextInput value={titleEn} onChange={setTitleEn} placeholder="Free shipping above 1000 EGP" />
            </Field>
            <Field label="Title AR">
              <TextInput value={titleAr} onChange={setTitleAr} placeholder="شحن مجاني فوق 1000 جنيه" />
            </Field>
          </div>

          {offerType === "free-shipping" && (
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Applies to">
                <SelectInput
                  value={applyTo}
                  onChange={setApplyTo}
                  options={[
                    { value: "All orders", label: "All orders" },
                    { value: "Orders above amount", label: "Orders above amount" },
                  ]}
                />
              </Field>
              <Field label="Minimum order amount">
                <TextInput value={minOrder} onChange={setMinOrder} type="number" placeholder="1000" />
              </Field>
              <Field label="Governorates">
                <TextInput value={governorates} onChange={setGovernorates} placeholder="All, Cairo, Giza" />
              </Field>
            </div>
          )}

          {offerType === "percentage" && (
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Discount percentage">
                <TextInput value={discountPct} onChange={setDiscountPct} type="number" placeholder="10" />
              </Field>
              <Field label="Max discount amount">
                <TextInput value={maxDiscount} onChange={setMaxDiscount} type="number" placeholder="120" />
              </Field>
              <Field label="Applies to">
                <SelectInput
                  value={applyTo}
                  onChange={setApplyTo}
                  options={[
                    { value: "All products", label: "All products" },
                    { value: "Specific category", label: "Specific category" },
                    { value: "Specific product", label: "Specific product" },
                    { value: "First order only", label: "First order only" },
                    { value: "Orders above amount", label: "Orders above amount" },
                  ]}
                />
              </Field>
              <Field label="Minimum order amount">
                <TextInput value={minOrder} onChange={setMinOrder} type="number" placeholder="400" />
              </Field>
            </div>
          )}

          {offerType === "fixed" && (
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Discount amount EGP">
                <TextInput value={discountAmount} onChange={setDiscountAmount} type="number" placeholder="50" />
              </Field>
              <Field label="Minimum order amount">
                <TextInput value={minOrder} onChange={setMinOrder} type="number" placeholder="400" />
              </Field>
              <Field label="Applies to">
                <SelectInput
                  value={applyTo}
                  onChange={setApplyTo}
                  options={[
                    { value: "All orders", label: "All orders" },
                    { value: "Specific category", label: "Specific category" },
                    { value: "Specific product", label: "Specific product" },
                    { value: "First order only", label: "First order only" },
                  ]}
                />
              </Field>
            </div>
          )}

          {offerType === "gift" && (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Gift name">
                <TextInput value={giftName} onChange={setGiftName} placeholder="Sample Coffee 50g" />
              </Field>
              <Field label="Condition">
                <SelectInput
                  value={applyTo}
                  onChange={setApplyTo}
                  options={[
                    { value: "Orders above amount", label: "Orders above amount" },
                    { value: "Specific category purchase", label: "Specific category purchase" },
                    { value: "Specific product purchase", label: "Specific product purchase" },
                  ]}
                />
              </Field>
              <Field label="Minimum order amount">
                <TextInput value={minOrder} onChange={setMinOrder} type="number" placeholder="1500" />
              </Field>
              <Field label="Gift description">
                <TextInput value={giftDescription} onChange={setGiftDescription} placeholder="A free sample with the order" />
              </Field>
            </div>
          )}

          {offerType === "first-order" && (
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Discount type">
                <SelectInput
                  value={firstOrderDiscountType}
                  onChange={(value) => setFirstOrderDiscountType(value as DiscountType | "free-shipping")}
                  options={[
                    { value: "percentage", label: "Percentage" },
                    { value: "fixed", label: "Fixed amount" },
                    { value: "free-shipping", label: "Free shipping" },
                  ]}
                />
              </Field>
              {firstOrderDiscountType === "percentage" && (
                <Field label="Value">
                  <TextInput value={discountPct} onChange={setDiscountPct} type="number" placeholder="10" />
                </Field>
              )}
              {firstOrderDiscountType === "fixed" && (
                <Field label="Value EGP">
                  <TextInput value={discountAmount} onChange={setDiscountAmount} type="number" placeholder="50" />
                </Field>
              )}
              <Field label="Minimum order amount">
                <TextInput value={minOrder} onChange={setMinOrder} type="number" placeholder="400" />
              </Field>
              <Field label="Audience">
                <TextInput value="New Customers" onChange={() => undefined} />
              </Field>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Target audience">
              <SelectInput
                value={audience}
                onChange={(value) => setAudience(value as AudienceType)}
                options={AUDIENCE_OPTIONS}
              />
            </Field>
            <Field label="Start date">
              <TextInput value={startDate} onChange={setStartDate} type="date" />
            </Field>
            <Field label="End date">
              <TextInput value={endDate} onChange={setEndDate} type="date" />
            </Field>
            <Field label="Status">
              <SelectInput
                value={status}
                onChange={(value) => setStatus(value as OfferStatus)}
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Paused", label: "Paused" },
                ]}
              />
            </Field>
          </div>

          {audience === "specific" && (
            <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[#b79b85]">{selectedCustomerIds.length} selected customers</p>
                <button
                  type="button"
                  onClick={() => setCustomerPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#b6885e]/30 px-3 py-1.5 text-xs font-semibold text-[#b6885e] transition-colors hover:bg-[#b6885e]/10"
                >
                  <Users size={12} /> Choose Customers
                </button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#6b5744]">Generated condition</p>
            <p className="mt-1 text-xs text-[#f5e6d8]">{conditionEn}</p>
            <p className="mt-1 text-xs text-[#b79b85]" dir="rtl">{conditionAr}</p>
          </div>
        </div>

        <FormActions onClose={onClose} submitLabel={initialOffer ? "Save Offer" : "Create Offer"} />
      </form>

      <CustomerPickerModal
        open={customerPickerOpen}
        onClose={() => setCustomerPickerOpen(false)}
        mode="select"
        selectedIds={selectedCustomerIds}
        onConfirm={setSelectedCustomerIds}
      />
    </ModalShell>
  );
}

interface PromoBuilderModalProps {
  initialCode?: PromoCode;
  onClose: () => void;
  onSave: (code: PromoCode) => void;
}

function PromoBuilderModal({ initialCode, onClose, onSave }: PromoBuilderModalProps) {
  const [code, setCode] = useState(initialCode?.code ?? "");
  const [type, setType] = useState<DiscountType>(initialCode?.type ?? "percentage");
  const [value, setValue] = useState(initialCode?.value?.toString() ?? "");
  const [minOrder, setMinOrder] = useState(initialCode?.minOrder?.toString() ?? "");
  const [maxDiscount, setMaxDiscount] = useState(initialCode?.maxDiscount?.toString() ?? "");
  const [usageRule, setUsageRule] = useState<UsageRule>(initialCode?.usageRule ?? "unlimited");
  const [maxUses, setMaxUses] = useState(initialCode?.maxUses?.toString() ?? "");
  const [audience, setAudience] = useState<AudienceType>(initialCode?.audience ?? "all");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>(initialCode?.specificCustomerIds ?? []);
  const [startDate, setStartDate] = useState(initialCode?.startDate ?? "2026-06-22");
  const [endDate, setEndDate] = useState(initialCode?.endDate ?? "2026-12-31");
  const [status, setStatus] = useState<PromoStatus>(initialCode?.status === "Archived" ? "Paused" : initialCode?.status ?? "Active");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextCode: PromoCode = {
      id: initialCode?.id ?? `pc-${Date.now()}`,
      code: code.trim().toUpperCase() || "NEWCODE",
      type,
      value: numberOrZero(value),
      minOrder: numberOrZero(minOrder),
      maxDiscount: optionalNumber(maxDiscount),
      usageRule,
      maxUses: usageRule === "limited" ? optionalNumber(maxUses) : undefined,
      usedCount: initialCode?.usedCount ?? 0,
      audience,
      specificCustomerIds: audience === "specific" ? selectedCustomerIds : undefined,
      startDate,
      endDate,
      status,
      announcementId: initialCode?.announcementId,
      ordersGenerated: initialCode?.ordersGenerated ?? 0,
      originalRevenue: initialCode?.originalRevenue ?? 0,
      discountGiven: initialCode?.discountGiven ?? 0,
      paidRevenue: initialCode?.paidRevenue ?? 0,
    };

    onSave(nextCode);
    onClose();
  };

  return (
    <ModalShell title={initialCode ? "Edit Promo Code" : "New Promo Code"} subtitle="Create checkout codes customers enter manually." onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="admin-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Promo code word">
              <TextInput value={code} onChange={(next) => setCode(next.toUpperCase())} placeholder="LINE10" />
            </Field>
            <Field label="Discount type">
              <SelectInput
                value={type}
                onChange={(next) => setType(next as DiscountType)}
                options={[
                  { value: "percentage", label: "Percentage" },
                  { value: "fixed", label: "Fixed amount" },
                ]}
              />
            </Field>
            <Field label={type === "percentage" ? "Value %" : "Value EGP"}>
              <TextInput value={value} onChange={setValue} type="number" placeholder={type === "percentage" ? "10" : "50"} />
            </Field>
            <Field label="Minimum order amount">
              <TextInput value={minOrder} onChange={setMinOrder} type="number" placeholder="400" />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {type === "percentage" && (
              <Field label="Max discount amount">
                <TextInput value={maxDiscount} onChange={setMaxDiscount} type="number" placeholder="120" />
              </Field>
            )}
            <Field label="Total usage">
              <SelectInput
                value={usageRule}
                onChange={(next) => setUsageRule(next as UsageRule)}
                options={[
                  { value: "unlimited", label: "Unlimited until paused" },
                  { value: "limited", label: "Limited total uses" },
                ]}
              />
            </Field>
            {usageRule === "limited" && (
              <Field label="Max uses">
                <TextInput value={maxUses} onChange={setMaxUses} type="number" placeholder="100" />
              </Field>
            )}
            <Field label="Target audience">
              <SelectInput
                value={audience}
                onChange={(next) => setAudience(next as AudienceType)}
                options={AUDIENCE_OPTIONS}
              />
            </Field>
          </div>

          {audience === "specific" && (
            <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[#b79b85]">{selectedCustomerIds.length} selected customers</p>
                <button
                  type="button"
                  onClick={() => setCustomerPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#b6885e]/30 px-3 py-1.5 text-xs font-semibold text-[#b6885e] transition-colors hover:bg-[#b6885e]/10"
                >
                  <Users size={12} /> Choose Customers
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Start date">
              <TextInput value={startDate} onChange={setStartDate} type="date" />
            </Field>
            <Field label="End date">
              <TextInput value={endDate} onChange={setEndDate} type="date" />
            </Field>
            <Field label="Status">
              <SelectInput
                value={status}
                onChange={(next) => setStatus(next as PromoStatus)}
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Paused", label: "Paused" },
                ]}
              />
            </Field>
          </div>
        </div>

        <FormActions onClose={onClose} submitLabel={initialCode ? "Save Code" : "Create Promo Code"} />
      </form>

      <CustomerPickerModal
        open={customerPickerOpen}
        onClose={() => setCustomerPickerOpen(false)}
        mode="select"
        selectedIds={selectedCustomerIds}
        onConfirm={setSelectedCustomerIds}
      />
    </ModalShell>
  );
}

interface AnnouncementModalProps {
  initialMessage?: AnnouncementMessage;
  prefillOffer?: Offer;
  prefillPromo?: PromoCode;
  offers: Offer[];
  codes: PromoCode[];
  onClose: () => void;
  onSave: (message: AnnouncementMessage) => void;
}

function AnnouncementModal({
  initialMessage,
  prefillOffer,
  prefillPromo,
  offers,
  codes,
  onClose,
  onSave,
}: AnnouncementModalProps) {
  const suggestion = initialMessage
    ? undefined
    : prefillOffer
      ? suggestedOfferAnnouncement(prefillOffer)
      : prefillPromo
        ? suggestedPromoAnnouncement(prefillPromo)
        : undefined;

  const [internalTitle, setInternalTitle] = useState(initialMessage?.internalTitle ?? suggestion?.title ?? "");
  const [textEn, setTextEn] = useState(initialMessage?.textEn ?? suggestion?.en ?? "");
  const [textAr, setTextAr] = useState(initialMessage?.textAr ?? suggestion?.ar ?? "");
  const [active, setActive] = useState(initialMessage?.active ?? true);
  const [startDate, setStartDate] = useState(initialMessage?.startDate ?? "2026-06-22");
  const [endDate, setEndDate] = useState(initialMessage?.endDate ?? "2026-12-31");
  const [linkUrl, setLinkUrl] = useState(initialMessage?.linkUrl ?? "");
  const [ctaLabelEn, setCtaLabelEn] = useState(initialMessage?.ctaLabelEn ?? "");
  const [ctaLabelAr, setCtaLabelAr] = useState(initialMessage?.ctaLabelAr ?? "");
  const [relatedOfferId, setRelatedOfferId] = useState(initialMessage?.relatedOfferId ?? prefillOffer?.id ?? "");
  const [relatedPromoId, setRelatedPromoId] = useState(initialMessage?.relatedPromoId ?? prefillPromo?.id ?? "");
  const [priority, setPriority] = useState(initialMessage?.priority?.toString() ?? "10");
  const [animationStyle, setAnimationStyle] = useState<AnnouncementAnimation>(initialMessage?.animationStyle ?? "slide");
  const [durationSeconds, setDurationSeconds] = useState(initialMessage?.durationSeconds?.toString() ?? "4");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onSave({
      id: initialMessage?.id ?? `ann-${Date.now()}`,
      internalTitle: internalTitle.trim() || "Announcement Message",
      textEn: textEn.trim(),
      textAr: textAr.trim(),
      active,
      startDate,
      endDate,
      linkUrl: linkUrl.trim() || undefined,
      ctaLabelEn: ctaLabelEn.trim() || undefined,
      ctaLabelAr: ctaLabelAr.trim() || undefined,
      relatedOfferId: relatedOfferId || undefined,
      relatedPromoId: relatedPromoId || undefined,
      priority: numberOrZero(priority) || 10,
      animationStyle,
      durationSeconds: numberOrZero(durationSeconds) || 4,
    });
    onClose();
  };

  return (
    <ModalShell
      title={initialMessage ? "Edit Announcement Message" : "New Announcement Message"}
      subtitle="Controls the small rotating bar above the public header."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="admin-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-[#6b5744]">Announcement preview</p>
            <div className="rounded bg-[#120d09] px-3 py-2 text-center text-xs text-[#f5e6d8]">
              {textEn || "Announcement text will appear here"}
            </div>
            {textAr && <p className="mt-2 text-center text-xs text-[#b79b85]" dir="rtl">{textAr}</p>}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Internal title">
              <TextInput value={internalTitle} onChange={setInternalTitle} placeholder="SUMMER15 top bar" />
            </Field>
            <Field label="Status">
              <SelectInput
                value={active ? "active" : "paused"}
                onChange={(next) => setActive(next === "active")}
                options={[
                  { value: "active", label: "Active" },
                  { value: "paused", label: "Paused" },
                ]}
              />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Text EN">
              <TextArea value={textEn} onChange={setTextEn} placeholder="Use code SUMMER15 for 15% off." />
            </Field>
            <Field label="Text AR">
              <TextArea value={textAr} onChange={setTextAr} placeholder="استخدم كود SUMMER15 واحصل على خصم 15%." dir="rtl" />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Related offer">
              <SelectInput
                value={relatedOfferId}
                onChange={setRelatedOfferId}
                options={[{ value: "", label: "None" }, ...offers.map((offer) => ({ value: offer.id, label: offer.title.en }))]}
              />
            </Field>
            <Field label="Related promo code">
              <SelectInput
                value={relatedPromoId}
                onChange={setRelatedPromoId}
                options={[{ value: "", label: "None" }, ...codes.map((code) => ({ value: code.id, label: code.code }))]}
              />
            </Field>
            <Field label="Start date">
              <TextInput value={startDate} onChange={setStartDate} type="date" />
            </Field>
            <Field label="End date">
              <TextInput value={endDate} onChange={setEndDate} type="date" />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Link URL">
              <TextInput value={linkUrl} onChange={setLinkUrl} placeholder="/products" />
            </Field>
            <Field label="CTA label EN">
              <TextInput value={ctaLabelEn} onChange={setCtaLabelEn} placeholder="Shop now" />
            </Field>
            <Field label="CTA label AR">
              <TextInput value={ctaLabelAr} onChange={setCtaLabelAr} placeholder="تسوق الآن" />
            </Field>
            <Field label="Priority">
              <TextInput value={priority} onChange={setPriority} type="number" placeholder="1" />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Animation style">
              <SelectInput
                value={animationStyle}
                onChange={(next) => setAnimationStyle(next as AnnouncementAnimation)}
                options={ANIMATION_OPTIONS}
              />
            </Field>
            <Field label="Duration seconds">
              <TextInput value={durationSeconds} onChange={setDurationSeconds} type="number" placeholder="4" />
            </Field>
          </div>
        </div>

        <FormActions onClose={onClose} submitLabel={initialMessage ? "Save Message" : "Create Message"} />
      </form>
    </ModalShell>
  );
}

function CampaignActions({
  status,
  usedCount,
  onView,
  onEdit,
  onToggleStatus,
  onArchiveOrDelete,
  onCreateAnnouncement,
  extra,
}: {
  status: CampaignStatus;
  usedCount: number;
  onView: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onArchiveOrDelete: () => void;
  onCreateAnnouncement: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={onView} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2018] px-2.5 py-1.5 text-[11px] text-[#b79b85] transition-colors hover:border-[#b6885e]/40 hover:text-[#f5e6d8]">
        <Eye size={11} /> View
      </button>
      <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2018] px-2.5 py-1.5 text-[11px] text-[#b79b85] transition-colors hover:border-[#b6885e]/40 hover:text-[#f5e6d8]">
        <Edit3 size={11} /> Edit
      </button>
      <button type="button" onClick={onToggleStatus} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2018] px-2.5 py-1.5 text-[11px] text-[#b79b85] transition-colors hover:border-[#b6885e]/40 hover:text-[#f5e6d8]">
        {status === "Active" ? <Pause size={11} /> : <Play size={11} />}
        {status === "Active" ? "Pause" : "Activate"}
      </button>
      <button type="button" onClick={onCreateAnnouncement} className="inline-flex items-center gap-1 rounded-lg border border-[#b6885e]/25 px-2.5 py-1.5 text-[11px] text-[#b6885e] transition-colors hover:bg-[#b6885e]/10">
        <Megaphone size={11} /> Create Announcement
      </button>
      {extra}
      <button
        type="button"
        onClick={onArchiveOrDelete}
        className="inline-flex items-center gap-1 rounded-lg border border-[#2a2018] px-2.5 py-1.5 text-[11px] text-[#f87171] transition-colors hover:border-[#f87171]/35 hover:bg-[#f87171]/10"
      >
        {usedCount > 0 ? <Archive size={11} /> : <Trash2 size={11} />}
        {usedCount > 0 ? "Archive" : "Delete"}
      </button>
    </div>
  );
}

interface OffersTabProps {
  offers: Offer[];
  messages: AnnouncementMessage[];
  onNew: () => void;
  onOpen: (offer: Offer) => void;
  onEdit: (offer: Offer) => void;
  onToggleStatus: (id: string, status: OfferStatus) => void;
  onArchiveOrDelete: (offer: Offer) => void;
  onCreateAnnouncement: (offer: Offer) => void;
}

function OffersTab({
  offers,
  messages,
  onNew,
  onOpen,
  onEdit,
  onToggleStatus,
  onArchiveOrDelete,
  onCreateAnnouncement,
}: OffersTabProps) {
  const [filter, setFilter] = useState<OperationalFilter>("Active");
  const [showArchived, setShowArchived] = useState(false);

  const displayed = showArchived
    ? offers.filter((offer) => offer.status === "Archived")
    : offers.filter((offer) => offer.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(["Active", "Paused"] as OperationalFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setShowArchived(false);
                setFilter(item);
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                !showArchived && filter === item
                  ? "border-[#b6885e] bg-[#b6885e]/10 text-[#b6885e]"
                  : "border-[#2a2018] text-[#b79b85] hover:border-[#b6885e]/40"
              }`}
            >
              {item} ({offers.filter((offer) => offer.status === item).length})
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowArchived((current) => !current)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              showArchived ? "border-[#6b5744] bg-[#2a2018] text-[#b79b85]" : "border-[#2a2018] text-[#6b5744] hover:border-[#6b5744]/60"
            }`}
          >
            Archived
          </button>
        </div>
        <button type="button" onClick={onNew} className="inline-flex items-center gap-1.5 rounded-lg bg-[#b6885e] px-3 py-2 text-xs font-bold text-[#0b0806] transition-colors hover:bg-[#d6a373]">
          <Plus size={13} /> New Offer
        </button>
      </div>

      <div className="admin-surface overflow-hidden">
        <SectionTitle icon={Tag} title={`${showArchived ? "Archived" : filter} Offers`} />
        <div className="divide-y divide-[#1b140f]">
          {displayed.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-[#6b5744]">No offers in this view.</p>
          ) : (
            displayed.map((offer) => {
              const hasAnnouncement = hasActiveAnnouncementForOffer(offer, messages);
              return (
                <div key={offer.id} className="p-4 transition-colors hover:bg-[#0b0806]/70">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <button type="button" onClick={() => onOpen(offer)} className="min-w-0 flex-1 text-left">
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        <StatusPill status={offer.status} />
                        <DateStatePill startDate={offer.startDate} endDate={offer.endDate} status={offer.status} />
                        <AnnouncementPill hasAnnouncement={hasAnnouncement} />
                        <AudiencePill audience={offer.audience} count={offer.specificCustomerIds?.length} />
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg border border-[#2a2018] bg-[#15100b] text-[#b6885e]">
                          <Tag size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#f5e6d8]">{offer.title.en}</p>
                          <p className="mt-1 text-xs text-[#b79b85]/70">{offer.conditionEn}</p>
                          <p className="mt-1 text-xs text-[#6b5744]">{offer.startDate} to {offer.endDate}</p>
                        </div>
                      </div>
                    </button>

                    <div className="grid min-w-[260px] grid-cols-3 gap-2 lg:text-right">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#6b5744]">Used</p>
                        <p className="text-sm font-bold text-[#f5e6d8]">{offer.usedCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#6b5744]">Paid</p>
                        <p className="text-sm font-bold text-[#4ade80]">{money(offer.paidRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#6b5744]">Discount</p>
                        <p className="text-sm font-bold text-[#f87171]">{money(offer.discountGiven)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-[#2a2018] bg-[#15100b] px-2 py-0.5 text-[10px] text-[#b79b85]">{getOfferTypeLabel(offer.offerType)}</span>
                      <span className="rounded-full border border-[#2a2018] bg-[#15100b] px-2 py-0.5 text-[10px] text-[#b6885e]">{buildOfferValueLabel(offer)}</span>
                    </div>
                    <CampaignActions
                      status={offer.status}
                      usedCount={offer.usedCount}
                      onView={() => onOpen(offer)}
                      onEdit={() => onEdit(offer)}
                      onToggleStatus={() => onToggleStatus(offer.id, offer.status === "Active" ? "Paused" : "Active")}
                      onArchiveOrDelete={() => onArchiveOrDelete(offer)}
                      onCreateAnnouncement={() => onCreateAnnouncement(offer)}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

interface PromoCodesTabProps {
  codes: PromoCode[];
  messages: AnnouncementMessage[];
  copiedCode: string | null;
  onNew: () => void;
  onOpen: (code: PromoCode) => void;
  onEdit: (code: PromoCode) => void;
  onCopy: (code: string) => void;
  onToggleStatus: (id: string, status: PromoStatus) => void;
  onArchiveOrDelete: (code: PromoCode) => void;
  onCreateAnnouncement: (code: PromoCode) => void;
}

function PromoCodesTab({
  codes,
  messages,
  copiedCode,
  onNew,
  onOpen,
  onEdit,
  onCopy,
  onToggleStatus,
  onArchiveOrDelete,
  onCreateAnnouncement,
}: PromoCodesTabProps) {
  const [filter, setFilter] = useState<OperationalFilter>("Active");
  const [showArchived, setShowArchived] = useState(false);
  const [sendCode, setSendCode] = useState<string | null>(null);

  const displayed = showArchived
    ? codes.filter((code) => code.status === "Archived")
    : codes.filter((code) => code.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(["Active", "Paused"] as OperationalFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setShowArchived(false);
                setFilter(item);
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                !showArchived && filter === item
                  ? "border-[#b6885e] bg-[#b6885e]/10 text-[#b6885e]"
                  : "border-[#2a2018] text-[#b79b85] hover:border-[#b6885e]/40"
              }`}
            >
              {item} ({codes.filter((code) => code.status === item).length})
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowArchived((current) => !current)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              showArchived ? "border-[#6b5744] bg-[#2a2018] text-[#b79b85]" : "border-[#2a2018] text-[#6b5744] hover:border-[#6b5744]/60"
            }`}
          >
            Archived
          </button>
        </div>
        <button type="button" onClick={onNew} className="inline-flex items-center gap-1.5 rounded-lg bg-[#b6885e] px-3 py-2 text-xs font-bold text-[#0b0806] transition-colors hover:bg-[#d6a373]">
          <Plus size={13} /> New Promo Code
        </button>
      </div>

      <div className="admin-surface overflow-hidden">
        <SectionTitle icon={Percent} title={`${showArchived ? "Archived" : filter} Promo Codes`} />
        <div className="divide-y divide-[#1b140f]">
          {displayed.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-[#6b5744]">No promo codes in this view.</p>
          ) : (
            displayed.map((code) => {
              const hasAnnouncement = hasActiveAnnouncementForPromo(code, messages);
              return (
                <div key={code.id} className="p-4 transition-colors hover:bg-[#0b0806]/70">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <button type="button" onClick={() => onOpen(code)} className="min-w-0 flex-1 text-left">
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        <StatusPill status={code.status} />
                        <DateStatePill startDate={code.startDate} endDate={code.endDate} status={code.status} />
                        <AnnouncementPill hasAnnouncement={hasAnnouncement} />
                        <AudiencePill audience={code.audience} count={code.specificCustomerIds?.length} />
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg border border-[#2a2018] bg-[#15100b] text-[#b6885e]">
                          <Percent size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-base font-bold text-[#b6885e]">{code.code}</p>
                          <p className="mt-1 text-xs text-[#b79b85]/70">
                            {buildPromoDiscountLabel(code)} off, minimum order {money(code.minOrder)}
                          </p>
                          <p className="mt-1 text-xs text-[#6b5744]">
                            {code.usageRule === "limited" ? `${code.usedCount}/${code.maxUses ?? 0} uses` : `${code.usedCount} uses, unlimited until paused`}
                          </p>
                        </div>
                      </div>
                    </button>

                    <div className="grid min-w-[260px] grid-cols-3 gap-2 lg:text-right">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#6b5744]">Orders</p>
                        <p className="text-sm font-bold text-[#f5e6d8]">{code.ordersGenerated}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#6b5744]">Paid</p>
                        <p className="text-sm font-bold text-[#4ade80]">{money(code.paidRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#6b5744]">Discount</p>
                        <p className="text-sm font-bold text-[#f87171]">{money(code.discountGiven)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-[#2a2018] bg-[#15100b] px-2 py-0.5 text-[10px] text-[#b6885e]">{buildPromoDiscountLabel(code)}</span>
                      <span className="rounded-full border border-[#2a2018] bg-[#15100b] px-2 py-0.5 text-[10px] text-[#b79b85]">Min {money(code.minOrder)}</span>
                    </div>
                    <CampaignActions
                      status={code.status}
                      usedCount={code.usedCount}
                      onView={() => onOpen(code)}
                      onEdit={() => onEdit(code)}
                      onToggleStatus={() => onToggleStatus(code.id, code.status === "Active" ? "Paused" : "Active")}
                      onArchiveOrDelete={() => onArchiveOrDelete(code)}
                      onCreateAnnouncement={() => onCreateAnnouncement(code)}
                      extra={
                        <>
                          <button type="button" onClick={() => onCopy(code.code)} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2018] px-2.5 py-1.5 text-[11px] text-[#b79b85] transition-colors hover:border-[#b6885e]/40 hover:text-[#f5e6d8]">
                            {copiedCode === code.code ? <Check size={11} /> : <Copy size={11} />}
                            {copiedCode === code.code ? "Copied" : "Copy"}
                          </button>
                          <button type="button" onClick={() => setSendCode(code.code)} className="inline-flex items-center gap-1 rounded-lg border border-[#25D366]/25 px-2.5 py-1.5 text-[11px] text-[#25D366] transition-colors hover:bg-[#25D366]/10">
                            <Send size={11} /> Send
                          </button>
                        </>
                      }
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <CustomerPickerModal
        open={Boolean(sendCode)}
        onClose={() => setSendCode(null)}
        mode="send"
        promoCode={sendCode ?? undefined}
        selectedIds={[]}
      />
    </div>
  );
}

interface AnnouncementBarTabProps {
  messages: AnnouncementMessage[];
  offers: Offer[];
  codes: PromoCode[];
  missingOffers: Offer[];
  missingCodes: PromoCode[];
  onNew: () => void;
  onEdit: (message: AnnouncementMessage) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onCreateForOffer: (offer: Offer) => void;
  onCreateForPromo: (code: PromoCode) => void;
}

function AnnouncementBarTab({
  messages,
  offers,
  codes,
  missingOffers,
  missingCodes,
  onNew,
  onEdit,
  onToggle,
  onDelete,
  onCreateForOffer,
  onCreateForPromo,
}: AnnouncementBarTabProps) {
  const activeMessages = messages.filter((message) => message.active);
  const pausedMessages = messages.filter((message) => !message.active);
  const previewMessage = activeMessages[0];

  return (
    <div className="space-y-4">
      <div className="admin-surface overflow-hidden">
        <SectionTitle
          icon={Megaphone}
          title="Announcement Bar"
          right={
            <button type="button" onClick={onNew} className="inline-flex items-center gap-1.5 rounded-lg bg-[#b6885e] px-3 py-1.5 text-xs font-bold text-[#0b0806] transition-colors hover:bg-[#d6a373]">
              <Plus size={13} /> Add Message
            </button>
          }
        />
        <div className="p-4">
          <div className="rounded-lg border border-[#2a2018] bg-[#080604] p-3">
            <div className="flex items-center justify-between gap-3 rounded bg-[#15100b] px-3 py-2 text-xs">
              <span className="truncate text-[#f5e6d8]">{previewMessage?.textEn ?? "No active announcement messages"}</span>
              <span className="flex-shrink-0 text-[10px] uppercase tracking-wider text-[#6b5744]">
                {previewMessage ? `${previewMessage.animationStyle} / ${previewMessage.durationSeconds}s` : "Paused"}
              </span>
            </div>
            {previewMessage?.textAr && <p className="mt-2 text-center text-xs text-[#b79b85]" dir="rtl">{previewMessage.textAr}</p>}
          </div>
        </div>
      </div>

      {(missingOffers.length > 0 || missingCodes.length > 0) && (
        <div className="admin-surface overflow-hidden border border-[#fbbf24]/20">
          <SectionTitle icon={AlertTriangle} title="Missing Announcement Warnings" />
          <div className="divide-y divide-[#1b140f]">
            {missingOffers.map((offer) => (
              <div key={offer.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#f5e6d8]">{offer.title.en}</p>
                  <p className="mt-1 text-xs text-[#b79b85]/60">This active offer has no active bar message.</p>
                </div>
                <button type="button" onClick={() => onCreateForOffer(offer)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#fbbf24]/30 px-3 py-1.5 text-xs font-semibold text-[#fbbf24] transition-colors hover:bg-[#fbbf24]/10">
                  <Plus size={12} /> Create Message
                </button>
              </div>
            ))}
            {missingCodes.map((code) => (
              <div key={code.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-[#b6885e]">{code.code}</p>
                  <p className="mt-1 text-xs text-[#b79b85]/60">This active promo code has no active bar message.</p>
                </div>
                <button type="button" onClick={() => onCreateForPromo(code)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#fbbf24]/30 px-3 py-1.5 text-xs font-semibold text-[#fbbf24] transition-colors hover:bg-[#fbbf24]/10">
                  <Plus size={12} /> Create Message
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <MessageList
        title={`Active Messages (${activeMessages.length})`}
        messages={activeMessages}
        offers={offers}
        codes={codes}
        onEdit={onEdit}
        onToggle={onToggle}
        onDelete={onDelete}
      />
      <MessageList
        title={`Paused Messages (${pausedMessages.length})`}
        messages={pausedMessages}
        offers={offers}
        codes={codes}
        onEdit={onEdit}
        onToggle={onToggle}
        onDelete={onDelete}
      />
    </div>
  );
}

function MessageList({
  title,
  messages,
  offers,
  codes,
  onEdit,
  onToggle,
  onDelete,
}: {
  title: string;
  messages: AnnouncementMessage[];
  offers: Offer[];
  codes: PromoCode[];
  onEdit: (message: AnnouncementMessage) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="admin-surface overflow-hidden">
      <SectionTitle icon={MessageSquare} title={title} />
      <div className="divide-y divide-[#1b140f]">
        {messages.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-[#6b5744]">No messages here.</p>
        ) : (
          messages.map((message) => {
            const linkedOffer = message.relatedOfferId ? offers.find((offer) => offer.id === message.relatedOfferId) : undefined;
            const linkedCode = message.relatedPromoId ? codes.find((code) => code.id === message.relatedPromoId) : undefined;

            return (
              <div key={message.id} className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${message.active ? "border-[#4ade80]/25 bg-[#4ade80]/10 text-[#4ade80]" : "border-[#6b5744]/30 bg-[#2a2018] text-[#8b735b]"}`}>
                        {message.active ? "Active" : "Paused"}
                      </span>
                      <span className="rounded-full border border-[#2a2018] bg-[#15100b] px-2 py-0.5 text-[10px] text-[#b79b85]">Priority {message.priority}</span>
                      <span className="rounded-full border border-[#2a2018] bg-[#15100b] px-2 py-0.5 text-[10px] text-[#b79b85]">{message.animationStyle} / {message.durationSeconds}s</span>
                    </div>
                    <p className="text-sm font-semibold text-[#f5e6d8]">{message.internalTitle}</p>
                    <p className="mt-1 text-xs text-[#b79b85]/75">{message.textEn}</p>
                    <p className="mt-1 text-xs text-[#6b5744]" dir="rtl">{message.textAr}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {linkedOffer && <span className="rounded-full border border-[#2a2018] bg-[#15100b] px-2 py-0.5 text-[10px] text-[#b6885e]">Offer: {linkedOffer.title.en}</span>}
                      {linkedCode && <span className="rounded-full border border-[#2a2018] bg-[#15100b] px-2 py-0.5 font-mono text-[10px] text-[#b6885e]">Code: {linkedCode.code}</span>}
                      {message.linkUrl && <span className="inline-flex items-center gap-1 rounded-full border border-[#2a2018] bg-[#15100b] px-2 py-0.5 text-[10px] text-[#b79b85]"><LinkIcon size={9} /> {message.linkUrl}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button" onClick={() => onToggle(message.id, !message.active)} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2018] px-2.5 py-1.5 text-[11px] text-[#b79b85] transition-colors hover:border-[#b6885e]/40 hover:text-[#f5e6d8]">
                      {message.active ? <Pause size={11} /> : <Play size={11} />}
                      {message.active ? "Pause" : "Activate"}
                    </button>
                    <button type="button" onClick={() => onEdit(message)} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2018] px-2.5 py-1.5 text-[11px] text-[#b79b85] transition-colors hover:border-[#b6885e]/40 hover:text-[#f5e6d8]">
                      <Edit3 size={11} /> Edit
                    </button>
                    <button type="button" onClick={() => onDelete(message.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2018] px-2.5 py-1.5 text-[11px] text-[#f87171] transition-colors hover:border-[#f87171]/35 hover:bg-[#f87171]/10">
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface PerformanceTabProps {
  offers: Offer[];
  codes: PromoCode[];
  onOpenUsage: (kind: CampaignKind, id: string) => void;
}

function PerformanceTab({ offers, codes, onOpenUsage }: PerformanceTabProps) {
  const [view, setView] = useState<"offers" | "codes">("offers");
  const rows = view === "offers" ? offers : codes;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        {(["offers", "codes"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setView(item)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === item ? "border-[#b6885e] bg-[#b6885e]/10 text-[#b6885e]" : "border-[#2a2018] text-[#b79b85] hover:border-[#b6885e]/40"
            }`}
          >
            {item === "offers" ? "Offers Performance" : "Promo Codes Performance"}
          </button>
        ))}
      </div>

      <div className="admin-surface overflow-hidden">
        <SectionTitle icon={BarChart2} title={view === "offers" ? "Offers Performance" : "Promo Codes Performance"} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead>
              <tr className="border-b border-[#2a2018] bg-[#0b0806]/70 text-[10px] uppercase tracking-wider text-[#6b5744]">
                <th className="px-4 py-3 font-semibold">Campaign</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Used</th>
                <th className="px-4 py-3 font-semibold">Orders</th>
                <th className="px-4 py-3 font-semibold">Before Discount</th>
                <th className="px-4 py-3 font-semibold">Discount Given</th>
                <th className="px-4 py-3 font-semibold">Paid Revenue</th>
                <th className="px-4 py-3 font-semibold">Avg Before</th>
                <th className="px-4 py-3 font-semibold">Avg Paid</th>
                <th className="px-4 py-3 font-semibold">Best Segment</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b140f]">
              {rows.map((row) => {
                const isOffer = view === "offers";
                const name = isOffer ? (row as Offer).title.en : (row as PromoCode).code;
                const kind: CampaignKind = isOffer ? "offer" : "promo";
                return (
                  <tr key={row.id} className="transition-colors hover:bg-[#0b0806]/70">
                    <td className="px-4 py-3">
                      <p className={isOffer ? "font-semibold text-[#f5e6d8]" : "font-mono font-bold text-[#b6885e]"}>{name}</p>
                      <p className="mt-0.5 text-[10px] text-[#6b5744]">{row.startDate} to {row.endDate}</p>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={row.status} /></td>
                    <td className="px-4 py-3 font-mono text-[#f5e6d8]">{row.usedCount}</td>
                    <td className="px-4 py-3 font-mono text-[#b79b85]">{row.ordersGenerated}</td>
                    <td className="px-4 py-3 font-mono text-[#b79b85]">{money(row.originalRevenue)}</td>
                    <td className="px-4 py-3 font-mono text-[#f87171]">{money(row.discountGiven)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#4ade80]">{money(row.paidRevenue)}</td>
                    <td className="px-4 py-3 font-mono text-[#b79b85]">{money(getAverage(row.originalRevenue, row.ordersGenerated))}</td>
                    <td className="px-4 py-3 font-mono text-[#b79b85]">{money(getAverage(row.paidRevenue, row.ordersGenerated))}</td>
                    <td className="px-4 py-3"><AudiencePill audience={row.audience} count={row.specificCustomerIds?.length} /></td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => onOpenUsage(kind, row.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2018] px-2.5 py-1.5 text-[11px] text-[#b79b85] transition-colors hover:border-[#b6885e]/40 hover:text-[#f5e6d8]">
                        <Eye size={11} /> Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface OfferDetailDrawerProps {
  offer: Offer;
  hasAnnouncement: boolean;
  onClose: () => void;
  onEdit: (offer: Offer) => void;
  onToggleStatus: (id: string, status: OfferStatus) => void;
  onArchiveOrDelete: (offer: Offer) => void;
  onCreateAnnouncement: (offer: Offer) => void;
}

function OfferDetailDrawer({
  offer,
  hasAnnouncement,
  onClose,
  onEdit,
  onToggleStatus,
  onArchiveOrDelete,
  onCreateAnnouncement,
}: OfferDetailDrawerProps) {
  return (
    <DrawerShell title={offer.title.en} subtitle={offer.title.ar} onClose={onClose}>
      <div className="admin-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="flex flex-wrap gap-1.5">
          <StatusPill status={offer.status} />
          <DateStatePill startDate={offer.startDate} endDate={offer.endDate} status={offer.status} />
          <AnnouncementPill hasAnnouncement={hasAnnouncement} />
          <AudiencePill audience={offer.audience} count={offer.specificCustomerIds?.length} />
        </div>

        <MetricStrip
          original={offer.originalRevenue}
          discount={offer.discountGiven}
          paid={offer.paidRevenue}
          used={offer.usedCount}
          orders={offer.ordersGenerated}
        />

        <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-4">
          <p className="mb-3 text-[10px] uppercase tracking-wider text-[#6b5744]">Rules and conditions</p>
          <div className="space-y-2 text-xs">
            <p className="text-[#f5e6d8]">{offer.conditionEn}</p>
            <p className="text-[#b79b85]" dir="rtl">{offer.conditionAr}</p>
            <div className="flex flex-wrap gap-1.5 pt-2">
              <span className="rounded-full border border-[#2a2018] px-2 py-0.5 text-[10px] text-[#b79b85]">{getOfferTypeLabel(offer.offerType)}</span>
              <span className="rounded-full border border-[#2a2018] px-2 py-0.5 text-[10px] text-[#b6885e]">{buildOfferValueLabel(offer)}</span>
              {offer.minOrder !== undefined && <span className="rounded-full border border-[#2a2018] px-2 py-0.5 text-[10px] text-[#b79b85]">Min {money(offer.minOrder)}</span>}
              {offer.applyTo && <span className="rounded-full border border-[#2a2018] px-2 py-0.5 text-[10px] text-[#b79b85]">{offer.applyTo}</span>}
            </div>
          </div>
        </div>

        {offer.audience === "specific" && (
          <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-4">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-[#6b5744]">Selected customers</p>
            <p className="text-xs text-[#b79b85]">{offer.specificCustomerIds?.join(", ") || "No customers selected."}</p>
          </div>
        )}
      </div>

      <div className="border-t border-[#2a2018] px-5 py-4">
        <CampaignActions
          status={offer.status}
          usedCount={offer.usedCount}
          onView={() => undefined}
          onEdit={() => {
            onClose();
            onEdit(offer);
          }}
          onToggleStatus={() => onToggleStatus(offer.id, offer.status === "Active" ? "Paused" : "Active")}
          onArchiveOrDelete={() => {
            onArchiveOrDelete(offer);
            onClose();
          }}
          onCreateAnnouncement={() => {
            onClose();
            onCreateAnnouncement(offer);
          }}
        />
      </div>
    </DrawerShell>
  );
}

interface PromoDetailDrawerProps {
  code: PromoCode;
  hasAnnouncement: boolean;
  copiedCode: string | null;
  onClose: () => void;
  onEdit: (code: PromoCode) => void;
  onCopy: (code: string) => void;
  onToggleStatus: (id: string, status: PromoStatus) => void;
  onArchiveOrDelete: (code: PromoCode) => void;
  onCreateAnnouncement: (code: PromoCode) => void;
}

function PromoDetailDrawer({
  code,
  hasAnnouncement,
  copiedCode,
  onClose,
  onEdit,
  onCopy,
  onToggleStatus,
  onArchiveOrDelete,
  onCreateAnnouncement,
}: PromoDetailDrawerProps) {
  const [sendOpen, setSendOpen] = useState(false);

  return (
    <DrawerShell title={code.code} subtitle={`${buildPromoDiscountLabel(code)} off, minimum ${money(code.minOrder)}`} onClose={onClose}>
      <div className="admin-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="flex flex-wrap gap-1.5">
          <StatusPill status={code.status} />
          <DateStatePill startDate={code.startDate} endDate={code.endDate} status={code.status} />
          <AnnouncementPill hasAnnouncement={hasAnnouncement} />
          <AudiencePill audience={code.audience} count={code.specificCustomerIds?.length} />
        </div>

        <MetricStrip
          original={code.originalRevenue}
          discount={code.discountGiven}
          paid={code.paidRevenue}
          used={code.usedCount}
          orders={code.ordersGenerated}
        />

        <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-4">
          <p className="mb-3 text-[10px] uppercase tracking-wider text-[#6b5744]">Promo code rules</p>
          <div className="grid gap-3 text-xs sm:grid-cols-2">
            <p className="text-[#b79b85]">Discount: <span className="font-bold text-[#f5e6d8]">{buildPromoDiscountLabel(code)}</span></p>
            <p className="text-[#b79b85]">Minimum order: <span className="font-bold text-[#f5e6d8]">{money(code.minOrder)}</span></p>
            <p className="text-[#b79b85]">Usage: <span className="font-bold text-[#f5e6d8]">{code.usageRule === "limited" ? `${code.usedCount}/${code.maxUses ?? 0}` : "Unlimited until paused"}</span></p>
            <p className="text-[#b79b85]">Dates: <span className="font-bold text-[#f5e6d8]">{code.startDate} to {code.endDate}</span></p>
          </div>
        </div>

        {code.audience === "specific" && (
          <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-4">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-[#6b5744]">Selected customers</p>
            <p className="text-xs text-[#b79b85]">{code.specificCustomerIds?.join(", ") || "No customers selected."}</p>
          </div>
        )}
      </div>

      <div className="border-t border-[#2a2018] px-5 py-4">
        <CampaignActions
          status={code.status}
          usedCount={code.usedCount}
          onView={() => undefined}
          onEdit={() => {
            onClose();
            onEdit(code);
          }}
          onToggleStatus={() => onToggleStatus(code.id, code.status === "Active" ? "Paused" : "Active")}
          onArchiveOrDelete={() => {
            onArchiveOrDelete(code);
            onClose();
          }}
          onCreateAnnouncement={() => {
            onClose();
            onCreateAnnouncement(code);
          }}
          extra={
            <>
              <button type="button" onClick={() => onCopy(code.code)} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2018] px-2.5 py-1.5 text-[11px] text-[#b79b85] transition-colors hover:border-[#b6885e]/40 hover:text-[#f5e6d8]">
                {copiedCode === code.code ? <Check size={11} /> : <Copy size={11} />}
                {copiedCode === code.code ? "Copied" : "Copy"}
              </button>
              <button type="button" onClick={() => setSendOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-[#25D366]/25 px-2.5 py-1.5 text-[11px] text-[#25D366] transition-colors hover:bg-[#25D366]/10">
                <Send size={11} /> Send to Customers
              </button>
            </>
          }
        />
      </div>

      <CustomerPickerModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        mode="send"
        promoCode={code.code}
        selectedIds={[]}
      />
    </DrawerShell>
  );
}

function UsageDetailsDrawer({
  kind,
  campaign,
  onClose,
}: {
  kind: CampaignKind;
  campaign: Offer | PromoCode;
  onClose: () => void;
}) {
  const records = USAGE_RECORDS.filter((record) => record.campaignType === kind && record.campaignId === campaign.id);
  const title = kind === "offer" ? (campaign as Offer).title.en : (campaign as PromoCode).code;

  return (
    <DrawerShell title="Usage Details" subtitle={title} onClose={onClose}>
      <div className="admin-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <MetricStrip
          original={campaign.originalRevenue}
          discount={campaign.discountGiven}
          paid={campaign.paidRevenue}
          used={campaign.usedCount}
          orders={campaign.ordersGenerated}
        />

        <div className="admin-surface overflow-hidden rounded-lg">
          <SectionTitle icon={Users} title="Customers and orders" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#2a2018] bg-[#0b0806]/70 text-[10px] uppercase tracking-wider text-[#6b5744]">
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Original</th>
                  <th className="px-4 py-3 font-semibold">Discount</th>
                  <th className="px-4 py-3 font-semibold">Paid</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b140f]">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-xs text-[#6b5744]">No usage records yet.</td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="transition-colors hover:bg-[#0b0806]/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#f5e6d8]">{record.customerName}</p>
                        <p className="mt-0.5 text-[10px] text-[#6b5744]">{record.customerPhone} / {record.customerType}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono font-bold text-[#b6885e]">{record.orderId}</p>
                        <p className="mt-0.5 text-[10px] text-[#6b5744]">{record.orderDate}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#b79b85]">{money(record.originalTotal)}</td>
                      <td className="px-4 py-3 font-mono text-[#f87171]">{money(record.discountAmt)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#4ade80]">{money(record.finalPaid)}</td>
                      <td className="px-4 py-3 text-[#b79b85]">{record.orderStatus}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://wa.me/${normalizePhone(record.customerPhone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#25D366]/25 px-2.5 py-1.5 text-[11px] text-[#25D366] transition-colors hover:bg-[#25D366]/10"
                        >
                          <MessageSquare size={11} /> WhatsApp
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("offers");
  const [offers, setOffers] = useState<Offer[]>(OFFERS);
  const [codes, setCodes] = useState<PromoCode[]>(PROMO_CODES);
  const [messages, setMessages] = useState<AnnouncementMessage[]>(ANNOUNCEMENT_MESSAGES);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [offerBuilder, setOfferBuilder] = useState<Offer | "new" | null>(null);
  const [promoBuilder, setPromoBuilder] = useState<PromoCode | "new" | null>(null);
  const [announcementBuilder, setAnnouncementBuilder] = useState<
    | { type: "new" }
    | { type: "edit"; message: AnnouncementMessage }
    | { type: "offer"; offer: Offer }
    | { type: "promo"; code: PromoCode }
    | null
  >(null);
  const [openOfferId, setOpenOfferId] = useState<string | null>(null);
  const [openCodeId, setOpenCodeId] = useState<string | null>(null);
  const [usageDrawer, setUsageDrawer] = useState<{ kind: CampaignKind; id: string } | null>(null);

  const sortedMessages = useMemo(() => [...messages].sort((a, b) => a.priority - b.priority), [messages]);

  const missingOffers = useMemo(
    () => offers.filter((offer) => offer.status === "Active" && !hasActiveAnnouncementForOffer(offer, sortedMessages)),
    [offers, sortedMessages],
  );
  const missingCodes = useMemo(
    () => codes.filter((code) => code.status === "Active" && !hasActiveAnnouncementForPromo(code, sortedMessages)),
    [codes, sortedMessages],
  );
  const missingCount = missingOffers.length + missingCodes.length;

  const kpis = useMemo(() => {
    const allCampaigns = [...offers, ...codes];
    return {
      activeOffers: offers.filter((offer) => offer.status === "Active").length,
      activeCodes: codes.filter((code) => code.status === "Active").length,
      totalUsage: allCampaigns.reduce((sum, campaign) => sum + campaign.usedCount, 0),
      totalDiscount: allCampaigns.reduce((sum, campaign) => sum + campaign.discountGiven, 0),
      paidRevenue: allCampaigns.reduce((sum, campaign) => sum + campaign.paidRevenue, 0),
      originalRevenue: allCampaigns.reduce((sum, campaign) => sum + campaign.originalRevenue, 0),
    };
  }, [codes, offers]);

  const openedOffer = openOfferId ? offers.find((offer) => offer.id === openOfferId) : undefined;
  const openedCode = openCodeId ? codes.find((code) => code.id === openCodeId) : undefined;
  const usageCampaign =
    usageDrawer?.kind === "offer"
      ? offers.find((offer) => offer.id === usageDrawer.id)
      : usageDrawer?.kind === "promo"
        ? codes.find((code) => code.id === usageDrawer.id)
        : undefined;

  const saveOffer = (offer: Offer) => {
    setOffers((current) => {
      const exists = current.some((item) => item.id === offer.id);
      return exists ? current.map((item) => (item.id === offer.id ? offer : item)) : [offer, ...current];
    });
  };

  const saveCode = (code: PromoCode) => {
    setCodes((current) => {
      const exists = current.some((item) => item.id === code.id);
      return exists ? current.map((item) => (item.id === code.id ? code : item)) : [code, ...current];
    });
  };

  const saveMessage = (message: AnnouncementMessage) => {
    setMessages((current) => {
      const exists = current.some((item) => item.id === message.id);
      return exists ? current.map((item) => (item.id === message.id ? message : item)) : [message, ...current];
    });
  };

  const copyCode = (code: string) => {
    void navigator.clipboard?.writeText(code).catch(() => undefined);
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(null), 1600);
  };

  const archiveOrDeleteOffer = (offer: Offer) => {
    setOffers((current) =>
      offer.usedCount > 0
        ? current.map((item) => (item.id === offer.id ? { ...item, status: "Archived" } : item))
        : current.filter((item) => item.id !== offer.id),
    );
  };

  const archiveOrDeleteCode = (code: PromoCode) => {
    setCodes((current) =>
      code.usedCount > 0
        ? current.map((item) => (item.id === code.id ? { ...item, status: "Archived" } : item))
        : current.filter((item) => item.id !== code.id),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#f5e6d8]" style={{ fontFamily: "var(--font-playfair)" }}>
            Marketing &amp; Promotions
          </h1>
          <p className="mt-1 text-[13px] text-[#b79b85]/60">
            Offers, promo codes, header announcement messages, and campaign performance.
          </p>
        </div>
        {missingCount > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("announcements")}
            className="inline-flex items-center gap-2 rounded-lg border border-[#fbbf24]/25 bg-[#fbbf24]/10 px-3 py-2 text-xs font-semibold text-[#fbbf24] transition-colors hover:bg-[#fbbf24]/15"
          >
            <AlertTriangle size={14} />
            {missingCount} active campaign{missingCount > 1 ? "s" : ""} missing announcements
            <ChevronRight size={13} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Active Offers" value={kpis.activeOffers} icon={Tag} tone="gold" onClick={() => setActiveTab("offers")} />
        <KpiCard label="Active Promo Codes" value={kpis.activeCodes} icon={Percent} tone="gold" onClick={() => setActiveTab("promos")} />
        <KpiCard label="Total Usage" value={kpis.totalUsage} icon={Users} sub="offers + codes" />
        <KpiCard label="Discount Given" value={money(kpis.totalDiscount)} icon={Gift} tone="red" />
        <KpiCard label="Paid Revenue" value={money(kpis.paidRevenue)} icon={Sparkles} tone="green" sub={`before discount ${money(kpis.originalRevenue)}`} />
        <KpiCard label="Missing Announcements" value={missingCount} icon={AlertTriangle} tone={missingCount > 0 ? "amber" : "cream"} onClick={() => setActiveTab("announcements")} />
      </div>

      {missingCount > 0 && (
        <div className="rounded-lg border border-[#fbbf24]/20 bg-[#fbbf24]/10 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-[#fbbf24]" />
              <p className="text-sm text-[#f5e6d8]">
                {missingCount} active campaign{missingCount > 1 ? "s have" : " has"} no announcement message. Customers may not notice them.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("announcements")}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#fbbf24]/35 px-3 py-1.5 text-xs font-semibold text-[#fbbf24] transition-colors hover:bg-[#fbbf24]/10"
            >
              Fix Now <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      <div className="flex overflow-x-auto border-b border-[#2a2018]">
        {TAB_OPTIONS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-shrink-0 px-4 py-3 text-xs font-semibold transition-colors ${
                active ? "text-[#b6885e]" : "text-[#b79b85]/60 hover:text-[#f5e6d8]"
              }`}
            >
              {tab.label}
              {tab.key === "announcements" && missingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-[#fbbf24] px-1.5 py-0.5 text-[9px] font-bold text-[#0b0806]">{missingCount}</span>
              )}
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b6885e]" />}
            </button>
          );
        })}
      </div>

      {activeTab === "offers" && (
        <OffersTab
          offers={offers}
          messages={sortedMessages}
          onNew={() => setOfferBuilder("new")}
          onOpen={(offer) => setOpenOfferId(offer.id)}
          onEdit={(offer) => setOfferBuilder(offer)}
          onToggleStatus={(id, status) => setOffers((current) => current.map((offer) => (offer.id === id ? { ...offer, status } : offer)))}
          onArchiveOrDelete={archiveOrDeleteOffer}
          onCreateAnnouncement={(offer) => setAnnouncementBuilder({ type: "offer", offer })}
        />
      )}

      {activeTab === "promos" && (
        <PromoCodesTab
          codes={codes}
          messages={sortedMessages}
          copiedCode={copiedCode}
          onNew={() => setPromoBuilder("new")}
          onOpen={(code) => setOpenCodeId(code.id)}
          onEdit={(code) => setPromoBuilder(code)}
          onCopy={copyCode}
          onToggleStatus={(id, status) => setCodes((current) => current.map((code) => (code.id === id ? { ...code, status } : code)))}
          onArchiveOrDelete={archiveOrDeleteCode}
          onCreateAnnouncement={(code) => setAnnouncementBuilder({ type: "promo", code })}
        />
      )}

      {activeTab === "announcements" && (
        <AnnouncementBarTab
          messages={sortedMessages}
          offers={offers}
          codes={codes}
          missingOffers={missingOffers}
          missingCodes={missingCodes}
          onNew={() => setAnnouncementBuilder({ type: "new" })}
          onEdit={(message) => setAnnouncementBuilder({ type: "edit", message })}
          onToggle={(id, active) => setMessages((current) => current.map((message) => (message.id === id ? { ...message, active } : message)))}
          onDelete={(id) => setMessages((current) => current.filter((message) => message.id !== id))}
          onCreateForOffer={(offer) => setAnnouncementBuilder({ type: "offer", offer })}
          onCreateForPromo={(code) => setAnnouncementBuilder({ type: "promo", code })}
        />
      )}

      {activeTab === "performance" && (
        <PerformanceTab
          offers={offers}
          codes={codes}
          onOpenUsage={(kind, id) => setUsageDrawer({ kind, id })}
        />
      )}

      {offerBuilder && (
        <OfferBuilderModal
          initialOffer={offerBuilder === "new" ? undefined : offerBuilder}
          onClose={() => setOfferBuilder(null)}
          onSave={saveOffer}
        />
      )}

      {promoBuilder && (
        <PromoBuilderModal
          initialCode={promoBuilder === "new" ? undefined : promoBuilder}
          onClose={() => setPromoBuilder(null)}
          onSave={saveCode}
        />
      )}

      {announcementBuilder && (
        <AnnouncementModal
          initialMessage={announcementBuilder.type === "edit" ? announcementBuilder.message : undefined}
          prefillOffer={announcementBuilder.type === "offer" ? announcementBuilder.offer : undefined}
          prefillPromo={announcementBuilder.type === "promo" ? announcementBuilder.code : undefined}
          offers={offers}
          codes={codes}
          onClose={() => setAnnouncementBuilder(null)}
          onSave={saveMessage}
        />
      )}

      {openedOffer && (
        <OfferDetailDrawer
          offer={openedOffer}
          hasAnnouncement={hasActiveAnnouncementForOffer(openedOffer, sortedMessages)}
          onClose={() => setOpenOfferId(null)}
          onEdit={(offer) => setOfferBuilder(offer)}
          onToggleStatus={(id, status) => setOffers((current) => current.map((offer) => (offer.id === id ? { ...offer, status } : offer)))}
          onArchiveOrDelete={archiveOrDeleteOffer}
          onCreateAnnouncement={(offer) => setAnnouncementBuilder({ type: "offer", offer })}
        />
      )}

      {openedCode && (
        <PromoDetailDrawer
          code={openedCode}
          hasAnnouncement={hasActiveAnnouncementForPromo(openedCode, sortedMessages)}
          copiedCode={copiedCode}
          onClose={() => setOpenCodeId(null)}
          onEdit={(code) => setPromoBuilder(code)}
          onCopy={copyCode}
          onToggleStatus={(id, status) => setCodes((current) => current.map((code) => (code.id === id ? { ...code, status } : code)))}
          onArchiveOrDelete={archiveOrDeleteCode}
          onCreateAnnouncement={(code) => setAnnouncementBuilder({ type: "promo", code })}
        />
      )}

      {usageDrawer && usageCampaign && (
        <UsageDetailsDrawer
          kind={usageDrawer.kind}
          campaign={usageCampaign}
          onClose={() => setUsageDrawer(null)}
        />
      )}
    </div>
  );
}
