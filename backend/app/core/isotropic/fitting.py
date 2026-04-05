"""
Least-squares fitting for isotropic FD-PBD analysis.

This file finds the two unknown parameters — thermal conductivity (lambda)
and thermo-optic coefficient (coef) — by adjusting them until the thermal
model's predicted signal matches the experimental measurements as closely
as possible.

## How least-squares fitting works:
Given a model function f(x) and measured data y, find x that minimizes:
    sum of (f(x) - y)² over all data points

scipy.optimize.least_squares does this iteratively:
1. Start with an initial guess x_guess
2. Evaluate the residual: r = model(x) - data
3. Use the Jacobian (dr/dx) to compute a better x
4. Repeat until convergence

## Why least_squares instead of minimize?
least_squares is specialized for sum-of-squares problems. It exploits the
structure of the residual vector to compute gradients more efficiently than
a generic optimizer. It also provides the Jacobian for free, which we use
to estimate confidence intervals.

## Normalization:
The in-phase signal is typically ~3× larger than out-of-phase. Without
normalization, the optimizer would prioritize fitting the larger signal
(minimizing its squared error contributes more to the total). Dividing
out-of-phase by max_in and in-phase by 3×max_in gives both components
roughly equal weight in the cost function.
"""

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
    Fit thermal conductivity and thermo-optic coefficient to measured data.

    Args:
        x_guess: Initial guess [lambda_sample, thermo_optic_coef].
        v_corr_in/out: Corrected experimental signals (from data_processing.correct_data).
        lb, ub: Lower and upper bounds for the parameters — prevents the optimizer
            from exploring physically impossible values (e.g., negative conductivity).

    Returns:
        Tuple of:
        - x_sol: fitted parameters [lambda, coef]
        - confidence: 95% confidence intervals for each parameter
    """

    def model(x: NDArray[np.float64], freq: NDArray[np.float64]) -> NDArray[np.float64]:
        """Evaluate the thermal model at the current parameter guess.

        x[0] = lambda (thermal conductivity of the sample, layer index 2)
        x[1] = coef (thermo-optic coefficient)

        Returns a single concatenated vector: [out-of-phase, in-phase] normalized
        so both components contribute equally to the fit.
        """
        # Temporarily set the sample conductivity to the current guess.
        # NOTE: this mutates lambda_down in-place — the optimizer tries different
        # values of x[0] and we slot each one into the layer array.
        lambda_down[2] = x[0]
        coef = x[1]

        # Run the full thermal model to get the predicted signal
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
        delta_out = np.imag(delta_theta)   # predicted out-of-phase
        delta_in = np.real(delta_theta)    # predicted in-phase
        max_in = np.max(np.abs(v_corr_in))
        # Concatenate and normalize: out-of-phase gets weight 1/max_in,
        # in-phase gets weight 1/(3×max_in) so both contribute equally
        return np.concatenate((delta_out / max_in, delta_in / (3 * max_in)))

    # Build the target vector with the same normalization as the model output
    v_target = np.concatenate(
        (
            v_corr_out / np.max(np.abs(v_corr_in)),
            v_corr_in / (3 * np.max(np.abs(v_corr_in))),
        )
    )

    # Run the optimizer: minimize ||model(x) - v_target||²
    # lambda x: model(x, freq) - v_target is the residual function —
    # least_squares will minimize the sum of squares of this vector.
    # method="trf" = Trust Region Reflective — handles bounds efficiently.
    result = least_squares(
        lambda x: model(x, freq) - v_target,
        x_guess,
        bounds=(lb, ub),  # (lower_bounds, upper_bounds) for each parameter
        method="trf",
    )
    x_sol = result.x  # the best-fit parameter values

    # --- Approximate 95% confidence intervals ---
    # The Jacobian J (dr/dx) tells us how sensitive the residual is to each
    # parameter. The covariance matrix is approximately:
    #   cov ≈ (J^T × J)^(-1) × mean(residual²)
    # The diagonal of cov gives the variance of each parameter estimate.
    # 1.96 × sqrt(variance) gives the 95% confidence interval (assuming
    # normally distributed errors).
    jac = result.jac
    resid = result.fun  # final residual vector
    # jac may be a sparse matrix (scipy returns sparse for large problems);
    # convert to dense ndarray for matrix operations
    jac_array: NDArray[np.float64] = (
        np.asarray(jac.todense()) if hasattr(jac, "todense") else np.asarray(jac)
    )
    # J^T @ J is the Fisher information matrix; its inverse × σ² gives covariance
    cov: NDArray[np.float64] = np.linalg.inv(jac_array.T @ jac_array) * np.mean(
        resid**2
    )
    # 1.96 = z-score for 95% confidence (2-sided normal distribution)
    confidence = 1.96 * np.sqrt(np.diag(cov))
    return x_sol, confidence
