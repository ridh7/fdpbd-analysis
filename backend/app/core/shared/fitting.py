"""
Peak detection for anisotropic and transverse analysis results.

After the thermal model computes the out-of-phase signal and ratio curves,
this function finds the "peak" — the frequency where the out-of-phase signal
is maximum. This peak frequency (f_peak) and the ratio at that frequency
(ratio_at_peak) are the primary outputs of anisotropic/transverse analysis,
reported in the frontend's ResultsSummary and AnisotropicResult/TransverseResult.

## Why polynomial fitting instead of just finding the max value?
The experimental data is discrete (measured at specific frequencies), so the
true peak almost certainly falls BETWEEN two data points. Fitting a smooth
polynomial and finding its analytical maximum gives a more accurate peak
location than just picking the highest measured value.

## numpy functions used:
- np.log(): natural logarithm (element-wise on arrays). We work in log-space
  because frequency data spans orders of magnitude (100 Hz to 100 kHz).
- np.polyfit(x, y, degree): fits a polynomial of the given degree to the data
  using least squares. Returns coefficients [a, b, c] for ax² + bx + c.
- np.polyval(coeffs, x): evaluates a polynomial at point x. The inverse of
  polyfit — takes the coefficients and computes the y value.
- np.exp(): exponential (e^x). Used to convert back from log-space.
- np.nan: "Not a Number" — a sentinel value meaning "no valid result".
  Used here as a default when the peak can't be found (e.g., the curve is
  monotonic with no peak, or the data is too noisy for fitting).
- np.isnan(): checks if a value is NaN. Regular == comparison doesn't work
  with NaN (NaN != NaN is True by IEEE 754 convention).
"""

import numpy as np
from numpy.typing import NDArray


def fit_rough_analysis(
    freqs: NDArray[np.float64],
    out_of_phase: NDArray[np.float64],
    ratio: NDArray[np.float64],
) -> tuple[float, float]:
    """Find peak out-of-phase frequency and ratio at that frequency.

    Returns (f_peak, ratio_at_peak). Both are NaN if the peak can't be determined.
    """
    f_max = np.nan
    ratio_at_fmax = np.nan

    try:
        # Work in log-frequency space so the polynomial fit treats
        # the wide frequency range (e.g., 100 Hz to 100 kHz) uniformly
        log_f = np.log(freqs)

        # Fit a quadratic (degree 2) to out-of-phase vs log(frequency).
        # A quadratic ax² + bx + c has its peak at x = -b/(2a).
        # p_op = [a, b, c] — the 3 polynomial coefficients.
        p_op = np.polyfit(log_f, out_of_phase, 2)

        # Find the peak: the vertex of the parabola is at x = -b/(2a)
        # Only meaningful if a ≠ 0 (otherwise it's a line, no peak)
        if p_op[0] != 0:
            # Convert back from log-space: f_max = e^(x_peak)
            f_max = np.exp(-p_op[1] / (2 * p_op[0]))
    except (np.linalg.LinAlgError, ValueError):
        # polyfit can fail if the data is degenerate (e.g., all identical values,
        # singular matrix). In that case, f_max stays NaN.
        pass

    # If we found a valid peak frequency, evaluate the ratio at that frequency
    if not np.isnan(f_max):
        try:
            # Fit a linear (degree 1) relationship in log-log space:
            # log(ratio) = p_r[0] * log(f) + p_r[1]
            # This is equivalent to a power law: ratio = C * f^n
            log_r = np.log(ratio)
            p_r = np.polyfit(log_f, log_r, 1)

            # Evaluate the fitted line at log(f_max), then convert back:
            # ratio_at_fmax = e^(p_r[0] * log(f_max) + p_r[1])
            ratio_at_fmax = float(np.exp(np.polyval(p_r, np.log(f_max))))
        except (np.linalg.LinAlgError, ValueError):
            # Same failure mode as above — ratio_at_fmax stays NaN
            pass

    return f_max, ratio_at_fmax
