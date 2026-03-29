"""Tests for isotropic thermal model."""

import numpy as np

from app.core.isotropic.thermal_model import compute_steady_state_heat


def test_steady_state_heat_positive() -> None:
    """Steady-state heating should be a positive real number."""
    lambda_down = np.array([149.0, 0.1, 9.7])
    c_down = np.array([2.44e6, 0.1e6, 2.73e6])
    h_down = np.array([0.07e-6, 0.001e-6, 1.0e-6])
    eta_down = np.array([1.0, 1.0, 1.0])

    result = compute_steady_state_heat(
        lambda_down=lambda_down,
        c_down=c_down,
        h_down=h_down,
        eta_down=eta_down,
        lambda_up=0.028,
        c_up=1192.0,
        h_up=0.001,
        eta_up=1.0,
        r_pump=11.2e-6,
        r_probe=11.2e-6,
        a_dc=0.001,
    )
    assert isinstance(result, float)
    assert result > 0
