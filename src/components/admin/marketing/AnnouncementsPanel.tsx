"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Edit3,
  Megaphone,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteAnnouncement,
  listAnnouncements,
  saveAnnouncement,
  setAnnouncementActive,
  type Announcement,
  type AnnouncementInput,
} from "@/lib/admin/admin-announcements";

const inputClass =
  "w-full rounded-lg border border-[#2a2018] bg-[#0b0806] px-3 py-2.5 text-sm text-[#f5e6d8] outline-none transition-colors focus:border-[#b6885e]/60";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#b79b85]">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-[#6b5744]">{hint}</span>}
    </label>
  );
}

function AnnouncementModal({
  announcement,
  onClose,
  onSaved,
}: {
  announcement: Announcement | "new";
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const existing = announcement === "new" ? null : announcement;
  const [messageEn, setMessageEn] = useState(existing?.messageEn ?? "");
  const [messageAr, setMessageAr] = useState(existing?.messageAr ?? "");
  const [ctaLabelEn, setCtaLabelEn] = useState(existing?.ctaLabelEn ?? "Shop now");
  const [ctaLabelAr, setCtaLabelAr] = useState(existing?.ctaLabelAr ?? "تسوق الآن");
  const [ctaHref, setCtaHref] = useState(existing?.ctaHref ?? "/products");
  const [active, setActive] = useState(existing?.active ?? true);
  const [sortOrder, setSortOrder] = useState(
    existing?.sortOrder == null ? "0" : String(existing.sortOrder),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hrefValid = /^\/[A-Za-z0-9/_-]*$/.test(ctaHref.trim());
  const canSave =
    messageEn.trim().length > 0 && messageAr.trim().length > 0 && hrefValid;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    const payload: AnnouncementInput = {
      id: existing?.id,
      messageEn,
      messageAr,
      ctaLabelEn,
      ctaLabelAr,
      ctaHref,
      active,
      sortOrder: Number(sortOrder) || 0,
    };
    try {
      await saveAnnouncement(payload);
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save the announcement.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close announcement dialog"
        className="fixed inset-0 z-[300] bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-dialog-title"
        className="fixed left-1/2 top-1/2 z-[301] flex max-h-[90vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[#b6885e]/20 bg-[#120d09] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#2a2018] px-5 py-4">
          <div>
            <h2
              id="announcement-dialog-title"
              className="text-sm font-semibold text-[#f5e6d8]"
            >
              {existing ? "Edit announcement" : "New announcement"}
            </h2>
            <p className="mt-0.5 text-[11px] text-[#b79b85]/65">
              Shown in the public top bar with a &quot;Shop now&quot; button. Both
              languages are required.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={16} className="text-[#b79b85]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="admin-scrollbar grid gap-4 overflow-y-auto p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Message (English)" hint="Max 200 characters.">
                <input
                  value={messageEn}
                  maxLength={200}
                  onChange={(event) => setMessageEn(event.target.value)}
                  placeholder="Launch offers are live — shop now"
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Message (Arabic)" hint="بحد أقصى 200 حرف.">
                <input
                  value={messageAr}
                  maxLength={200}
                  dir="rtl"
                  onChange={(event) => setMessageAr(event.target.value)}
                  placeholder="عروض الافتتاح وصلت — تسوق الآن"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Button label (English)">
              <input
                value={ctaLabelEn}
                maxLength={40}
                onChange={(event) => setCtaLabelEn(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Button label (Arabic)">
              <input
                value={ctaLabelAr}
                maxLength={40}
                dir="rtl"
                onChange={(event) => setCtaLabelAr(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label="Button link"
              hint="Internal path only, e.g. /products or /products/turkish-silk."
            >
              <input
                value={ctaHref}
                maxLength={200}
                onChange={(event) => setCtaHref(event.target.value)}
                placeholder="/products"
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Sort order" hint="Lower numbers show first in rotation.">
              <input
                type="number"
                step="1"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2.5 text-sm text-[#f5e6d8]">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                  className="h-4 w-4 accent-[#b6885e]"
                />
                Active (shown on the public site)
              </label>
            </div>

            {!hrefValid && (
              <p className="text-xs text-[#fbbf24] md:col-span-2">
                Link must be an internal path that starts with &quot;/&quot;.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300 md:col-span-2"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-[#2a2018] px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#b79b85]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#b6885e] px-5 py-2 text-sm font-bold text-[#0b0806] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              {saving ? "Saving…" : existing ? "Save changes" : "Create announcement"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function AnnouncementsPanel() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [editing, setEditing] = useState<Announcement | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setItems(await listAnnouncements());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load announcements.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial authenticated admin fetch; the callback owns request state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const summary = useMemo(
    () => ({
      active: items.filter((item) => item.active).length,
      inactive: items.filter((item) => !item.active).length,
      total: items.length,
    }),
    [items],
  );

  async function handleSaved(message: string) {
    await load(true);
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 3000);
  }

  async function handleToggle(item: Announcement) {
    if (busyId) return;
    setBusyId(item.id);
    setError("");
    try {
      await setAnnouncementActive(item.id, !item.active);
      await handleSaved(item.active ? "Announcement hidden." : "Announcement is live.");
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not update the announcement.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: Announcement) {
    if (busyId) return;
    setBusyId(item.id);
    setError("");
    try {
      await deleteAnnouncement(item.id);
      setConfirmDeleteId(null);
      await handleSaved("Announcement deleted.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the announcement.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#93c5fd]/15 bg-[#93c5fd]/5 px-4 py-3">
        <div className="flex items-start gap-3">
          <Megaphone size={16} className="mt-0.5 shrink-0 text-[#93c5fd]" />
          <div>
            <p className="text-sm font-semibold text-[#f5e6d8]">
              These are the real public top-bar messages
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#b79b85]/70">
              Active messages rotate in the site header, each with its own
              &quot;Shop now&quot; button. If no message is active, the site shows the
              built-in launch messages so the bar is never blank.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Active", summary.active, "#4ade80"],
          ["Hidden", summary.inactive, "#b79b85"],
          ["Total", summary.total, "#b6885e"],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="admin-kpi-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b5744]">
              {label}
            </p>
            <p
              className="mt-2 text-xl font-bold tabular-nums"
              style={{ color: String(color) }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2018] px-3 py-2 text-xs font-semibold text-[#b79b85]"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : undefined} />
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#b6885e] px-3 py-2 text-xs font-bold text-[#0b0806]"
        >
          <Plus size={13} />
          New announcement
        </button>
      </div>

      {success && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-[#4ade80]/20 bg-[#4ade80]/10 px-3 py-2 text-xs text-[#4ade80]"
        >
          <Check size={13} />
          {success}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300"
        >
          <span>{error}</span>
          <button type="button" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      <div className="admin-surface overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#2a2018] px-4 py-3">
          <Megaphone size={14} className="text-[#b6885e]" />
          <h2 className="text-sm font-semibold text-[#f5e6d8]">Announcement bar</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-[#2a2018]">
                {["Order", "Message", "Button", "Status", "Actions"].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6b5744]"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b140f]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-[#b79b85]">
                    Loading announcements…
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-[#0b0806]/60">
                    <td className="px-4 py-3 text-xs font-semibold tabular-nums text-[#b79b85]">
                      {item.sortOrder}
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[360px] text-[#f5e6d8]">{item.messageEn}</p>
                      <p dir="rtl" className="mt-1 max-w-[360px] text-[12px] text-[#b79b85]/80">
                        {item.messageAr}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-[#f5e6d8]">{item.ctaLabelEn}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-[#6b5744]">
                        {item.ctaHref}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          item.active
                            ? "border-[#4ade80]/25 bg-[#4ade80]/10 text-[#4ade80]"
                            : "border-[#6b5744]/30 bg-[#2a2018] text-[#b79b85]"
                        }`}
                      >
                        {item.active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {confirmDeleteId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleDelete(item)}
                            disabled={busyId === item.id}
                            className="rounded-md border border-red-400/30 px-2.5 py-1.5 text-[10px] font-semibold text-red-300 disabled:opacity-40"
                          >
                            {busyId === item.id ? "Deleting…" : "Confirm"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-md border border-[#2a2018] px-2.5 py-1.5 text-[10px] font-semibold text-[#b79b85]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditing(item)}
                            aria-label="Edit announcement"
                            title="Edit"
                            className="grid h-7 w-7 place-items-center rounded-md border border-[#2a2018] text-[#93c5fd]"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggle(item)}
                            disabled={busyId === item.id}
                            className={`rounded-md border px-2.5 py-1.5 text-[10px] font-semibold ${
                              item.active
                                ? "border-[#fbbf24]/25 text-[#fbbf24]"
                                : "border-[#4ade80]/25 text-[#4ade80]"
                            } disabled:opacity-40`}
                          >
                            {busyId === item.id
                              ? "Saving…"
                              : item.active
                                ? "Hide"
                                : "Show"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            aria-label="Delete announcement"
                            title="Delete"
                            className="grid h-7 w-7 place-items-center rounded-md border border-[#2a2018] text-[#b79b85] hover:text-red-300"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && items.length === 0 && !error && (
          <div className="py-12 text-center">
            <AlertTriangle size={20} className="mx-auto text-[#6b5744]" />
            <p className="mt-2 text-xs text-[#b79b85]">
              No announcements yet. The site is showing the built-in launch
              messages until you add one.
            </p>
          </div>
        )}
      </div>

      {editing && (
        <AnnouncementModal
          key={editing === "new" ? "new" : editing.id}
          announcement={editing}
          onClose={() => setEditing(null)}
          onSaved={() => handleSaved("Announcement saved.")}
        />
      )}
    </div>
  );
}
