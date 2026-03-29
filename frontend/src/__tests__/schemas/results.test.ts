import { describe, it, expect } from "vitest";
import { FDPBDResultSchema } from "../../schemas/results";

describe("FDPBDResultSchema", () => {
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
    const result = FDPBDResultSchema.parse(valid);
    expect(result.lambda_measure).toBe(9.7);
    expect(result.plot_data.freq_fit).toHaveLength(3);
  });

  it("rejects missing fields", () => {
    expect(() => FDPBDResultSchema.parse({ lambda_measure: 9.7 })).toThrow();
  });

  it("rejects non-numeric values", () => {
    expect(() =>
      FDPBDResultSchema.parse({
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
