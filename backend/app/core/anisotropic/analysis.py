"""Anisotropic FD-PBD analysis: thermo-elastic boundary-condition model.

Solves the coupled thermal + elastic wave equations for a multilayer system
with anisotropic elastic constants and thermal conductivities. Uses transfer
matrix method with 6x6 eigenvalue problems per layer.
"""

import time
from multiprocessing import Pool, cpu_count
from pathlib import Path

import numpy as np
from numpy.typing import NDArray
from scipy import linalg as la

from app.core.shared.data_processing import calculate_leaking, correct_data, load_data
from app.core.shared.integration import simpson_integration
from app.models.anisotropic import (
    AnisotropicFDPBDParams,
    AnisotropicFDPBDResult,
    AnisotropicPlotData,
)

ANISOTROPIC_FIT_PARAMS = [
    "sigma_x",
    "sigma_y",
    "sigma_z",
    "alphaT_perp",
    "alphaT_para",
]


def _compute_single_freq(args: tuple) -> tuple[int, NDArray[np.complex128]]:
    """Worker: compute Z[:, :] for one frequency. Top-level for pickling."""
    i_f, f, p_vals, psi_vals, pc = args

    n_p = len(p_vals)
    n_psi = len(psi_vals)
    Z_slice = np.zeros((n_p, n_psi), dtype=complex)

    Dif1 = pc["Dif1"]
    Dif2 = pc["Dif2"]
    Dif3 = pc["Dif3"]
    L1 = pc["L1"]
    sigma1 = pc["sigma1"]
    sigma2z = pc["sigma2z"]
    sigma3 = pc["sigma3"]
    a0 = pc["a0"]
    w_rms = pc["w_rms"]
    g_int = pc["g_int"]
    C11_0_2 = pc["C11_0_2"]
    C11_1 = pc["C11_1"]
    sigma_x_over_z = pc["sigma_x_over_z"]
    sigma_y_over_z = pc["sigma_y_over_z"]

    C55C11_1 = pc["C55C11_1"]
    C44C11_1 = pc["C44C11_1"]
    C33C11_1 = pc["C33C11_1"]
    C22C11_1 = pc["C22C11_1"]
    C12C11_1 = pc["C12C11_1"]
    C13C11_1 = pc["C13C11_1"]
    C23C11_1 = pc["C23C11_1"]
    C66C11_1 = pc["C66C11_1"]
    C46C11_1 = pc["C46C11_1"]
    betaxC11_1 = pc["betaxC11_1"]
    betayC11_1 = pc["betayC11_1"]
    betazC11_1 = pc["betazC11_1"]
    sqrtC11rho_1 = pc["sqrtC11rho_1"]

    C55C11_2 = pc["C55C11_2"]
    C44C11_2 = pc["C44C11_2"]
    C33C11_2 = pc["C33C11_2"]
    C22C11_2 = pc["C22C11_2"]
    C12C11_2 = pc["C12C11_2"]
    C13C11_2 = pc["C13C11_2"]
    C23C11_2 = pc["C23C11_2"]
    C66C11_2 = pc["C66C11_2"]
    betaxC11_2 = pc["betaxC11_2"]
    betayC11_2 = pc["betayC11_2"]
    betazC11_2 = pc["betazC11_2"]
    sqrtC11rho_2 = pc["sqrtC11rho_2"]

    omega = 2 * np.pi * f
    qn2_1 = 1j * omega / Dif1
    qn2_2 = 1j * omega / Dif2
    qn2_3 = 1j * omega / Dif3

    for i_p, p in enumerate(p_vals):
        flx = a0 * np.exp(-(w_rms**2) * p**2 / 8)

        for i_psi, psi in enumerate(psi_vals):
            k = p * np.cos(psi)
            xi = p * np.sin(psi)

            zeta1 = np.sqrt(qn2_1 + p**2)
            zeta2 = np.sqrt(qn2_2 + k**2 * sigma_x_over_z + xi**2 * sigma_y_over_z)
            zeta3 = np.sqrt(qn2_3 + p**2)

            z1L = zeta1 * L1
            s1z = sigma1 * zeta1
            s2z = sigma2z * zeta2
            s3z = sigma3 * zeta3

            G_d = (
                s2z * np.sinh(z1L)
                + s1z * np.cosh(z1L)
                + s1z * s2z / g_int * np.cosh(z1L)
            ) / s1z
            G_d /= (
                s2z * np.cosh(z1L)
                + s1z * np.sinh(z1L)
                + s1z * s2z / g_int * np.sinh(z1L)
            )
            G_u = 1.0 / s3z
            G = 1.0 / (1.0 / G_u + 1.0 / G_d)

            theta_s = flx * G
            theta_bs = (
                np.cosh(z1L) * theta_s
                + s1z / g_int * np.sinh(z1L) * theta_s
                - np.sinh(z1L) * flx / s1z
                - np.cosh(z1L) * flx / g_int
            )

            C_s1 = (s2z / g_int * theta_bs + theta_bs - theta_s * np.exp(-z1L)) / (
                np.exp(z1L) - np.exp(-z1L)
            )
            C_s2 = theta_s - C_s1

            # Layer 1 matrices
            A1 = np.zeros((6, 6), dtype=complex)
            B1 = np.zeros((6, 6), dtype=complex)
            D1 = np.zeros(6, dtype=complex)

            A1[0, 3] = A1[1, 4] = A1[2, 5] = 1.0
            A1[3, 0] = C55C11_1
            A1[4, 1] = C44C11_1
            A1[5, 2] = C33C11_1
            B1[3, 3] = B1[4, 4] = B1[5, 5] = 1.0
            D1[5] = betazC11_1

            A1[0, 0] = -C46C11_1 * 1j * k
            A1[1, 1] = C46C11_1 * 1j * k
            A1[0, 1] = C46C11_1 * 1j * xi
            A1[1, 0] = C46C11_1 * 1j * xi
            A1[0, 2] = C13C11_1 * 1j * k
            A1[1, 2] = C23C11_1 * 1j * xi

            B1[0, 0] = k**2 + C66C11_1 * xi**2 - omega**2 / sqrtC11rho_1**2
            B1[1, 1] = C22C11_1 * xi**2 + C66C11_1 * k**2 - omega**2 / sqrtC11rho_1**2
            B1[0, 1] = B1[1, 0] = (C12C11_1 + C66C11_1) * k * xi
            B1[2, 2] = -(omega**2) / sqrtC11rho_1**2
            B1[0, 2] = C46C11_1 * (xi**2 - k**2)
            B1[1, 2] = 2 * C46C11_1 * k * xi
            B1[2, 3] = -1j * k
            B1[2, 4] = -1j * xi
            B1[3, 0] = C46C11_1 * 1j * k
            B1[3, 1] = -C46C11_1 * 1j * xi
            B1[3, 2] = -C55C11_1 * 1j * k
            B1[4, 0] = -C46C11_1 * 1j * xi
            B1[4, 1] = -C46C11_1 * 1j * k
            B1[4, 2] = -C44C11_1 * 1j * xi
            B1[5, 0] = -C13C11_1 * 1j * k
            B1[5, 1] = -C23C11_1 * 1j * xi

            D1[0] = betaxC11_1 * 1j * k
            D1[1] = betayC11_1 * 1j * xi

            try:
                eigvals1, Q1 = la.eig(B1, A1)
                N1 = la.solve(A1, D1)
                U1 = la.solve(Q1, N1)
            except (ValueError, la.LinAlgError):
                continue

            # Layer 2 matrices
            A2 = np.zeros((6, 6), dtype=complex)
            B2 = np.zeros((6, 6), dtype=complex)
            D2 = np.zeros(6, dtype=complex)

            A2[0, 3] = A2[1, 4] = A2[2, 5] = 1.0
            A2[3, 0] = C55C11_2
            A2[4, 1] = C44C11_2
            A2[5, 2] = C33C11_2
            B2[3, 3] = B2[4, 4] = B2[5, 5] = 1.0

            D2[0] = betaxC11_2 * 1j * k
            D2[1] = betayC11_2 * 1j * xi
            D2[5] = betazC11_2

            A2[0, 2] = C13C11_2 * 1j * k
            A2[1, 2] = C23C11_2 * 1j * xi

            B2[0, 0] = k**2 + C66C11_2 * xi**2 - omega**2 / sqrtC11rho_2**2
            B2[1, 1] = C22C11_2 * xi**2 + C66C11_2 * k**2 - omega**2 / sqrtC11rho_2**2
            B2[0, 1] = B2[1, 0] = (C12C11_2 + C66C11_2) * k * xi
            B2[2, 2] = -(omega**2) / sqrtC11rho_2**2
            B2[2, 3] = -1j * k
            B2[2, 4] = -1j * xi
            B2[3, 2] = -C55C11_2 * 1j * k
            B2[4, 2] = -C44C11_2 * 1j * xi
            B2[5, 0] = -C13C11_2 * 1j * k
            B2[5, 1] = -C23C11_2 * 1j * xi

            D2[0] = betaxC11_2 * 1j * k
            D2[1] = betayC11_2 * 1j * xi

            try:
                eigvals2, Q2_raw = la.eig(B2, A2)
                neg = [i for i, lam in enumerate(eigvals2) if lam.real < 0]
                pos = [i for i, lam in enumerate(eigvals2) if lam.real >= 0]
                idx_order = neg + pos
                Q2 = Q2_raw[:, idx_order]
                L2 = eigvals2[idx_order]
                U2 = la.solve(Q2, la.solve(A2, D2))
            except (ValueError, la.LinAlgError):
                continue

            # Build 9x9 boundary condition matrix
            BCM = np.zeros((9, 9), dtype=complex)
            BCC = np.zeros(9, dtype=complex)

            for m in range(6):
                BCM[0:3, m] = Q1[3:6, m]
                BCM[3:9, m] = Q1[0:6, m] * np.exp(eigvals1[m] * L1)

            for m in range(3):
                BCM[3:6, 6 + m] = -Q2[0:3, m] * np.exp(L2[m] * L1)
                BCM[6:9, 6 + m] = -C11_0_2 / C11_1 * Q2[3:6, m] * np.exp(L2[m] * L1)

            for rw in range(3):
                s = sum(
                    Q1[rw + 3, j]
                    * U1[j]
                    * (C_s1 / (zeta1 - eigvals1[j]) + C_s2 / (-zeta1 - eigvals1[j]))
                    for j in range(6)
                )
                BCC[rw] = -s

            for rw in range(3, 6):
                s1 = s2 = 0.0 + 0j
                for j in range(6):
                    s1 += (
                        Q1[rw - 3, j]
                        * U1[j]
                        * (
                            C_s1 * np.exp(z1L) / (zeta1 - eigvals1[j])
                            + C_s2 * np.exp(-z1L) / (-zeta1 - eigvals1[j])
                        )
                    )
                    s2 += Q2[rw - 3, j] * U2[j] * (theta_bs / (-zeta2 - L2[j]))
                BCC[rw] = -s1 + s2

            for rw in range(6, 9):
                s1 = s2 = 0.0 + 0j
                for j in range(6):
                    s1 += (
                        Q1[rw - 3, j]
                        * U1[j]
                        * (
                            C_s1 * np.exp(z1L) / (zeta1 - eigvals1[j])
                            + C_s2 * np.exp(-z1L) / (-zeta1 - eigvals1[j])
                        )
                    )
                    s2 += Q2[rw - 3, j] * U2[j] * (theta_bs / (-zeta2 - L2[j]))
                BCC[rw] = -s1 + (C11_0_2 / C11_1) * s2

            if not (np.all(np.isfinite(BCM)) and np.all(np.isfinite(BCC))):
                Z_slice[i_p, i_psi] = 0.0 + 0.0j
                continue

            try:
                J = la.solve(BCM, BCC)
            except (ValueError, la.LinAlgError):
                Z_slice[i_p, i_psi] = 0.0 + 0.0j
                continue

            w_H = sum(Q1[2, m] * J[m] for m in range(6))
            w_P = sum(
                Q1[2, j]
                * U1[j]
                * (C_s1 / (zeta1 - eigvals1[j]) + C_s2 / (-zeta1 - eigvals1[j]))
                for j in range(6)
            )

            Z_slice[i_p, i_psi] = -(w_H + w_P)

    return i_f, Z_slice


