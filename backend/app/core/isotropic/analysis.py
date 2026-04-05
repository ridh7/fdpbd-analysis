"""
Orchestrator for isotropic FD-PBD analysis.

This is the pipeline function that connects all the building blocks into a
single end-to-end workflow:

    raw params + data file
        → load & correct signals
        → compute derived physics quantities
        → fit thermal conductivity
        → generate model curves for plotting
        → return structured result

Each step delegates to a specialized module:
- data_processing: load_data, calculate_leaking, correct_data
- thermal_model: compute_steady_state_heat, delta_bo_theta
- fitting: fit_in_out (least-squares optimizer)

The router calls this function, and the frontend receives the IsotropicResult.
"""

from pathlib import Path

import numpy as np

from app.core.shared.data_processing import calculate_leaking, correct_data, load_data
from app.models.isotropic import IsotropicParams, IsotropicResult, PlotData

from .fitting import fit_in_out
from .thermal_model import compute_steady_state_heat, delta_bo_theta


def run_isotropic_analysis(params: IsotropicParams, data_filepath: Path) -> IsotropicResult:
    """Run the full isotropic analysis pipeline: load data → correct → fit → plot."""

    # --- Step 1: Convert Pydantic model fields to numpy arrays ---
    # The thermal model and optimizer need numpy arrays for vectorized math.
    # The optimizer also mutates lambda_down[2] in-place during fitting.
    lambda_down = np.array(params.lambda_down)
    eta_down = np.array(params.eta_down)
    c_down = np.array(params.c_down)
    h_down = np.array(params.h_down)
    # For isotropic analysis, pump and probe beam sizes are assumed equal
    r_pump = params.w_rms
    r_probe = params.w_rms

    # --- Step 2: Compute derived physics quantities ---
    # Fresnel reflectance of aluminum transducer at normal incidence:
    #   R = |n - 1 + ik|² / |n + 1 + ik|²
    # where n = refractive index, k = extinction coefficient.
    # This gives the fraction of pump laser light reflected (not absorbed).
    refl_al = (
        abs(params.n_al - 1 + 1j * params.k_al) ** 2
        / abs(params.n_al + 1 + 1j * params.k_al) ** 2
    )
    absorbed_pump = 1 - refl_al  # fraction that enters the sample as heat

    # Effective AC pump power reaching the sample:
    # incident × lens transmission × 4/π (Gaussian beam geometry) × absorption
    a_pump = (
        params.incident_pump * params.lens_transmittance * 4.0 / np.pi * absorbed_pump
    )
    # Total DC absorbed power (pump + probe) — used only for steady-state
    # temperature rise estimate (to check if power is too high)
    a_dc = (params.incident_pump + params.incident_probe) * absorbed_pump

    # --- Step 3: Load experimental data and remove instrument distortion ---
    v_out, v_in, _, v_sum, freq = load_data(data_filepath)

    # Leaking correction: undo the lock-in amplifier's frequency-dependent
    # gain roll-off and phase delay (see data_processing.py)
    complex_leaking = calculate_leaking(
        freq, params.f_rolloff, params.delay_1, params.delay_2
    )

    # Divide raw signals by the instrument transfer function
    v_corr_in, v_corr_out, v_corr_ratio = correct_data(v_out, v_in, complex_leaking)

    # --- Step 4: Compute thermo-optic coefficient (initial guess) ---
    # v_sum_avg: average photodetector sum voltage, proportional to probe power
    v_sum_avg = np.mean(v_sum)
    # coef combines the material's thermo-optic response (alpha_t) with
    # the detection sensitivity. √2 converts RMS to amplitude.
    coef = params.alpha_t * params.detector_factor * v_sum_avg / np.sqrt(2)

    # --- Step 5: Steady-state temperature rise ---
    # Estimate the DC temperature increase at the sample surface.
    # Used to verify the pump power won't damage the sample.
    t_ss_heat = compute_steady_state_heat(
        lambda_down,
        c_down,
        h_down,
        eta_down,
        params.lambda_up,
        params.c_up,
        params.h_up,
        params.eta_up,
        r_pump,
        r_probe,
        a_dc,
    )

    # --- Step 6: Select fitting frequency range ---
    # Instead of fitting all frequencies, focus on ±1 decade around the
    # out-of-phase peak. This region is most sensitive to thermal conductivity
    # and avoids noisy data at the tails.
    idx_peak = np.argmax(np.abs(v_corr_out))  # index of largest |out-of-phase|
    fc = freq[idx_peak]                        # center frequency (peak)
    mask = (freq >= fc / 10) & (freq <= fc * 10)  # ±1 decade around peak
    freq_fit = freq[mask]
    v_corr_in_fit = v_corr_in[mask]
    v_corr_out_fit = v_corr_out[mask]
    v_corr_ratio_fit = v_corr_ratio[mask]

    # --- Step 7: Least-squares fitting ---
    # Fit two unknowns: thermal conductivity (lambda) and thermo-optic coef.
    # Initial guess: user-provided lambda for the sample layer, computed coef.
    # Bounds prevent physically impossible values (e.g., negative conductivity).
    x_guess = [lambda_down[2], coef]
    lb = [0.0, -100.0]    # lower bounds: lambda ≥ 0, coef ≥ -100
    ub = [100.0, 100.0]   # upper bounds: lambda ≤ 100, coef ≤ 100
    x_sol, _ = fit_in_out(
        x_guess,
        v_corr_in_fit,
        v_corr_out_fit,
        params.niu,
        freq_fit,
        lambda_down,
        c_down,
        h_down,
        eta_down,
        params.lambda_up,
        params.c_up,
        params.h_up,
        params.eta_up,
        r_pump,
        r_probe,
        a_pump,
        params.x_offset,
        lb,
        ub,
    )
    lambda_measure = float(x_sol[0])   # fitted thermal conductivity (W/m·K)
    coef_fitted = float(x_sol[1])      # fitted thermo-optic coefficient
    # Back-calculate alpha_t from the fitted coef — this is what the user
    # cares about (the material property, independent of the detector)
    alpha_t_fitted = coef_fitted / (params.detector_factor * v_sum_avg / np.sqrt(2))

    # --- Step 8: Generate model curves for plotting ---
    # Run the thermal model one more time with fitted parameters to get the
    # best-fit prediction. These curves are overlaid on experimental data
    # in the frontend's InOutPhasePlot and RatioPlot.
    delta_theta = delta_bo_theta(
        params.niu,
        coef_fitted,
        freq_fit,
        lambda_down,
        c_down,
        h_down,
        eta_down,
        params.lambda_up,
        params.c_up,
        params.h_up,
        params.eta_up,
        r_pump,
        r_probe,
        a_pump,
        params.x_offset,
    )
    delta_in = np.real(delta_theta)     # model in-phase signal
    delta_out = np.imag(delta_theta)    # model out-of-phase signal
    delta_ratio = -delta_in / delta_out  # model ratio (sign convention)

    # --- Build and return the result ---
    # .tolist() converts numpy arrays to Python lists for JSON serialization.
    # Pydantic will serialize these as JSON arrays in the API response.
    return IsotropicResult(
        lambda_measure=lambda_measure,
        alpha_t_fitted=alpha_t_fitted,
        t_ss_heat=t_ss_heat,
        plot_data=PlotData(
            freq_fit=freq_fit.tolist(),
            v_corr_in_fit=v_corr_in_fit.tolist(),
            v_corr_out_fit=v_corr_out_fit.tolist(),
            v_corr_ratio_fit=v_corr_ratio_fit.tolist(),
            delta_in=delta_in.tolist(),
            delta_out=delta_out.tolist(),
            delta_ratio=delta_ratio.tolist(),
        ),
    )
