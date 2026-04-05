"""
Anisotropic FD-PBD analysis: thermo-elastic boundary-condition model.

## How this differs from isotropic analysis:
Isotropic analysis assumes the sample's thermal conductivity is the same in
all directions, so the heat equation is scalar (one λ value). Anisotropic
analysis allows DIFFERENT conductivities in the x, y, and z directions
(σ_x, σ_y, σ_z), and also models the elastic wave equations because the
probe beam deflection now depends on direction-dependent thermal expansion
(the "thermo-elastic" coupling).

## Physics overview:
The anisotropic model solves a COUPLED system of equations:
1. Heat diffusion (with anisotropic conductivity) → temperature field
2. Thermo-elastic wave equation → surface displacement from thermal stress
3. Beam deflection → how the probe beam responds to surface displacement

This coupling is solved via a 6×6 eigenvalue problem per layer (3 displacement
components × 2 boundary conditions each = 6 unknowns), then assembled into a
9×9 boundary condition matrix at the layer interfaces.

## Key differences from isotropic pipeline:
- Uses elastic stiffness constants (C11, C12, C13, C33, C44) instead of just λ
- Solves in 2D Fourier space (k, ξ) instead of 1D Hankel space (k)
- Integration is over both spatial frequency p and angle ψ (azimuthal)
- Uses multiprocessing (Pool) because the computation is ~100× more expensive
- Output is peak frequency + ratio instead of fitted thermal conductivity

## scipy.linalg functions used:
- la.eig(B, A): generalized eigenvalue problem Bx = λAx. Returns eigenvalues
  (how fast each mode decays/oscillates) and eigenvectors (the mode shapes).
  The generalized form (two matrices) arises because the elastic wave equation
  has both stiffness (A) and mass/coupling (B) terms.
- la.solve(A, b): solve Ax = b for x. Used to find particular solutions and
  boundary condition coefficients. More numerically stable than np.linalg.inv(A) @ b.
"""

import time
from multiprocessing import Pool, cpu_count

import numpy as np
from numpy.typing import NDArray
from scipy import linalg as la

from app.core.shared.data_processing import calculate_leaking, correct_data, load_data
from app.core.shared.fitting import fit_rough_analysis
from app.core.shared.integration import simpson_integration
from app.models.anisotropic import (
    AnisotropicParams,
    AnisotropicPlotData,
    AnisotropicResult,
)

# Parameters that can be varied during DE (Differential Evolution) fitting.
# The fitting service iterates over these to find optimal material properties.
ANISOTROPIC_FIT_PARAMS = [
    "sigma_x",  # thermal conductivity in x-direction (W/m·K)
    "sigma_y",  # thermal conductivity in y-direction (W/m·K)
    "sigma_z",  # thermal conductivity in z-direction (W/m·K)
    "alphaT_perp",  # thermal expansion coefficient perpendicular to symmetry axis
    "alphaT_para",  # thermal expansion coefficient parallel to symmetry axis
]