def _precompute_constants(params: dict) -> dict:
    """Precompute all material constants for the worker function."""
    layer1 = params["layer1"]
    layer2 = params["layer2"]
    layer3 = params["layer3"]

    n_al, k_al = params["n_al"], params["k_al"]
    a0 = (
        params["incident_pump"]
        * params["lens_transmittance"]
        * (4.0 / np.pi)
        * (1.0 - abs((n_al - 1 + 1j * k_al) / (n_al + 1 + 1j * k_al)) ** 2)
    )

    Dif1 = layer1["sigma"] / layer1["capac"]
    Dif2 = layer2["sigma_z"] / layer2["capac"]
    Dif3 = layer3["sigma"] / layer3["capac"]

    # Layer 1 effective elastic constants (Voigt average for cubic)
    C11_0_1 = layer1["C11_0"]
    C12_0_1 = layer1["C12_0"]
    C44_0_1 = layer1["C44_0"]
    alpha1 = layer1["alphaT"]
    beta1 = (C11_0_1 + 2 * C12_0_1) * alpha1
    C11_1 = (C11_0_1 + C12_0_1 + 2 * C44_0_1) / 2
    C44_1 = (C11_0_1 - C12_0_1 + C44_0_1) / 3
    C12_1 = (C11_0_1 + 5 * C12_0_1 - 2 * C44_0_1) / 6
    C13_1 = (C11_0_1 + 2 * C12_0_1 - 4 * C44_0_1) / 3
    C33_1 = (C11_0_1 + 2 * C12_0_1 + 4 * C44_0_1) / 3
    C22_1 = C11_1
    C23_1 = C13_1
    C55_1 = C44_1
    C66_1 = (C11_1 - C12_1) / 2

    # Layer 2 (transversely isotropic sample)
    C11_0_2 = layer2["C11_0"]
    C12_0_2 = layer2["C12_0"]
    C13_0_2 = layer2["C13_0"]
    C33_0_2 = layer2["C33_0"]
    C44_0_2 = layer2["C44_0"]
    alpha_v = layer2["alphaT_perp"]
    alpha_p = layer2["alphaT_para"]
    betax2 = (C11_0_2 + C12_0_2) * alpha_v + C13_0_2 * alpha_p
    betay2 = 2 * C13_0_2 * alpha_v + C33_0_2 * alpha_p
    betaz2 = betax2

    C11_2 = C11_0_2
    C22_2 = C33_0_2
    C33_2 = C11_0_2
    C12_2 = C13_0_2
    C13_2 = C12_0_2
    C23_2 = C13_0_2
    C44_2 = C44_0_2
    C55_2 = (C11_0_2 - C12_0_2) / 2
    C66_2 = C44_0_2

    return {
        "Dif1": Dif1,
        "Dif2": Dif2,
        "Dif3": Dif3,
        "L1": layer1["thickness"],
        "sigma1": layer1["sigma"],
        "sigma2z": layer2["sigma_z"],
        "sigma3": layer3["sigma"],
        "a0": a0,
        "w_rms": params["w_rms"],
        "g_int": params["g_int"],
        "C11_0_2": C11_0_2,
        "C11_1": C11_1,
        "sigma_x_over_z": layer2["sigma_x"] / layer2["sigma_z"],
        "sigma_y_over_z": layer2["sigma_y"] / layer2["sigma_z"],
        # Layer 1 normalized
        "C55C11_1": C55_1 / C11_1,
        "C44C11_1": C44_1 / C11_1,
        "C33C11_1": C33_1 / C11_1,
        "C22C11_1": C22_1 / C11_1,
        "C12C11_1": C12_1 / C11_1,
        "C13C11_1": C13_1 / C11_1,
        "C23C11_1": C23_1 / C11_1,
        "C66C11_1": C66_1 / C11_1,
        "C46C11_1": 0.0,
        "betaxC11_1": beta1 / C11_1,
        "betayC11_1": beta1 / C11_1,
        "betazC11_1": beta1 / C11_1,
        "sqrtC11rho_1": np.sqrt(C11_1 / layer1["rho"]),
        # Layer 2 normalized
        "C55C11_2": C55_2 / C11_2,
        "C44C11_2": C44_2 / C11_2,
        "C33C11_2": C33_2 / C11_2,
        "C22C11_2": C22_2 / C11_2,
        "C12C11_2": C12_2 / C11_2,
        "C13C11_2": C13_2 / C11_2,
        "C23C11_2": C23_2 / C11_2,
        "C66C11_2": C66_2 / C11_2,
        "betaxC11_2": betax2 / C11_2,
        "betayC11_2": betay2 / C11_2,
        "betazC11_2": betaz2 / C11_2,
        "sqrtC11rho_2": np.sqrt((1 + 1e-6j) * C11_2 / layer2["rho"]),
    }


