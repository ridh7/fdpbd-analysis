import type { PlotData, AnisotropicPlotData } from "../../schemas/results";
import { InOutPhasePlot } from "./charts/InOutPhasePlot";
import { RatioPlot } from "./charts/RatioPlot";

interface PlotPanelProps {
  data: PlotData | AnisotropicPlotData;
}

export function PlotPanel({ data }: PlotPanelProps) {
  return (
    <div className="grid h-full grid-rows-2 gap-4">
      <div className="min-h-0">
        <InOutPhasePlot data={data} />
      </div>
      <div className="min-h-0">
        <RatioPlot data={data} />
      </div>
    </div>
  );
}
