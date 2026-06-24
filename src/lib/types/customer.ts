// Line Coffee V3 — Launch-Core Data Contracts
// customer.ts — canonical customer + address contract.
//
// Phase 3A, Part A. Type-only. Additive. Not yet imported anywhere.
// Unifies the multiple customer/address shapes (admin `AdminCustomer` +
// `CustomerAddress`, customer-account `MockAddress`, and the inline
// `AdminOrder.address`) into one launch shape, and adds order-time snapshot
// shapes so an order can freeze customer/address details at purchase time.

import type {
  ID,
  ISODate,
  ISODateTime,
  LocalizedValue,
} from "@/lib/types/common";

// Guests are valid customers in Line Coffee. A registered customer is linked to
// an auth account; a guest is not.
export type CustomerType = "guest" | "registered";

// Account standing. Segments (VIP / Repeat / etc.) are computed elsewhere and
// are NOT stored on the customer — this is only the hard account state.
export type CustomerStatus = "active" | "inactive" | "blocked";

// A saved delivery address belonging to a customer.
// Supabase mapping: `customer_addresses` table.
export interface CustomerAddress {
  id: ID;
  customerId: ID;
  // Short label chosen by the customer, e.g. "Home", "Work".
  label: LocalizedValue | string;
  recipientName?: string;
  phone?: string;
  whatsapp?: string;
  governorate: string;
  city: string;
  area?: string;
  street: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  isDefault: boolean;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// The canonical customer. Read/written by signup, login, checkout, account
// pages, and admin Customers.
// Supabase mapping: `customers` table (FK `authUserId` → Supabase Auth user).
export interface Customer {
  id: ID;
  // Link to the Supabase Auth user; null/absent for guests.
  authUserId?: string | null;
  type: CustomerType;
  status: CustomerStatus;
  name: string;
  email?: string;
  phone?: string;
  // WhatsApp is the primary contact channel and is required.
  whatsapp: string;
  avatarUrl?: string;
  marketingOptIn: boolean;
  // Descriptive admin tags. Do not override computed segments (except the
  // Wholesale Potential signal). See business rules in CURRENT_STATE.
  tags: string[];
  defaultAddressId?: ID;
  addresses?: CustomerAddress[];
  joinedAt: ISODate;
  updatedAt?: ISODateTime;
}

// Frozen copy of the customer's identity at the moment an order is placed.
// Stored on the order so later edits to the customer record don't rewrite history.
// Supabase mapping: snapshot columns on `orders`.
export interface CustomerSnapshot {
  // Link back to the customer record when one exists (absent for pure guests).
  customerId?: ID;
  name: string;
  email?: string;
  phone?: string;
  whatsapp: string;
  type: CustomerType;
}

// Frozen copy of the delivery address at the moment an order is placed.
// Supabase mapping: snapshot columns on `orders`.
export interface AddressSnapshot {
  recipientName: string;
  phone: string;
  whatsapp?: string;
  governorate: string;
  city: string;
  area?: string;
  street: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
}
