import type { PlotData, AnisotropicPlotData } from "../../schemas/results";
import { InOutPhasePlot } from "./charts/InOutPhasePlot";
import { RatioPlot } from "./charts/RatioPlot";

interface PlotPanelProps {
  data: PlotData | AnisotropicPlotData;
}

export function PlotPanel({ data }: PlotPanelProps) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="aspect-square">
          <InOutPhasePlot data={data} />
        </div>
        <div className="aspect-square">
          <RatioPlot data={data} />
        </div>
      </div>
    </div>
  );
}
