// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// useWishlist.ts is module-level singleton state (one shared list across every
// mounted consumer, by design) — each test needs a fresh module instance via
// vi.resetModules() + a fresh dynamic import, exactly like useAuth.test.ts.
//
// Because `globals: false` in vitest.config.ts disables Testing Library's
// implicit global afterEach(cleanup), every renderHook() from a PRIOR test
// would otherwise stay mounted (its startAuthWatcher() listener still live on
// the real jsdom `window`) for the rest of the file — a stale generation's
// listener firing on a later test's dispatchOwner() call, racing whatever
// mock state happens to be live at that moment. Explicit cleanup() is not
// optional here.

vi.mock("@/lib/checkout", () => ({
  getOrCreateGuestId: () => "guest-test-id",
}));

// Defense in depth AND the true external-boundary assertion point: if a
// dynamic import inside useWishlist.ts/customer-account.ts ever resolves to
// the REAL (unmocked) customer-account.ts module instead of the mock below
// (observed empirically after several vi.resetModules() + dynamic-import
// cycles in one file — a Vitest module-graph quirk, not a code defect), the
// real module's own RPC wrappers still terminate here, at supabase.rpc —
// never reaching a real network call, and still observable via `rpc`.
const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

let resolvedOwner: { userId: string | null; epoch: number } | null = null;
const startCommerceOwnerResolver = vi.fn();
vi.mock("@/lib/hooks/useAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/hooks/useAuth")>(
    "@/lib/hooks/useAuth",
  );
  return {
    COMMERCE_OWNER_LINKED_EVENT: actual.COMMERCE_OWNER_LINKED_EVENT,
    getResolvedCommerceOwner: () => resolvedOwner,
    startCommerceOwnerResolver: (...args: unknown[]) => startCommerceOwnerResolver(...args),
  };
});

const getCustomerWishlist = vi.fn();
const addCustomerWishlistItem = vi.fn();
const removeCustomerWishlistItem = vi.fn();
vi.mock("@/lib/account/customer-account", () => ({
  getCustomerWishlist: (...args: unknown[]) => getCustomerWishlist(...args),
  addCustomerWishlistItem: (...args: unknown[]) => addCustomerWishlistItem(...args),
  removeCustomerWishlistItem: (...args: unknown[]) => removeCustomerWishlistItem(...args),
}));

let COMMERCE_OWNER_LINKED_EVENT = "";

async function loadFreshModule() {
  vi.resetModules();
  // Re-register with vi.doMock (non-hoisted) on every cycle, in addition to
  // the hoisted vi.mock() above: repeated vi.resetModules() + dynamic
  // import() cycles for a module that itself does an INTERNAL dynamic
  // import of a mocked sibling (useWishlist.ts's queuePersist/
  // fetchServerWishlist importing "@/lib/account/customer-account") were
  // observed, empirically, to occasionally resolve to the REAL module
  // instead of the mock after several reset cycles in the same file — a
  // Vitest module-graph quirk, not a code defect. Explicitly re-doMock()ing
  // right before every fresh import closes that gap.
  vi.doMock("@/lib/account/customer-account", () => ({
    getCustomerWishlist: (...args: unknown[]) => getCustomerWishlist(...args),
    addCustomerWishlistItem: (...args: unknown[]) => addCustomerWishlistItem(...args),
    removeCustomerWishlistItem: (...args: unknown[]) => removeCustomerWishlistItem(...args),
  }));
  window.localStorage.clear();
  const authMod = await import("@/lib/hooks/useAuth");
  COMMERCE_OWNER_LINKED_EVENT = authMod.COMMERCE_OWNER_LINKED_EVENT;
  return import("./useWishlist");
}

function dispatchOwner(userId: string | null, epoch: number) {
  resolvedOwner = { userId, epoch };
  window.dispatchEvent(
    new CustomEvent(COMMERCE_OWNER_LINKED_EVENT, { detail: { userId, epoch } }),
  );
}

