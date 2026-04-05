/**
 * In-phase and out-of-phase signal plot — overlays model curves against
 * experimental data on a log-frequency x-axis.
 *
 * Handles two different data shapes (both plot model vs experiment):
 *   - Isotropic (PlotData): model (delta_in/out) and experiment (v_corr_in/out_fit)
 *     share the same frequency axis (freq_fit)
 *   - Anisotropic/Transverse (AnisotropicPlotData): model and experiment have
 *     separate frequency axes (model_freqs vs exp_freqs) since the model may
 *     be computed at higher resolution than the experimental data points
 *
 * Theme colors are imported directly from the palette objects (not CSS vars)
 * because Plotly renders to a <canvas>/<svg> outside React's DOM — CSS custom
 * properties set in useEffect would be stale when Plotly reads them.
 */
import Plot from "./Plot";
import type { PlotData, AnisotropicPlotData } from "../../../schemas/results";
import { darkTheme, lightTheme, type Theme } from "../../../constants/theme";

interface InOutPhasePlotProps {
  data: PlotData | AnisotropicPlotData;
  theme: Theme;
}

function isAnisotropicData(
  data: PlotData | AnisotropicPlotData,
): data is AnisotropicPlotData {
  return "model_freqs" in data;
}

export function InOutPhasePlot({ data, theme }: InOutPhasePlotProps) {
  const palette = theme === "dark" ? darkTheme : lightTheme;

  const traces = isAnisotropicData(data)
    ? [
        {
          x: data.exp_freqs,
          y: data.in_exp,
          type: "scatter" as const,
          mode: "markers" as const,
          name: "In-phase (data)",
          marker: { color: palette.plotInPhase, size: 5 },
        },
        {
          x: data.model_freqs,
          y: data.in_model,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "In-phase (model)",
          line: { color: palette.plotInPhase, width: 2 },
        },
        {
          x: data.exp_freqs,
          y: data.out_exp,
          type: "scatter" as const,
          mode: "markers" as const,
          name: "Out-of-phase (data)",
          marker: { color: palette.plotOutPhase, size: 5 },
        },
        {
          x: data.model_freqs,
          y: data.out_model,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Out-of-phase (model)",
          line: { color: palette.plotOutPhase, width: 2 },
        },
      ]
    : [
        {
          x: data.freq_fit,
          y: data.v_corr_in_fit,
          type: "scatter" as const,
          mode: "markers" as const,
          name: "In-phase (data)",
          marker: { color: palette.plotInPhase, size: 5 },
        },
        {
          x: data.freq_fit,
          y: data.delta_in,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "In-phase (model)",
          line: { color: palette.plotInPhase, width: 2 },
        },
        {
          x: data.freq_fit,
          y: data.v_corr_out_fit,
          type: "scatter" as const,
          mode: "markers" as const,
          name: "Out-of-phase (data)",
          marker: { color: palette.plotOutPhase, size: 5 },
        },
        {
          x: data.freq_fit,
          y: data.delta_out,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Out-of-phase (model)",
          line: { color: palette.plotOutPhase, width: 2 },
        },
      ];

  return (
    <Plot
      data={traces}
      layout={{
        title: { text: "In-Phase / Out-of-Phase Signal" },
        xaxis: {
          title: { text: "Frequency (Hz)" },
          type: "log",
          gridcolor: palette.plotGridline,
        },
        yaxis: { title: { text: "Signal (V)" }, gridcolor: palette.plotGridline },
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
