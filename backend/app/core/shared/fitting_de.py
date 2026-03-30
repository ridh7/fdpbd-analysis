"""Differential evolution fitting for anisotropic and transverse isotropic models.

Runs DE optimization with a callback that pushes progress events to a queue,
enabling SSE streaming to the frontend.
"""

import copy
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from numpy.typing import NDArray
from scipy.optimize import differential_evolution

from app.core.anisotropic.analysis import (
    compute_lockin_signals as aniso_lockin,
)
from app.core.anisotropic.analysis import (
    compute_probe_deflection as aniso_probe,
)
from app.core.anisotropic.analysis import (
    compute_surface_displacement as aniso_surface,
)
from app.core.shared.data_processing import calculate_leaking, correct_data, load_data
from app.core.shared.fitting import fit_rough_analysis
from app.core.transverse.analysis import (
    compute_lockin_signals as trans_lockin,
)
from app.core.transverse.analysis import (
    compute_probe_deflection as trans_probe,
)
from app.core.transverse.analysis import (
    compute_surface_displacement as trans_surface,
)
from app.models.fitting import AnisotropicFitParams, TransverseFitParams


@dataclass
class ProgressEvent:
    """Progress update from DE callback."""

    generation: int
    max_generations: int
    best_value: float
    convergence: float
    elapsed_s: float


@dataclass
class FitResult:
    """Final result of a DE fitting run."""

    fitted_param_name: str
    fitted_param_value: float
    final_cost: float
    total_time_s: float
    message: str
    # Forward model output with fitted param
    model_freqs: list[float]
    in_model: list[float]
    out_model: list[float]
    ratio_model: list[float]
    exp_freqs: list[float]
    in_exp: list[float]
    out_exp: list[float]
    ratio_exp: list[float]
    f_peak: float | None
    ratio_at_peak: float | None


# ---------------------------------------------------------------------------
# Top-level objective functions (must be picklable for workers=-1)
# ---------------------------------------------------------------------------


def _aniso_objective(
    param_value: NDArray,
    layer2_key: str,
    base_layer2: dict[str, Any],
    transformed: dict[str, Any],
    freq: NDArray,
    p_vals: NDArray,
    psi_vals: NDArray,
    v_sum_avg: float,
    v_corr_in: NDArray,
    v_corr_out: NDArray,
) -> float:
    """Anisotropic objective: evaluate model at exp freqs, return SSD."""
    trial_params = copy.deepcopy(transformed)
    trial_layer2 = copy.deepcopy(base_layer2)
    trial_layer2[layer2_key] = param_value[0]
    trial_params["layer2"] = trial_layer2

    Z = aniso_surface(freq, p_vals, psi_vals, trial_params, parallel=True)
    pbd_angles = aniso_probe(Z, p_vals, psi_vals, freq, trial_params)
    in_mod, out_mod, _ = aniso_lockin(
        pbd_angles, v_sum_avg, trial_params["detector_factor"]
    )

    if np.isnan(in_mod).any() or np.isnan(out_mod).any():
        return 1e12

    ssd_in = float(np.sum((in_mod - v_corr_in) ** 2))
    ssd_out = float(np.sum((out_mod - v_corr_out) ** 2))
    return ssd_in + ssd_out


