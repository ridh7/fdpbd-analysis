"""Orchestrator for isotropic FD-PBD analysis."""

from pathlib import Path

import numpy as np

from app.core.shared.data_processing import calculate_leaking, correct_data, load_data
from app.models.isotropic import FDPBDParams, FDPBDResult, PlotData

from .fitting import fit_in_out
from .thermal_model import compute_steady_state_heat, delta_bo_theta


def run_fdpbd_analysis(params: FDPBDParams, data_filepath: Path) -> FDPBDResult:
    """Run isotropic FD-PBD analysis with given parameters and data file."""
    # Extract parameters
    lambda_down = np.array(params.lambda_down)
    eta_down = np.array(params.eta_down)
    c_down = np.array(params.c_down)
    h_down = np.array(params.h_down)
    r_pump = params.w_rms
    r_probe = params.w_rms

    # Derived parameters
    refl_al = (
        abs(params.n_al - 1 + 1j * params.k_al) ** 2
        / abs(params.n_al + 1 + 1j * params.k_al) ** 2
    )
    absorbed_pump = 1 - refl_al
    a_pump = (
        params.incident_pump * params.lens_transmittance * 4.0 / np.pi * absorbed_pump
    )
    a_dc = (params.incident_pump + params.incident_probe) * absorbed_pump

    # Load data
    v_out, v_in, _, v_sum, freq = load_data(data_filepath)

    # Calculate leaking correction
    complex_leaking = calculate_leaking(
        freq, params.f_rolloff, params.delay_1, params.delay_2
    )

    # Correct data
    v_corr_in, v_corr_out, v_corr_ratio = correct_data(v_out, v_in, complex_leaking)

    # Average sum voltage
    v_sum_avg = np.mean(v_sum)
    coef = params.alpha_t * params.detector_factor * v_sum_avg / np.sqrt(2)

    # Steady-state heating
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

    # Determine fitting frequency range
    idx_peak = np.argmax(np.abs(v_corr_out))
    fc = freq[idx_peak]
    mask = (freq >= fc / 10) & (freq <= fc * 10)
    freq_fit = freq[mask]
    v_corr_in_fit = v_corr_in[mask]
    v_corr_out_fit = v_corr_out[mask]
    v_corr_ratio_fit = v_corr_ratio[mask]

    # Perform fitting
    x_guess = [lambda_down[2], coef]
    lb = [0.0, -100.0]
    ub = [100.0, 100.0]
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
    lambda_measure = float(x_sol[0])
    coef_fitted = float(x_sol[1])
    alpha_t_fitted = coef_fitted / (params.detector_factor * v_sum_avg / np.sqrt(2))

    # Compute model for plotting
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
    delta_in = np.real(delta_theta)
    delta_out = np.imag(delta_theta)
    delta_ratio = -delta_in / delta_out

    return FDPBDResult(
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
