// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The commerce owner resolver (useAuth.ts) is module-level singleton state on
// purpose (it must be one shared source of truth across every consumer on the
// page), which means each test needs a FRESH module instance via
// vi.resetModules() + a fresh dynamic import — otherwise state from a
// previous test (which owner is "resolved", which epoch is current) leaks
// into the next one.

const getUser = vi.fn();
let authStateCallback: ((event: string, session: { user: { id: string } } | null) => void) | null =
  null;
const onAuthStateChange = vi.fn((cb: typeof authStateCallback) => {
  authStateCallback = cb;
  return { data: { subscription: { unsubscribe: () => {} } } };
});

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => getUser(...args),
      onAuthStateChange: (...args: unknown[]) =>
        onAuthStateChange(...(args as [typeof authStateCallback])),
    },
  },
}));

const linkGuestDataToAccount = vi.fn();
vi.mock("@/lib/account/customer-account", () => ({
  linkGuestDataToAccount: (...args: unknown[]) => linkGuestDataToAccount(...args),
}));

async function loadFreshModule() {
  vi.resetModules();
  authStateCallback = null;
  return import("./useAuth");
}

// Several chained awaits happen between a mocked promise resolving and the
// resolver's state actually settling (the dynamic `import()` inside
// linkGuestDataBestEffort, then boundedWait's own promise executor) — flush
// generously rather than guessing the exact microtask depth.
async function flushMicrotasks(times = 6) {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
  // The dynamic `import("@/lib/account/customer-account")` inside
  // linkGuestDataBestEffort resolves through Vitest's module loader, which
  // isn't guaranteed to settle within pure promise microtasks alone — a
  // single (fake-clock-advanced, since this whole file runs on fake timers)
  // 0ms timer tick reliably flushes it.
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  getUser.mockReset();
  onAuthStateChange.mockClear();
  linkGuestDataToAccount.mockReset();
  linkGuestDataToAccount.mockResolvedValue({ linked: false });
  // Every test in this file exercises startCommerceOwnerResolver(), which
  // always arms a real 8s fallback setTimeout — fake timers everywhere (not
  // just the one test that explicitly advances it) so a test finishing
  // early never leaves a live timer armed against a torn-down module.
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("commerce owner resolver — auth-lookup failure must never be read as guest", () => {
  it("stays unresolved while getUser() is pending, and does not resolve as guest just because it later rejects", async () => {
    let rejectGetUser: (reason: unknown) => void = () => {};
    getUser.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectGetUser = reject;
      }),
    );

    const mod = await loadFreshModule();
    mod.startCommerceOwnerResolver();

    // Neither getUser() nor onAuthStateChange's initial event has settled yet.
    expect(mod.getResolvedCommerceOwner()).toBeNull();

    rejectGetUser(new Error("network down"));
    await vi.advanceTimersByTimeAsync(0);
    // A rejected lookup must NOT be interpreted as "guest" — still unresolved.
    expect(mod.getResolvedCommerceOwner()).toBeNull();

    // Only the bounded fallback timer (8s) may resolve it from here.
    await vi.advanceTimersByTimeAsync(8000);
    expect(mod.getResolvedCommerceOwner()).toEqual({ userId: null, epoch: 1 });
  });

  it("resolves as guest immediately (no 8s wait) when getUser() genuinely resolves with no user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const mod = await loadFreshModule();
    mod.startCommerceOwnerResolver();
    await flushMicrotasks();

    expect(mod.getResolvedCommerceOwner()).toEqual({ userId: null, epoch: 1 });
    expect(linkGuestDataToAccount).not.toHaveBeenCalled();
  });
});

describe("commerce owner resolver — sign-in waits for guest-data linking before announcing ready", () => {
  it("stays claimed-but-unsettled while linking is in flight, then settles once it resolves", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    let resolveLink: (value: { linked: boolean }) => void = () => {};
    linkGuestDataToAccount.mockReturnValue(
      new Promise((resolve) => {
        resolveLink = resolve;
      }),
    );

    const mod = await loadFreshModule();
    mod.startCommerceOwnerResolver();
    await flushMicrotasks();
    // Guest resolved first (no linking needed for a null user).
    expect(mod.getResolvedCommerceOwner()).toEqual({ userId: null, epoch: 1 });

    // Now simulate a genuine sign-in via the auth listener.
    authStateCallback?.("SIGNED_IN", { user: { id: "user-a" } });
    // Claimed immediately (isNewSignIn), but not settled — linking is pending.
    expect(mod.getResolvedCommerceOwner()).toBeNull();

    resolveLink({ linked: true });
    await flushMicrotasks();
    expect(mod.getResolvedCommerceOwner()).toEqual({ userId: "user-a", epoch: 2 });
  });

  it("sign-out resolves immediately without waiting on any link attempt", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-a" } } });
    linkGuestDataToAccount.mockResolvedValue({ linked: true });

    const mod = await loadFreshModule();
    mod.startCommerceOwnerResolver();
    await flushMicrotasks();
    expect(mod.getResolvedCommerceOwner()).toEqual({ userId: "user-a", epoch: 1 });

    linkGuestDataToAccount.mockClear();
    authStateCallback?.("SIGNED_OUT", null);
    // No await needed at all — sign-out never calls boundedWait.
    expect(mod.getResolvedCommerceOwner()).toEqual({ userId: null, epoch: 2 });
    expect(linkGuestDataToAccount).not.toHaveBeenCalled();
  });
});

describe("commerce owner resolver — stale in-flight resolution can never clobber a newer one", () => {
  it("a sign-in immediately followed by a sign-out only ever announces the sign-out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    let resolveLink: (value: { linked: boolean }) => void = () => {};
    linkGuestDataToAccount.mockReturnValue(
      new Promise((resolve) => {
        resolveLink = resolve;
      }),
    );

    const mod = await loadFreshModule();
    mod.startCommerceOwnerResolver();
    await flushMicrotasks();
    expect(mod.getResolvedCommerceOwner()).toEqual({ userId: null, epoch: 1 });

    const dispatched: Array<{ userId: string | null; epoch: number }> = [];
    window.addEventListener(mod.COMMERCE_OWNER_LINKED_EVENT, (event) => {
      dispatched.push(
        (event as CustomEvent<{ userId: string | null; epoch: number }>).detail,
      );
    });

    // Sign in (epoch 2, claims immediately, awaits linking)...
    authStateCallback?.("SIGNED_IN", { user: { id: "user-a" } });
    expect(mod.getResolvedCommerceOwner()).toBeNull();

    // ...then sign out again BEFORE the sign-in's link attempt has resolved
    // (epoch 3, no linking needed, settles immediately).
    authStateCallback?.("SIGNED_OUT", null);
    expect(mod.getResolvedCommerceOwner()).toEqual({ userId: null, epoch: 3 });

    // Now let the stale sign-in's link attempt finish.
    resolveLink({ linked: true });
    await flushMicrotasks();

    // The stale epoch-2 resolution must never have dispatched or overwritten
    // the newer epoch-3 (signed-out) state.
    expect(mod.getResolvedCommerceOwner()).toEqual({ userId: null, epoch: 3 });
    expect(dispatched).toEqual([{ userId: null, epoch: 3 }]);
  });
});