def _trans_objective(
    param_value: NDArray,
    layer2_key: str,
    base_layer2: dict[str, Any],
    layer1: dict[str, float],
    layer3: dict[str, float],
    freq_middle: NDArray,
    p_vals: NDArray,
    a0: float,
    w_rms: float,
    g_int: float,
    r_0: float,
    c_probe: float,
    v_sum_fixed: float,
    detector_gain: float,
    v_corr_in_middle: NDArray,
    v_corr_out_middle: NDArray,
) -> float:
    """Transverse objective: evaluate model at exp freqs, return SSD."""
    trial_layer2 = copy.deepcopy(base_layer2)
    trial_layer2[layer2_key] = param_value[0]

    Z = trans_surface(
        freq_middle, p_vals, a0, w_rms, g_int,
        layer1, trial_layer2, layer3,
    )
    pbd_angles = trans_probe(Z, p_vals, freq_middle, w_rms, r_0, c_probe)
    in_mod, out_mod, _ = trans_lockin(pbd_angles, v_sum_fixed, detector_gain)

    if np.isnan(in_mod).any() or np.isnan(out_mod).any():
        return 1e12

    ssd_in = float(np.sum((in_mod - v_corr_in_middle) ** 2))
    ssd_out = float(np.sum((out_mod - v_corr_out_middle) ** 2))
    return ssd_in + ssd_out


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def run_anisotropic_fit(
    params: AnisotropicFitParams,
    data_filepath: str | Path,
    on_progress: Callable[[ProgressEvent], None],
) -> FitResult:
    """Run DE fitting for anisotropic model."""
    data_filepath = Path(data_filepath)
    fit_config = params.fit_config

    transformed: dict[str, Any] = {
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
        "c_probe": 0.7,
        "g_int": 100e6,
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
    n_p = 63
    n_psi = 45
    model_freqs = np.logspace(np.log10(100e3), np.log10(100), 10)
    w_rms: float = transformed["w_rms"]
    up_p = 8 / w_rms
    d_p = up_p / n_p
    p_vals = np.linspace(d_p, up_p, n_p)
    psi_vals = np.linspace(0, np.pi / 2, n_psi)

    # Validate fit parameter
    layer2_key = fit_config.parameter_to_fit
    if layer2_key not in transformed["layer2"]:
        raise ValueError(
            f"Unknown fit parameter '{layer2_key}'. "
            f"Must be one of: {list(transformed['layer2'].keys())}"
        )

    # Apply fixed values to base layer2
    base_layer2 = copy.deepcopy(transformed["layer2"])
    for key, value in fit_config.fixed_values.items():
        if key in base_layer2:
            base_layer2[key] = value

    start_time = time.time()
    iteration_count = 0

    def callback(xk: NDArray, convergence: float) -> None:
        nonlocal iteration_count
        iteration_count += 1
        on_progress(
            ProgressEvent(
                generation=iteration_count,
                max_generations=fit_config.max_iterations,
                best_value=float(xk[0]),
                convergence=float(convergence),
                elapsed_s=time.time() - start_time,
            )
        )

    de_args = (
        layer2_key,
        base_layer2,
        transformed,
        freq,
        p_vals,
        psi_vals,
        v_sum_avg,
        v_corr_in,
        v_corr_out,
    )

    result = differential_evolution(
        _aniso_objective,
        bounds=[(fit_config.bounds_min, fit_config.bounds_max)],
        args=de_args,
        strategy="best1bin",
        maxiter=fit_config.max_iterations,
        popsize=fit_config.population_size,
        tol=fit_config.tolerance,
        mutation=(0.5, 1),
        recombination=0.7,
        callback=callback,
        workers=1,
        updating="immediate",
    )

    total_time = time.time() - start_time
    fitted_value = float(result.x[0])

    # Run final forward model with fitted parameter
    final_params = copy.deepcopy(transformed)
    final_layer2 = copy.deepcopy(base_layer2)
    final_layer2[layer2_key] = fitted_value
    final_params["layer2"] = final_layer2

    Z_final = aniso_surface(model_freqs, p_vals, psi_vals, final_params, parallel=True)
    pbd_final = aniso_probe(Z_final, p_vals, psi_vals, model_freqs, final_params)
    in_fit, out_fit, ratio_fit = aniso_lockin(
        pbd_final, v_sum_avg, final_params["detector_factor"]
    )

    f_peak, ratio_at_peak = fit_rough_analysis(model_freqs, out_fit, ratio_fit)

    return FitResult(
        fitted_param_name=layer2_key,
        fitted_param_value=fitted_value,
        final_cost=float(result.fun),
        total_time_s=total_time,
        message=str(result.message),
        model_freqs=model_freqs.tolist(),
        in_model=in_fit.tolist(),
        out_model=out_fit.tolist(),
        ratio_model=ratio_fit.tolist(),
        exp_freqs=freq.tolist(),
        in_exp=v_corr_in.tolist(),
        out_exp=v_corr_out.tolist(),
        ratio_exp=v_corr_ratio.tolist(),
        f_peak=float(f_peak) if not np.isnan(f_peak) else None,
        ratio_at_peak=float(ratio_at_peak) if not np.isnan(ratio_at_peak) else None,
    )


def run_transverse_fit(
    params: TransverseFitParams,
    data_filepath: str | Path,
    on_progress: Callable[[ProgressEvent], None],
) -> FitResult:
    """Run DE fitting for transverse isotropic model."""
    data_filepath = Path(data_filepath)
    fit_config = params.fit_config

    # Load and correct data
    v_out, v_in, _, v_sum, freq = load_data(data_filepath)
    complex_leaking = calculate_leaking(
        freq, params.f_rolloff, params.delay_1, params.delay_2
    )
    v_corr_in, v_corr_out, v_corr_ratio = correct_data(v_out, v_in, complex_leaking)

    # Select middle points
    num_points = len(freq)
    num_middle = params.num_middle_points
    if num_points >= num_middle:
        start_idx = (num_points - num_middle) // 2
        end_idx = start_idx + num_middle
        freq_middle = freq[start_idx:end_idx]
        v_corr_in_middle = v_corr_in[start_idx:end_idx]
        v_corr_out_middle = v_corr_out[start_idx:end_idx]
        v_corr_ratio_middle = v_corr_ratio[start_idx:end_idx]
    else:
        freq_middle = freq
        v_corr_in_middle = v_corr_in
        v_corr_out_middle = v_corr_out
        v_corr_ratio_middle = v_corr_ratio

    # Compute A0
    refl_al = (
        abs((params.n_al - 1 + 1j * params.k_al) / (params.n_al + 1 + 1j * params.k_al))
        ** 2
    )
    a0 = params.incident_pump * params.lens_transmittance * (4.0 / np.pi) * (1.0 - refl_al)

    # Build grids
    up_p = 8 / params.w_rms
    d_p = up_p / params.n_p
    p_vals = np.linspace(d_p, up_p, params.n_p)
    model_freqs = np.logspace(
        np.log10(params.model_freq_start),
        np.log10(params.model_freq_end),
        params.model_freq_points,
    )

    # Build layer dicts
    layer1 = {
        "thickness": params.layer1_thickness,
        "sigma": params.layer1_sigma,
        "capac": params.layer1_capac,
        "rho": params.layer1_rho,
        "alphaT": params.layer1_alphaT,
        "C11_0": params.layer1_C11_0,
        "C12_0": params.layer1_C12_0,
        "C44_0": params.layer1_C44_0,
    }
    base_layer2 = {
        "sigma_r": params.layer2_sigma_r,
        "sigma_z": params.layer2_sigma_z,
        "capac": params.layer2_capac,
        "rho": params.layer2_rho,
        "alphaT_perp": params.layer2_alphaT_perp,
        "alphaT_para": params.layer2_alphaT_para,
        "C11_0": params.layer2_C11_0,
        "C12_0": params.layer2_C12_0,
        "C13_0": params.layer2_C13_0,
        "C33_0": params.layer2_C33_0,
        "C44_0": params.layer2_C44_0,
    }
    layer3 = {
        "sigma": params.layer3_sigma,
        "capac": params.layer3_capac,
    }

    # Validate fit parameter
    layer2_key = fit_config.parameter_to_fit
    if layer2_key not in base_layer2:
        raise ValueError(
            f"Unknown fit parameter '{layer2_key}'. "
            f"Must be one of: {list(base_layer2.keys())}"
        )

    # Apply fixed values
    for key, value in fit_config.fixed_values.items():
        if key in base_layer2:
            base_layer2[key] = value

    start_time = time.time()
    iteration_count = 0

    def callback(xk: NDArray, convergence: float) -> None:
        nonlocal iteration_count
        iteration_count += 1
        on_progress(
            ProgressEvent(
                generation=iteration_count,
                max_generations=fit_config.max_iterations,
                best_value=float(xk[0]),
                convergence=float(convergence),
                elapsed_s=time.time() - start_time,
            )
        )

    de_args = (
        layer2_key,
        base_layer2,
        layer1,
        layer3,
        freq_middle,
        p_vals,
        a0,
        params.w_rms,
        params.g_int,
        params.r_0,
        params.c_probe,
        params.v_sum_fixed,
        params.detector_gain,
        v_corr_in_middle,
        v_corr_out_middle,
    )

    result = differential_evolution(
        _trans_objective,
        bounds=[(fit_config.bounds_min, fit_config.bounds_max)],
        args=de_args,
        strategy="best1bin",
        maxiter=fit_config.max_iterations,
        popsize=fit_config.population_size,
        tol=fit_config.tolerance,
        mutation=(0.5, 1),
        recombination=0.7,
        callback=callback,
        workers=1,
        updating="immediate",
    )

    total_time = time.time() - start_time
    fitted_value = float(result.x[0])

    # Run final forward model with fitted parameter
    final_layer2 = copy.deepcopy(base_layer2)
    final_layer2[layer2_key] = fitted_value

    Z_final = trans_surface(
        model_freqs, p_vals, a0, params.w_rms, params.g_int,
        layer1, final_layer2, layer3,
    )
    pbd_final = trans_probe(
        Z_final, p_vals, model_freqs, params.w_rms, params.r_0, params.c_probe,
    )
    in_fit, out_fit, ratio_fit = trans_lockin(
        pbd_final, params.v_sum_fixed, params.detector_gain,
    )

    f_peak, ratio_at_peak = fit_rough_analysis(model_freqs, out_fit, ratio_fit)

    return FitResult(
        fitted_param_name=layer2_key,
        fitted_param_value=fitted_value,
        final_cost=float(result.fun),
        total_time_s=total_time,
        message=str(result.message),
        model_freqs=model_freqs.tolist(),
        in_model=in_fit.tolist(),
        out_model=out_fit.tolist(),
        ratio_model=ratio_fit.tolist(),
        exp_freqs=freq_middle.tolist(),
        in_exp=v_corr_in_middle.tolist(),
        out_exp=v_corr_out_middle.tolist(),
        ratio_exp=v_corr_ratio_middle.tolist(),
        f_peak=float(f_peak) if not np.isnan(f_peak) else None,
        ratio_at_peak=float(ratio_at_peak) if not np.isnan(ratio_at_peak) else None,
    )
