import Plot from "./Plot";
import type { PlotData, AnisotropicPlotData } from "../../../schemas/results";

interface InOutPhasePlotProps {
  data: PlotData | AnisotropicPlotData;
}

function isAnisotropicData(
  data: PlotData | AnisotropicPlotData,
): data is AnisotropicPlotData {
  return "model_freqs" in data;
}

export function InOutPhasePlot({ data }: InOutPhasePlotProps) {
  const traces = isAnisotropicData(data)
    ? [
        {
          x: data.exp_freqs,
          y: data.in_exp,
          type: "scatter" as const,
          mode: "markers" as const,
          name: "In-phase (data)",
          marker: { color: "#3b82f6", size: 5 },
        },
        {
          x: data.model_freqs,
          y: data.in_model,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "In-phase (model)",
          line: { color: "#3b82f6", width: 2 },
        },
        {
          x: data.exp_freqs,
          y: data.out_exp,
          type: "scatter" as const,
          mode: "markers" as const,
          name: "Out-of-phase (data)",
          marker: { color: "#ef4444", size: 5 },
        },
        {
          x: data.model_freqs,
          y: data.out_model,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Out-of-phase (model)",
          line: { color: "#ef4444", width: 2 },
        },
      ]
    : [
        {
          x: data.freq_fit,
          y: data.v_corr_in_fit,
          type: "scatter" as const,
          mode: "markers" as const,
          name: "In-phase (data)",
          marker: { color: "#3b82f6", size: 5 },
        },
        {
          x: data.freq_fit,
          y: data.delta_in,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "In-phase (model)",
          line: { color: "#3b82f6", width: 2 },
        },
        {
          x: data.freq_fit,
          y: data.v_corr_out_fit,
          type: "scatter" as const,
          mode: "markers" as const,
          name: "Out-of-phase (data)",
          marker: { color: "#ef4444", size: 5 },
        },
        {
          x: data.freq_fit,
          y: data.delta_out,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Out-of-phase (model)",
          line: { color: "#ef4444", width: 2 },
        },
      ];

  return (
    <Plot
      data={traces}
      layout={{
        title: { text: "In-Phase / Out-of-Phase Signal" },
        xaxis: { title: { text: "Frequency (Hz)" }, type: "log" },
        yaxis: { title: { text: "Signal (V)" } },
        paper_bgcolor: "transparent",
        plot_bgcolor: "rgba(30,30,30,0.8)",
        font: { color: "#d1d5db", size: 12 },
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
