import Plot from "./Plot";
import type { PlotData, AnisotropicPlotData } from "../../../schemas/results";

interface RatioPlotProps {
  data: PlotData | AnisotropicPlotData;
}

function isAnisotropicData(
  data: PlotData | AnisotropicPlotData,
): data is AnisotropicPlotData {
  return "model_freqs" in data;
}

export function RatioPlot({ data }: RatioPlotProps) {
  const traces = isAnisotropicData(data)
    ? [
        {
          x: data.exp_freqs,
          y: data.ratio_exp,
          type: "scatter" as const,
          mode: "markers" as const,
          name: "Ratio (data)",
          marker: { color: "#22c55e", size: 5 },
        },
        {
          x: data.model_freqs,
          y: data.ratio_model,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Ratio (model)",
          line: { color: "#22c55e", width: 2 },
        },
      ]
    : [
        {
          x: data.freq_fit,
          y: data.v_corr_ratio_fit,
          type: "scatter" as const,
          mode: "markers" as const,
          name: "Ratio (data)",
          marker: { color: "#22c55e", size: 5 },
        },
        {
          x: data.freq_fit,
          y: data.delta_ratio,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Ratio (model)",
          line: { color: "#22c55e", width: 2 },
        },
      ];

  return (
    <Plot
      data={traces}
      layout={{
        title: { text: "-V_in / V_out Ratio" },
        xaxis: { title: { text: "Frequency (Hz)" }, type: "log" },
        yaxis: { title: { text: "Ratio" } },
        paper_bgcolor: "transparent",
        plot_bgcolor: "rgba(30,30,30,0.8)",
        font: { color: "#d1d5db", size: 12 },
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
