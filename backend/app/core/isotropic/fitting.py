"""Least-squares fitting for isotropic FD-PBD analysis."""

import numpy as np
from numpy.typing import NDArray
from scipy.optimize import least_squares

from .thermal_model import delta_bo_theta


def fit_in_out(
    x_guess: list[float],
    v_corr_in: NDArray[np.float64],
    v_corr_out: NDArray[np.float64],
    niu: float,
    freq: NDArray[np.float64],
    lambda_down: NDArray[np.float64],
    c_down: NDArray[np.float64],
    h_down: NDArray[np.float64],
    eta_down: NDArray[np.float64],
    lambda_up: float,
    c_up: float,
    h_up: float,
    eta_up: float,
    r_pump: float,
    r_probe: float,
    a_pump: float,
    x_offset: float,
    lb: list[float],
    ub: list[float],
) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    """
    Fit in-phase and out-of-phase signals to the FD-PBD thermal model.

    Returns:
        Tuple of (fitted parameters [lambda, coef], 95% confidence intervals).
    """

    def model(x: NDArray[np.float64], freq: NDArray[np.float64]) -> NDArray[np.float64]:
        lambda_down[2] = x[0]
        coef = x[1]
        delta_theta = delta_bo_theta(
            niu,
            coef,
            freq,
            lambda_down,
            c_down,
            h_down,
            eta_down,
            lambda_up,
            c_up,
            h_up,
            eta_up,
            r_pump,
            r_probe,
            a_pump,
            x_offset,
        )
        delta_out = np.imag(delta_theta)
        delta_in = np.real(delta_theta)
        max_in = np.max(np.abs(v_corr_in))
        return np.concatenate((delta_out / max_in, delta_in / (3 * max_in)))

    v_target = np.concatenate(
        (
            v_corr_out / np.max(np.abs(v_corr_in)),
            v_corr_in / (3 * np.max(np.abs(v_corr_in))),
        )
    )
    result = least_squares(
        lambda x: model(x, freq) - v_target,
        x_guess,
        bounds=(lb, ub),
        method="trf",
    )
    x_sol = result.x

    # Approximate 95% confidence intervals
    jac = result.jac
    resid = result.fun
    jac_array: NDArray[np.float64] = (
        np.asarray(jac.todense()) if hasattr(jac, "todense") else np.asarray(jac)
    )
    cov: NDArray[np.float64] = np.linalg.inv(jac_array.T @ jac_array) * np.mean(
        resid**2
    )
    confidence = 1.96 * np.sqrt(np.diag(cov))
    return x_sol, confidence