def _compute_single_freq(args: tuple) -> tuple[int, NDArray[np.complex128]]:
    """
    Worker function: compute the surface displacement Z(p, ψ) for ONE frequency.

    This is a top-level function (not a method or closure) because Python's
    multiprocessing.Pool uses pickle to serialize functions to worker processes,
    and pickle can only serialize top-level functions — not lambdas, closures,
    or nested functions.

    For each (p, ψ) pair at this frequency:
    1. Solve the thermal part → temperature at surface (θ_s) and bottom (θ_bs)
    2. Build 6×6 eigenvalue problems for each layer (thermo-elastic equations)
    3. Assemble a 9×9 boundary condition matrix (continuity of displacement and
       stress at interfaces)
    4. Solve for the surface displacement w = u_z(z=0)

    Args:
        args: tuple of (frequency_index, frequency, p_values, psi_values,
              precomputed_constants_dict)

    Returns:
        (frequency_index, Z_slice) where Z_slice[i_p, i_psi] is the complex
        surface displacement at that spatial frequency and angle.
    """
    i_f, f, p_vals, psi_vals, pc = args

    n_p = len(p_vals)
    n_psi = len(psi_vals)
    Z_slice = np.zeros((n_p, n_psi), dtype=complex)

    # --- Unpack precomputed constants into local variables ---
    # This avoids repeated dict lookups in the inner loop (performance).
    # See _precompute_constants() for how these are derived.

    # Thermal diffusivities (σ/C) for each layer
    Dif1 = pc["Dif1"]  # layer 1 (transducer)
    Dif2 = pc["Dif2"]  # layer 2 (sample) — uses σ_z direction
    Dif3 = pc["Dif3"]  # layer 3 (medium above sample)
    L1 = pc["L1"]  # transducer thickness
    sigma1 = pc["sigma1"]  # transducer thermal conductivity
    sigma2z = pc["sigma2z"]  # sample thermal conductivity (z-direction)
    sigma3 = pc["sigma3"]  # medium thermal conductivity
    a0 = pc["a0"]  # effective pump power
    w_rms = pc["w_rms"]  # beam spot size (RMS radius)
    g_int = pc["g_int"]  # interface thermal conductance (W/m²·K)
    C11_0_2 = pc["C11_0_2"]  # sample C11 stiffness (for stress scaling)
    C11_1 = pc["C11_1"]  # transducer effective C11 (Voigt average)
    # Anisotropy ratios: σ_x/σ_z and σ_y/σ_z — these modify the thermal
    # wavevector to account for direction-dependent heat spreading
    sigma_x_over_z = pc["sigma_x_over_z"]
    sigma_y_over_z = pc["sigma_y_over_z"]

    # Elastic stiffness constants normalized by C11 for each layer.
    # Normalizing makes the eigenvalue problem better-conditioned numerically.
    # Layer 1 (transducer): Voigt-averaged from cubic single-crystal constants
    C55C11_1 = pc["C55C11_1"]
    C44C11_1 = pc["C44C11_1"]
    C33C11_1 = pc["C33C11_1"]
    C22C11_1 = pc["C22C11_1"]
    C12C11_1 = pc["C12C11_1"]
    C13C11_1 = pc["C13C11_1"]
    C23C11_1 = pc["C23C11_1"]
    C66C11_1 = pc["C66C11_1"]
    C46C11_1 = pc["C46C11_1"]  # cross-coupling (0 for Voigt-averaged cubic)
    betaxC11_1 = pc["betaxC11_1"]  # thermo-elastic coupling coefficients
    betayC11_1 = pc["betayC11_1"]
    betazC11_1 = pc["betazC11_1"]
    sqrtC11rho_1 = pc["sqrtC11rho_1"]  # wave speed √(C11/ρ)

    # Layer 2 (sample): transversely isotropic elastic constants
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

    omega = 2 * np.pi * f  # angular modulation frequency
    # Temporal part of diffusion equation for each layer: q² = iω/D
    qn2_1 = 1j * omega / Dif1
    qn2_2 = 1j * omega / Dif2
    qn2_3 = 1j * omega / Dif3

    # --- Main computation loop: iterate over all (p, ψ) pairs ---
    for i_p, p in enumerate(p_vals):
        # Gaussian pump beam profile in Fourier space: amplitude at spatial freq p
        flx = a0 * np.exp(-(w_rms**2) * p**2 / 8)

        for i_psi, psi in enumerate(psi_vals):
            # Decompose spatial frequency p into Cartesian components:
            # k = p·cos(ψ) in x-direction, ξ = p·sin(ψ) in y-direction
            k = p * np.cos(psi)
            xi = p * np.sin(psi)

            # --- Thermal part: solve for temperature at interfaces ---
            # Thermal wavevectors for each layer. Layer 2 (sample) has
            # anisotropic conductivity, so k² and ξ² are weighted by σ_x/σ_z
            # and σ_y/σ_z respectively.
            zeta1 = np.sqrt(qn2_1 + p**2)
            zeta2 = np.sqrt(qn2_2 + k**2 * sigma_x_over_z + xi**2 * sigma_y_over_z)
            zeta3 = np.sqrt(qn2_3 + p**2)

            z1L = zeta1 * L1  # dimensionless: wavevector × thickness
            s1z = sigma1 * zeta1  # thermal impedance of layer 1
            s2z = sigma2z * zeta2  # thermal impedance of layer 2
            s3z = sigma3 * zeta3  # thermal impedance of layer 3

            # Green's functions: same parallel-resistance approach as isotropic,
            # but with interface conductance g_int included.
            # G_d: thermal response looking downward (through transducer + sample)
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
            # G_u: thermal response looking upward (semi-infinite medium)
            G_u = 1.0 / s3z
            # Combined: parallel combination of upward and downward paths
            G = 1.0 / (1.0 / G_u + 1.0 / G_d)

            # theta_s: temperature at the TOP surface (z=0)
            theta_s = flx * G
            # theta_bs: temperature at the BOTTOM of layer 1 (transducer-sample interface)
            theta_bs = (
                np.cosh(z1L) * theta_s
                + s1z / g_int * np.sinh(z1L) * theta_s
                - np.sinh(z1L) * flx / s1z
                - np.cosh(z1L) * flx / g_int
            )

            # C_s1, C_s2: coefficients for the temperature profile inside layer 1.
            # Temperature = C_s1·exp(ζz) + C_s2·exp(-ζz), matching boundary values
            # at z=0 (theta_s) and z=L1 (theta_bs).
            C_s1 = (s2z / g_int * theta_bs + theta_bs - theta_s * np.exp(-z1L)) / (
                np.exp(z1L) - np.exp(-z1L)
            )
            C_s2 = theta_s - C_s1

            # --- Elastic part: build 6×6 eigenvalue problem for each layer ---
            # The thermo-elastic wave equation in Fourier space becomes:
            #   A · (du/dz) = B · u + D · θ(z)
            # where u = [ux, uy, uz, σxz, σyz, σzz] (3 displacements + 3 stresses)
            # A contains stiffness terms, B contains spatial frequency terms,
            # D contains thermo-elastic forcing from the temperature field.
            # Solving A·u = λ·B·u gives 6 eigenvalues (decay rates) and
            # eigenvectors (mode shapes) for each layer.

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

            # Fill A1 and B1 with stiffness, coupling, and inertia terms.
            # These entries come from the Christoffel equation (wave equation in
            # anisotropic media) written in Voigt notation. The 1j*k and 1j*xi
            # terms are Fourier-space derivatives (d/dx → ik, d/dy → iξ).
            A1[0, 0] = -C46C11_1 * 1j * k
            A1[1, 1] = C46C11_1 * 1j * k
            A1[0, 1] = C46C11_1 * 1j * xi
            A1[1, 0] = C46C11_1 * 1j * xi
            A1[0, 2] = C13C11_1 * 1j * k
            A1[1, 2] = C23C11_1 * 1j * xi

            # Diagonal of B: spatial frequency squared terms minus inertia (ω²/v²)
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

            # D1: thermal forcing vector — how temperature gradients drive stress
            D1[0] = betaxC11_1 * 1j * k
            D1[1] = betayC11_1 * 1j * xi

            try:
                # Solve generalized eigenvalue problem: B·q = λ·A·q
                # eigvals1: 6 eigenvalues (z-decay rates for each mode)
                # Q1: 6×6 eigenvector matrix (columns = mode shapes)
                eigvals1, Q1 = la.eig(B1, A1)
                # N1: particular solution from thermal forcing (A·N = D)
                N1 = la.solve(A1, D1)
                # U1: particular solution in eigenvector basis (Q·U = N)
                U1 = la.solve(Q1, N1)
            except (ValueError, la.LinAlgError):
                # Singular matrix — degenerate case at this (p, ψ). Skip.
                continue

            # Layer 2 (sample) — same structure as layer 1 but with
            # transversely isotropic elastic constants. No C46 cross-coupling
            # terms because the sample has higher symmetry.
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
                # Sort eigenvalues: negative-real first (decaying INTO the sample),
                # then positive-real (growing). For a semi-infinite substrate,
                # only the first 3 (decaying) modes are physical — the growing
                # modes would blow up at z→∞. We keep all 6 but use only the
                # first 3 when applying boundary conditions at the interface.
                neg = [i for i, lam in enumerate(eigvals2) if lam.real < 0]
                pos = [i for i, lam in enumerate(eigvals2) if lam.real >= 0]
                idx_order = neg + pos
                Q2 = Q2_raw[:, idx_order]
                L2 = eigvals2[idx_order]
                U2 = la.solve(Q2, la.solve(A2, D2))
            except (ValueError, la.LinAlgError):
                continue

            # --- Assemble 9×9 boundary condition matrix (BCM) ---
            # 9 equations enforce continuity at the two interfaces:
            #   Rows 0-2: free surface (z=0) — stress = 0
            #   Rows 3-5: transducer-sample interface — displacement continuity
            #   Rows 6-8: transducer-sample interface — stress continuity
            # 9 unknowns: 6 mode amplitudes in layer 1, 3 decaying mode
            # amplitudes in layer 2 (the 3 growing modes are excluded because
            # layer 2 is semi-infinite).
            BCM = np.zeros((9, 9), dtype=complex)
            BCC = np.zeros(9, dtype=complex)  # right-hand side (thermal forcing)

            # Free surface: stress components from layer 1 eigenmodes
            for m in range(6):
                BCM[0:3, m] = Q1[3:6, m]
                # Interface: layer 1 fields propagated to z=L1
                BCM[3:9, m] = Q1[0:6, m] * np.exp(eigvals1[m] * L1)

            # Interface: layer 2 fields (only 3 decaying modes, columns 6-8)
            for m in range(3):
                # Displacement continuity (rows 3-5)
                BCM[3:6, 6 + m] = -Q2[0:3, m] * np.exp(L2[m] * L1)
                # Stress continuity (rows 6-8), scaled by stiffness ratio
                BCM[6:9, 6 + m] = -C11_0_2 / C11_1 * Q2[3:6, m] * np.exp(L2[m] * L1)

            # Right-hand side: particular solution contributions from thermal
            # forcing. These integrals involve the temperature profile (C_s1, C_s2)
            # convolved with each eigenmode's response.
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

            # Guard against NaN/Inf from numerical overflow
            if not (np.all(np.isfinite(BCM)) and np.all(np.isfinite(BCC))):
                Z_slice[i_p, i_psi] = 0.0 + 0.0j
                continue

            try:
                # Solve BCM·J = BCC for the 9 unknown mode amplitudes
                J = la.solve(BCM, BCC)
            except (ValueError, la.LinAlgError):
                Z_slice[i_p, i_psi] = 0.0 + 0.0j
                continue

            # --- Extract surface displacement w = u_z(z=0) ---
            # w_H: homogeneous part (from the 6 eigenmodes of layer 1)
            w_H = sum(Q1[2, m] * J[m] for m in range(6))
            # w_P: particular part (from thermal forcing)
            w_P = sum(
                Q1[2, j]
                * U1[j]
                * (C_s1 / (zeta1 - eigvals1[j]) + C_s2 / (-zeta1 - eigvals1[j]))
                for j in range(6)
            )

            # Total surface displacement (negative sign = convention)
            Z_slice[i_p, i_psi] = -(w_H + w_P)

    return i_f, Z_slice


