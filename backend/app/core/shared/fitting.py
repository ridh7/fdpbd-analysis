"""Shared fitting utilities for anisotropic and transverse analysis."""

import numpy as np
from numpy.typing import NDArray


def fit_rough_analysis(
    freqs: NDArray[np.float64],
    out_of_phase: NDArray[np.float64],
    ratio: NDArray[np.float64],
) -> tuple[float, float]:
    """Find peak out-of-phase frequency and ratio at that frequency."""
    f_max = np.nan
    ratio_at_fmax = np.nan

    try:
        log_f = np.log(freqs)
        p_op = np.polyfit(log_f, out_of_phase, 2)
        if p_op[0] != 0:
            f_max = np.exp(-p_op[1] / (2 * p_op[0]))
    except (np.linalg.LinAlgError, ValueError):
        pass

    if not np.isnan(f_max):
        try:
            log_r = np.log(ratio)
            p_r = np.polyfit(log_f, log_r, 1)
            ratio_at_fmax = float(np.exp(np.polyval(p_r, np.log(f_max))))
        except (np.linalg.LinAlgError, ValueError):
            pass

    return f_max, ratio_at_fmax