def compute_surface_displacement(
    freqs: NDArray[np.float64],
    p_vals: NDArray[np.float64],
    psi_vals: NDArray[np.float64],
    params: dict,
    parallel: bool = True,
) -> NDArray[np.complex128]:
    """Build and solve the 9x9 thermo-elastic boundary-condition system."""
    n_p, n_psi, n_f = len(p_vals), len(psi_vals), len(freqs)
    precomputed = _precompute_constants(params)

    args_list = [(i_f, f, p_vals, psi_vals, precomputed) for i_f, f in enumerate(freqs)]

    if parallel:
        n_workers = min(cpu_count(), n_f)
        with Pool(n_workers) as pool:
            results = pool.map(_compute_single_freq, args_list)
    else:
        results = [_compute_single_freq(args) for args in args_list]

    Z = np.zeros((n_p, n_psi, n_f), dtype=complex)
    for i_f, Z_slice in results:
        Z[:, :, i_f] = Z_slice

    return Z


def compute_probe_deflection(
    Z: NDArray[np.complex128],
    p_vals: NDArray[np.float64],
    psi_vals: NDArray[np.float64],
    freqs: NDArray[np.float64],
    params: dict,
) -> NDArray[np.complex128]:
    """Integrate Z(p,psi,omega) over psi and p to yield probe-beam deflection."""
    n_p, n_psi, n_f = Z.shape
    d_psi = psi_vals[1] - psi_vals[0]
    d_p = p_vals[1] - p_vals[0]
    w_rms = params["w_rms"]
    r_0 = params["r_0"]
    phi = params["phi"]
    c_probe = params["c_probe"]

    angles = np.zeros(n_f, dtype=complex)

    for i_f in range(n_f):
        I_p = np.zeros(n_p, dtype=complex)
        for i_p, p in enumerate(p_vals):
            integrand = np.zeros(n_psi, dtype=complex)
            for i_psi, psi in enumerate(psi_vals):
                g = -np.cos(psi - phi) * np.sin(p * r_0 * np.cos(psi - phi)) - np.cos(
                    psi + phi
                ) * np.sin(p * r_0 * np.cos(psi + phi))
                integrand[i_psi] = Z[i_p, i_psi, i_f] * g
            I_psi = (1 / np.pi) * simpson_integration(integrand, d_psi)
            I_p[i_p] = I_psi * np.exp(-(w_rms**2) * p**2 / 8) * p**2
        angles[i_f] = (1 / np.pi) * c_probe * simpson_integration(I_p, d_p)

    return angles


