import type { PlotData, AnisotropicPlotData } from "../../schemas/results";
import type { Theme } from "../../constants/theme";
import { InOutPhasePlot } from "./charts/InOutPhasePlot";
import { RatioPlot } from "./charts/RatioPlot";

interface PlotPanelProps {
  data: PlotData | AnisotropicPlotData;
  theme: Theme;
}

export function PlotPanel({ data, theme }: PlotPanelProps) {
  return (
    <div className="rounded-lg border border-(--border-primary) bg-(--bg-secondary) p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="aspect-square">
          <InOutPhasePlot data={data} theme={theme} />
        </div>
        <div className="aspect-square">
          <RatioPlot data={data} theme={theme} />
        </div>
      </div>
    </div>
  );
}