def _precompute_constants(params: dict) -> dict:
    """
    Precompute all material constants before the (p, ψ, freq) loop.

    This function runs ONCE before the parallel workers start. It converts
    raw material properties into the normalized elastic constants, thermal
    diffusivities, and coupling coefficients that the eigenvalue solver needs.
    Doing this upfront avoids redundant computation in every (p, ψ) iteration.

    Returns a flat dict that gets passed to each worker via pickle.
    """
    layer1 = params["layer1"]  # transducer (e.g., aluminum)
    layer2 = params["layer2"]  # sample (anisotropic material)
    layer3 = params["layer3"]  # medium above (e.g., air)

    # Effective pump power (same Fresnel reflectance calculation as isotropic)
    n_al, k_al = params["n_al"], params["k_al"]
    a0 = (
        params["incident_pump"]
        * params["lens_transmittance"]
        * (4.0 / np.pi)
        * (1.0 - abs((n_al - 1 + 1j * k_al) / (n_al + 1 + 1j * k_al)) ** 2)
    )

    # Thermal diffusivities D = σ/C (conductivity / volumetric heat capacity)
    Dif1 = layer1["sigma"] / layer1["capac"]
    Dif2 = layer2["sigma_z"] / layer2["capac"]  # uses z-direction conductivity
    Dif3 = layer3["sigma"] / layer3["capac"]

    # --- Layer 1: Voigt average of cubic single-crystal elastic constants ---
    # The transducer (aluminum) is polycrystalline — many randomly oriented
    # grains. The Voigt average gives effective isotropic stiffness constants
    # from the single-crystal values (C11_0, C12_0, C44_0). This is an
    # upper bound on the true polycrystalline stiffness.
    C11_0_1 = layer1["C11_0"]
    C12_0_1 = layer1["C12_0"]
    C44_0_1 = layer1["C44_0"]
    alpha1 = layer1["alphaT"]  # thermal expansion coefficient
    # beta = thermo-elastic coupling: (C11 + 2*C12) × alpha
    beta1 = (C11_0_1 + 2 * C12_0_1) * alpha1
    # Voigt-averaged stiffness constants (formulas from elasticity theory)
    C11_1 = (C11_0_1 + C12_0_1 + 2 * C44_0_1) / 2
    C44_1 = (C11_0_1 - C12_0_1 + C44_0_1) / 3
    C12_1 = (C11_0_1 + 5 * C12_0_1 - 2 * C44_0_1) / 6
    C13_1 = (C11_0_1 + 2 * C12_0_1 - 4 * C44_0_1) / 3
    C33_1 = (C11_0_1 + 2 * C12_0_1 + 4 * C44_0_1) / 3
    C22_1 = C11_1  # isotropic: C22 = C11
    C23_1 = C13_1  # isotropic: C23 = C13
    C55_1 = C44_1  # isotropic: C55 = C44
    C66_1 = (C11_1 - C12_1) / 2  # isotropic relation

    # --- Layer 2: transversely isotropic sample (5 independent constants) ---
    C11_0_2 = layer2["C11_0"]
    C12_0_2 = layer2["C12_0"]
    C13_0_2 = layer2["C13_0"]
    C33_0_2 = layer2["C33_0"]
    C44_0_2 = layer2["C44_0"]
    # Two thermal expansion coefficients: perpendicular and parallel to
    # the symmetry axis (unlike isotropic which has just one)
    alpha_v = layer2["alphaT_perp"]
    alpha_p = layer2["alphaT_para"]
    # Thermo-elastic coupling in each direction
    betax2 = (C11_0_2 + C12_0_2) * alpha_v + C13_0_2 * alpha_p
    betay2 = 2 * C13_0_2 * alpha_v + C33_0_2 * alpha_p
    betaz2 = betax2  # x and z are equivalent for transverse isotropy

    # Remap transversely isotropic constants to the coordinate system used
    # by the eigenvalue solver (symmetry axis along y, not z)
    C11_2 = C11_0_2
    C22_2 = C33_0_2
    C33_2 = C11_0_2
    C12_2 = C13_0_2
    C13_2 = C12_0_2
    C23_2 = C13_0_2
    C44_2 = C44_0_2
    C55_2 = (C11_0_2 - C12_0_2) / 2  # derived from transverse isotropy relation
    C66_2 = C44_0_2

    # Return all constants in a flat dict, normalized by C11 for each layer.
    # Normalizing improves the condition number of the eigenvalue problem.
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
        # Layer 1 elastic constants, each divided by C11_1
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
        # Layer 2 elastic constants, each divided by C11_2
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
        # The (1 + 1e-6j) adds a tiny imaginary part to avoid branch-cut
        # issues in np.sqrt when the argument is exactly real and negative.
        "sqrtC11rho_2": np.sqrt((1 + 1e-6j) * C11_2 / layer2["rho"]),
    }


