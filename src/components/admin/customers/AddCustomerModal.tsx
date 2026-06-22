"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { type AdminCustomer, type CustomerAddress } from "@/lib/mock-data/admin/customers-mock";

const ANCHOR = "2026-06-21";

const EGYPT_GOVS = [
  "Cairo", "Giza", "Alexandria", "Sharqia", "Mansoura / Dakahlia",
  "Gharbia", "Menufia", "Qalyubia", "Beheira", "Kafr El-Sheikh",
  "Ismailia", "Suez", "Port Said", "Damietta", "Faiyum",
  "Beni Suef", "Minya", "Asyut", "Sohag", "Qena", "Luxor",
  "Aswan", "Red Sea", "Matruh", "North Sinai", "South Sinai", "New Valley",
];

interface FormState {
  name:            string;
  phone:           string;
  whatsapp:        string;
  email:           string;
  type:            "guest" | "registered";
  marketingOptIn:  boolean;
  notes:           string;
  govAddressOpen:  boolean;
  governorate:     string;
  city:            string;
  area:            string;
  streetAddress:   string;
  buildingName:    string;
  floor:           string;
  apartment:       string;
  landmark:        string;
}

const EMPTY: FormState = {
  name: "", phone: "", whatsapp: "", email: "",
  type: "guest", marketingOptIn: false, notes: "",
  govAddressOpen: false,
  governorate: "", city: "", area: "", streetAddress: "",
  buildingName: "", floor: "", apartment: "", landmark: "",
};

interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  onSave:    (customer: AdminCustomer) => void;
  nextId:    string;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--cream-dim)", opacity: 0.55, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}{required && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 12.5,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.12)",
  color: "var(--cream)", outline: "none", fontFamily: "inherit",
};

