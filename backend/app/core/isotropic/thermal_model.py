"""Thermal modeling for isotropic FD-PBD analysis.

Implements transfer matrix method for multilayer heat diffusion
with Hankel transform in cylindrical coordinates.
"""

import numpy as np
from numpy.typing import NDArray
from scipy.special import j1

from app.core.shared.integration import romberg_integration


def compute_steady_state_heat(
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
    a_dc: float,
) -> float:
    """
    Compute steady-state temperature rise due to laser heating.

    Uses Hankel transform to solve 3D heat diffusion in cylindrical coordinates.
    """
    k_max = 2 / np.sqrt(r_pump**2 + r_probe**2)
    k_min = 1 / (10000 * max(r_pump, r_probe))

    def integrand(k: NDArray[np.float64]) -> NDArray[np.complex128]:
        return k * bi_fdtr_bo_temp(
            k,
            0.0,
            lambda_up,
            c_up,
            h_up,
            eta_up,
            lambda_down,
            c_down,
            h_down,
            eta_down,
            r_pump,
            r_probe,
            a_dc,
        )

    result = romberg_integration(integrand, k_min, k_max)
    return float(np.real(result))


def bi_fdtr_bo_temp(
    k: NDArray[np.float64],
    freq: float,
    lambda_up: float,
    c_up: float,
    h_up: float,
    eta_up: float,
    lambda_down: NDArray[np.float64],
    c_down: NDArray[np.float64],
    h_down: NDArray[np.float64],
    eta_down: NDArray[np.float64],
    r_pump: float,
    r_probe: float,
    a_pump: float,
) -> NDArray[np.complex128]:
    """
    Compute temperature field in Hankel transform space for multilayer system.

    Uses transfer matrix method to compute thermal Green's function G(k,w).
    """
    is_scalar = np.isscalar(k)
    k = np.atleast_1d(k)

    # Air layer thermal impedance
    alpha_up = lambda_up / c_up
    omega = 2 * np.pi * freq
    q2 = 1j * omega / alpha_up
    un = np.sqrt(4 * np.pi**2 * eta_up * k**2 + q2)
    gamman = lambda_up * un
    g_up = 1 / gamman

    # Sample layers (transfer matrix method)
    n_layers = len(lambda_down)
    alpha_down = lambda_down / c_down
    q2 = 1j * omega / alpha_down[-1]
    un = np.sqrt(4 * np.pi**2 * eta_down[-1] * k**2 + q2)
    gamman = lambda_down[-1] * un
    b_plus = np.zeros_like(k, dtype=complex)
    b_minus = np.ones_like(k, dtype=complex)

    if n_layers > 1:
        for n in range(n_layers - 1, 0, -1):
            q2 = 1j * omega / alpha_down[n - 1]
            un_minus = np.sqrt(eta_down[n - 1] * 4 * np.pi**2 * k**2 + q2)
            gamman_minus = lambda_down[n - 1] * un_minus

            aa = gamman_minus + gamman
            bb = gamman_minus - gamman
            temp1 = aa * b_plus + bb * b_minus
            temp2 = bb * b_plus + aa * b_minus
            exp_term = np.exp(un_minus * h_down[n - 1])

            b_plus = 0.5 / (gamman_minus * exp_term) * temp1
            b_minus = 0.5 / gamman_minus * exp_term * temp2

            penetration_logic = h_down[n - 1] * np.abs(un_minus) > 100
            b_plus[penetration_logic] = 0
            b_minus[penetration_logic] = 1

            un = un_minus
            gamman = gamman_minus

    denominator = b_minus - b_plus
    denominator = np.where(np.abs(denominator) < 1e-10, 1e-10, denominator)
    g_down = (b_plus + b_minus) / denominator / gamman

    g = g_up * g_down / (g_up + g_down)

    s = np.exp(-(np.pi**2) * r_probe**2 / 2 * k**2)
    p = a_pump * np.exp(-(np.pi**2) * r_pump**2 / 2 * k**2)

    result: NDArray[np.complex128] = g * s * p
    return result[0] if is_scalar else result


def delta_bo_theta(
    niu: float,
    coef: float,
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
) -> NDArray[np.complex128]:
    """
    Compute photothermal beam deflection signal vs frequency.

    Physical principle: modulated pump laser creates temperature oscillations,
    temperature gradient causes refractive index gradient (mirage effect),
    probe beam deflects proportionally to grad(n).
    """
    Nk = 200
    k_max = 2.0 / np.sqrt(r_pump**2 + r_probe**2)
    k = np.linspace(0.0, k_max, Nk)
    weight = 8 * np.pi**2 * k**2
    bessel = -j1(2 * np.pi * k * x_offset)

    alpha_sub = lambda_down[2] / c_down[2]
    c_probe = 0.7

    delta_theta = np.zeros(freq.shape, dtype=complex)

    for i, f in enumerate(freq):
        omega = 2 * np.pi * f
        q2 = 1j * omega / alpha_sub
        qk = np.sqrt(4 * np.pi**2 * eta_down[2] * k**2 + q2)

        defl = (2 * (1 + niu) * coef) / (qk + 2 * np.pi * k)

        temp = bi_fdtr_bo_temp(
            k,
            f,
            lambda_up,
            c_up,
            h_up,
            eta_up,
            lambda_down,
            c_down,
            h_down,
            eta_down,
            r_pump,
            r_probe,
            a_pump,
        )

        integrand = -c_probe * weight * bessel * defl * temp
        delta_theta[i] = np.trapezoid(integrand, k)

    return delta_theta