def compute_surface_displacement(
    freqs: NDArray[np.float64],
    p_vals: NDArray[np.float64],
    psi_vals: NDArray[np.float64],
    params: dict,
    parallel: bool = True,
) -> NDArray[np.complex128]:
    """
    Compute surface displacement Z(p, ψ, ω) for all frequencies.

    This is the most expensive step — for each frequency, it solves n_p × n_psi
    eigenvalue problems. Uses multiprocessing.Pool to parallelize across
    frequencies (each frequency is independent).

    Args:
        parallel: If True, use multiprocessing. Set False for debugging
            (multiprocessing makes stack traces harder to read).

    Returns:
        Z[i_p, i_psi, i_f]: 3D complex array of surface displacements.
    """
    n_p, n_psi, n_f = len(p_vals), len(psi_vals), len(freqs)
    precomputed = _precompute_constants(params)

    # Build argument tuples — one per frequency, for pool.map()
    args_list = [(i_f, f, p_vals, psi_vals, precomputed) for i_f, f in enumerate(freqs)]

    if parallel:
        # Use at most one worker per frequency (no benefit from more)
        n_workers = min(cpu_count(), n_f)
        with Pool(n_workers) as pool:
            results = pool.map(_compute_single_freq, args_list)
    else:
        results = [_compute_single_freq(args) for args in args_list]

    # Assemble results into the 3D array
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
    """
    Integrate Z(p, ψ, ω) over ψ and p to get the probe beam deflection angle.

    This is the 2D inverse Fourier transform — converting the surface
    displacement from (p, ψ) space back to a single deflection value at the
    probe beam position. The integration is:
        angle(ω) = (c_probe/π) ∫ [ (1/π) ∫ Z(p,ψ,ω) · g(p,ψ) dψ ]
                    × exp(-w²p²/8) · p² dp

    where g(p,ψ) is the angular sensitivity function that encodes the
    pump-probe geometry (offset r_0 and angle φ).
    """
    n_p, n_psi, n_f = Z.shape
    d_psi = psi_vals[1] - psi_vals[0]  # step size for Simpson's rule
    d_p = p_vals[1] - p_vals[0]
    w_rms = params["w_rms"]
    r_0 = params["r_0"]  # pump-probe offset distance
    phi = params["phi"]  # pump-probe offset angle
    c_probe = params["c_probe"]  # probe beam correction factor

    angles = np.zeros(n_f, dtype=complex)

    for i_f in range(n_f):
        I_p = np.zeros(n_p, dtype=complex)
        for i_p, p in enumerate(p_vals):
            integrand = np.zeros(n_psi, dtype=complex)
            for i_psi, psi in enumerate(psi_vals):
                # g: angular sensitivity — combines two terms for the two
                # beam deflection directions at the offset position
                g = -np.cos(psi - phi) * np.sin(p * r_0 * np.cos(psi - phi)) - np.cos(
                    psi + phi
                ) * np.sin(p * r_0 * np.cos(psi + phi))
                integrand[i_psi] = Z[i_p, i_psi, i_f] * g
            # Inner integral: over azimuthal angle ψ
            I_psi = (1 / np.pi) * simpson_integration(integrand, d_psi)
            # Multiply by probe beam profile and p² (Fourier measure)
            I_p[i_p] = I_psi * np.exp(-(w_rms**2) * p**2 / 8) * p**2
        # Outer integral: over spatial frequency p
        angles[i_f] = (1 / np.pi) * c_probe * simpson_integration(I_p, d_p)

    return angles


