"""
Numerical integration methods used by the thermal model.

The thermal model requires computing integrals that have no closed-form
(analytical) solution — the beam deflection depends on integrating the
temperature distribution over space, which can only be done numerically.

## Why not use scipy.integrate?
These implementations handle complex-valued integrands natively. scipy's
quad() only works with real functions — you'd need to integrate real and
imaginary parts separately and manage the bookkeeping yourself. These
functions encapsulate that pattern.

## Two methods, two use cases:
- romberg_integration: for integrating a FUNCTION (callable). Higher accuracy
  through Richardson extrapolation — iteratively refines the estimate by
  combining coarse and fine approximations. Used when you can evaluate the
  function at any point.
- simpson_integration: for integrating pre-computed DATA points (array).
  Used when you already have the function values on a grid and can't
  evaluate at new points.

## Python imports used:
- Callable[..., Any]: type hint for "any function" — the ... means any number
  of arguments, Any means any return type. Used because the integrand's
  signature varies depending on the physics being computed.
- NDArray[np.float64]: numpy array of 64-bit floats (see data_processing.py
  for full explanation of numpy types).
"""

from collections.abc import Callable
from typing import Any

import numpy as np
from numpy.typing import NDArray


def romberg_integration(
    func: Callable[..., Any],
    a: float,
    b: float,
    dec_digits: int = 10,
) -> complex:
    """
    Romberg integration of a function over [a, b].

    Romberg integration is the trapezoidal rule on steroids. It works by:
    1. Computing the trapezoidal rule at increasingly fine step sizes (h, h/2, h/4, ...)
    2. Using Richardson extrapolation to combine these estimates, cancelling out
       error terms and converging much faster than the trapezoidal rule alone.

    The Richardson extrapolation formula:
        rom[1, k+1] = (4^(k+1) * rom[1, k] - rom[0, k]) / (4^(k+1) - 1)
    Each level cancels one more order of error, giving rapid convergence
    for smooth functions.

    Supports complex-valued integrands by integrating real and imaginary
    parts separately, then combining the results.

    Args:
        func: The function to integrate. May return complex values.
        a, b: Lower and upper integration limits.
        dec_digits: Controls accuracy — more digits = finer grid = more precision.
            Uses 2^(dec_digits-1) + 1 evaluation points. Default 10 → 513 points.
    """

    # Split complex integration into two real integrations
    def real_integrator(x: NDArray[np.float64]) -> NDArray[np.float64]:
        return np.real(func(x))

    def imag_integrator(x: NDArray[np.float64]) -> NDArray[np.float64]:
        return np.imag(func(x))

    def integrate_part(
        integrator: Callable[[NDArray[np.float64]], NDArray[np.float64]],
    ) -> float:
        # rom is a 2-row table for Richardson extrapolation.
        # Row 0 = previous level's estimates, row 1 = current level's estimates.
        # Only 2 rows needed because each level only depends on the previous one.
        rom = np.zeros((2, dec_digits))

        # Pre-compute all function values at the finest grid resolution.
        # Coarser grids reuse subsets of these values (every 2nd, 4th, etc. point)
        # rather than recomputing — an efficiency trick.
        n_points = 2 ** (dec_digits - 1) + 1
        x = np.linspace(a, b, n_points)  # evenly spaced points from a to b
        f_vals = integrator(x)
        h = b - a  # initial step size (the full interval)

        # Level 0: basic trapezoidal rule using just the endpoints
        # Trapezoid area = h * (f(a) + f(b)) / 2
        rom[0, 0] = h * (f_vals[0] + f_vals[-1]) / 2

        for i in range(1, dec_digits):
            st = 2 ** (dec_digits - i)
            # Add midpoints to the previous trapezoidal estimate (halving h each time)
            rom[1, 0] = (
                rom[0, 0] + h * np.sum(f_vals[st // 2 : st : 2 ** (dec_digits - 1)])
            ) / 2
            # Richardson extrapolation: combine estimates to cancel error terms.
            # k=0 cancels O(h²) error → O(h⁴) accuracy (Simpson's rule equivalent)
            # k=1 cancels O(h⁴) error → O(h⁶) accuracy
            # Each level gives 2 more orders of accuracy for smooth functions.
            for k in range(i):
                rom[1, k + 1] = (4 ** (k + 1) * rom[1, k] - rom[0, k]) / (
                    4 ** (k + 1) - 1
                )
            # Shift current row to previous for next iteration
            rom[0, : i + 1] = rom[1, : i + 1]
            h /= 2  # halve step size for next level

        # The most refined estimate is in the last column
        return float(rom[0, dec_digits - 1])

    real_result: float = integrate_part(real_integrator)
    imag_result: float = integrate_part(imag_integrator)
    return complex(real_result + 1j * imag_result)


def simpson_integration(y: NDArray[np.complex128], dx: float) -> complex:
    """
    Simpson's rule for equally-spaced data points (supports complex values).

    Simpson's rule approximates the integral by fitting parabolas through
    every 3 consecutive points, rather than straight lines (trapezoidal).
    This gives O(h⁴) accuracy vs O(h²) for trapezoidal.

    The formula weights points as: 1, 4, 2, 4, 2, ..., 4, 1
    multiplied by dx/3. The alternating 4,2 pattern comes from the
    parabolic fit coefficients.

    Requires an ODD number of points (≥ 3) because Simpson's rule works
    in pairs of intervals — each parabola spans 2 intervals (3 points).
    Even number of points would leave one interval unpaired.

    Args:
        y: Function values at equally-spaced points (complex-valued).
        dx: Spacing between points (the step size).
    """
    n = y.size
    if n < 3 or n % 2 == 0:
        raise ValueError("Simpson integration requires odd number of points >= 3.")
    # y[0] + y[-1]       → endpoints, weight 1
    # y[1:-1:2].sum()     → odd-indexed points (1,3,5,...), weight 4
    # y[2:-1:2].sum()     → even-indexed points (2,4,6,...), weight 2
    return complex(dx / 3 * (y[0] + y[-1] + 4 * y[1:-1:2].sum() + 2 * y[2:-1:2].sum()))