export default function AddCustomerModal({ isOpen, onClose, onSave, nextId }: Props) {
  const [form,   setForm]   = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saved,  setSaved]  = useState(false);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim())  e.name  = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    if (form.type === "registered" && !form.email.trim()) e.email = "Email required for registered customers";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    const wa = form.whatsapp.trim() || form.phone.trim();

    const addresses: CustomerAddress[] = form.streetAddress.trim() ? [{
      id:            `A-${nextId}-1`,
      label:         "Home",
      governorate:   form.governorate || "—",
      city:          form.city.trim() || "—",
      area:          form.area.trim() || undefined,
      streetAddress: form.streetAddress.trim(),
      buildingName:  form.buildingName.trim() || undefined,
      floor:         form.floor.trim() || undefined,
      apartment:     form.apartment.trim() || undefined,
      landmark:      form.landmark.trim() || undefined,
      isDefault:     true,
    }] : [];

    const newCustomer: AdminCustomer = {
      id:                nextId,
      name:              form.name.trim(),
      phone:             form.phone.trim(),
      whatsapp:          wa,
      email:             form.type === "registered" ? form.email.trim() : (form.email.trim() || undefined),
      type:              form.type,
      joinedAt:          ANCHOR,
      lastOrderDate:     undefined,
      ordersCount:       0,
      totalSpent:        0,
      averageOrderValue: 0,
      tags:              [],
      addresses,
      recentOrders:      [],
      activity: [
        {
          id:          `ACT-${nextId}-1`,
          date:        ANCHOR,
          type:        "customer-created",
          title:       "Customer Added Manually",
          description: "Added by admin via Add Customer form",
        },
      ],
      notes:           form.notes.trim() || undefined,
      marketingOptIn:  form.marketingOptIn,
      promoUsageCount: 0,
    };

    onSave(newCustomer);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setForm(EMPTY);
      setErrors({});
      onClose();
    }, 900);
  }

  function handleClose() {
    setForm(EMPTY);
    setErrors({});
    setSaved(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200 }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: "clamp(340px,92vw,580px)",
        maxHeight: "90vh", overflowY: "auto",
        background: "var(--coffee-dark)",
        border: "1px solid rgba(182,136,94,0.15)",
        borderRadius: 16, zIndex: 201,
        boxShadow: "0 24px 80px rgba(0,0,0,0.70)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid rgba(182,136,94,0.10)" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--cream)", fontFamily: "var(--font-playfair)", margin: 0 }}>Add Customer</h2>
            <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.45, margin: "3px 0 0" }}>Mock only — lost on page refresh</p>
          </div>
          <button type="button" onClick={handleClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--cream-dim)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Type toggle */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(["guest", "registered"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => set("type", t)}
                aria-pressed={form.type === t ? "true" : "false"}
                style={{
                  padding: "9px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                  background: form.type === t ? "rgba(182,136,94,0.15)" : "rgba(255,255,255,0.03)",
                  color: form.type === t ? "var(--gold)" : "var(--cream-dim)",
                  border: form.type === t ? "1px solid rgba(182,136,94,0.28)" : "1px solid rgba(182,136,94,0.08)",
                  textTransform: "capitalize", transition: "all 150ms",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Name */}
          <Field label="Name" required>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" style={{ ...inputStyle, borderColor: errors.name ? "#f87171" : "rgba(182,136,94,0.12)" }} />
            {errors.name && <p style={{ fontSize: 10.5, color: "#f87171", marginTop: 3 }}>{errors.name}</p>}
          </Field>

          {/* Phone + WhatsApp */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Phone" required>
              <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+20 1xx xxx xxxx" dir="ltr" style={{ ...inputStyle, borderColor: errors.phone ? "#f87171" : "rgba(182,136,94,0.12)" }} />
              {errors.phone && <p style={{ fontSize: 10.5, color: "#f87171", marginTop: 3 }}>{errors.phone}</p>}
            </Field>
            <Field label="WhatsApp">
              <input type="tel" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="Defaults to phone" dir="ltr" style={inputStyle} />
            </Field>
          </div>

          {/* Email */}
          <Field label={`Email${form.type === "registered" ? "" : " (optional)"}`} required={form.type === "registered"}>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder={form.type === "registered" ? "customer@email.com" : "Optional"} dir="ltr" style={{ ...inputStyle, borderColor: errors.email ? "#f87171" : "rgba(182,136,94,0.12)" }} />
            {errors.email && <p style={{ fontSize: 10.5, color: "#f87171", marginTop: 3 }}>{errors.email}</p>}
          </Field>

          {/* Marketing opt-in */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.marketingOptIn}
              onChange={e => set("marketingOptIn", e.target.checked)}
              style={{ width: 15, height: 15, accentColor: "var(--gold)", cursor: "pointer" }}
            />
            <span style={{ fontSize: 12.5, color: "var(--cream-dim)" }}>Marketing opt-in</span>
          </label>

          {/* Notes */}
          <Field label="Internal Notes (optional)">
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              rows={2}
              placeholder="Notes visible only to admin team…"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>

          {/* Address section (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => set("govAddressOpen", !form.govAddressOpen)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--gold)", fontSize: 12.5, fontWeight: 600, padding: 0 }}
            >
              {form.govAddressOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {form.govAddressOpen ? "Hide Address Fields" : "+ Add Address (optional)"}
            </button>

            {form.govAddressOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, padding: "14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(182,136,94,0.08)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Governorate">
                    <select
                      value={form.governorate}
                      onChange={e => set("governorate", e.target.value)}
                      style={{ ...inputStyle, colorScheme: "dark" }}
                    >
                      <option value="">Select governorate</option>
                      {EGYPT_GOVS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="City">
                    <input type="text" value={form.city} onChange={e => set("city", e.target.value)} placeholder="City / District" style={inputStyle} />
                  </Field>
                </div>
                <Field label="Area">
                  <input type="text" value={form.area} onChange={e => set("area", e.target.value)} placeholder="Area (optional)" style={inputStyle} />
                </Field>
                <Field label="Street Address">
                  <input type="text" value={form.streetAddress} onChange={e => set("streetAddress", e.target.value)} placeholder="Street name and number" style={inputStyle} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <Field label="Building">
                    <input type="text" value={form.buildingName} onChange={e => set("buildingName", e.target.value)} placeholder="Building name" style={inputStyle} />
                  </Field>
                  <Field label="Floor">
                    <input type="text" value={form.floor} onChange={e => set("floor", e.target.value)} placeholder="Floor" style={inputStyle} />
                  </Field>
                  <Field label="Apt.">
                    <input type="text" value={form.apartment} onChange={e => set("apartment", e.target.value)} placeholder="Apt." style={inputStyle} />
                  </Field>
                </div>
                <Field label="Landmark">
                  <input type="text" value={form.landmark} onChange={e => set("landmark", e.target.value)} placeholder="Landmark (optional)" style={inputStyle} />
                </Field>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px 18px", borderTop: "1px solid rgba(182,136,94,0.10)" }}>
          <button type="button" onClick={handleClose} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12.5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(182,136,94,0.10)", color: "var(--cream-dim)", cursor: "pointer" }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: "8px 22px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              background: saved ? "rgba(74,222,128,0.15)" : "rgba(182,136,94,0.15)",
              color: saved ? "#4ade80" : "var(--gold)",
              border: saved ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(182,136,94,0.25)",
              transition: "all 200ms",
            }}
          >
            {saved ? "✓ Customer Added" : "Add Customer"}
          </button>
        </div>
      </div>
    </>
  );
}
