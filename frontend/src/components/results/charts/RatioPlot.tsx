/**
 * Ratio plot (V_in / V_out) — shows the signal ratio which is the primary
 * observable used for thermal conductivity extraction.
 *
 * Same dual-format handling as InOutPhasePlot: both modes plot model vs
 * experiment, but isotropic uses a shared frequency axis while
 * anisotropic/transverse uses separate axes (higher-resolution model).
 * Same theme import pattern (direct palette objects) for Plotly compatibility.
 */
import Plot from "./Plot";
import type { PlotData, AnisotropicPlotData } from "../../../schemas/results";
import { darkTheme, lightTheme, type Theme } from "../../../constants/theme";

interface RatioPlotProps {
  data: PlotData | AnisotropicPlotData;
  theme: Theme;
}

function isAnisotropicData(
  data: PlotData | AnisotropicPlotData,
): data is AnisotropicPlotData {
  return "model_freqs" in data;
}

export function RatioPlot({ data, theme }: RatioPlotProps) {
  const palette = theme === "dark" ? darkTheme : lightTheme;

  const traces = isAnisotropicData(data)
    ? [
        {
          x: data.exp_freqs,
          y: data.ratio_exp,
          type: "scatter" as const,
          mode: "markers" as const,
          name: "Ratio (data)",
          marker: { color: palette.plotRatio, size: 5 },
        },
        {
          x: data.model_freqs,
          y: data.ratio_model,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Ratio (model)",
          line: { color: palette.plotRatio, width: 2 },
        },
      ]
    : [
        {
          x: data.freq_fit,
          y: data.v_corr_ratio_fit,
          type: "scatter" as const,
          mode: "markers" as const,
          name: "Ratio (data)",
          marker: { color: palette.plotRatio, size: 5 },
        },
        {
          x: data.freq_fit,
          y: data.delta_ratio,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Ratio (model)",
          line: { color: palette.plotRatio, width: 2 },
        },
      ];

  return (
    <Plot
      data={traces}
      layout={{
        title: { text: "-V_in / V_out Ratio" },
        xaxis: {
          title: { text: "Frequency (Hz)" },
          type: "log",
          gridcolor: palette.plotGridline,
        },
        yaxis: { title: { text: "Ratio" }, gridcolor: palette.plotGridline },
        paper_bgcolor: "transparent",
        plot_bgcolor: palette.plotBg,
        font: { color: palette.plotFont, size: 12 },
        legend: { x: 1, xanchor: "right", y: 0.99 },
        margin: { l: 60, r: 20, t: 40, b: 50 },
        autosize: true,
      }}
      useResizeHandler
      style={{ width: "100%", height: "100%" }}
      config={{ responsive: true }}
    />
  );
}
