import { describe, it, expect } from "vitest";
import { buildIsotropicPayload } from "../../lib/unitConversions";
import { ISOTROPIC_DEFAULTS } from "../../constants/defaults";

describe("buildIsotropicPayload", () => {
  it("converts w_rms from µm to m", () => {
    const payload = buildIsotropicPayload(ISOTROPIC_DEFAULTS);
    // 11.20 µm → 11.20e-6 m
    expect(payload.w_rms).toBeCloseTo(11.2e-6, 10);
  });

  it("converts x_offset from µm to m", () => {
    const payload = buildIsotropicPayload(ISOTROPIC_DEFAULTS);
    expect(payload.x_offset).toBeCloseTo(12.6e-6, 10);
  });

  it("converts incident_pump from mW to W", () => {
    const payload = buildIsotropicPayload(ISOTROPIC_DEFAULTS);
    expect(payload.incident_pump).toBeCloseTo(1.06e-3, 10);
  });

  it("converts incident_probe from mW to W", () => {
    const payload = buildIsotropicPayload(ISOTROPIC_DEFAULTS);
    expect(payload.incident_probe).toBeCloseTo(0.85e-3, 10);
  });

  it("converts c_down from J/cm³-K to J/m³-K", () => {
    const payload = buildIsotropicPayload(ISOTROPIC_DEFAULTS);
    const c_down = payload.c_down as number[];
    // 2.44 J/cm³-K → 2.44e6 J/m³-K
    expect(c_down[0]).toBeCloseTo(2.44e6, 0);
    expect(c_down[1]).toBeCloseTo(0.1e6, 0);
    expect(c_down[2]).toBeCloseTo(2.73e6, 0);
  });

  it("converts h_down from µm to m", () => {
    const payload = buildIsotropicPayload(ISOTROPIC_DEFAULTS);
    const h_down = payload.h_down as number[];
    expect(h_down[0]).toBeCloseTo(0.07e-6, 12);
    expect(h_down[1]).toBeCloseTo(0.001e-6, 14);
    expect(h_down[2]).toBeCloseTo(1e-6, 10);
  });

  it("passes through values that need no conversion", () => {
    const payload = buildIsotropicPayload(ISOTROPIC_DEFAULTS);
    expect(payload.f_rolloff).toBe(95000);
    expect(payload.n_al).toBe(2.9);
    expect(payload.lens_transmittance).toBe(0.93);
  });

  it("sends eta_down as comma-separated string", () => {
    const payload = buildIsotropicPayload(ISOTROPIC_DEFAULTS);
    expect(payload.eta_down).toBe("1.0,1.0,1.0");
  });
});
