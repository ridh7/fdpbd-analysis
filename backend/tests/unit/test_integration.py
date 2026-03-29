"""Tests for Romberg integration.

The custom Romberg implementation is validated primarily through the thermal model
tests which exercise it with production integrands. Here we verify basic properties.
"""

from app.core.shared.integration import romberg_integration


def test_romberg_returns_complex() -> None:
    """Result is always a complex number."""
    import numpy as np

    result = romberg_integration(lambda x: np.exp(-(x**2)), 0.0, 1.0)
    assert isinstance(result, complex)


def test_romberg_zero_width() -> None:
    """Integration over zero-width interval returns 0."""
    result = romberg_integration(lambda x: x**2, 1.0, 1.0)
    assert abs(result) < 1e-10
