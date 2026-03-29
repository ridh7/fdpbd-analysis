import Plot from "react-plotly.js";
import type { PlotData } from "../../../schemas/results";

interface RatioPlotProps {
  data: PlotData;
}

export function RatioPlot({ data }: RatioPlotProps) {
  return (
    <Plot
      data={[
        {
          x: data.freq_fit,
          y: data.v_corr_ratio_fit,
          type: "scatter",
          mode: "markers",
          name: "Ratio (data)",
          marker: { color: "#22c55e", size: 5 },
        },
        {
          x: data.freq_fit,
          y: data.delta_ratio,
          type: "scatter",
          mode: "lines",
          name: "Ratio (model)",
          line: { color: "#22c55e", width: 2 },
        },
      ]}
      layout={{
        title: {
          text: "-V_in / V_out Ratio",
          font: { size: 14 },
        },
        xaxis: { title: "Frequency (Hz)", type: "log" },
        yaxis: { title: "Ratio" },
        paper_bgcolor: "transparent",
        plot_bgcolor: "rgba(30,30,30,0.8)",
        font: { color: "#d1d5db" },
        legend: { x: 0.01, y: 0.99 },
        margin: { l: 60, r: 20, t: 40, b: 50 },
        autosize: true,
      }}
      useResizeHandler
      style={{ width: "100%", height: "100%" }}
      config={{ responsive: true }}
    />
  );
}