def compute_lockin_signals(
    angles: NDArray[np.complex128],
    v_sum_avg: float,
    detector_factor: float,
) -> tuple[NDArray[np.float64], NDArray[np.float64], NDArray[np.float64]]:
    """Convert deflection angles into lock-in signals."""
    raw = angles / np.sqrt(2) * 0.5 * detector_factor * v_sum_avg
    in_phase = np.abs(np.real(raw))
    out_phase = -np.imag(raw)
    ratio = np.full_like(in_phase, np.nan)
    nonzero = out_phase != 0
    ratio[nonzero] = -in_phase[nonzero] / out_phase[nonzero]
    return in_phase, out_phase, ratio


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


def run_anisotropic_analysis(
    params: AnisotropicFDPBDParams, data_filepath: Path
) -> AnisotropicFDPBDResult:
    """Run anisotropic FD-PBD analysis."""
    c_probe = 0.7
    g_int = 100e6
    n_p = 63
    n_psi = 45
    model_freqs = np.logspace(np.log10(100e3), np.log10(100), 10)

    # Transform to internal dict format
    transformed = {
        "f_rolloff": params.f_rolloff,
        "delay_1": params.delay_1,
        "delay_2": params.delay_2,
        "incident_pump": params.incident_pump,
        "w_rms": params.w_rms,
        "r_0": params.x_offset,
        "phi": params.phi,
        "lens_transmittance": params.lens_transmittance,
        "detector_factor": params.detector_factor,
        "n_al": params.n_al,
        "k_al": params.k_al,
        "c_probe": c_probe,
        "g_int": g_int,
        "layer1": {
            "thickness": params.h_down[0],
            "sigma": params.lambda_down[0],
            "capac": params.c_down[0],
            "rho": params.rho,
            "alphaT": params.alphaT,
            "C11_0": params.C11_0,
            "C12_0": params.C12_0,
            "C44_0": params.C44_0,
        },
        "layer2": {
            "sigma_x": params.lambda_down_x_sample,
            "sigma_y": params.lambda_down_y_sample,
            "sigma_z": params.lambda_down_z_sample,
            "capac": params.c_down[2] if len(params.c_down) > 2 else params.c_down[0],
            "rho": params.rho_sample,
            "alphaT_perp": params.alphaT_perp,
            "alphaT_para": params.alphaT_para,
            "C11_0": params.C11_0_sample,
            "C12_0": params.C12_0_sample,
            "C13_0": params.C13_0_sample,
            "C33_0": params.C33_0_sample,
            "C44_0": params.C44_0_sample,
        },
        "layer3": {
            "sigma": params.lambda_up,
            "capac": params.c_up,
        },
    }

    # Load and correct data
    v_out, v_in, _, v_sum, freq = load_data(data_filepath)
    complex_leaking = calculate_leaking(
        freq, params.f_rolloff, params.delay_1, params.delay_2
    )
    v_corr_in, v_corr_out, v_corr_ratio = correct_data(v_out, v_in, complex_leaking)
    v_sum_avg = float(np.mean(v_sum))

    # Build grids
    w_rms: float = transformed["w_rms"]  # type: ignore[assignment]
    up_p = 8 / w_rms
    d_p = up_p / n_p
    p_vals = np.linspace(d_p, up_p, n_p)
    psi_vals = np.linspace(0, np.pi / 2, n_psi)

    # Compute model
    t0 = time.time()
    Z = compute_surface_displacement(model_freqs, p_vals, psi_vals, transformed)
    pbd_angles = compute_probe_deflection(Z, p_vals, psi_vals, model_freqs, transformed)
    detector_factor: float = transformed["detector_factor"]  # type: ignore[assignment]
    in_mod, out_mod, ratio_mod = compute_lockin_signals(
        pbd_angles, v_sum_avg, detector_factor
    )
    elapsed = time.time() - t0
    print(f"[anisotropic] forward model: {elapsed:.3f}s")

    f_peak, ratio_at_peak = fit_rough_analysis(model_freqs, out_mod, ratio_mod)

    return AnisotropicFDPBDResult(
        f_peak=float(f_peak) if not np.isnan(f_peak) else None,
        ratio_at_peak=float(ratio_at_peak) if not np.isnan(ratio_at_peak) else None,
        lambda_measure=None,
        alpha_t_fitted=None,
        t_ss_heat=None,
        plot_data=AnisotropicPlotData(
            model_freqs=model_freqs.tolist(),
            in_model=in_mod.tolist(),
            out_model=out_mod.tolist(),
            ratio_model=ratio_mod.tolist(),
            exp_freqs=freq.tolist(),
            in_exp=v_corr_in.tolist(),
            out_exp=v_corr_out.tolist(),
            ratio_exp=v_corr_ratio.tolist(),
        ),
    )
