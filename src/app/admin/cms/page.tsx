"use client";

import Image from "next/image";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Archive,
  BookOpen,
  Camera,
  Check,
  Clipboard,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Gavel,
  Globe2,
  Inbox,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { getAdminDisplayName } from "@/lib/auth/admin";
import { useCurrentAdmin } from "@/lib/hooks/useCurrentAdmin";
import {
  CMS_ACTIVITY,
  CMS_ARTICLES,
  CMS_CONTACT_MESSAGES,
  CMS_IMAGE_OPTIONS,
  CMS_LEGAL_PAGES,
  CMS_PROOF_IMAGE_OPTIONS,
  CMS_REVIEWS,
  type ActivityTone,
  type ArticleStatus,
  type CmsActivity,
  type CmsArticle,
  type CmsContactMessage,
  type CmsLegalPage,
  type CmsReview,
  type ContactStatus,
  type LegalPageStatus,
  type LocalizedText,
  type ReviewDisplayTarget,
  type ReviewSource,
  type ReviewStatus,
} from "@/lib/mock-data/admin/cms-mock";

type ActiveTab = "blog" | "reviews" | "legal" | "contact";
type ReviewFilter = ReviewStatus | "Featured";
type Tone = "neutral" | "gold" | "green" | "amber" | "red";

const TODAY = "2026-06-22";

const TAB_OPTIONS: Array<{ key: ActiveTab; label: string; icon: ComponentType<{ size?: number; className?: string }> }> = [
  { key: "blog", label: "Blog", icon: BookOpen },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "legal", label: "Legal Pages", icon: Gavel },
  { key: "contact", label: "Contact Messages", icon: Inbox },
];

const ARTICLE_STATUSES: ArticleStatus[] = ["Draft", "Published", "Archived"];
const REVIEW_STATUSES: ReviewStatus[] = ["Pending", "Approved", "Rejected"];
const REVIEW_SOURCES: ReviewSource[] = ["Manual", "WhatsApp", "Facebook", "Instagram", "Website"];
const REVIEW_DISPLAY_TARGETS: ReviewDisplayTarget[] = ["Product Page", "Homepage Testimonials", "Both"];
const REVIEW_FILTERS: ReviewFilter[] = ["Pending", "Approved", "Rejected", "Featured"];
const LEGAL_STATUSES: LegalPageStatus[] = ["Draft", "Published"];
const CONTACT_STATUSES: ContactStatus[] = ["New", "In Progress", "Replied", "Archived"];

const STATUS_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  Draft: { bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.22)", color: "#fbbf24" },
  Published: { bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.22)", color: "#4ade80" },
  Archived: { bg: "rgba(107,87,68,0.18)", border: "rgba(107,87,68,0.35)", color: "#8b735b" },
  Featured: { bg: "rgba(182,136,94,0.14)", border: "rgba(182,136,94,0.35)", color: "#d6a373" },
  Pending: { bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.22)", color: "#fbbf24" },
  Approved: { bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.22)", color: "#4ade80" },
  Rejected: { bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.22)", color: "#f87171" },
  Hidden: { bg: "rgba(107,87,68,0.18)", border: "rgba(107,87,68,0.35)", color: "#8b735b" },
  New: { bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.24)", color: "#60a5fa" },
  "In Progress": { bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.22)", color: "#fbbf24" },
  Replied: { bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.22)", color: "#4ade80" },
  WhatsApp: { bg: "rgba(37,211,102,0.10)", border: "rgba(37,211,102,0.24)", color: "#25D366" },
  Website: { bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.24)", color: "#60a5fa" },
  Facebook: { bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.24)", color: "#60a5fa" },
  Instagram: { bg: "rgba(214,163,115,0.10)", border: "rgba(214,163,115,0.24)", color: "#d6a373" },
  Manual: { bg: "rgba(183,155,133,0.10)", border: "rgba(183,155,133,0.24)", color: "#b79b85" },
  Email: { bg: "rgba(183,155,133,0.10)", border: "rgba(183,155,133,0.24)", color: "#b79b85" },
  "Contact Form": { bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.24)", color: "#60a5fa" },
  "Product Page": { bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.24)", color: "#60a5fa" },
  "Homepage Testimonials": { bg: "rgba(182,136,94,0.14)", border: "rgba(182,136,94,0.35)", color: "#d6a373" },
  Both: { bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.22)", color: "#4ade80" },
};

const ACTIVITY_STYLE: Record<ActivityTone, string> = {
  gold: "#d6a373",
  green: "#4ade80",
  amber: "#fbbf24",
  red: "#f87171",
  cream: "#f5e6d8",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => ({ en: tag, ar: tag }));
}

function bumpVersion(version: string) {
  const [major = "1", minor = "0"] = version.split(".");
  const nextMinor = Number.isFinite(Number(minor)) ? Number(minor) + 1 : 1;
  return `${major}.${nextMinor}`;
}

function createEmptyArticle(authorName = ""): CmsArticle {
  return {
    id: makeId("ART"),
    slug: "",
    title: { en: "", ar: "" },
    excerpt: { en: "", ar: "" },
    content: { en: "", ar: "" },
    category: { en: "Guide", ar: "دليل" },
    author: authorName,
    status: "Draft",
    featured: false,
    views: 0,
    readTime: { en: "4 min read", ar: "٤ دقائق قراءة" },
    tags: [],
    heroImage: CMS_IMAGE_OPTIONS[0],
    cardImage: CMS_IMAGE_OPTIONS[0],
    featuredImage: CMS_IMAGE_OPTIONS[0],
    seoTitle: { en: "", ar: "" },
    seoDescription: { en: "", ar: "" },
  };
}

function createEmptyReview(): CmsReview {
  return {
    id: makeId("REV"),
    customer: { name: "", phone: "", email: "" },
    product: "",
    rating: 5,
    reviewText: { en: "", ar: "" },
    source: "Manual",
    proofScreenshot: CMS_PROOF_IMAGE_OPTIONS[0],
    internalNotes: "",
    status: "Pending",
    featured: false,
    hidden: false,
    showOn: "Product Page",
    date: TODAY,
  };
}

function StatusPill({ label }: { label: string }) {
  const style = STATUS_STYLE[label] ?? STATUS_STYLE.Draft;
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: style.bg, borderColor: style.border, color: style.color }}
    >
      {label}
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((item) => (
        <Star
          key={item}
          size={12}
          fill={item <= rating ? "#b6885e" : "none"}
          className={item <= rating ? "text-[#b6885e]" : "text-[#4a3828]"}
        />
      ))}
    </span>
  );
}

