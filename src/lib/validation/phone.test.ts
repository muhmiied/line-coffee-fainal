import { describe, expect, it } from "vitest";
import { isValidEgyptianPhone, normalizeEgyptianPhone } from "./phone";

describe("normalizeEgyptianPhone", () => {
  it("accepts the canonical local form unchanged", () => {
    expect(normalizeEgyptianPhone("01012345678")).toBe("01012345678");
  });

  it("accepts all four valid operator digits (0/1/2/5)", () => {
    expect(normalizeEgyptianPhone("01012345678")).toBe("01012345678");
    expect(normalizeEgyptianPhone("01112345678")).toBe("01112345678");
    expect(normalizeEgyptianPhone("01212345678")).toBe("01212345678");
    expect(normalizeEgyptianPhone("01512345678")).toBe("01512345678");
  });

  it("rejects an unassigned operator digit", () => {
    expect(normalizeEgyptianPhone("01312345678")).toBeNull();
    expect(normalizeEgyptianPhone("01912345678")).toBeNull();
  });

  it("strips spaces and dashes", () => {
    expect(normalizeEgyptianPhone("010 1234 5678")).toBe("01012345678");
    expect(normalizeEgyptianPhone("010-1234-5678")).toBe("01012345678");
  });

  it("normalizes the 0020 international prefix", () => {
    expect(normalizeEgyptianPhone("00201012345678")).toBe("01012345678");
  });

  it("normalizes the +20 international prefix", () => {
    expect(normalizeEgyptianPhone("+201012345678")).toBe("01012345678");
  });

  it("normalizes a bare 20-prefixed 12-digit number", () => {
    expect(normalizeEgyptianPhone("201012345678")).toBe("01012345678");
  });

  it("normalizes +20 followed by the full local number with its leading 0 still attached", () => {
    expect(normalizeEgyptianPhone("+20 01012345678")).toBe("01012345678");
    expect(normalizeEgyptianPhone("20 010 1234 5678")).toBe("01012345678");
  });

  it("restores a missing leading 0 on a 10-digit 1xxxxxxxxx number", () => {
    expect(normalizeEgyptianPhone("1012345678")).toBe("01012345678");
  });

  it("rejects a too-short number", () => {
    expect(normalizeEgyptianPhone("0101234567")).toBeNull();
  });

  it("rejects a too-long number", () => {
    expect(normalizeEgyptianPhone("010123456789")).toBeNull();
  });

  it("rejects a landline-shaped number (no 01 prefix)", () => {
    expect(normalizeEgyptianPhone("0212345678")).toBeNull();
  });

  it("rejects letters/garbage", () => {
    expect(normalizeEgyptianPhone("not-a-phone")).toBeNull();
  });

  it("treats null/undefined/empty as invalid, never throwing", () => {
    expect(normalizeEgyptianPhone(null)).toBeNull();
    expect(normalizeEgyptianPhone(undefined)).toBeNull();
    expect(normalizeEgyptianPhone("")).toBeNull();
  });
});

describe("isValidEgyptianPhone", () => {
  it("mirrors normalizeEgyptianPhone's accept/reject decision", () => {
    expect(isValidEgyptianPhone("01012345678")).toBe(true);
    expect(isValidEgyptianPhone("+201012345678")).toBe(true);
    expect(isValidEgyptianPhone("0101234567")).toBe(false);
    expect(isValidEgyptianPhone(null)).toBe(false);
  });
});
