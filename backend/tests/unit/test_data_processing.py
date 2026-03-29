"""Tests for shared data processing functions."""

from pathlib import Path

import numpy as np
import pytest

from app.core.shared.data_processing import calculate_leaking, correct_data, load_data


def test_load_data(sample_data_path: Path) -> None:
    """load_data returns 5 arrays with correct shapes."""
    v_out, v_in, v_ratio, v_sum, freq = load_data(sample_data_path)
    assert len(v_out) == len(v_in) == len(freq) == len(v_sum) == len(v_ratio)
    assert len(freq) == 50


def test_load_data_file_not_found() -> None:
    """load_data raises FileNotFoundError for missing files."""
    with pytest.raises(FileNotFoundError):
        load_data(Path("/nonexistent/file.txt"))


def test_calculate_leaking_dc_limit() -> None:
    """At DC (freq=0), leaking correction should be 1+0j."""
    freq = np.array([0.0])
    result = calculate_leaking(
        freq, f_rolloff=95000.0, delay_1=8.9e-6, delay_2=-1.3e-11
    )
    np.testing.assert_allclose(result, [1.0 + 0j], atol=1e-10)


def test_calculate_leaking_shape() -> None:
    """Output shape matches input frequency array."""
    freq = np.logspace(2, 5, 20)
    result = calculate_leaking(
        freq, f_rolloff=95000.0, delay_1=8.9e-6, delay_2=-1.3e-11
    )
    assert result.shape == freq.shape
    assert np.iscomplexobj(result)


def test_correct_data_identity() -> None:
    """When leaking is 1+0j, corrected data equals input."""
    v_out = np.array([1.0, 2.0, 3.0])
    v_in = np.array([4.0, 5.0, 6.0])
    leaking = np.ones(3, dtype=complex)
    v_corr_in, v_corr_out, v_corr_ratio = correct_data(v_out, v_in, leaking)
    np.testing.assert_allclose(v_corr_in, v_in)
    np.testing.assert_allclose(v_corr_out, v_out)
    np.testing.assert_allclose(v_corr_ratio, -v_in / v_out)
