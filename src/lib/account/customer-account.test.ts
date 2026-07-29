import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the boundary modules so no real network/localStorage is ever touched.
// `rpc` is a single vi.fn() whose resolved value each test controls directly —
// this lets us assert the exact "silent failure vs throw" contract each
// wrapper function promises its caller, which is exactly the class of bug
// the 2026-07-21 wishlist fix (see CLAUDE.md changelog) was about: a failed
// RPC call must never be indistinguishable from "the list is genuinely empty".
const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));
vi.mock("@/lib/checkout", () => ({
  getOrCreateGuestId: () => "guest-test-id",
}));

const {
  getCustomerOrders,
  getCustomerOrderDetail,
  getCustomerNotifications,
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerAddresses,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  getCustomerWishlist,
  addCustomerWishlistItem,
  removeCustomerWishlistItem,
  linkGuestDataToAccount,
} = await import("./customer-account");

const ADDRESS_INPUT = {
  label: "Home",
  recipientName: null,
  phone: null,
  governorate: "Cairo",
  city: "Cairo",
  area: null,
  street: "Test St",
  building: null,
  floor: null,
  apartment: null,
  landmark: null,
  locationUrl: null,
  isDefault: false,
};

beforeEach(() => {
  rpc.mockReset();
});

describe("owner scoping — every RPC call is scoped to the device guest_id", () => {
  it("passes the correct RPC name and p_guest_id for a representative read and a representative write", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await getCustomerOrders();
    expect(rpc).toHaveBeenCalledWith("get_customer_orders", { p_guest_id: "guest-test-id" });

    rpc.mockClear();
    await addCustomerWishlistItem("turkish-silk");
    expect(rpc).toHaveBeenCalledWith("add_customer_wishlist_item", {
      p_guest_id: "guest-test-id",
      p_product_slug: "turkish-silk",
    });
  });
});

describe("read functions degrade gracefully only for a genuine empty result (not an RPC error)", () => {
  it("getCustomerOrderDetail returns null on error", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(getCustomerOrderDetail("LC-000001")).resolves.toBeNull();
  });

  it("getCustomerOrderDetail returns null when the order has zero matching rows (not found / not owned)", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getCustomerOrderDetail("LC-000001")).resolves.toBeNull();
  });

  it("getCustomerProfile returns null on error", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(getCustomerProfile()).resolves.toBeNull();
  });
});

describe("mutation functions that report failure via a return value", () => {
  it("updateCustomerProfile returns false on error", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(updateCustomerProfile("Name", "01012345678", "01012345678")).resolves.toBe(
      false,
    );
  });

  it("updateCustomerProfile returns the RPC's boolean result on success", async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null });
    await expect(updateCustomerProfile("Name", "01012345678", "01012345678")).resolves.toBe(true);
  });

  it("addCustomerAddress returns null on error", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(addCustomerAddress(ADDRESS_INPUT)).resolves.toBeNull();
  });

  it("addCustomerAddress returns the new address id on success", async () => {
    rpc.mockResolvedValueOnce({ data: "addr-123", error: null });
    await expect(addCustomerAddress(ADDRESS_INPUT)).resolves.toBe("addr-123");
  });

  it("updateCustomerAddress returns false on error", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(updateCustomerAddress("addr-123", ADDRESS_INPUT)).resolves.toBe(false);
  });

  it("deleteCustomerAddress returns false on error (failure is never silent success)", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(deleteCustomerAddress("addr-123")).resolves.toBe(false);
  });

  it("deleteCustomerAddress returns true when the RPC confirms the delete", async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null });
    await expect(deleteCustomerAddress("addr-123")).resolves.toBe(true);
  });

  it("setDefaultCustomerAddress returns false on error", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(setDefaultCustomerAddress("addr-123")).resolves.toBe(false);
  });
});

describe("wishlist + orders/notifications/addresses reads THROW on RPC failure (deliberate contrast with the profile/address-write functions above)", () => {
  it("getCustomerWishlist throws instead of returning an empty list", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(getCustomerWishlist()).rejects.toEqual({ message: "boom" });
  });

  it("getCustomerWishlist returns [] for a null-data, non-error response (no error ≠ no data)", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(getCustomerWishlist()).resolves.toEqual([]);
  });

  it("getCustomerWishlist returns [] for the realistic empty-array PostgREST response", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getCustomerWishlist()).resolves.toEqual([]);
  });

  it("addCustomerWishlistItem throws instead of silently succeeding", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(addCustomerWishlistItem("turkish-silk")).rejects.toEqual({ message: "boom" });
  });

  it("removeCustomerWishlistItem throws instead of silently succeeding", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(removeCustomerWishlistItem("turkish-silk")).rejects.toEqual({ message: "boom" });
  });

  it("addCustomerWishlistItem resolves (void) on success", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(addCustomerWishlistItem("turkish-silk")).resolves.toBeUndefined();
  });

  it("getCustomerOrders throws instead of returning an empty list", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(getCustomerOrders()).rejects.toEqual({ message: "boom" });
  });

  it("getCustomerOrders returns [] for a genuine empty-array response (no error)", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getCustomerOrders()).resolves.toEqual([]);
  });

  it("getCustomerNotifications throws instead of returning an empty list", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(getCustomerNotifications()).rejects.toEqual({ message: "boom" });
  });

  it("getCustomerNotifications returns [] for a genuine empty-array response (no error)", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getCustomerNotifications()).resolves.toEqual([]);
  });

  it("getCustomerAddresses throws instead of returning an empty list", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(getCustomerAddresses()).rejects.toEqual({ message: "boom" });
  });

  it("getCustomerAddresses returns [] for a genuine empty-array response (no error)", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getCustomerAddresses()).resolves.toEqual([]);
  });
});

describe("linkGuestDataToAccount", () => {
  it("returns { linked: false } on RPC error instead of throwing", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(linkGuestDataToAccount()).resolves.toEqual({ linked: false });
  });

  it("returns { linked: false } when the RPC returns a non-object payload", async () => {
    rpc.mockResolvedValueOnce({ data: "unexpected-string", error: null });
    await expect(linkGuestDataToAccount()).resolves.toEqual({ linked: false });
  });

  it("maps a successful promote/merge result", async () => {
    rpc.mockResolvedValueOnce({
      data: { linked: true, mode: "merge", moved_orders: 3, customer_id: "cust-1" },
      error: null,
    });
    await expect(linkGuestDataToAccount()).resolves.toEqual({
      linked: true,
      mode: "merge",
      movedOrders: 3,
      customerId: "cust-1",
    });
  });
});