function ImagePreview({ src, label, ratio = "aspect-[4/3]" }: { src?: string; label: string; ratio?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg border border-[#2a2018] bg-[#0b0806] ${ratio}`}>
      {src ? (
        <Image src={src} alt={label} fill sizes="320px" className="object-cover" />
      ) : (
        <div className="grid h-full place-items-center text-[11px] text-[#6b5744]">No image</div>
      )}
      <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold text-[#f5e6d8]">
        {label}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone?: Tone;
  onClick?: () => void;
}) {
  const color =
    tone === "gold" ? "text-[#b6885e]" :
    tone === "green" ? "text-[#4ade80]" :
    tone === "amber" ? "text-[#fbbf24]" :
    tone === "red" ? "text-[#f87171]" :
    "text-[#f5e6d8]";

  const content = (
    <>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#b79b85]/50">{label}</p>
        <Icon size={14} className={color} />
      </div>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
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
  title,
  icon: Icon,
  right,
}: {
  title: string;
  icon: ComponentType<{ size?: number; className?: string }>;
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

function ActionButton({
  children,
  icon: Icon,
  onClick,
  tone = "neutral",
  type = "button",
  title,
}: {
  children: ReactNode;
  icon?: ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
  tone?: Tone;
  type?: "button" | "submit";
  title?: string;
}) {
  const toneClass =
    tone === "gold" ? "border-[#b6885e]/35 bg-[#b6885e] text-[#0b0806] hover:bg-[#d6a373]" :
    tone === "green" ? "border-[#4ade80]/25 text-[#4ade80] hover:bg-[#4ade80]/10" :
    tone === "amber" ? "border-[#fbbf24]/25 text-[#fbbf24] hover:bg-[#fbbf24]/10" :
    tone === "red" ? "border-[#f87171]/25 text-[#f87171] hover:bg-[#f87171]/10" :
    "border-[#2a2018] text-[#b79b85] hover:border-[#b6885e]/40 hover:text-[#f5e6d8]";

  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${toneClass}`}
    >
      {Icon && <Icon size={13} />}
      {children}
    </button>
  );
}

function IconButton({
  title,
  icon: Icon,
  onClick,
  tone = "neutral",
}: {
  title: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  tone?: Tone;
}) {
  const color =
    tone === "green" ? "text-[#4ade80] hover:bg-[#4ade80]/10" :
    tone === "amber" ? "text-[#fbbf24] hover:bg-[#fbbf24]/10" :
    tone === "red" ? "text-[#f87171] hover:bg-[#f87171]/10" :
    tone === "gold" ? "text-[#b6885e] hover:bg-[#b6885e]/10" :
    "text-[#b79b85] hover:bg-white/5 hover:text-[#f5e6d8]";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${color}`}
    >
      <Icon size={14} />
    </button>
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
        className="admin-surface relative z-10 flex h-full w-full max-w-[760px] flex-col overflow-hidden rounded-none border-l border-[#2a2018]"
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
            title="Close drawer"
          >
            <X size={15} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
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
  dir,
  readOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  dir?: "ltr" | "rtl";
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      dir={dir}
      readOnly={readOnly}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-[#2a2018] bg-[#15100b] px-3 py-2 text-xs text-[#f5e6d8] outline-none transition-colors placeholder:text-[#4a3828] focus:border-[#b6885e] read-only:text-[#b79b85]"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  dir,
  rows = 4,
  readOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  rows?: number;
  readOnly?: boolean;
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      dir={dir}
      rows={rows}
      readOnly={readOnly}
      onChange={(event) => onChange(event.target.value)}
      className="w-full resize-none rounded-lg border border-[#2a2018] bg-[#15100b] px-3 py-2 text-xs leading-5 text-[#f5e6d8] outline-none transition-colors placeholder:text-[#4a3828] focus:border-[#b6885e] read-only:text-[#b79b85]"
    />
  );
}

function SelectInput({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-[#2a2018] bg-[#15100b] px-3 py-2 text-xs text-[#f5e6d8] outline-none transition-colors focus:border-[#b6885e]"
    >
      {children}
    </select>
  );
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Field label={label}>
        <SelectInput value={value} onChange={onChange}>
          {CMS_IMAGE_OPTIONS.map((image) => (
            <option key={image} value={image}>{image}</option>
          ))}
        </SelectInput>
      </Field>
      <ImagePreview src={value} label={label} />
    </div>
  );
}

function ReviewPreviewCard({ review }: { review: CmsReview }) {
  return (
    <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Stars rating={review.rating} />
        <StatusPill label={review.showOn} />
      </div>
      <p className="text-sm italic leading-7 text-[#f5e6d8]">
        &ldquo;{review.reviewText.en || "Review text will appear here."}&rdquo;
      </p>
      {review.reviewText.ar && (
        <p className="mt-2 text-sm italic leading-7 text-[#b79b85]" dir="rtl">
          &ldquo;{review.reviewText.ar}&rdquo;
        </p>
      )}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#2a2018] pt-3">
        <div>
          <p className="text-xs font-bold text-[#f5e6d8]">{review.customer.name || "Customer name"}</p>
          <p className="text-[11px] text-[#6b5744]">{review.product || "Product name"}</p>
        </div>
        {review.featured && <StatusPill label="Featured" />}
      </div>
    </div>
  );
}

function ArticleDrawer({
  article,
  authorName,
  onClose,
  onSave,
  onDuplicate,
  onDelete,
}: {
  article: CmsArticle | null;
  authorName: string;
  onClose: () => void;
  onSave: (article: CmsArticle, activity: string, tone?: ActivityTone) => void;
  onDuplicate: (article: CmsArticle) => void;
  onDelete: (article: CmsArticle) => void;
}) {
  const [form, setForm] = useState<CmsArticle>(() => article ?? createEmptyArticle(authorName));
  const [tagsText, setTagsText] = useState(() => (article?.tags ?? []).map((tag) => tag.en).join(", "));
  const isNew = !article;

  const setLocalized = (
    field: "title" | "excerpt" | "content" | "category" | "readTime" | "seoTitle" | "seoDescription",
    lang: keyof LocalizedText,
    value: string,
  ) => {
    setForm((current) => ({ ...current, [field]: { ...current[field], [lang]: value } }));
  };

  const buildArticle = (status = form.status): CmsArticle => ({
    ...form,
    status,
    slug: form.slug || slugify(form.title.en) || makeId("article").toLowerCase(),
    views: Number.isFinite(Number(form.views)) ? Number(form.views) : 0,
    publishDate: status === "Published" ? form.publishDate || TODAY : status === "Draft" ? undefined : form.publishDate,
    tags: parseTags(tagsText),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = buildArticle();
    onSave(next, isNew ? "created article" : "saved article", next.status === "Published" ? "green" : "gold");
    onClose();
  };

  return (
    <DrawerShell title={isNew ? "Create Article" : form.title.en || "Edit Article"} subtitle={form.title.ar} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="admin-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="EN Title">
              <TextInput value={form.title.en} onChange={(value) => setLocalized("title", "en", value)} placeholder="Article title" />
            </Field>
            <Field label="AR Title">
              <TextInput value={form.title.ar} onChange={(value) => setLocalized("title", "ar", value)} placeholder="عنوان المقال" dir="rtl" />
            </Field>
            <Field label="EN Category">
              <TextInput value={form.category.en} onChange={(value) => setLocalized("category", "en", value)} />
            </Field>
            <Field label="AR Category">
              <TextInput value={form.category.ar} onChange={(value) => setLocalized("category", "ar", value)} dir="rtl" />
            </Field>
            <Field label="Author">
              <TextInput value={form.author} onChange={(value) => setForm((current) => ({ ...current, author: value }))} />
            </Field>
            <Field label="Slug">
              <TextInput value={form.slug} onChange={(value) => setForm((current) => ({ ...current, slug: value }))} placeholder="auto-generated from title" />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value as ArticleStatus }))}>
                {ARTICLE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </SelectInput>
            </Field>
            <Field label="Featured">
              <SelectInput value={form.featured ? "Featured" : "Normal"} onChange={(value) => setForm((current) => ({ ...current, featured: value === "Featured" }))}>
                <option value="Normal">Normal</option>
                <option value="Featured">Featured</option>
              </SelectInput>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ImageField label="Hero Image" value={form.heroImage} onChange={(value) => setForm((current) => ({ ...current, heroImage: value }))} />
            <ImageField label="Blog Card Image" value={form.cardImage} onChange={(value) => setForm((current) => ({ ...current, cardImage: value }))} />
            <ImageField label="Featured Article Image" value={form.featuredImage} onChange={(value) => setForm((current) => ({ ...current, featuredImage: value }))} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="EN Excerpt">
              <TextArea value={form.excerpt.en} onChange={(value) => setLocalized("excerpt", "en", value)} rows={3} />
            </Field>
            <Field label="AR Excerpt">
              <TextArea value={form.excerpt.ar} onChange={(value) => setLocalized("excerpt", "ar", value)} dir="rtl" rows={3} />
            </Field>
            <Field label="EN Content">
              <TextArea value={form.content.en} onChange={(value) => setLocalized("content", "en", value)} rows={6} />
            </Field>
            <Field label="AR Content">
              <TextArea value={form.content.ar} onChange={(value) => setLocalized("content", "ar", value)} dir="rtl" rows={6} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tags">
              <TextInput value={tagsText} onChange={setTagsText} placeholder="History, Culture" />
            </Field>
            <Field label="EN Read Time">
              <TextInput value={form.readTime.en} onChange={(value) => setLocalized("readTime", "en", value)} />
            </Field>
            <Field label="AR Read Time">
              <TextInput value={form.readTime.ar} onChange={(value) => setLocalized("readTime", "ar", value)} dir="rtl" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SEO Title">
              <TextInput value={form.seoTitle.en} onChange={(value) => setLocalized("seoTitle", "en", value)} />
            </Field>
            <Field label="SEO Title AR">
              <TextInput value={form.seoTitle.ar} onChange={(value) => setLocalized("seoTitle", "ar", value)} dir="rtl" />
            </Field>
            <Field label="SEO Description">
              <TextArea value={form.seoDescription.en} onChange={(value) => setLocalized("seoDescription", "en", value)} rows={3} />
            </Field>
            <Field label="SEO Description AR">
              <TextArea value={form.seoDescription.ar} onChange={(value) => setLocalized("seoDescription", "ar", value)} dir="rtl" rows={3} />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2a2018] px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {!isNew && (
              <>
                <ActionButton title="Duplicate article" icon={Copy} onClick={() => { onDuplicate(buildArticle()); onClose(); }}>
                  Duplicate
                </ActionButton>
                <ActionButton
                  title={form.status === "Published" ? "Unpublish article" : "Publish article"}
                  icon={form.status === "Published" ? EyeOff : Eye}
                  tone={form.status === "Published" ? "amber" : "green"}
                  onClick={() => {
                    const nextStatus: ArticleStatus = form.status === "Published" ? "Draft" : "Published";
                    onSave(buildArticle(nextStatus), nextStatus === "Published" ? "published article" : "unpublished article", nextStatus === "Published" ? "green" : "amber");
                    onClose();
                  }}
                >
                  {form.status === "Published" ? "Unpublish" : "Publish"}
                </ActionButton>
                <ActionButton title="Archive article" icon={Archive} tone="amber" onClick={() => { onSave(buildArticle("Archived"), "archived article", "amber"); onClose(); }}>
                  Archive
                </ActionButton>
                <ActionButton
                  title="Delete article"
                  icon={Trash2}
                  tone="red"
                  onClick={() => {
                    if (window.confirm("Delete this article?")) {
                      onDelete(form);
                      onClose();
                    }
                  }}
                >
                  Delete
                </ActionButton>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <ActionButton title="Cancel article edits" onClick={onClose}>Cancel</ActionButton>
            <ActionButton title="Save article changes" type="submit" icon={Check} tone="gold">{isNew ? "Create" : "Save changes"}</ActionButton>
          </div>
        </div>
      </form>
    </DrawerShell>
  );
}

function ReviewDrawer({
  review,
  onClose,
  onSave,
}: {
  review: CmsReview | null;
  onClose: () => void;
  onSave: (review: CmsReview, activity: string, tone?: ActivityTone) => void;
}) {
  const [form, setForm] = useState<CmsReview>(() => review ?? createEmptyReview());
  const isNew = !review;

  const setCustomer = (field: keyof CmsReview["customer"], value: string) => {
    setForm((current) => ({ ...current, customer: { ...current.customer, [field]: value } }));
  };

  const setReviewText = (lang: keyof LocalizedText, value: string) => {
    setForm((current) => ({ ...current, reviewText: { ...current.reviewText, [lang]: value } }));
  };

  const saveAndClose = (next: CmsReview, action = "saved review", tone: ActivityTone = "gold") => {
    onSave(next, action, tone);
    onClose();
  };

  return (
    <DrawerShell title={isNew ? "Add Review" : `Review ${form.id}`} subtitle={`${form.customer.name || "New customer"} / ${form.product || "Product"}`} onClose={onClose}>
      <div className="admin-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer">
            <TextInput value={form.customer.name} onChange={(value) => setCustomer("name", value)} />
          </Field>
          <Field label="Product">
            <TextInput value={form.product} onChange={(value) => setForm((current) => ({ ...current, product: value }))} />
          </Field>
          <Field label="Phone">
            <TextInput value={form.customer.phone} onChange={(value) => setCustomer("phone", value)} />
          </Field>
          <Field label="Email">
            <TextInput value={form.customer.email} onChange={(value) => setCustomer("email", value)} />
          </Field>
          <Field label="Source">
            <SelectInput value={form.source} onChange={(value) => setForm((current) => ({ ...current, source: value as ReviewSource }))}>
              {REVIEW_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
            </SelectInput>
          </Field>
          <Field label="Show On">
            <SelectInput value={form.showOn} onChange={(value) => setForm((current) => ({ ...current, showOn: value as ReviewDisplayTarget }))}>
              {REVIEW_DISPLAY_TARGETS.map((target) => <option key={target} value={target}>{target}</option>)}
            </SelectInput>
          </Field>
          <Field label="Rating">
            <TextInput
              type="number"
              value={String(form.rating)}
              onChange={(value) => setForm((current) => ({ ...current, rating: Math.min(5, Math.max(1, Number(value) || 1)) }))}
            />
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value as ReviewStatus }))}>
              {REVIEW_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </SelectInput>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Review Text">
            <TextArea value={form.reviewText.en} onChange={(value) => setReviewText("en", value)} rows={5} />
          </Field>
          <Field label="Review Text AR">
            <TextArea value={form.reviewText.ar} onChange={(value) => setReviewText("ar", value)} dir="rtl" rows={5} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Field label="Proof Screenshot">
            <SelectInput value={form.proofScreenshot ?? ""} onChange={(value) => setForm((current) => ({ ...current, proofScreenshot: value || undefined }))}>
              <option value="">No screenshot</option>
              {CMS_PROOF_IMAGE_OPTIONS.map((image) => (
                <option key={image} value={image}>{image}</option>
              ))}
            </SelectInput>
          </Field>
          <ImagePreview src={form.proofScreenshot} label="Internal proof" />
        </div>
        <p className="-mt-3 text-[11px] text-[#6b5744]">Screenshot is internal proof only. It does not need to appear publicly.</p>

        <Field label="Internal Notes">
          <TextArea value={form.internalNotes} onChange={(value) => setForm((current) => ({ ...current, internalNotes: value }))} rows={4} />
        </Field>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#b79b85]/55">Website Preview Card</p>
          <ReviewPreviewCard review={form} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2a2018] px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <ActionButton title="Approve review" icon={Check} tone="green" onClick={() => saveAndClose({ ...form, status: "Approved", hidden: false }, isNew ? "added review" : "approved review", "green")}>Approve</ActionButton>
          <ActionButton title="Reject review" icon={X} tone="red" onClick={() => saveAndClose({ ...form, status: "Rejected" }, "rejected review", "red")}>Reject</ActionButton>
          <ActionButton title={form.featured ? "Unfeature review" : "Feature review"} icon={Star} tone={form.featured ? "amber" : "gold"} onClick={() => saveAndClose({ ...form, featured: !form.featured, status: form.featured ? form.status : "Approved", hidden: false }, form.featured ? "unfeatured review" : "featured review", "gold")}>
            {form.featured ? "Unfeature" : "Feature"}
          </ActionButton>
          <ActionButton title={form.hidden ? "Unhide review" : "Hide review"} icon={form.hidden ? Eye : EyeOff} tone="amber" onClick={() => saveAndClose({ ...form, hidden: !form.hidden }, form.hidden ? "unhid review" : "hid review", "amber")}>
            {form.hidden ? "Unhide" : "Hide"}
          </ActionButton>
        </div>
        <div className="flex gap-2">
          <ActionButton title="Cancel review edits" onClick={onClose}>Cancel</ActionButton>
          <ActionButton title="Save review changes" icon={Check} tone="gold" onClick={() => saveAndClose(form, isNew ? "added review" : "saved review")}>{isNew ? "Add Review" : "Save changes"}</ActionButton>
        </div>
      </div>
    </DrawerShell>
  );
}

