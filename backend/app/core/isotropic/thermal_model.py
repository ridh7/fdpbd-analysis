"""
Thermal modeling for isotropic FD-PBD analysis — the core physics engine.

This file implements the mathematical model that predicts what the FD-PBD
instrument should measure for a given set of material properties. The predicted
signal is compared to actual measurements to extract thermal conductivity.

## Physical overview:
A modulated pump laser heats the sample surface, creating periodic temperature
oscillations that diffuse into the material. A separate probe beam passes through
the heated region, and the temperature gradient causes a refractive index
gradient (the "mirage effect"), which deflects the probe beam. The deflection
angle is measured by the lock-in amplifier as in-phase and out-of-phase signals.

## Mathematical approach:
The heat diffusion equation in a multilayer system is solved in Hankel transform
space (the cylindrical coordinate equivalent of Fourier transforms). This
converts the 3D partial differential equation into a 1D algebraic problem for
each spatial frequency k, which is solved using the transfer matrix method.

## Key functions (in order of dependency):
1. bi_fdtr_bo_temp() — computes the temperature field G(k,ω) for a given spatial
   frequency k and modulation frequency ω, using the transfer matrix method
2. compute_steady_state_heat() — integrates G(k,0) over all k to get the DC
   temperature rise (freq=0, no oscillation)
3. delta_bo_theta() — computes the beam deflection signal by integrating
   G(k,ω) × (deflection sensitivity) × (beam profile) over k, for each
   modulation frequency. This is the main output — the predicted signal.

## scipy import:
- j1 (from scipy.special): first-order Bessel function of the first kind.
  Appears in the Hankel transform because we're working in cylindrical
  coordinates — Bessel functions are to cylindrical symmetry what sines/cosines
  are to planar symmetry. j1 specifically arises from the derivative of j0
  when computing the beam deflection (gradient of the temperature field).
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
    Compute steady-state (DC) temperature rise due to continuous laser heating.

    This is the time-averaged temperature increase at the surface — used to
    check if the pump power is too high (could damage the sample). Computed
    by evaluating the thermal model at frequency=0 (no modulation) and
    integrating over spatial frequency k.

    The integration limits k_min and k_max define the range of spatial
    frequencies that contribute meaningfully to the temperature field:
    - k_max: ~1/beam_size — spatial frequencies finer than the beam are irrelevant
    - k_min: ~1/(10000 × beam_size) — very long wavelength contributions are negligible
    """
    k_max = 2 / np.sqrt(r_pump**2 + r_probe**2)
    k_min = 1 / (10000 * max(r_pump, r_probe))

    def integrand(k: NDArray[np.float64]) -> NDArray[np.complex128]:
        # k × G(k, freq=0) — the extra k factor comes from the Hankel transform
        # measure (k dk dθ in cylindrical coordinates)
        return k * bi_fdtr_bo_temp(
            k,
            0.0,  # freq=0 → steady state (no oscillation)
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
    # Take only the real part — the imaginary part should be ~0 for DC
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
    Temperature field in Hankel-transform space for a multilayer system: G(k, ω).

    This is the thermal Green's function — it tells you the temperature response
    at spatial frequency k and modulation frequency ω. The actual temperature
    distribution is obtained by integrating G(k,ω) over k (inverse Hankel transform).

    ## Transfer matrix method:
    Each layer is represented by a 2×2 matrix that relates the temperature and
    heat flux at its top surface to those at its bottom. Multiplying matrices
    for all layers gives the total system response. This is much simpler than
    solving the heat equation across all layers simultaneously.

    The b_plus and b_minus variables track the upward and downward propagating
    thermal waves in each layer. Starting from the deepest layer (semi-infinite
    substrate: b_plus=0, b_minus=1, meaning only a downward-decaying wave),
    we propagate back to the surface through each layer.

    ## Key variables:
    - alpha: thermal diffusivity = lambda/c (how fast heat spreads, m²/s)
    - omega: angular modulation frequency = 2π × freq
    - q²: 1j × omega / alpha — the temporal part of the diffusion equation
    - un: √(eta × 4π²k² + q²) — the total wavevector combining spatial (k)
      and temporal (q) components. eta is the anisotropy ratio (1 for isotropic)
    - gamman: lambda × un — the thermal impedance of the layer
    - g_up, g_down: thermal Green's functions for above and below the surface
    - g: combined Green's function (parallel thermal resistances)
    """
    is_scalar = np.isscalar(k)
    # np.atleast_1d ensures k is always an array, even if a single float was passed.
    # This lets the math below work with array operations uniformly.
    k = np.atleast_1d(k)

    # --- Air layer (above sample) thermal impedance ---
    alpha_up = lambda_up / c_up  # thermal diffusivity of the medium
    omega = 2 * np.pi * freq     # angular frequency (rad/s)
    q2 = 1j * omega / alpha_up   # temporal diffusion term
    # un: total wavevector — combines spatial frequency k with temporal frequency ω.
    # For freq=0 (steady state), this simplifies to un = 2π × sqrt(eta) × k
    un = np.sqrt(4 * np.pi**2 * eta_up * k**2 + q2)
    gamman = lambda_up * un  # thermal impedance
    g_up = 1 / gamman        # Green's function for the upper medium (semi-infinite)

    # --- Sample layers (transfer matrix method, bottom to top) ---
    n_layers = len(lambda_down)
    alpha_down = lambda_down / c_down  # diffusivity for each layer

    # Start from the deepest layer (substrate, assumed semi-infinite)
    q2 = 1j * omega / alpha_down[-1]
    un = np.sqrt(4 * np.pi**2 * eta_down[-1] * k**2 + q2)
    gamman = lambda_down[-1] * un
    # Semi-infinite boundary condition: only downward-decaying wave exists
    b_plus = np.zeros_like(k, dtype=complex)   # upward wave amplitude = 0
    b_minus = np.ones_like(k, dtype=complex)   # downward wave amplitude = 1

    if n_layers > 1:
        # Propagate from bottom layer upward through each interface
        for n in range(n_layers - 1, 0, -1):
            q2 = 1j * omega / alpha_down[n - 1]
            un_minus = np.sqrt(eta_down[n - 1] * 4 * np.pi**2 * k**2 + q2)
            gamman_minus = lambda_down[n - 1] * un_minus

            # Transfer matrix coefficients for the interface between layers
            aa = gamman_minus + gamman   # sum of impedances
            bb = gamman_minus - gamman   # difference of impedances
            temp1 = aa * b_plus + bb * b_minus
            temp2 = bb * b_plus + aa * b_minus
            # Exponential growth/decay through the layer thickness
            exp_term = np.exp(un_minus * h_down[n - 1])

            b_plus = 0.5 / (gamman_minus * exp_term) * temp1
            b_minus = 0.5 / gamman_minus * exp_term * temp2

            # Numerical stability: if the thermal wave decays to effectively zero
            # within this layer (penetration depth << layer thickness), reset to
            # semi-infinite boundary condition. Prevents overflow from exp() with
            # large arguments.
            penetration_logic = h_down[n - 1] * np.abs(un_minus) > 100
            b_plus[penetration_logic] = 0
            b_minus[penetration_logic] = 1

            un = un_minus
            gamman = gamman_minus

    # Combine b_plus and b_minus into the sample-side Green's function
    denominator = b_minus - b_plus
    # Prevent division by zero — clamp tiny denominators
    denominator = np.where(np.abs(denominator) < 1e-10, 1e-10, denominator)
    g_down = (b_plus + b_minus) / denominator / gamman

    # Total Green's function: parallel combination of above and below
    # Like parallel resistors: 1/g = 1/g_up + 1/g_down → g = g_up * g_down / (g_up + g_down)
    g = g_up * g_down / (g_up + g_down)

    # Beam profiles in Hankel space — Gaussian beams become Gaussians in k-space
    # s: probe beam sensitivity profile (how much each k contributes to detection)
    # p: pump beam power profile (how much each k is heated)
    s = np.exp(-(np.pi**2) * r_probe**2 / 2 * k**2)
    p = a_pump * np.exp(-(np.pi**2) * r_pump**2 / 2 * k**2)

    # Final result: temperature response = Green's function × pump × probe
    result: NDArray[np.complex128] = g * s * p
    # Return scalar if scalar input was given (keeps downstream code clean)
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
    Compute photothermal beam deflection signal vs modulation frequency.

    This is the main output of the thermal model — the predicted in-phase and
    out-of-phase signals that get compared to experimental data. The complex
    return value encodes both: real part = in-phase, imaginary part = out-of-phase.

    ## Physics:
    The probe beam deflection angle is proportional to the integral of
    (temperature gradient) × (thermo-optic response) × (beam profile)
    over all spatial frequencies k. At each k:
    - bi_fdtr_bo_temp gives the temperature amplitude
    - defl gives the mechanical + thermal expansion response
    - bessel (j1) gives the spatial phase from the pump-probe offset
    - weight (k²) comes from the cylindrical coordinate measure

    ## Parameters:
    - niu: Poisson's ratio — relates thermal stress to surface deformation
    - coef: combined thermo-optic coefficient (how much refractive index
      changes per kelvin of temperature change)
    - x_offset: distance between pump and probe beams. The j1 Bessel function
      encodes how the deflection signal depends on this offset.
    """
    Nk = 200  # number of k-points for integration (spatial frequency grid)
    k_max = 2.0 / np.sqrt(r_pump**2 + r_probe**2)
    k = np.linspace(0.0, k_max, Nk)

    # Weight factor from cylindrical Hankel transform: 8π²k²
    weight = 8 * np.pi**2 * k**2
    # j1: first-order Bessel function — arises from the spatial derivative of
    # the temperature field at the pump-probe offset distance
    bessel = -j1(2 * np.pi * k * x_offset)

    # Substrate (deepest layer) diffusivity — used for the thermoelastic response
    alpha_sub = lambda_down[2] / c_down[2]
    c_probe = 0.7  # probe beam correction factor (empirical)

    # Output array: one complex value per frequency (real=in-phase, imag=out-of-phase)
    delta_theta = np.zeros(freq.shape, dtype=complex)

    # Loop over each modulation frequency — can't be vectorized because
    # bi_fdtr_bo_temp's transfer matrix computation depends on freq
    for i, f in enumerate(freq):
        omega = 2 * np.pi * f
        q2 = 1j * omega / alpha_sub
        # qk: combined wavevector in the substrate at this frequency
        qk = np.sqrt(4 * np.pi**2 * eta_down[2] * k**2 + q2)

        # Thermoelastic deflection sensitivity: how much surface deformation
        # (and thus beam deflection) each k-component of the temperature field
        # produces. The (1+niu) factor comes from Poisson's ratio relating
        # thermal stress to strain.
        defl = (2 * (1 + niu) * coef) / (qk + 2 * np.pi * k)

        # Temperature field at this frequency for all k values
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

        # Assemble the integrand and integrate over k using trapezoidal rule
        # (np.trapezoid is numpy's built-in trapezoidal integration for arrays)
        integrand = -c_probe * weight * bessel * defl * temp
        delta_theta[i] = np.trapezoid(integrand, k)

    return delta_theta