def compute_lockin_signals(
    angles: NDArray[np.complex128],
    v_sum_avg: float,
    detector_factor: float,
) -> tuple[NDArray[np.float64], NDArray[np.float64], NDArray[np.float64]]:
    """
    Convert raw deflection angles into simulated lock-in amplifier signals.

    The lock-in amplifier reports in-phase (real) and out-of-phase (imaginary)
    components. This function scales the complex deflection angle by the
    detector sensitivity and probe beam power to produce signals in the same
    units as the experimental data, enabling direct comparison.

    The √2 and 0.5 factors come from RMS-to-amplitude conversion and the
    lock-in's reference signal normalization.
    """
    raw = angles / np.sqrt(2) * 0.5 * detector_factor * v_sum_avg
    in_phase = np.abs(np.real(raw))
    out_phase = -np.imag(raw)
    # Ratio: avoid division by zero — fill with NaN where out_phase is 0
    ratio = np.full_like(in_phase, np.nan)
    nonzero = out_phase != 0
    ratio[nonzero] = -in_phase[nonzero] / out_phase[nonzero]
    return in_phase, out_phase, ratio


def run_anisotropic_analysis(
    params: AnisotropicParams, file_content: bytes
) -> AnisotropicResult:
    """
    Run the full anisotropic analysis pipeline.

    Unlike isotropic (which fits λ and α_t via least-squares), anisotropic
    analysis runs a FORWARD MODEL only — it predicts what the signal should
    look like for the given material properties, then finds the peak frequency
    and ratio using polynomial fitting. Actual fitting of anisotropic
    parameters is done separately via DE fitting (fitting_service.py).
    """
    c_probe = 0.7  # probe beam correction factor (empirical)
    g_int = 100e6  # interface thermal conductance (W/m²·K)
    n_p = 63  # number of spatial frequency points (must be odd for Simpson)
    n_psi = 45  # number of azimuthal angle points (must be odd for Simpson)
    # Model frequencies: 10 points logarithmically spaced from 100 kHz down to 100 Hz
    model_freqs = np.logspace(np.log10(100e3), np.log10(100), 10)

    # Transform Pydantic model into the internal dict format expected by
    # _precompute_constants and the worker functions. This mapping converts
    # field names (e.g., lambda_down → sigma, h_down → thickness).
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

    # --- Load and correct experimental data (same as isotropic) ---
    v_out, v_in, _, v_sum, freq = load_data(file_content)
    complex_leaking = calculate_leaking(
        freq, params.f_rolloff, params.delay_1, params.delay_2
    )
    v_corr_in, v_corr_out, v_corr_ratio = correct_data(v_out, v_in, complex_leaking)
    v_sum_avg = float(np.mean(v_sum))

    # --- Build spatial frequency and angle grids ---
    w_rms: float = transformed["w_rms"]  # type: ignore[assignment]
    # up_p = 8/w_rms: spatial frequencies beyond this are negligible
    # (Gaussian beam profile decays as exp(-w²p²/8))
    up_p = 8 / w_rms
    d_p = up_p / n_p
    p_vals = np.linspace(d_p, up_p, n_p)  # spatial frequency grid
    psi_vals = np.linspace(0, np.pi / 2, n_psi)  # azimuthal angle grid (0 to π/2)

    # --- Run the forward model pipeline ---
    t0 = time.time()
    # Step 1: surface displacement Z(p, ψ, ω) — the expensive part
    Z = compute_surface_displacement(model_freqs, p_vals, psi_vals, transformed)
    # Step 2: integrate Z to get probe beam deflection angles
    pbd_angles = compute_probe_deflection(Z, p_vals, psi_vals, model_freqs, transformed)
    # Step 3: convert deflection angles to simulated lock-in signals
    detector_factor: float = transformed["detector_factor"]  # type: ignore[assignment]
    in_mod, out_mod, ratio_mod = compute_lockin_signals(
        pbd_angles, v_sum_avg, detector_factor
    )
    elapsed = time.time() - t0
    print(f"[anisotropic] forward model: {elapsed:.3f}s")

    # Step 4: find peak frequency and ratio via polynomial fitting
    f_peak, ratio_at_peak = fit_rough_analysis(model_freqs, out_mod, ratio_mod)

    # --- Build result ---
    # Note: lambda_measure, alpha_t_fitted, t_ss_heat are None because
    # anisotropic forward model doesn't do least-squares fitting — that's
    # done separately via DE fitting if the user requests it.
    return AnisotropicResult(
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