function LegalDrawer({
  page,
  initialPreview,
  onClose,
  onSave,
}: {
  page: CmsLegalPage;
  initialPreview: boolean;
  onClose: () => void;
  onSave: (page: CmsLegalPage, activity: string, tone?: ActivityTone) => void;
}) {
  const [form, setForm] = useState<CmsLegalPage>(page);
  const [preview, setPreview] = useState(initialPreview);

  const setContent = (lang: keyof LocalizedText, value: string) => {
    setForm((current) => ({ ...current, content: { ...current.content, [lang]: value } }));
  };

  const saveAndClose = (next: CmsLegalPage, action = "saved legal page", tone: ActivityTone = "gold") => {
    onSave(next, action, tone);
    onClose();
  };

  return (
    <DrawerShell title={form.page} subtitle={`Version ${form.version} / ${form.status}`} onClose={onClose}>
      <div className="admin-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Status">
            <SelectInput value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value as LegalPageStatus }))}>
              {LEGAL_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </SelectInput>
          </Field>
          <Field label="Last Updated">
            <TextInput value={form.lastUpdated} onChange={(value) => setForm((current) => ({ ...current, lastUpdated: value }))} />
          </Field>
          <Field label="Version">
            <TextInput value={form.version} onChange={(value) => setForm((current) => ({ ...current, version: value }))} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="EN Content">
            <TextArea value={form.content.en} onChange={(value) => setContent("en", value)} rows={9} />
          </Field>
          <Field label="AR Content">
            <TextArea value={form.content.ar} onChange={(value) => setContent("ar", value)} dir="rtl" rows={9} />
          </Field>
        </div>

        {preview && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b5744]">Preview EN</p>
              <p className="text-sm leading-7 text-[#f5e6d8]">{form.content.en}</p>
            </div>
            <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-4" dir="rtl">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b5744]">Preview AR</p>
              <p className="text-sm leading-8 text-[#f5e6d8]">{form.content.ar}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2a2018] px-5 py-4">
        <ActionButton title="Toggle legal preview" icon={Eye} onClick={() => setPreview((current) => !current)}>
          {preview ? "Hide preview" : "Preview"}
        </ActionButton>
        <div className="flex flex-wrap gap-2">
          <ActionButton title="Cancel legal edits" onClick={onClose}>Cancel</ActionButton>
          <ActionButton title="Save legal draft" icon={Check} onClick={() => saveAndClose({ ...form, lastUpdated: TODAY })}>Save draft</ActionButton>
          <ActionButton
            title="Publish legal page"
            icon={Send}
            tone="gold"
            onClick={() => saveAndClose({ ...form, status: "Published", lastUpdated: TODAY, version: bumpVersion(form.version) }, "published legal page", "green")}
          >
            Publish
          </ActionButton>
        </div>
      </div>
    </DrawerShell>
  );
}

