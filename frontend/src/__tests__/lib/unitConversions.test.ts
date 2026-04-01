import { describe, it, expect } from "vitest";
import {
  buildIsotropicPayload,
  buildAnisotropicPayload,
  buildTransversePayload,
} from "../../lib/unitConversions";
import {
  ISOTROPIC_DEFAULTS,
  ANISOTROPIC_DEFAULTS,
  TRANSVERSE_ANISO_DEFAULTS,
  TRANSVERSE_EXTRA_DEFAULTS,
} from "../../constants/defaults";

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

describe("buildAnisotropicPayload", () => {
  const payload = buildAnisotropicPayload(ISOTROPIC_DEFAULTS, ANISOTROPIC_DEFAULTS);

  it("converts rho from g/cm³ to kg/m³", () => {
    // 2.70 g/cm³ → 2700 kg/m³
    expect(payload.rho).toBeCloseTo(2700, 0);
  });

  it("converts rho_sample from g/cm³ to kg/m³", () => {
    // 1.38 g/cm³ → 1380 kg/m³
    expect(payload.rho_sample).toBeCloseTo(1380, 0);
  });

  it("converts elastic constants from GPa to Pa", () => {
    // 107.4 GPa → 107.4e9 Pa
    expect(payload.C11_0).toBeCloseTo(107.4e9, 0);
    expect(payload.C12_0).toBeCloseTo(60.5e9, 0);
    expect(payload.C44_0).toBeCloseTo(28.3e9, 0);
  });

  it("converts sample elastic constants from GPa to Pa", () => {
    expect(payload.C11_0_sample).toBeCloseTo(12.11e9, 0);
    expect(payload.C44_0_sample).toBeCloseTo(1.2e9, 0);
  });

  it("sends only transducer layer for lambda_down and h_down", () => {
    const ld = payload.lambda_down as number[];
    const hd = payload.h_down as number[];
    expect(ld).toHaveLength(1);
    expect(hd).toHaveLength(1);
  });

  it("sends all layers for c_down", () => {
    const cd = payload.c_down as number[];
    expect(cd).toHaveLength(3);
    expect(cd[0]).toBeCloseTo(2.44e6, 0);
    expect(cd[1]).toBeCloseTo(0.1e6, 0);
    expect(cd[2]).toBeCloseTo(2.73e6, 0);
  });

  it("does not include isotropic-only fields", () => {
    expect(payload).not.toHaveProperty("eta_down");
    expect(payload).not.toHaveProperty("h_up");
    expect(payload).not.toHaveProperty("niu");
    expect(payload).not.toHaveProperty("alpha_t");
    expect(payload).not.toHaveProperty("incident_probe");
  });

  it("passes through conductivities without conversion", () => {
    expect(payload.lambda_down_x_sample).toBeCloseTo(0.3, 10);
    expect(payload.lambda_down_y_sample).toBeCloseTo(0.5, 10);
    expect(payload.lambda_down_z_sample).toBeCloseTo(0.3, 10);
  });
});

describe("buildTransversePayload", () => {
  const payload = buildTransversePayload(
    ISOTROPIC_DEFAULTS,
    TRANSVERSE_ANISO_DEFAULTS,
    TRANSVERSE_EXTRA_DEFAULTS,
  );

  it("maps x_offset to r_0 in meters", () => {
    // 12.60 µm → 12.60e-6 m
    expect(payload.r_0).toBeCloseTo(12.6e-6, 10);
    expect(payload).not.toHaveProperty("x_offset");
  });

  it("maps detector_factor to detector_gain", () => {
    expect(payload.detector_gain).toBe(74.0);
    expect(payload).not.toHaveProperty("detector_factor");
  });

  it("includes transverse-specific fields", () => {
    expect(payload.v_sum_fixed).toBe(0.18);
    expect(payload.c_probe).toBe(0.65);
    expect(payload.g_int).toBe(100e6);
  });

  it("uses flat layer structure", () => {
    // Layer 1
    expect(payload.layer1_thickness).toBeCloseTo(0.07e-6, 12);
    expect(payload.layer1_sigma).toBe(149.0);
    expect(payload.layer1_capac).toBeCloseTo(2.44e6, 0);
    expect(payload.layer1_rho).toBeCloseTo(2700, 0);
    expect(payload.layer1_C11_0).toBeCloseTo(107.4e9, 0);
    // Layer 2
    expect(payload.layer2_sigma_r).toBeCloseTo(0.64, 10);
    expect(payload.layer2_sigma_z).toBeCloseTo(0.21, 10);
    expect(payload.layer2_capac).toBeCloseTo(2.73e6, 0);
    expect(payload.layer2_rho).toBeCloseTo(1430, 0);
    expect(payload.layer2_C11_0).toBeCloseTo(8.9e9, 0);
    // Layer 3
    expect(payload.layer3_sigma).toBe(0.028);
    expect(payload.layer3_capac).toBe(1192.0);
  });

  it("does not include anisotropic or isotropic-only fields", () => {
    expect(payload).not.toHaveProperty("phi");
    expect(payload).not.toHaveProperty("lambda_down");
    expect(payload).not.toHaveProperty("eta_down");
    expect(payload).not.toHaveProperty("niu");
  });
});
