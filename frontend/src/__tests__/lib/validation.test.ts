import { describe, it, expect } from "vitest";
import { isValidDecimal, areAllValidDecimals } from "../../lib/validation";

describe("isValidDecimal", () => {
  it("accepts valid numbers", () => {
    expect(isValidDecimal("3.14")).toBe(true);
    expect(isValidDecimal("-1.3e-11")).toBe(true);
    expect(isValidDecimal("0")).toBe(true);
    expect(isValidDecimal("95000")).toBe(true);
  });

  it("rejects empty strings", () => {
    expect(isValidDecimal("")).toBe(false);
  });

  it("rejects non-numeric strings", () => {
    expect(isValidDecimal("abc")).toBe(false);
    expect(isValidDecimal("NaN")).toBe(false);
  });
});

describe("areAllValidDecimals", () => {
  it("accepts all valid", () => {
    expect(areAllValidDecimals(["1.0", "2.0", "3.0"])).toBe(true);
  });

  it("rejects if any invalid", () => {
    expect(areAllValidDecimals(["1.0", "", "3.0"])).toBe(false);
  });
});