function ReadOnlyLine({ label, value, dir }: { label: string; value: string; dir?: "ltr" | "rtl" }) {
  return (
    <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b5744]">{label}</p>
      <p className="mt-1 text-xs font-semibold text-[#f5e6d8]" dir={dir}>{value}</p>
    </div>
  );
}

function ContactDrawer({
  message,
  onClose,
  onSave,
  onCopy,
}: {
  message: CmsContactMessage;
  onClose: () => void;
  onSave: (message: CmsContactMessage, activity: string, tone?: ActivityTone) => void;
  onCopy: (value: string, label: string) => void;
}) {
  const [form, setForm] = useState<CmsContactMessage>(message);
  const waHref = `https://wa.me/${normalizePhone(form.whatsApp)}`;
  const emailHref = `mailto:${form.email}?subject=${encodeURIComponent(`Re: ${form.subject}`)}`;

  const saveAndClose = (next: CmsContactMessage, action = "saved contact note", tone: ActivityTone = "gold") => {
    onSave(next, action, tone);
    onClose();
  };

  return (
    <DrawerShell title={form.subject} subtitle={`${form.name} / ${form.source}`} onClose={onClose}>
      <div className="admin-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <ReadOnlyLine label="Name" value={form.name} />
          <ReadOnlyLine label="Source" value={form.source} />
          <ReadOnlyLine label="Phone" value={form.phone} />
          <ReadOnlyLine label="WhatsApp" value={form.whatsApp} />
          <ReadOnlyLine label="Email" value={form.email} />
          <ReadOnlyLine label="Assigned Admin" value={form.assignedAdmin} />
          <ReadOnlyLine label="Date" value={form.date} />
          <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b5744]">Status</p>
            <div className="mt-1"><StatusPill label={form.status} /></div>
          </div>
        </div>

        <div className="rounded-lg border border-[#2a2018] bg-[#0b0806] p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b5744]">Message body / read only</p>
          <p className="text-sm leading-7 text-[#f5e6d8]">{form.message}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={waHref} target="_blank" rel="noopener noreferrer" title="Reply via WhatsApp" className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/25 px-3 py-2 text-xs font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/10">
            <MessageCircle size={13} /> Reply via WhatsApp
          </a>
          <a href={emailHref} title="Reply via Email" className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2018] px-3 py-2 text-xs font-semibold text-[#b79b85] transition-colors hover:border-[#b6885e]/40 hover:text-[#f5e6d8]">
            <Mail size={13} /> Reply via Email
          </a>
          <ActionButton title="Copy phone" icon={Phone} onClick={() => onCopy(form.phone, "Phone")}>Copy Phone</ActionButton>
          <ActionButton title="Copy email" icon={Mail} onClick={() => onCopy(form.email, "Email")}>Copy Email</ActionButton>
        </div>

        <Field label="Internal Notes">
          <TextArea value={form.internalNotes} onChange={(value) => setForm((current) => ({ ...current, internalNotes: value }))} rows={5} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2a2018] px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <ActionButton title="Mark inquiry in progress" icon={MessageSquare} tone="amber" onClick={() => saveAndClose({ ...form, status: "In Progress" }, "started contact reply", "amber")}>In Progress</ActionButton>
          <ActionButton title="Mark inquiry replied" icon={Check} tone="green" onClick={() => saveAndClose({ ...form, status: "Replied" }, "replied to contact message", "green")}>Replied</ActionButton>
          <ActionButton title="Archive inquiry" icon={Archive} onClick={() => saveAndClose({ ...form, status: "Archived" }, "archived contact message", "cream")}>Archive</ActionButton>
        </div>
        <div className="flex gap-2">
          <ActionButton title="Cancel contact note changes" onClick={onClose}>Cancel</ActionButton>
          <ActionButton title="Save internal note" icon={Check} tone="gold" onClick={() => saveAndClose(form)}>Save internal note</ActionButton>
        </div>
      </div>
    </DrawerShell>
  );
}

