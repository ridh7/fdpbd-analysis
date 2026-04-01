import { describe, it, expect } from "vitest";
import {
  IsotropicResultSchema,
  AnisotropicResultSchema,
  TransverseResultSchema,
} from "../../schemas/results";

describe("IsotropicResultSchema", () => {
  it("accepts valid result data", () => {
    const valid = {
      lambda_measure: 9.7,
      alpha_t_fitted: 1.885e-5,
      t_ss_heat: 0.5,
      plot_data: {
        freq_fit: [100, 200, 300],
        v_corr_in_fit: [0.1, 0.2, 0.3],
        v_corr_out_fit: [0.01, 0.02, 0.03],
        v_corr_ratio_fit: [10, 10, 10],
        delta_in: [0.11, 0.21, 0.31],
        delta_out: [0.012, 0.022, 0.032],
        delta_ratio: [9.2, 9.5, 9.7],
      },
    };
    const result = IsotropicResultSchema.parse(valid);
    expect(result.lambda_measure).toBe(9.7);
    expect(result.plot_data.freq_fit).toHaveLength(3);
  });

  it("rejects missing fields", () => {
    expect(() => IsotropicResultSchema.parse({ lambda_measure: 9.7 })).toThrow();
  });

  it("rejects non-numeric values", () => {
    expect(() =>
      IsotropicResultSchema.parse({
        lambda_measure: "not a number",
        alpha_t_fitted: 1e-5,
        t_ss_heat: 0.5,
        plot_data: {
          freq_fit: [],
          v_corr_in_fit: [],
          v_corr_out_fit: [],
          v_corr_ratio_fit: [],
          delta_in: [],
          delta_out: [],
          delta_ratio: [],
        },
      }),
    ).toThrow();
  });
});

describe("AnisotropicResultSchema", () => {
  const validAnisotropicResult = {
    f_peak: 50000,
    ratio_at_peak: 1.234,
    lambda_measure: null,
    alpha_t_fitted: null,
    t_ss_heat: null,
    plot_data: {
      model_freqs: [100, 200, 300],
      in_model: [0.1, 0.2, 0.3],
      out_model: [0.01, 0.02, 0.03],
      ratio_model: [10, 10, 10],
      exp_freqs: [100, 200, 300],
      in_exp: [0.11, 0.21, 0.31],
      out_exp: [0.012, 0.022, 0.032],
      ratio_exp: [9.2, 9.5, 9.7],
    },
  };

  it("accepts valid anisotropic result with nullable fields", () => {
    const result = AnisotropicResultSchema.parse(validAnisotropicResult);
    expect(result.f_peak).toBe(50000);
    expect(result.lambda_measure).toBeNull();
    expect(result.plot_data.model_freqs).toHaveLength(3);
  });

  it("accepts anisotropic result with all numeric fields", () => {
    const result = AnisotropicResultSchema.parse({
      ...validAnisotropicResult,
      lambda_measure: 10.5,
      alpha_t_fitted: 1e-5,
      t_ss_heat: 0.3,
    });
    expect(result.lambda_measure).toBe(10.5);
  });

  it("rejects missing plot_data", () => {
    expect(() =>
      AnisotropicResultSchema.parse({
        f_peak: 50000,
        ratio_at_peak: 1.234,
      }),
    ).toThrow();
  });
});

describe("TransverseResultSchema", () => {
  it("accepts valid transverse result", () => {
    const result = TransverseResultSchema.parse({
      f_peak: 25000,
      ratio_at_peak: 2.5,
      plot_data: {
        model_freqs: [100, 200],
        in_model: [0.1, 0.2],
        out_model: [0.01, 0.02],
        ratio_model: [10, 10],
        exp_freqs: [100, 200],
        in_exp: [0.11, 0.21],
        out_exp: [0.012, 0.022],
        ratio_exp: [9.2, 9.5],
      },
    });
    expect(result.f_peak).toBe(25000);
    expect(result.plot_data.model_freqs).toHaveLength(2);
  });

  it("accepts null f_peak and ratio_at_peak", () => {
    const result = TransverseResultSchema.parse({
      f_peak: null,
      ratio_at_peak: null,
      plot_data: {
        model_freqs: [],
        in_model: [],
        out_model: [],
        ratio_model: [],
        exp_freqs: [],
        in_exp: [],
        out_exp: [],
        ratio_exp: [],
      },
    });
    expect(result.f_peak).toBeNull();
  });
});
