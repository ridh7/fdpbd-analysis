import type { FDPBDResult } from "../../schemas/results";

interface ResultsSummaryProps {
  result: FDPBDResult;
  timeTaken: number | null;
}

export function ResultsSummary({ result, timeTaken }: ResultsSummaryProps) {
  return (
    <div className="rounded border border-gray-700 bg-gray-800 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-200">
        Analysis Results
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-gray-400">
            Thermal Conductivity ({"\u03BB"})
          </div>
          <div className="text-lg font-medium text-white">
            {result.lambda_measure.toFixed(4)}{" "}
            <span className="text-sm text-gray-400">W/m-K</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">
            Thermo-optic Coeff ({"\u03B1_T"})
          </div>
          <div className="text-lg font-medium text-white">
            {result.alpha_t_fitted.toExponential(4)}{" "}
            <span className="text-sm text-gray-400">1/K</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">
            Steady-State Heating ({"\u0394T"})
          </div>
          <div className="text-lg font-medium text-white">
            {result.t_ss_heat.toFixed(4)}{" "}
            <span className="text-sm text-gray-400">K</span>
          </div>
        </div>
      </div>
      {timeTaken !== null && (
        <div className="mt-2 text-xs text-gray-500">
          Completed in {timeTaken.toFixed(2)}s
        </div>
      )}
    </div>
  );
}
