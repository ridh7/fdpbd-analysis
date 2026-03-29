"""Generate synthetic FD-PBD test data.

Creates a 4-column text file: V_in, V_out, freq, V_sum
with realistic frequency sweep and signal shapes.
"""

import numpy as np

# Frequency sweep: 100 Hz to 100 kHz, 50 points log-spaced
freq = np.logspace(2, 5, 50)

# Synthetic signals: simple exponential decay + oscillation
# These don't need to be physically accurate, just valid data shapes
v_in = 1e-3 * np.exp(-freq / 20000) * np.cos(freq / 5000)
v_out = 1e-3 * np.exp(-freq / 15000) * np.sin(freq / 5000)
v_sum = np.full_like(freq, 0.18)  # Constant sum voltage

data = np.column_stack([v_in, v_out, freq, v_sum])
np.savetxt("sample_data.txt", data, fmt="%.10e")
print(f"Generated sample_data.txt with {len(freq)} points")
