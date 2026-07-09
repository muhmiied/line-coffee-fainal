import type { LocalizedValue } from "@/lib/context/language";

// Shared shapes for the checkout form + its section components.

export type FormData = {
  name:          string;
  phone:         string;
  whatsapp:      string;
  email:         string;
  governorate:   string;
  area:          string;
  manualArea:    string;
  street:        string;
  building:      string;
  floorApt:      string;
  googleMapsUrl: string;
  paymentMethod: "cash" | "instapay" | "e-wallet";
  paymentReference: string;
  paymentPhone:     string;
};

export type FormErrors = Partial<Record<keyof FormData, string>>;

export const EMPTY_FORM: FormData = {
  name: "", phone: "", whatsapp: "", email: "",
  governorate: "", area: "", manualArea: "",
  street: "", building: "", floorApt: "",
  googleMapsUrl: "",
  paymentMethod: "cash",
  paymentReference: "", paymentPhone: "",
};

export type TranslateFn = (value: LocalizedValue) => string;

export type SelectOption = { value: string; label: string };

export type DeliveryZonePreview = { fee: number; zone: string } | null;
