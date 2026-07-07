"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CupSoda,
  Info,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";
import {
  listFlavorBases,
  listFlavorItems,
  upsertFlavorBase,
  upsertFlavorItem,
  type AdminFlavorBase,
  type AdminFlavorItem,
  type FlavorCategory,
} from "@/lib/admin/admin-flavor";

type EditTarget =
  | { kind: "base"; item: AdminFlavorBase }
  | { kind: "flavor"; item: AdminFlavorItem };

type FormState = {
  nameEn: string;
  nameAr: string;
  hintEn: string;
  hintAr: string;
  price: string;
  cost: string;
  category: FlavorCategory;
  active: boolean;
  sortOrder: string;
};

const CATEGORIES: FlavorCategory[] = [
  "chocolate",
  "fruits",
  "nuts",
  "desserts",
  "coffee-shisha",
];

function CatalogEditor({
  target,
  onClose,
  onSaved,
}: {
  target: EditTarget;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useAdminLanguage();
  const item = target.item;
  const [form, setForm] = useState<FormState>({
    nameEn: item.nameEn,
    nameAr: item.nameAr,
    hintEn: item.hintEn ?? "",
    hintAr: item.hintAr ?? "",
    price: String(
      target.kind === "base" ? target.item.pricePerKg : target.item.addOnPerKg,
    ),
    cost: item.costPerKg == null ? "" : String(item.costPerKg),
    category: target.kind === "flavor" ? target.item.category : "chocolate",
    active: item.active,
    sortOrder: String(item.sortOrder),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    const price = Number(form.price);
    const cost = form.cost.trim() ? Number(form.cost) : null;
    const sortOrder = Number(form.sortOrder);
    if (
      !form.nameEn.trim() ||
      !form.nameAr.trim() ||
      !Number.isFinite(price) ||
      price < 0 ||
      (cost !== null && (!Number.isFinite(cost) || cost < 0)) ||
      !Number.isInteger(sortOrder)
    ) {
      setError(t("Enter valid names, prices, and display order."));
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (target.kind === "base") {
        await upsertFlavorBase({
          id: target.item.id,
          baseKey: target.item.baseKey,
          nameEn: form.nameEn.trim(),
          nameAr: form.nameAr.trim(),
          hintEn: form.hintEn.trim() || null,
          hintAr: form.hintAr.trim() || null,
          pricePerKg: price,
          costPerKg: cost,
          active: form.active,
          sortOrder,
        });
      } else {
        await upsertFlavorItem({
          id: target.item.id,
          flavorKey: target.item.flavorKey,
          nameEn: form.nameEn.trim(),
          nameAr: form.nameAr.trim(),
          hintEn: form.hintEn.trim() || null,
          hintAr: form.hintAr.trim() || null,
          category: form.category,
          addOnPerKg: price,
          costPerKg: cost,
          metrics: target.item.metrics,
          active: form.active,
          sortOrder,
        });
      }
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("Could not save flavor catalog item."));
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
  const fieldStyle = {
    borderColor: "rgba(182,136,94,0.18)",
    background: "rgba(11,8,6,0.72)",
    color: "var(--cream)",
  };

  return (
    <>
      <button type="button" aria-label={t("Close")} onClick={onClose} className="fixed inset-0 z-40 cursor-default bg-black/65" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={target.kind === "base" ? t("Edit flavor base") : t("Edit flavor")}
        className="fixed inset-y-0 end-0 z-50 w-full max-w-xl overflow-y-auto border-s p-5 shadow-2xl md:p-7"
        style={{ borderColor: "rgba(182,136,94,0.2)", background: "#130e09" }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--gold)" }}>
              {target.kind === "base" ? target.item.baseKey : target.item.flavorKey}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold" style={{ color: "var(--cream)" }}>
              {target.kind === "base" ? t("Edit flavor base") : t("Edit flavor")}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="p-2"><X size={18} /></button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs text-[#B79B85]">{t("Name (English)")}</span>
            <input value={form.nameEn} onChange={(event) => set("nameEn", event.target.value)} className={fieldClass} style={fieldStyle} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-[#B79B85]">{t("Name (Arabic)")}</span>
            <input dir="rtl" value={form.nameAr} onChange={(event) => set("nameAr", event.target.value)} className={fieldClass} style={fieldStyle} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs text-[#B79B85]">{t("Description / hint (English)")}</span>
            <textarea rows={2} value={form.hintEn} onChange={(event) => set("hintEn", event.target.value)} className={`${fieldClass} resize-none`} style={fieldStyle} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs text-[#B79B85]">{t("Description / hint (Arabic)")}</span>
            <textarea dir="rtl" rows={2} value={form.hintAr} onChange={(event) => set("hintAr", event.target.value)} className={`${fieldClass} resize-none`} style={fieldStyle} />
          </label>
          {target.kind === "flavor" && (
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs text-[#B79B85]">{t("Category")}</span>
              <select value={form.category} onChange={(event) => set("category", event.target.value as FlavorCategory)} className={fieldClass} style={fieldStyle}>
                {CATEGORIES.map((category) => <option key={category} value={category}>{t(category.replace("-", " & "))}</option>)}
              </select>
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs text-[#B79B85]">
              {target.kind === "base" ? t("Base price / kg") : t("Add-on price / kg")}
            </span>
            <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => set("price", event.target.value)} className={fieldClass} style={fieldStyle} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-[#B79B85]">{t("Cost / kg")}</span>
            <input type="number" min="0" step="0.01" value={form.cost} onChange={(event) => set("cost", event.target.value)} className={fieldClass} style={fieldStyle} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-[#B79B85]">{t("Display order")}</span>
            <input type="number" step="1" value={form.sortOrder} onChange={(event) => set("sortOrder", event.target.value)} className={fieldClass} style={fieldStyle} />
          </label>
          <label className="flex items-center justify-between rounded-lg border px-3 py-3" style={{ borderColor: "rgba(182,136,94,0.12)" }}>
            <span className="text-sm">{t("Active")}</span>
            <input type="checkbox" checked={form.active} onChange={(event) => set("active", event.target.checked)} className="h-4 w-4 accent-[#b6885e]" />
          </label>
        </div>

        <p className="mt-5 rounded-lg border border-blue-300/10 bg-blue-300/5 px-3 py-2 text-xs leading-5 text-blue-100/80">
          {t("This editor updates the existing flavor catalog only. It does not alter checkout formulas or add French Coffee to the builder.")}
        </p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-300">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm">{t("Cancel")}</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50" style={{ background: "rgba(182,136,94,0.18)", color: "var(--gold)" }}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? t("Saving…") : t("Save Changes")}
          </button>
        </div>
      </div>
    </>
  );
}

export default function FlavorManagerPage() {
  const { currency, formatNumber, localize, t } = useAdminLanguage();
  const [tab, setTab] = useState<"bases" | "flavors">("bases");
  const [bases, setBases] = useState<AdminFlavorBase[]>([]);
  const [flavors, setFlavors] = useState<AdminFlavorItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | FlavorCategory>("all");
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [nextBases, nextFlavors] = await Promise.all([
        listFlavorBases(),
        listFlavorItems(),
      ]);
      setBases(nextBases);
      setFlavors(nextFlavors);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("Could not load flavor catalog."));
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

  const filteredFlavors = useMemo(() => {
    const query = search.trim().toLowerCase();
    return flavors.filter((flavor) => {
      const matchesCategory = category === "all" || flavor.category === category;
      const matchesSearch = `${flavor.nameEn} ${flavor.nameAr} ${flavor.flavorKey}`
        .toLowerCase()
        .includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, flavors, search]);

  async function saved() {
    await load(true);
    setSuccess(t("Flavor catalog item saved to Supabase."));
    window.setTimeout(() => setSuccess(""), 3000);
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--gold)" }}>{t("Make Your Flavor")}</p>
          <h1 className="mt-1 font-serif text-2xl font-bold md:text-3xl" style={{ color: "var(--cream)" }}>{t("Flavor Manager")}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--cream-dim)" }}>{t("Real flavor_bases and flavor_items catalog. All edits persist.")}</p>
        </div>
        <button type="button" onClick={() => void load(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: "rgba(182,136,94,0.16)", color: "var(--cream-dim)" }}>
          <RefreshCw size={13} className={refreshing ? "animate-spin" : undefined} />
          {t("Refresh")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [t("Flavor bases"), bases.length],
          [t("Active bases"), bases.filter((base) => base.active).length],
          [t("Flavor add-ons"), flavors.length],
          [t("Active flavors"), flavors.filter((flavor) => flavor.active).length],
        ].map(([label, value]) => (
          <div key={String(label)} className="admin-kpi-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)" }}>{label}</p>
            <p className="mt-2 text-xl font-bold" style={{ color: "var(--gold)" }}>{formatNumber(Number(value))}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("bases")} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: tab === "bases" ? "rgba(182,136,94,0.32)" : "rgba(182,136,94,0.1)", background: tab === "bases" ? "rgba(182,136,94,0.12)" : "transparent", color: tab === "bases" ? "var(--gold)" : "var(--cream-dim)" }}><CupSoda size={14} />{t("Bases")}</button>
        <button type="button" onClick={() => setTab("flavors")} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: tab === "flavors" ? "rgba(182,136,94,0.32)" : "rgba(182,136,94,0.1)", background: tab === "flavors" ? "rgba(182,136,94,0.12)" : "transparent", color: tab === "flavors" ? "var(--gold)" : "var(--cream-dim)" }}><Sparkles size={14} />{t("Flavor add-ons")}</button>
      </div>

      {tab === "flavors" && (
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-64 flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B79B85]" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search flavors")} className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm" style={{ borderColor: "rgba(182,136,94,0.14)", background: "rgba(255,255,255,0.025)" }} />
          </div>
          <select value={category} onChange={(event) => setCategory(event.target.value as "all" | FlavorCategory)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "rgba(182,136,94,0.14)", background: "#130e09" }}>
            <option value="all">{t("All categories")}</option>
            {CATEGORIES.map((item) => <option key={item} value={item}>{t(item.replace("-", " & "))}</option>)}
          </select>
        </div>
      )}

      {success && <p role="status" className="flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2 text-xs text-green-300"><CheckCircle2 size={14} />{success}</p>}
      {error && <div role="alert" className="flex items-center justify-between rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-300"><span>{error}</span><button type="button" onClick={() => void load()}>{t("Try again")}</button></div>}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin" style={{ color: "var(--gold)" }} /></div>
      ) : tab === "bases" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {bases.map((base) => (
            <article key={base.id} className="rounded-xl border border-[#B6885E]/12 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#B6885E]/10 text-[#D6A373]"><CupSoda size={17} /></span>
                <span className={base.active ? "rounded-full bg-green-400/10 px-2 py-1 text-[10px] text-green-300" : "rounded-full bg-white/5 px-2 py-1 text-[10px] text-[#B79B85]"}>{base.active ? t("Active") : t("Inactive")}</span>
              </div>
              <h2 className="mt-4 font-semibold">{localize({ en: base.nameEn, ar: base.nameAr })}</h2>
              <p className="mt-1 text-xs text-[#B79B85]">{base.baseKey}</p>
              <p className="mt-3 text-sm font-semibold text-[#D6A373]">{formatNumber(base.pricePerKg)} {currency} / kg</p>
              <button type="button" onClick={() => setEditing({ kind: "base", item: base })} className="mt-4 flex items-center gap-2 rounded-lg bg-[#B6885E]/10 px-3 py-2 text-xs font-semibold text-[#D6A373]"><Pencil size={12} />{t("Edit")}</button>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredFlavors.map((flavor) => (
            <article key={flavor.id} className="rounded-xl border border-[#B6885E]/12 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{localize({ en: flavor.nameEn, ar: flavor.nameAr })}</h2>
                  <p className="mt-1 text-xs text-[#B79B85]">{t(flavor.category.replace("-", " & "))}</p>
                </div>
                <span className={flavor.active ? "rounded-full bg-green-400/10 px-2 py-1 text-[10px] text-green-300" : "rounded-full bg-white/5 px-2 py-1 text-[10px] text-[#B79B85]"}>{flavor.active ? t("Active") : t("Inactive")}</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-[#D6A373]">+{formatNumber(flavor.addOnPerKg)} {currency} / kg</p>
              <p className="mt-1 text-[10px] text-[#B79B85]">{flavor.flavorKey} · {t("Order")} {formatNumber(flavor.sortOrder)}</p>
              <button type="button" onClick={() => setEditing({ kind: "flavor", item: flavor })} className="mt-4 flex items-center gap-2 rounded-lg bg-[#B6885E]/10 px-3 py-2 text-xs font-semibold text-[#D6A373]"><Pencil size={12} />{t("Edit")}</button>
            </article>
          ))}
          {filteredFlavors.length === 0 && <p className="text-sm text-[#B79B85]">{t("No flavors found.")}</p>}
        </div>
      )}

      <div className="space-y-2">
        <p className="flex items-start gap-2 rounded-xl border border-amber-300/12 bg-amber-300/5 px-4 py-3 text-xs leading-5 text-amber-100/85">
          <Info size={14} className="mt-0.5 shrink-0" />
          {t("Flavor bases and add-ons are catalog and pricing only — they are not stock-tracked. No inventory is deducted for Make Your Flavor, so no stock or low-stock figures are shown here.")}
        </p>
        <p className="rounded-xl border border-blue-300/10 bg-blue-300/5 px-4 py-3 text-xs leading-5 text-blue-100/80">
          {t("French Coffee remains a standalone catalog product and is not included in the flavor builder bases.")}
        </p>
      </div>

      {editing && <CatalogEditor target={editing} onClose={() => setEditing(null)} onSaved={saved} />}
    </div>
  );
}
