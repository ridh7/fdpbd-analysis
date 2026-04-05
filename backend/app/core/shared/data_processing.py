"""
Data loading, validation, and signal correction for FD-PBD experimental data.

This is the backend's equivalent of the frontend's validateDataFile() in
lib/validation.ts — but while the frontend does quick client-side checks
(column count, numeric values), this module does the actual parsing with
numpy and applies physics-based corrections to the raw measurements.

## Pipeline:
1. load_data() — parses raw bytes in-memory, validates shape, returns 5 arrays
2. calculate_leaking() — computes the complex correction factor from
   electronics parameters (lock-in amplifier response)
3. correct_data() — divides raw signals by the leaking factor to remove
   instrument artifacts, giving the true thermal signal

## NumPy types used:
- np.float64: 64-bit floating point (Python's default float is also 64-bit,
  but np.float64 arrays are contiguous in memory, enabling vectorized math
  that's 100x+ faster than Python loops)
- np.complex128: complex number with 64-bit real + 64-bit imaginary parts.
  Used because the lock-in amplifier measures in-phase and out-of-phase
  signals, which are naturally represented as real + imaginary components
  of a complex number.
- NDArray[np.float64]: type hint from numpy.typing that means "a numpy array
  where every element is float64". Similar to TypeScript's number[] but with
  a specific numeric precision. NDArray is purely for type-checking — at
  runtime it's just a regular numpy array.
"""

from io import BytesIO

import numpy as np
from numpy.typing import NDArray


def load_data(
    content: bytes,
) -> tuple[
    NDArray[np.float64],  # v_out
    NDArray[np.float64],  # v_in
    NDArray[np.float64],  # v_ratio
    NDArray[np.float64],  # v_sum
    NDArray[np.float64],  # freq
]:
    """
    Load experimental data from raw bytes (in-memory).

    Expected format: 4 columns per row (V_in, V_out, Frequency, V_sum),
    at least 2 rows. This matches what the frontend's FileUpload component
    validates before sending.

    The bytes come from FastAPI's UploadFile.read() and are wrapped in a
    BytesIO buffer for numpy to parse. No temp files are written to disk.

    Validation layers (defense in depth):
    1. Frontend: validateDataFile() checks column count, row count, numeric values
    2. Here: np.loadtxt fails on non-numeric, shape checks catch wrong dimensions
    Both exist because the frontend validation can be bypassed (curl, Postman, etc.)
    """
    try:
        # np.loadtxt reads whitespace-delimited text into a 2D float64 array.
        # BytesIO wraps the raw bytes so numpy can read them like a file.
        # Raises ValueError if any cell isn't a valid number.
        data: NDArray[np.float64] = np.loadtxt(BytesIO(content))
    except ValueError as e:
        raise ValueError(
            f"Could not parse data file: {e}. "
            "Expected a whitespace-delimited text file with 4 numeric columns "
            "(V_in, V_out, Frequency, V_sum)."
        ) from e

    # np.loadtxt returns a 1D array for a single-row file (e.g., "1.0 2.0 3.0 4.0")
    # because numpy can't distinguish "1 row × 4 columns" from "4 values".
    # We check for 4 elements and reshape to (1, 4) to normalize the shape.
    if data.ndim == 1:
        if data.shape[0] != 4:
            raise ValueError(
                f"Expected 4 columns but found {data.shape[0]}. "
                "File must contain columns: V_in, V_out, Frequency, V_sum."
            )
        data = data.reshape(1, 4)  # reshape from (4,) to (1, 4)
    elif data.ndim == 2:
        # Normal case: multiple rows, verify column count
        if data.shape[1] != 4:
            raise ValueError(
                f"Expected 4 columns but found {data.shape[1]}. "
                "File must contain columns: V_in, V_out, Frequency, V_sum."
            )
    else:
        raise ValueError(
            "Data file has unexpected structure. "
            "Expected a 2D table with 4 numeric columns."
        )

    if data.shape[0] < 2:
        raise ValueError(
            f"Data file has only {data.shape[0]} row(s). "
            "At least 2 data points are required for analysis."
        )

    # Transpose: rows become columns, columns become rows.
    # Before: data.shape = (N_rows, 4) — each row is one measurement
    # After:  data.shape = (4, N_rows) — each row is one signal across all frequencies
    # This lets us slice by signal type: data[0] = all V_in values, data[1] = all V_out, etc.
    data = data.T
    v_in = data[0]
    v_out = data[1]
    freq = data[2]
    v_sum = data[3]
    # V_ratio is the primary observable — negative because of the sign convention
    # in lock-in detection (in-phase and out-of-phase have opposite signs)
    v_ratio = -v_in / v_out
    return v_out, v_in, v_ratio, v_sum, freq


def calculate_leaking(
    freq: NDArray[np.float64], f_rolloff: float, delay_1: float, delay_2: float
) -> NDArray[np.complex128]:
    """
    Calculate the complex leaking correction factor.

    The lock-in amplifier and electronics introduce frequency-dependent
    distortions to the measured signal:
    - 1/(1 + j*f/f_rolloff): low-pass filter response — the amplifier's
      gain rolls off at high frequencies, attenuating the signal
    - exp(j*(delay_1*f + delay_2*f²)): phase delays from cables, electronics,
      and signal processing — shift the signal's phase at each frequency

    The combined effect is a complex transfer function. To recover the true
    thermal signal, we divide the raw measurement by this factor (in correct_data).

    1j is Python's imaginary unit (equivalent to i in math: √(-1)).
    The result is complex128 because multiplying/dividing by 1j produces
    complex numbers.
    """
    res: NDArray[np.complex128] = (
        1.0
        / (1 + 1j * freq / f_rolloff)         # low-pass filter roll-off
        / np.exp(1j * (delay_1 * freq + delay_2 * freq**2))  # phase delay
    )
    return res


def correct_data(
    v_out: NDArray[np.float64],
    v_in: NDArray[np.float64],
    complex_leaking: NDArray[np.complex128],
) -> tuple[NDArray[np.float64], NDArray[np.float64], NDArray[np.float64]]:
    """
    Remove instrument distortions from raw measurements.

    The measured V_in and V_out are combined into a single complex number
    (real = in-phase, imaginary = out-of-phase), then divided by the leaking
    factor to undo the electronics' effect. The corrected real/imaginary parts
    are extracted as the true in-phase and out-of-phase thermal signals.

    This is the same operation as: true_signal = measured_signal / transfer_function
    which is standard signal processing (deconvolution in the frequency domain).
    """
    # Combine in-phase and out-of-phase into one complex signal
    v_complex = v_in + 1j * v_out
    # Divide by the instrument transfer function to remove distortions
    v_corrected = v_complex / complex_leaking
    # Extract the corrected components back to real arrays
    v_corr_in = np.real(v_corrected)     # np.real extracts the real part
    v_corr_out = np.imag(v_corrected)    # np.imag extracts the imaginary part
    v_corr_ratio = -v_corr_in / v_corr_out
    return v_corr_in, v_corr_out, v_corr_ratio
