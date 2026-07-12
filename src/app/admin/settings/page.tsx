"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  Info,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Save,
  Share2,
  Store,
} from "lucide-react";
import {
  getAdminSettings,
  saveAdminSettings,
  DEFAULT_ADMIN_SETTINGS,
  AdminSettingsError,
  type AdminSettings,
} from "@/lib/admin/admin-settings";

// ---------------------------------------------------------------------------
// Presentational helpers (module-level for static-components lint rule)
// ---------------------------------------------------------------------------

function Surface({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="admin-surface p-5 md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="admin-icon-chip !h-9 !w-9">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="admin-card-title !text-sm" style={{ fontFamily: "var(--font-playfair)" }}>
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed admin-muted">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  dir,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  dir?: "ltr" | "rtl";
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="admin-label mb-1.5 block !text-[11px] !tracking-wide">
        {label}
      </span>
      <input
        type={type}
        value={value}
        dir={dir}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="admin-input !text-sm"
      />
      {hint && <span className="mt-1 block text-[11px] admin-faint">{hint}</span>}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="admin-label mb-1.5 block !text-[11px] !tracking-wide">
        {label}
      </span>
      <textarea
        value={value}
        rows={3}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="admin-textarea !resize-y !text-sm"
      />
      {hint && <span className="mt-1 block text-[11px] admin-faint">{hint}</span>}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked ? "true" : "false"}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3"
    >
      <span
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
        style={{ background: checked ? "linear-gradient(90deg, #6fb87e, #8fcf9a)" : "var(--admin-border-strong)" }}
      >
        <span
          className="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: checked ? "translateX(24px)" : "translateX(4px)" }}
        />
      </span>
      <span className="text-sm admin-text">
        {label}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminSettingsPage() {
  const [initial, setInitial] = useState<AdminSettings | null>(null);
  const [form, setForm] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getAdminSettings();
      setInitial(data);
      setForm(data);
    } catch (err) {
      const message =
        err instanceof AdminSettingsError ? err.message : "Could not load settings.";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const dirty = initial !== null && JSON.stringify(initial) !== JSON.stringify(form);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await saveAdminSettings(form);
      const fresh = await getAdminSettings();
      setInitial(fresh);
      setForm(fresh);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
    } catch (err) {
      const message =
        err instanceof AdminSettingsError ? err.message : "Could not save settings.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" style={{ color: "var(--admin-hazelnut)" }} />
          <p className="text-sm admin-muted">Loading settings…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="admin-drawer-surface w-full max-w-sm rounded-2xl p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-7 w-7" style={{ color: "#e3b673" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--admin-heading)" }}>Couldn’t load settings</p>
          <p className="mt-1.5 text-xs leading-relaxed admin-muted">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="premium-button mt-5 w-full rounded-lg py-2.5 text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="admin-page-title !text-lg">
            Store Settings
          </h1>
          <p className="mt-0.5 text-xs admin-muted">
            Your store details, saved to Supabase.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void load()} disabled={saving} className="admin-btn flex items-center gap-1.5 !px-3 !py-2 !text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!dirty || saving}
            className="premium-button flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Honest info line */}
      <div
        className="mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3"
        style={{ borderColor: "rgba(143,176,217,0.24)", background: "rgba(143,176,217,0.06)" }}
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#8fb0d9" }} />
        <p className="text-xs leading-relaxed admin-text">
          These are your real store settings and are saved to the database. Delivery
          fees are still calculated by the checkout engine and are not editable here.
          The store-status flag is stored for reference and is not yet enforced at
          checkout.
        </p>
      </div>

      {/* Banners */}
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-300">
          <Check className="h-4 w-4" /> Settings saved.
        </div>
      )}
      {saveError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4" /> {saveError}
        </div>
      )}

      <div className="space-y-5">
        {/* Store details */}
        <Surface
          title="Store details"
          description="The store name and default currency."
          icon={<Store className="h-4 w-4" />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Store name"
              value={form.brand.storeName}
              onChange={(v) =>
                setForm((f) => ({ ...f, brand: { ...f.brand, storeName: v } }))
              }
              placeholder="Line Coffee"
            />
            <Field
              label="Default currency"
              value={form.brand.defaultCurrency}
              onChange={(v) =>
                setForm((f) => ({ ...f, brand: { ...f.brand, defaultCurrency: v } }))
              }
              placeholder="EGP"
              hint="The storefront currently displays prices in EGP."
            />
          </div>
        </Surface>

        {/* Contact */}
        <Surface
          title="Contact"
          description="How customers reach your store. These are public support details."
          icon={<Phone className="h-4 w-4" />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Support email"
              type="email"
              dir="ltr"
              value={form.contact.supportEmail}
              onChange={(v) =>
                setForm((f) => ({ ...f, contact: { ...f.contact, supportEmail: v } }))
              }
              placeholder="hello@linecoffee.eg"
            />
            <Field
              label="Support phone"
              type="tel"
              dir="ltr"
              value={form.contact.supportPhone}
              onChange={(v) =>
                setForm((f) => ({ ...f, contact: { ...f.contact, supportPhone: v } }))
              }
              placeholder="+20 100 476 1171"
            />
            <Field
              label="WhatsApp number"
              type="tel"
              dir="ltr"
              value={form.contact.whatsappNumber}
              onChange={(v) =>
                setForm((f) => ({ ...f, contact: { ...f.contact, whatsappNumber: v } }))
              }
              placeholder="+20 100 476 1171"
            />
            <div className="sm:col-span-2">
              <TextAreaField
                label="Business address"
                value={form.contact.businessAddress}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    contact: { ...f.contact, businessAddress: v },
                  }))
                }
                placeholder="Cairo, Egypt"
              />
            </div>
          </div>
        </Surface>

        {/* Social links */}
        <Surface
          title="Social links"
          description="Public profile links for your brand."
          icon={<Share2 className="h-4 w-4" />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Facebook"
              dir="ltr"
              value={form.social.facebook}
              onChange={(v) =>
                setForm((f) => ({ ...f, social: { ...f.social, facebook: v } }))
              }
              placeholder="https://facebook.com/linecoffee"
            />
            <Field
              label="Instagram"
              dir="ltr"
              value={form.social.instagram}
              onChange={(v) =>
                setForm((f) => ({ ...f, social: { ...f.social, instagram: v } }))
              }
              placeholder="https://instagram.com/linecoffee.eg"
            />
            <Field
              label="TikTok"
              dir="ltr"
              value={form.social.tiktok}
              onChange={(v) =>
                setForm((f) => ({ ...f, social: { ...f.social, tiktok: v } }))
              }
              placeholder="https://www.tiktok.com/@linecoffee"
            />
            <Field
              label="YouTube"
              dir="ltr"
              value={form.social.youtube}
              onChange={(v) =>
                setForm((f) => ({ ...f, social: { ...f.social, youtube: v } }))
              }
              placeholder="https://youtube.com/@linecoffee"
            />
            <div className="sm:col-span-2">
              <Field
                label="WhatsApp link"
                dir="ltr"
                value={form.social.whatsapp}
                onChange={(v) =>
                  setForm((f) => ({ ...f, social: { ...f.social, whatsapp: v } }))
                }
                placeholder="https://wa.me/201004761171"
              />
            </div>
          </div>
        </Surface>

        {/* Store status */}
        <Surface
          title="Store status"
          description="Stored for reference. This flag is not yet enforced at checkout."
          icon={<MessageCircle className="h-4 w-4" />}
        >
          <div className="space-y-4">
            <Toggle
              checked={form.storefront.storeOpen}
              onChange={(next) =>
                setForm((f) => ({ ...f, storefront: { ...f.storefront, storeOpen: next } }))
              }
              label={form.storefront.storeOpen ? "Store is open" : "Store is closed"}
            />
            <TextAreaField
              label="Closed notice"
              value={form.storefront.closedNotice}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  storefront: { ...f.storefront, closedNotice: v },
                }))
              }
              placeholder="We’re taking a short break — back soon."
              hint="Message you plan to show while the store is closed."
            />
          </div>
        </Surface>

        {/* Footer note */}
        <div className="flex items-center gap-2 px-1 text-[11px] admin-faint">
          <MapPin className="h-3.5 w-3.5" />
          <span>All fields above are saved to your store settings in Supabase.</span>
        </div>
      </div>
    </div>
  );
}