beforeEach(() => {
  resolvedOwner = null;
  startCommerceOwnerResolver.mockReset();
  getCustomerWishlist.mockReset();
  addCustomerWishlistItem.mockReset();
  removeCustomerWishlistItem.mockReset();
  getCustomerWishlist.mockResolvedValue([]);
  addCustomerWishlistItem.mockResolvedValue(undefined);
  removeCustomerWishlistItem.mockResolvedValue(undefined);
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("useWishlist — owner hydration", () => {
  it("hydrates from the already-resolved guest owner on first mount", async () => {
    resolvedOwner = { userId: null, epoch: 1 };
    getCustomerWishlist.mockResolvedValue(["turkish-silk"]);

    const { useWishlist } = await loadFreshModule();
    const { result } = renderHook(() => useWishlist());

    await waitFor(() => expect(result.current.ids).toEqual(["turkish-silk"]));
  });

  it("clears immediately and refetches when the owner transitions from guest to an account (no stale flash of the guest list)", async () => {
    resolvedOwner = { userId: null, epoch: 1 };
    getCustomerWishlist.mockResolvedValueOnce(["guest-item"]);

    const { useWishlist } = await loadFreshModule();
    const { result } = renderHook(() => useWishlist());
    await waitFor(() => expect(result.current.ids).toEqual(["guest-item"]));

    // The account fetch triggered below lands through fetchServerWishlist()'s
    // own dynamic import, which can take an extra render/effect cycle in this
    // environment (the exact call count isn't stable to assert on) — capture
    // whichever pending resolver the mock is actually invoked with next.
    const pending: Array<(slugs: string[]) => void> = [];
    getCustomerWishlist.mockImplementation(
      () => new Promise((resolve) => pending.push(resolve)),
    );

    act(() => {
      dispatchOwner("user-a", 2);
    });
    // Cleared immediately — the guest's item must never carry over onto the
    // account, even for a single frame, before the server confirms.
    expect(result.current.ids).toEqual([]);

    await waitFor(() => expect(pending.length).toBeGreaterThan(0));
    act(() => {
      pending[pending.length - 1](["account-item"]);
    });
    await waitFor(() => expect(result.current.ids).toEqual(["account-item"]));
  });

  it("never persists an authenticated owner's wishlist to localStorage", async () => {
    resolvedOwner = { userId: "user-a", epoch: 1 };
    getCustomerWishlist.mockResolvedValue(["account-item"]);

    const { useWishlist } = await loadFreshModule();
    const { result } = renderHook(() => useWishlist());
    await waitFor(() => expect(result.current.ids).toEqual(["account-item"]));

    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i) ?? "";
      expect(key.startsWith("line-wishlist-v1:guest:")).toBe(false);
    }
  });
});