function BlogTab({
  articles,
  onCreate,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onTogglePublish,
  onToggleFeatured,
}: {
  articles: CmsArticle[];
  onCreate: () => void;
  onEdit: (article: CmsArticle) => void;
  onDuplicate: (article: CmsArticle) => void;
  onArchive: (article: CmsArticle) => void;
  onDelete: (article: CmsArticle) => void;
  onTogglePublish: (article: CmsArticle) => void;
  onToggleFeatured: (article: CmsArticle) => void;
}) {
  const sorted = [...articles].sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.en.localeCompare(b.title.en));

  return (
    <div className="admin-surface overflow-hidden">
      <SectionTitle
        icon={BookOpen}
        title="Blog articles"
        right={<ActionButton title="Create article" icon={Plus} tone="gold" onClick={onCreate}>Create Article</ActionButton>}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1160px] text-left text-xs">
          <thead>
            <tr className="border-b border-[#2a2018] bg-[#0b0806]/70 text-[10px] uppercase tracking-wider text-[#6b5744]">
              <th className="px-4 py-3 font-semibold">Image</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Author</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Views</th>
              <th className="px-4 py-3 font-semibold">Publish Date</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b140f]">
            {sorted.map((article) => (
              <tr key={article.id} className="transition-colors hover:bg-[#0b0806]/70">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onEdit(article)} className="relative block h-12 w-16 overflow-hidden rounded-lg border border-[#2a2018] bg-[#0b0806]" title="Edit article image">
                    <Image src={article.cardImage} alt="" fill sizes="64px" className="object-cover" />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onEdit(article)} className="max-w-[360px] text-left">
                    <p className="truncate font-semibold text-[#f5e6d8]">{article.title.en}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[#b79b85]/45" dir="rtl">{article.title.ar}</p>
                  </button>
                </td>
                <td className="px-4 py-3 text-[#b79b85]">{article.category.en}</td>
                <td className="px-4 py-3 text-[#b79b85]">{article.author}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <StatusPill label={article.status} />
                    {article.featured && <StatusPill label="Featured" />}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[#f5e6d8]">{formatNumber(article.views)}</td>
                <td className="px-4 py-3 text-[#b79b85]">{article.publishDate ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <IconButton title="Edit article" icon={Edit3} onClick={() => onEdit(article)} />
                    <IconButton title="Duplicate article" icon={Copy} onClick={() => onDuplicate(article)} />
                    <IconButton title={article.featured ? "Remove featured badge" : "Mark featured"} icon={Star} tone="gold" onClick={() => onToggleFeatured(article)} />
                    <IconButton title={article.status === "Published" ? "Unpublish article" : "Publish article"} icon={article.status === "Published" ? EyeOff : Eye} tone={article.status === "Published" ? "amber" : "green"} onClick={() => onTogglePublish(article)} />
                    <IconButton title="Archive article" icon={Archive} tone="amber" onClick={() => onArchive(article)} />
                    <IconButton title="Delete article" icon={Trash2} tone="red" onClick={() => {
                      if (window.confirm("Delete this article?")) onDelete(article);
                    }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewsTab({
  reviews,
  filter,
  onFilterChange,
  onCreate,
  onOpen,
  onSave,
}: {
  reviews: CmsReview[];
  filter: ReviewFilter;
  onFilterChange: (filter: ReviewFilter) => void;
  onCreate: () => void;
  onOpen: (review: CmsReview) => void;
  onSave: (review: CmsReview, activity: string, tone?: ActivityTone) => void;
}) {
  const filtered = reviews.filter((review) => {
    if (filter === "Featured") return review.featured && !review.hidden;
    return review.status === filter && !review.hidden;
  });

  return (
    <div className="admin-surface overflow-hidden">
      <SectionTitle
        icon={Star}
        title="Customer reviews"
        right={
          <div className="flex items-center gap-2">
            <div className="hidden gap-1 overflow-x-auto sm:flex">
              {REVIEW_FILTERS.map((item) => {
                const active = filter === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onFilterChange(item)}
                    className={`flex-shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                      active ? "border-[#b6885e]/50 bg-[#b6885e]/20 text-[#f5e6d8] shadow-[0_0_0_1px_rgba(182,136,94,0.16)]" : "border-[#2a2018] text-[#b79b85]/65 hover:text-[#f5e6d8]"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <ActionButton title="Add review" icon={Plus} tone="gold" onClick={onCreate}>Add Review</ActionButton>
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead>
            <tr className="border-b border-[#2a2018] bg-[#0b0806]/70 text-[10px] uppercase tracking-wider text-[#6b5744]">
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Rating</th>
              <th className="px-4 py-3 font-semibold">Show On</th>
              <th className="px-4 py-3 font-semibold">Proof</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b140f]">
            {filtered.map((review) => (
              <tr key={review.id} className="transition-colors hover:bg-[#0b0806]/70">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onOpen(review)} className="text-left">
                    <p className="font-semibold text-[#f5e6d8]">{review.customer.name}</p>
                    <p className="mt-0.5 text-[10px] text-[#6b5744]">{review.customer.phone}</p>
                  </button>
                </td>
                <td className="px-4 py-3"><StatusPill label={review.source} /></td>
                <td className="px-4 py-3 text-[#b79b85]">{review.product}</td>
                <td className="px-4 py-3"><Stars rating={review.rating} /></td>
                <td className="px-4 py-3 text-[#b79b85]">{review.showOn}</td>
                <td className="px-4 py-3">
                  {review.proofScreenshot ? <Camera size={14} className="text-[#b6885e]" /> : <span className="text-[#6b5744]">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <StatusPill label={review.hidden ? "Hidden" : review.status} />
                    {review.featured && <StatusPill label="Featured" />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <IconButton title="Open review" icon={Edit3} onClick={() => onOpen(review)} />
                    <IconButton title="Approve review" icon={Check} tone="green" onClick={() => onSave({ ...review, status: "Approved", hidden: false }, "approved review", "green")} />
                    <IconButton title="Reject review" icon={X} tone="red" onClick={() => onSave({ ...review, status: "Rejected" }, "rejected review", "red")} />
                    <IconButton title={review.featured ? "Unfeature review" : "Feature review"} icon={Star} tone="gold" onClick={() => onSave({ ...review, featured: !review.featured, status: review.featured ? review.status : "Approved", hidden: false }, review.featured ? "unfeatured review" : "featured review", "gold")} />
                    <IconButton title={review.hidden ? "Unhide review" : "Hide review"} icon={review.hidden ? Eye : EyeOff} tone="amber" onClick={() => onSave({ ...review, hidden: !review.hidden }, review.hidden ? "unhid review" : "hid review", "amber")} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LegalPagesTab({
  pages,
  onOpen,
  onSave,
}: {
  pages: CmsLegalPage[];
  onOpen: (page: CmsLegalPage, preview?: boolean) => void;
  onSave: (page: CmsLegalPage, activity: string, tone?: ActivityTone) => void;
}) {
  return (
    <div className="admin-surface overflow-hidden">
      <SectionTitle icon={Gavel} title="Legal pages" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead>
            <tr className="border-b border-[#2a2018] bg-[#0b0806]/70 text-[10px] uppercase tracking-wider text-[#6b5744]">
              <th className="px-4 py-3 font-semibold">Page</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last Updated</th>
              <th className="px-4 py-3 font-semibold">Version</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b140f]">
            {pages.map((page) => (
              <tr key={page.id} className="transition-colors hover:bg-[#0b0806]/70">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onOpen(page)} className="text-left">
                    <p className="font-semibold text-[#f5e6d8]">{page.page}</p>
                    <p className="mt-0.5 line-clamp-1 max-w-[480px] text-[11px] text-[#b79b85]/45">{page.content.en}</p>
                  </button>
                </td>
                <td className="px-4 py-3"><StatusPill label={page.status} /></td>
                <td className="px-4 py-3 text-[#b79b85]">{page.lastUpdated}</td>
                <td className="px-4 py-3 font-mono text-[#f5e6d8]">{page.version}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <IconButton title="Edit legal page" icon={Edit3} onClick={() => onOpen(page)} />
                    <IconButton title="Publish legal page" icon={Send} tone="green" onClick={() => onSave({ ...page, status: "Published", lastUpdated: TODAY, version: bumpVersion(page.version) }, "published legal page", "green")} />
                    <IconButton title="Preview legal page" icon={Eye} tone="gold" onClick={() => onOpen(page, true)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContactMessagesTab({
  messages,
  onOpen,
  onSave,
  onCopy,
}: {
  messages: CmsContactMessage[];
  onOpen: (message: CmsContactMessage) => void;
  onSave: (message: CmsContactMessage, activity: string, tone?: ActivityTone) => void;
  onCopy: (value: string, label: string) => void;
}) {
  const [filter, setFilter] = useState<ContactStatus | "All">("All");
  const filtered = messages
    .filter((message) => filter === "All" || message.status === filter)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="admin-surface overflow-hidden">
      <SectionTitle
        icon={Inbox}
        title="Customer inquiry inbox"
        right={
          <div className="flex max-w-full gap-1 overflow-x-auto">
            {(["All", ...CONTACT_STATUSES] as const).map((status) => {
              const active = filter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  className={`flex-shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    active ? "border-[#b6885e]/50 bg-[#b6885e]/20 text-[#f5e6d8] shadow-[0_0_0_1px_rgba(182,136,94,0.16)]" : "border-[#2a2018] text-[#b79b85]/65 hover:text-[#f5e6d8]"
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1220px] text-left text-xs">
          <thead>
            <tr className="border-b border-[#2a2018] bg-[#0b0806]/70 text-[10px] uppercase tracking-wider text-[#6b5744]">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">WhatsApp</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold">Subject</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Admin</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b140f]">
            {filtered.map((message) => (
              <tr key={message.id} className="transition-colors hover:bg-[#0b0806]/70">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onOpen(message)} className="text-left font-semibold text-[#f5e6d8]">{message.name}</button>
                </td>
                <td className="px-4 py-3 text-[#b79b85]">{message.phone}</td>
                <td className="px-4 py-3 text-[#b79b85]">{message.whatsApp}</td>
                <td className="px-4 py-3 text-[#b79b85]">{message.email}</td>
                <td className="px-4 py-3"><StatusPill label={message.source} /></td>
                <td className="px-4 py-3">
                  <p className="max-w-[240px] truncate text-[#f5e6d8]">{message.subject}</p>
                  <p className="mt-0.5 max-w-[240px] truncate text-[10px] text-[#6b5744]">{message.message}</p>
                </td>
                <td className="px-4 py-3"><StatusPill label={message.status} /></td>
                <td className="px-4 py-3 text-[#b79b85]">{message.assignedAdmin}</td>
                <td className="px-4 py-3 text-[#b79b85]">{message.date}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <IconButton title="Open inquiry" icon={Edit3} onClick={() => onOpen(message)} />
                    <IconButton title="Copy phone" icon={Clipboard} onClick={() => onCopy(message.phone, "Phone")} />
                    <IconButton title="Copy email" icon={Mail} onClick={() => onCopy(message.email, "Email")} />
                    <IconButton title="Mark in progress" icon={MessageSquare} tone="amber" onClick={() => onSave({ ...message, status: "In Progress" }, "started contact reply", "amber")} />
                    <IconButton title="Mark replied" icon={Check} tone="green" onClick={() => onSave({ ...message, status: "Replied" }, "replied to contact message", "green")} />
                    <IconButton title="Archive inquiry" icon={Archive} onClick={() => onSave({ ...message, status: "Archived" }, "archived contact message", "cream")} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CmsPage() {
  const { admin } = useCurrentAdmin();
  const currentAdminName = admin ? getAdminDisplayName(admin) : "";

  const [activeTab, setActiveTab] = useState<ActiveTab>("blog");
  const [articles, setArticles] = useState<CmsArticle[]>(CMS_ARTICLES);
  const [reviews, setReviews] = useState<CmsReview[]>(CMS_REVIEWS);
  const [legalPages, setLegalPages] = useState<CmsLegalPage[]>(CMS_LEGAL_PAGES);
  const [messages, setMessages] = useState<CmsContactMessage[]>(CMS_CONTACT_MESSAGES);
  const [activities, setActivities] = useState<CmsActivity[]>(CMS_ACTIVITY);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("Pending");
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const [articleDrawer, setArticleDrawer] = useState<CmsArticle | "new" | null>(null);
  const [reviewDrawer, setReviewDrawer] = useState<CmsReview | "new" | null>(null);
  const [legalDrawer, setLegalDrawer] = useState<{ page: CmsLegalPage; preview: boolean } | null>(null);
  const [contactDrawer, setContactDrawer] = useState<CmsContactMessage | null>(null);

  const health = useMemo(() => ({
    draftArticles: articles.filter((article) => article.status === "Draft").length,
    pendingReviews: reviews.filter((review) => review.status === "Pending" && !review.hidden).length,
    unansweredMessages: messages.filter((message) => message.status === "New" || message.status === "In Progress").length,
    legalDrafts: legalPages.filter((page) => page.status === "Draft").length,
  }), [articles, legalPages, messages, reviews]);

  const tabCounts = useMemo<Record<ActiveTab, number>>(() => ({
    blog: articles.length,
    reviews: reviews.filter((review) => !review.hidden).length,
    legal: legalPages.length,
    contact: messages.filter((message) => message.status !== "Archived").length,
  }), [articles.length, legalPages.length, messages, reviews]);

  const addActivity = (action: string, target: string, tone: ActivityTone = "gold") => {
    setActivities((current) => [
      {
        id: makeId("ACT"),
        actor: currentAdminName || "Current admin",
        action,
        target,
        time: "Just now",
        tone,
      },
      ...current,
    ].slice(0, 8));
  };

  const copyToClipboard = (value: string, label: string) => {
    void navigator.clipboard?.writeText(value).catch(() => undefined);
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(null), 1400);
  };

  const saveArticle = (article: CmsArticle, activity: string, tone: ActivityTone = "gold") => {
    setArticles((current) => {
      const exists = current.some((item) => item.id === article.id);
      return exists ? current.map((item) => (item.id === article.id ? article : item)) : [article, ...current];
    });
    addActivity(activity, article.title.en || "Untitled article", tone);
  };

  const duplicateArticle = (article: CmsArticle) => {
    const copy: CmsArticle = {
      ...article,
      id: makeId("ART"),
      slug: `${article.slug || slugify(article.title.en)}-copy`,
      title: {
        en: `${article.title.en} Copy`,
        ar: `${article.title.ar} نسخة`,
      },
      status: "Draft",
      featured: false,
      publishDate: undefined,
      views: 0,
    };
    setArticles((current) => [copy, ...current]);
    addActivity("duplicated article", article.title.en, "gold");
  };

  const deleteArticle = (article: CmsArticle) => {
    setArticles((current) => current.filter((item) => item.id !== article.id));
    addActivity("deleted article", article.title.en, "red");
  };

  const toggleArticlePublish = (article: CmsArticle) => {
    const published = article.status === "Published";
    saveArticle(
      {
        ...article,
        status: published ? "Draft" : "Published",
        publishDate: published ? undefined : article.publishDate || TODAY,
      },
      published ? "unpublished article" : "published article",
      published ? "amber" : "green",
    );
  };

  const toggleArticleFeatured = (article: CmsArticle) => {
    saveArticle(
      { ...article, featured: !article.featured },
      article.featured ? "unfeatured article" : "featured article",
      "gold",
    );
  };

  const saveReview = (review: CmsReview, activity: string, tone: ActivityTone = "gold") => {
    setReviews((current) => {
      const exists = current.some((item) => item.id === review.id);
      return exists ? current.map((item) => (item.id === review.id ? review : item)) : [review, ...current];
    });
    addActivity(activity, `${review.customer.name || "Customer"} / ${review.product || "Review"}`, tone);
  };

  const saveLegalPage = (page: CmsLegalPage, activity: string, tone: ActivityTone = "gold") => {
    setLegalPages((current) => current.map((item) => (item.id === page.id ? page : item)));
    addActivity(activity, page.page, tone);
  };

  const saveMessage = (message: CmsContactMessage, activity: string, tone: ActivityTone = "gold") => {
    setMessages((current) => current.map((item) => (item.id === message.id ? message : item)));
    addActivity(activity, message.subject, tone);
  };

  const drawerArticle = articleDrawer === "new" ? null : articleDrawer;
  const drawerReview = reviewDrawer === "new" ? null : reviewDrawer;

  if (!admin) {
    return (
      <div className="admin-surface p-6 text-sm text-[#b79b85]">
        Loading admin session...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#f5e6d8]" style={{ fontFamily: "var(--font-playfair)" }}>
            Content Operations Center
          </h1>
          <p className="mt-0.5 text-[13px] text-[#b79b85]/60">
            Blog content, public reviews, legal copy, and customer inquiries.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {copiedLabel && <span className="rounded-lg border border-[#4ade80]/25 bg-[#4ade80]/10 px-3 py-2 text-xs font-semibold text-[#4ade80]">{copiedLabel} copied</span>}
          <div className="inline-flex items-center gap-2 rounded-lg border border-[#2a2018] bg-[#15100b] px-3 py-2 text-xs text-[#b79b85]">
            <Globe2 size={13} className="text-[#b6885e]" />
            CMS manages content. Media Studio manages visual assets.
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="admin-surface overflow-hidden">
          <SectionTitle icon={FileText} title="Content health" />
          <div className="grid grid-cols-2 gap-3 p-3 lg:grid-cols-4">
            <KpiCard label="Draft Articles" value={health.draftArticles} icon={BookOpen} tone="amber" onClick={() => setActiveTab("blog")} />
            <KpiCard label="Pending Reviews" value={health.pendingReviews} icon={Star} tone="gold" onClick={() => setActiveTab("reviews")} />
            <KpiCard label="Unanswered Messages" value={health.unansweredMessages} icon={Inbox} tone="red" onClick={() => setActiveTab("contact")} />
            <KpiCard label="Legal Drafts" value={health.legalDrafts} icon={Gavel} tone={health.legalDrafts > 0 ? "amber" : "green"} onClick={() => setActiveTab("legal")} />
          </div>
        </div>

        <div className="admin-surface overflow-hidden">
          <SectionTitle icon={MessageSquare} title="Recent activity" />
          <div className="space-y-0 px-4 py-1.5">
            {activities.slice(0, 4).map((activity, index) => (
              <div key={activity.id} className="relative flex gap-3 py-2.5">
                {index < Math.min(activities.length, 4) - 1 && <span className="absolute left-[5px] top-6 h-[calc(100%-0.75rem)] w-px bg-[#2a2018]" />}
                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: ACTIVITY_STYLE[activity.tone] }} />
                <div className="min-w-0">
                  <p className="text-xs text-[#f5e6d8]">
                    <span className="font-semibold">{activity.actor}</span> {activity.action}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[#b79b85]/55">{activity.target} / {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto rounded-lg border border-[#2a2018] bg-[#0b0806]/35 p-1">
        {TAB_OPTIONS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex min-h-10 flex-shrink-0 items-center gap-2 rounded-md border px-4 text-xs font-semibold transition-colors ${
                active
                  ? "border-[#b6885e]/45 bg-[#b6885e]/20 text-[#f5e6d8] shadow-[inset_0_0_0_1px_rgba(214,163,115,0.10)]"
                  : "border-transparent text-[#b79b85]/60 hover:bg-white/[0.03] hover:text-[#f5e6d8]"
              }`}
            >
              <Icon size={14} />
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${active ? "bg-[#b6885e] text-[#0b0806]" : "bg-[#15100b] text-[#6b5744]"}`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === "blog" && (
        <BlogTab
          articles={articles}
          onCreate={() => setArticleDrawer("new")}
          onEdit={(article) => setArticleDrawer(article)}
          onDuplicate={duplicateArticle}
          onArchive={(article) => saveArticle({ ...article, status: "Archived" }, "archived article", "amber")}
          onDelete={deleteArticle}
          onTogglePublish={toggleArticlePublish}
          onToggleFeatured={toggleArticleFeatured}
        />
      )}

      {activeTab === "reviews" && (
        <ReviewsTab
          reviews={reviews}
          filter={reviewFilter}
          onFilterChange={setReviewFilter}
          onCreate={() => setReviewDrawer("new")}
          onOpen={(review) => setReviewDrawer(review)}
          onSave={saveReview}
        />
      )}

      {activeTab === "legal" && (
        <LegalPagesTab
          pages={legalPages}
          onOpen={(page, preview = false) => setLegalDrawer({ page, preview })}
          onSave={saveLegalPage}
        />
      )}

      {activeTab === "contact" && (
        <ContactMessagesTab
          messages={messages}
          onOpen={(message) => setContactDrawer(message)}
          onSave={saveMessage}
          onCopy={copyToClipboard}
        />
      )}

      {articleDrawer && (
        <ArticleDrawer
          article={drawerArticle}
          authorName={currentAdminName}
          onClose={() => setArticleDrawer(null)}
          onSave={saveArticle}
          onDuplicate={duplicateArticle}
          onDelete={deleteArticle}
        />
      )}

      {reviewDrawer && (
        <ReviewDrawer
          review={drawerReview}
          onClose={() => setReviewDrawer(null)}
          onSave={saveReview}
        />
      )}

      {legalDrawer && (
        <LegalDrawer
          page={legalDrawer.page}
          initialPreview={legalDrawer.preview}
          onClose={() => setLegalDrawer(null)}
          onSave={saveLegalPage}
        />
      )}

      {contactDrawer && (
        <ContactDrawer
          message={contactDrawer}
          onClose={() => setContactDrawer(null)}
          onSave={saveMessage}
          onCopy={copyToClipboard}
        />
      )}
    </div>
  );
}
