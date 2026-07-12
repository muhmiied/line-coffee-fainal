"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Coffee,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";
import {
  listEspressoBeans,
  upsertEspressoBean,
  type AdminEspressoBean,
  type EspressoBeanFamily,
} from "@/lib/admin/admin-espresso";

type BeanForm = {
  nameEn: string;
  nameAr: string;
  originEn: string;
  originAr: string;
  tasteHintEn: string;
  tasteHintAr: string;
  family: EspressoBeanFamily;
  salePricePerKg: string;
  purchaseCostPerKg: string;
  active: boolean;
  sortOrder: string;
};

function BeanEditor({
  bean,
  onClose,
  onSaved,
}: {
  bean: AdminEspressoBean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useAdminLanguage();
  const [form, setForm] = useState<BeanForm>({
    nameEn: bean.nameEn,
    nameAr: bean.nameAr,
    originEn: bean.originEn ?? "",
    originAr: bean.originAr ?? "",
    tasteHintEn: bean.tasteHintEn ?? "",
    tasteHintAr: bean.tasteHintAr ?? "",
    family: bean.family,
    salePricePerKg: String(bean.salePricePerKg),
    purchaseCostPerKg: bean.purchaseCostPerKg == null ? "" : String(bean.purchaseCostPerKg),
    active: bean.active,
    sortOrder: String(bean.sortOrder),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof BeanForm>(key: K, value: BeanForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function save() {
    const salePrice = Number(form.salePricePerKg);
    const purchaseCost = form.purchaseCostPerKg.trim()
      ? Number(form.purchaseCostPerKg)
      : null;
    const sortOrder = Number(form.sortOrder);
    if (
      !form.nameEn.trim() ||
      !form.nameAr.trim() ||
      !Number.isFinite(salePrice) ||
      salePrice < 0 ||
      (purchaseCost !== null && (!Number.isFinite(purchaseCost) || purchaseCost < 0)) ||
      !Number.isInteger(sortOrder)
    ) {
      setError(t("Enter valid names, prices, and display order."));
      return;
    }

    setSaving(true);
    setError("");
    try {
      await upsertEspressoBean({
        id: bean.id,
        beanKey: bean.beanKey,
        nameEn: form.nameEn.trim(),
        nameAr: form.nameAr.trim(),
        originEn: form.originEn.trim() || null,
        originAr: form.originAr.trim() || null,
        tasteHintEn: form.tasteHintEn.trim() || null,
        tasteHintAr: form.tasteHintAr.trim() || null,
        family: form.family,
        salePricePerKg: salePrice,
        purchaseCostPerKg: purchaseCost,
        active: form.active,
        sortOrder,
        metrics: bean.metrics,
      });
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("Could not save espresso bean."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("Close")}
        onClick={onClose}
        className="admin-modal-overlay fixed inset-0 z-40 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Edit espresso bean")}
        className="admin-drawer-surface fixed inset-y-0 end-0 z-50 w-full max-w-xl overflow-y-auto p-5 md:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="admin-label !text-[11px]" style={{ color: "var(--admin-hazelnut)" }}>
              {bean.beanKey}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold" style={{ color: "var(--admin-heading)" }}>
              {t("Edit espresso bean")}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="admin-btn admin-btn-sm !w-8 !h-8 !p-0">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Name (English)", form.nameEn, (value: string) => set("nameEn", value), "ltr"],
            ["Name (Arabic)", form.nameAr, (value: string) => set("nameAr", value), "rtl"],
            ["Origin (English)", form.originEn, (value: string) => set("originEn", value), "ltr"],
            ["Origin (Arabic)", form.originAr, (value: string) => set("originAr", value), "rtl"],
          ].map(([label, value, onChange, direction]) => (
            <label key={String(label)} className="block">
              <span className="admin-label mb-1.5 block !text-[11px] !normal-case !tracking-normal">{t(String(label))}</span>
              <input
                value={String(value)}
                dir={direction as "ltr" | "rtl"}
                onChange={(event) => (onChange as (value: string) => void)(event.target.value)}
                className="admin-input !text-sm"
              />
            </label>
          ))}

          <label className="block sm:col-span-2">
            <span className="admin-label mb-1.5 block !text-[11px] !normal-case !tracking-normal">{t("Taste hint (English)")}</span>
            <textarea value={form.tasteHintEn} rows={2} onChange={(event) => set("tasteHintEn", event.target.value)} className="admin-textarea !resize-none !text-sm" />
          </label>
          <label className="block sm:col-span-2">
            <span className="admin-label mb-1.5 block !text-[11px] !normal-case !tracking-normal">{t("Taste hint (Arabic)")}</span>
            <textarea dir="rtl" value={form.tasteHintAr} rows={2} onChange={(event) => set("tasteHintAr", event.target.value)} className="admin-textarea !resize-none !text-sm" />
          </label>
          <label className="block">
            <span className="admin-label mb-1.5 block !text-[11px] !normal-case !tracking-normal">{t("Family")}</span>
            <select value={form.family} onChange={(event) => set("family", event.target.value as EspressoBeanFamily)} className="admin-select !text-sm">
              <option value="arabica">Arabica</option>
              <option value="robusta">Robusta</option>
            </select>
          </label>
          <label className="block">
            <span className="admin-label mb-1.5 block !text-[11px] !normal-case !tracking-normal">{t("Display order")}</span>
            <input type="number" step="1" value={form.sortOrder} onChange={(event) => set("sortOrder", event.target.value)} className="admin-input !text-sm" />
          </label>
          <label className="block">
            <span className="admin-label mb-1.5 block !text-[11px] !normal-case !tracking-normal">{t("Sale price / kg")}</span>
            <input type="number" min="0" step="0.01" value={form.salePricePerKg} onChange={(event) => set("salePricePerKg", event.target.value)} className="admin-input !text-sm" />
          </label>
          <label className="block">
            <span className="admin-label mb-1.5 block !text-[11px] !normal-case !tracking-normal">{t("Purchase cost / kg")}</span>
            <input type="number" min="0" step="0.01" value={form.purchaseCostPerKg} onChange={(event) => set("purchaseCostPerKg", event.target.value)} className="admin-input !text-sm" />
          </label>
          <label className="admin-surface !shadow-none flex items-center justify-between px-3 py-3 sm:col-span-2 admin-text">
            <span className="text-sm">{t("Active in espresso catalog")}</span>
            <input type="checkbox" checked={form.active} onChange={(event) => set("active", event.target.checked)} className="h-4 w-4 accent-[#b6885e]" />
          </label>
        </div>

        <p className="mt-5 rounded-lg px-3 py-2 text-xs leading-5" style={{ background: "rgba(143,176,217,0.06)", border: "1px solid rgba(143,176,217,0.20)", color: "#8fb0d9" }}>
          {t("Blend metrics are preserved unchanged. Customer pricing and ratio formulas are not modified by this editor.")}
        </p>
        {error && <p role="alert" className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(227,154,140,0.10)", color: "#eeb4a8" }}>{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="admin-btn !px-4 !py-2 !text-sm">{t("Cancel")}</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="admin-btn admin-btn-primary flex items-center gap-2 !px-4 !py-2 !text-sm">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? t("Saving…") : t("Save Changes")}
          </button>
        </div>
      </div>
    </>
  );
}

export default function EspressoManagerPage() {
  const { currency, formatNumber, localize, t } = useAdminLanguage();
  const [beans, setBeans] = useState<AdminEspressoBean[]>([]);
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState<"all" | EspressoBeanFamily>("all");
  const [editing, setEditing] = useState<AdminEspressoBean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setBeans(await listEspressoBeans());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("Could not load espresso beans."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    // Initial client-side admin fetch; load owns its loading/error state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return beans.filter((bean) => {
      const matchesFamily = family === "all" || bean.family === family;
      const matchesQuery = `${bean.nameEn} ${bean.nameAr} ${bean.originEn ?? ""} ${bean.originAr ?? ""}`
        .toLowerCase()
        .includes(query);
      return matchesFamily && matchesQuery;
    });
  }, [beans, family, search]);

  const summary = {
    total: beans.length,
    active: beans.filter((bean) => bean.active).length,
    arabica: beans.filter((bean) => bean.family === "arabica").length,
    robusta: beans.filter((bean) => bean.family === "robusta").length,
  };

  async function saved() {
    await load(true);
    setSuccess(t("Espresso bean saved to Supabase."));
    window.setTimeout(() => setSuccess(""), 3000);
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="admin-label !text-[11px]" style={{ color: "var(--admin-hazelnut)" }}>{t("Make Your Espresso")}</p>
          <h1 className="admin-page-title mt-1 !text-2xl md:!text-3xl">{t("Espresso Manager")}</h1>
          <p className="admin-page-subtitle">{t("Real espresso_beans catalog and espresso_bean_stock balances. All edits persist.")}</p>
        </div>
        <button type="button" onClick={() => void load(true)} disabled={refreshing} className="admin-btn flex items-center gap-2 !px-3 !py-2 !text-xs">
          <RefreshCw size={13} className={refreshing ? "animate-spin" : undefined} />
          {t("Refresh")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [t("Total beans"), summary.total],
          [t("Active"), summary.active],
          ["Arabica", summary.arabica],
          ["Robusta", summary.robusta],
        ].map(([label, value]) => (
          <div key={String(label)} className="admin-kpi-card">
            <p className="admin-label">{label}</p>
            <p className="mt-2 text-xl font-bold tabular-nums" style={{ color: "var(--admin-hazelnut)" }}>{formatNumber(Number(value))}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-64 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 admin-faint" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search beans")} className="admin-input w-full !py-2 !pl-9 !pr-3 !text-sm" />
        </div>
        <select value={family} onChange={(event) => setFamily(event.target.value as "all" | EspressoBeanFamily)} className="admin-select !text-sm">
          <option value="all">{t("All families")}</option>
          <option value="arabica">Arabica</option>
          <option value="robusta">Robusta</option>
        </select>
      </div>

      {success && (
        <p role="status" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(143,207,154,0.10)", color: "#8fcf9a" }}>
          <CheckCircle2 size={14} />{success}
        </p>
      )}
      {error && (
        <div role="alert" className="flex items-center justify-between rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(227,154,140,0.10)", color: "#eeb4a8" }}>
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="admin-link">{t("Try again")}</button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin" style={{ color: "var(--admin-hazelnut)" }} /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((bean) => {
            const tracked = bean.stock != null;
            const available = bean.stock?.availableKg ?? 0;
            const threshold = bean.stock?.lowStockThresholdKg ?? 0;
            const status: "ok" | "low" | "out" = !tracked || available <= 0
              ? "out"
              : available <= threshold ? "low" : "ok";
            const statusStyle = status === "ok"
              ? { color: "#8fcf9a", background: "rgba(143,207,154,0.12)" }
              : status === "low"
                ? { color: "#e3b673", background: "rgba(227,182,115,0.12)" }
                : { color: "#e39a8c", background: "rgba(227,154,140,0.12)" };
            return (
              <article key={bean.id} className="admin-card !p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="admin-icon-chip !h-9 !w-9"><Coffee size={17} /></span>
                    <div>
                      <h2 className="font-semibold admin-text">{localize({ en: bean.nameEn, ar: bean.nameAr })}</h2>
                      <p className="mt-1 text-xs admin-faint">{localize({ en: bean.originEn, ar: bean.originAr }, bean.family)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="admin-badge"
                      style={bean.active ? { color: "#8fcf9a", background: "rgba(143,207,154,0.12)" } : { color: "var(--admin-faint)", background: "rgb(227 210 184 / 0.06)" }}
                    >
                      {bean.active ? t("Active") : t("Inactive")}
                    </span>
                    <span className="admin-badge" style={statusStyle}>
                      {status === "ok" ? "OK" : status === "low" ? t("Low") : t("Out")}
                    </span>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div><dt className="admin-faint">{t("Available")}</dt><dd className="mt-1 font-semibold admin-text">{formatNumber(available)} kg</dd></div>
                  <div><dt className="admin-faint">{t("Reserved")}</dt><dd className="mt-1 font-semibold" style={{ color: "#8fb0d9" }}>{formatNumber(bean.stock?.reservedKg ?? 0)} kg</dd></div>
                  <div><dt className="admin-faint">{t("Threshold")}</dt><dd className="mt-1 font-semibold admin-text">{formatNumber(threshold)} kg</dd></div>
                  <div><dt className="admin-faint">{t("Family")}</dt><dd className="mt-1 capitalize admin-text">{bean.family}</dd></div>
                  <div className="col-span-2"><dt className="admin-faint">{t("Sale price / kg")}</dt><dd className="mt-1 font-semibold" style={{ color: "var(--admin-hazelnut)" }}>{formatNumber(bean.salePricePerKg)} {currency}</dd></div>
                </dl>
                <button type="button" onClick={() => setEditing(bean)} className="admin-btn admin-btn-primary mt-4 flex items-center gap-2 !py-2 !text-xs">
                  <Pencil size={12} />{t("Edit")}
                </button>
              </article>
            );
          })}
          {filtered.length === 0 && (
            <div className="admin-empty-state col-span-full">
              <p className="text-sm admin-muted">{t("No beans found.")}</p>
            </div>
          )}
        </div>
      )}

      <p className="rounded-xl px-4 py-3 text-xs leading-5" style={{ background: "rgba(143,176,217,0.06)", border: "1px solid rgba(143,176,217,0.20)", color: "#8fb0d9" }}>
        {t("Available, reserved, and threshold values are real espresso_bean_stock balances. Add or remove bean kg with a stock movement in Inventory → Espresso Beans; ratio and pricing formulas are unchanged.")}
      </p>

      {editing && <BeanEditor bean={editing} onClose={() => setEditing(null)} onSaved={saved} />}
    </div>
  );
}