describe("useWishlist — toggle + server reconciliation", () => {
  it("optimistically adds a slug, then persists it to the server", async () => {
    resolvedOwner = { userId: null, epoch: 1 };
    const { useWishlist } = await loadFreshModule();
    const { result } = renderHook(() => useWishlist());
    await waitFor(() => expect(getCustomerWishlist).toHaveBeenCalled());

    act(() => {
      result.current.toggle("turkish-silk");
    });
    expect(result.current.ids).toEqual(["turkish-silk"]);

    await waitFor(() =>
      expect(addCustomerWishlistItem).toHaveBeenCalledWith("turkish-silk"),
    );
  });

  it("reverts the optimistic add when the server write fails", async () => {
    resolvedOwner = { userId: null, epoch: 1 };
    addCustomerWishlistItem.mockRejectedValueOnce(new Error("boom"));

    const { useWishlist } = await loadFreshModule();
    const { result } = renderHook(() => useWishlist());
    await waitFor(() => expect(getCustomerWishlist).toHaveBeenCalled());

    act(() => {
      result.current.toggle("turkish-silk");
    });
    expect(result.current.ids).toEqual(["turkish-silk"]);

    await waitFor(() => expect(result.current.ids).toEqual([]));
  });

  it("rapid add→remove→add on the same slug: a stale failure from the FIRST add never reverts the THIRD add's already-confirmed state", async () => {
    // Per-slug persists are chained sequentially (op N+1 never starts its
    // real RPC call until op N's promise settles) — but latestSlugSeq is
    // bumped SYNCHRONOUSLY the instant each click is queued, before any of
    // them have actually run. So by the time the stale op #1 finally
    // settles, it can already see a newer op has been queued and must skip
    // reconciling, even though ops #2/#3 haven't executed yet.
    resolvedOwner = { userId: null, epoch: 1 };
    let rejectFirstAdd: (reason: unknown) => void = () => {};
    addCustomerWishlistItem
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectFirstAdd = reject;
          }),
      )
      .mockResolvedValueOnce(undefined); // the third click's add, once the queue reaches it

    const { useWishlist } = await loadFreshModule();
    const { result } = renderHook(() => useWishlist());
    await waitFor(() => expect(getCustomerWishlist).toHaveBeenCalled());

    act(() => {
      result.current.toggle("turkish-silk"); // add #1 (starts immediately, queue was empty)
      result.current.toggle("turkish-silk"); // remove #2 (queued behind #1)
      result.current.toggle("turkish-silk"); // add #3 (queued behind #2, the LATEST op)
    });
    // Three synchronous optimistic updates net out to "has".
    expect(result.current.ids).toEqual(["turkish-silk"]);
    // Only op #1 actually reaches the RPC call (queuePersist's own dynamic
    // import means this lands a tick after the synchronous toggles above) —
    // #2/#3 are queued behind it and must not have called their RPC yet.
    await waitFor(() => expect(addCustomerWishlistItem).toHaveBeenCalledTimes(1));
    expect(removeCustomerWishlistItem).not.toHaveBeenCalled();

    act(() => {
      rejectFirstAdd(new Error("stale failure"));
    });
    // Op #1's catch runs and must see it is stale (latestSlugSeq is already
    // 3) and skip reconciling — the optimistic "has" state must survive.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.ids).toEqual(["turkish-silk"]);

    // The queue then drains: #2 (remove) and #3 (add) both actually run.
    await waitFor(() => expect(removeCustomerWishlistItem).toHaveBeenCalledWith("turkish-silk"));
    await waitFor(() => expect(addCustomerWishlistItem).toHaveBeenCalledTimes(2));
    // Final state still correctly reflects "has" throughout — no unrelated
    // revert ever fired.
    expect(result.current.ids).toEqual(["turkish-silk"]);
  });

  it("skips a queued persist entirely when the owner has changed since it was queued (never writes under a different owner)", async () => {
    resolvedOwner = { userId: null, epoch: 1 };
    const pendingAdds: Array<() => void> = [];
    addCustomerWishlistItem.mockImplementation(
      () => new Promise((resolve) => pendingAdds.push(() => resolve(undefined))),
    );

    const { useWishlist } = await loadFreshModule();
    const { result } = renderHook(() => useWishlist());
    await waitFor(() => expect(getCustomerWishlist).toHaveBeenCalled());

    act(() => {
      result.current.toggle("turkish-silk"); // queued as the guest owner
    });

    getCustomerWishlist.mockResolvedValue(["account-item"]);
    act(() => {
      dispatchOwner("user-a", 2); // owner switches before the queued op runs
    });
    await waitFor(() => expect(result.current.ids).toEqual(["account-item"]));

    // Proving a negative ("this RPC is never called") can't use waitFor,
    // which only polls until something becomes true. Instead, pump real
    // macrotask + microtask ticks for a generous, bounded window — enough to
    // let queuePersist's prior.catch().then() chain AND its own dynamic
    // import fully resolve if the call were going to happen at all (this
    // exact scenario was verified, via deliberate mutation of the guard at
    // useWishlist.ts's queuePersist, to reliably observe the call within far
    // fewer than 20 ticks when the guard is absent).
    await act(async () => {
      for (let i = 0; i < 20; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });

    // The queued write is skipped ENTIRELY once queuePersist notices the
    // owner token no longer matches — it must never even reach the RPC call
    // (this is the actual guarantee, not merely "the write fails cleanly").
    // Asserted at TWO levels so the guarantee holds even if queuePersist's
    // own dynamic import were to resolve to the real (unmocked)
    // customer-account.ts instead of this file's mock: the spy-level check
    // catches it when the mock resolves correctly; the rpc-level check
    // catches it even if it doesn't, since the real addCustomerWishlistItem
    // would itself call supabase.rpc("add_customer_wishlist_item", ...).
    expect(pendingAdds.length).toBe(0);
    expect(addCustomerWishlistItem).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalledWith(
      "add_customer_wishlist_item",
      expect.anything(),
    );
    // The stale guest-owner add must never have landed on the new account.
    expect(result.current.ids).toEqual(["account-item"]);
  });
});
