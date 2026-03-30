"""Numerical integration methods: Romberg and Simpson's rule."""

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
    Perform Romberg integration of a function, supporting complex-valued integrands.

    Args:
        func: Function to integrate (may return complex values).
        a, b: Integration limits.
        dec_digits: Number of decimal digits for accuracy.

    Returns:
        Complex integral result.
    """

    def real_integrator(x: NDArray[np.float64]) -> NDArray[np.float64]:
        return np.real(func(x))

    def imag_integrator(x: NDArray[np.float64]) -> NDArray[np.float64]:
        return np.imag(func(x))

    def integrate_part(
        integrator: Callable[[NDArray[np.float64]], NDArray[np.float64]],
    ) -> float:
        rom = np.zeros((2, dec_digits))
        n_points = 2 ** (dec_digits - 1) + 1
        x = np.linspace(a, b, n_points)
        f_vals = integrator(x)
        h = b - a
        rom[0, 0] = h * (f_vals[0] + f_vals[-1]) / 2

        for i in range(1, dec_digits):
            st = 2 ** (dec_digits - i)
            rom[1, 0] = (
                rom[0, 0] + h * np.sum(f_vals[st // 2 : st : 2 ** (dec_digits - 1)])
            ) / 2
            for k in range(i):
                rom[1, k + 1] = (4 ** (k + 1) * rom[1, k] - rom[0, k]) / (
                    4 ** (k + 1) - 1
                )
            rom[0, : i + 1] = rom[1, : i + 1]
            h /= 2

        return float(rom[0, dec_digits - 1])

    real_result: float = integrate_part(real_integrator)
    imag_result: float = integrate_part(imag_integrator)
    return complex(real_result + 1j * imag_result)


def simpson_integration(y: NDArray[np.complex128], dx: float) -> complex:
    """Simpson's rule for equally-spaced data (supports complex values).

    Requires an odd number of points >= 3.
    """
    n = y.size
    if n < 3 or n % 2 == 0:
        raise ValueError("Simpson integration requires odd number of points >= 3.")
    return complex(dx / 3 * (y[0] + y[-1] + 4 * y[1:-1:2].sum() + 2 * y[2:-1:2].sum()))
