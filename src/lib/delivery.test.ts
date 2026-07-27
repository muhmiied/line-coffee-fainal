import { describe, expect, it } from "vitest";
import { resolveDeliveryFee } from "./delivery";

// This mirrors the authoritative SQL `resolve_delivery_fee()` (Locked
// Decisions 10+11). The resolution order matters: Shorouk/Madinaty and
// Haram/October/Zayed are checked BEFORE the general Cairo/Giza rule because
// they sit inside those governorates — a naive alphabetical/governorate-only
// check would wrongly price them at 50 instead of 30/100.

describe("resolveDeliveryFee", () => {
  it("prices Shorouk at 30 EGP even though it is inside Cairo", () => {
    expect(resolveDeliveryFee("Cairo", "Shorouk")).toEqual({
      fee: 30,
      zone: "shorouk_madinaty",
      note: null,
    });
  });

  it("prices Madinaty at 30 EGP (Arabic area name)", () => {
    expect(resolveDeliveryFee("القاهرة", "مدينتي")).toEqual({
      fee: 30,
      zone: "shorouk_madinaty",
      note: null,
    });
  });

  it("prices Haram at 100 EGP even though it is inside Giza", () => {
    expect(resolveDeliveryFee("Giza", "Haram")).toEqual({
      fee: 100,
      zone: "haram_october_zayed",
      note: null,
    });
  });

  it("prices 6 October at 100 EGP", () => {
    expect(resolveDeliveryFee("Giza", "6 October City")).toEqual({
      fee: 100,
      zone: "haram_october_zayed",
      note: null,
    });
  });

  it("prices Sheikh Zayed at 100 EGP (Arabic area name)", () => {
    expect(resolveDeliveryFee("الجيزة", "الشيخ زايد")).toEqual({
      fee: 100,
      zone: "haram_october_zayed",
      note: null,
    });
  });

  it("prices a general Cairo area at 50 EGP", () => {
    expect(resolveDeliveryFee("Cairo", "Nasr City")).toEqual({
      fee: 50,
      zone: "cairo_giza",
      note: null,
    });
  });

  it("prices a general Giza area at 50 EGP", () => {
    expect(resolveDeliveryFee("Giza", "Dokki")).toEqual({
      fee: 50,
      zone: "cairo_giza",
      note: null,
    });
  });

  it("prices any other governorate at 0 EGP with a courier note", () => {
    const result = resolveDeliveryFee("Alexandria", "Miami");
    expect(result.fee).toBe(0);
    expect(result.zone).toBe("governorate_courier");
    expect(result.note).toMatch(/courier/i);
  });

  it("is case-insensitive on governorate and area", () => {
    expect(resolveDeliveryFee("CAIRO", "haram").zone).toBe("haram_october_zayed");
  });

  it("treats missing governorate/area as the default out-of-zone case", () => {
    const result = resolveDeliveryFee(null, undefined);
    expect(result).toEqual({
      fee: 0,
      zone: "governorate_courier",
      note: expect.stringContaining("courier"),
    });
  });

  it("never returns a negative fee or an unrecognized zone key", () => {
    const zones = new Set([
      "shorouk_madinaty",
      "haram_october_zayed",
      "cairo_giza",
      "governorate_courier",
    ]);
    for (const [gov, area] of [
      ["Cairo", "Shorouk"],
      ["Giza", "Haram"],
      ["Cairo", "Maadi"],
      ["Sharqia", "Zagazig"],
    ] as const) {
      const result = resolveDeliveryFee(gov, area);
      expect(result.fee).toBeGreaterThanOrEqual(0);
      expect(zones.has(result.zone)).toBe(true);
    }
  });
});
