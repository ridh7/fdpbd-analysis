/**
 * Wrapper around react-plotly.js to handle CJS/ESM interop.
 * react-plotly.js is a CJS module; with verbatimModuleSyntax the default
 * import resolves to the module object. We re-export the component cleanly.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
import PlotModule from "react-plotly.js";

// CJS interop: the default export may be wrapped in { default: Component }
const Plot =
  typeof PlotModule === "function"
    ? PlotModule
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((PlotModule as any).default as typeof PlotModule);

export default Plot;
