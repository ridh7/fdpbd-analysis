/**
 * Frontend input validation utilities for FDPBD analysis parameters.
 *
 * Validation in this app happens at two layers:
 *  1. Frontend (this file) — provides instant feedback as the user types,
 *     preventing obviously invalid inputs from ever reaching the server.
 *     This keeps the UI responsive and avoids unnecessary network round-trips.
 *  2. Backend (FastAPI/Pydantic) — acts as a safety net, enforcing schema
 *     constraints and catching anything the frontend might miss (e.g., range
 *     limits, cross-field dependencies). The backend is the authoritative
 *     source of truth for what constitutes valid input.
 *
 * By validating eagerly on the frontend, users get immediate error messages
 * next to the relevant form field rather than waiting for a server response.
 */

/**
 * Check if a string represents a valid decimal number.
 * Used to validate individual numeric form inputs before submission.
 */
export function isValidDecimal(value: string): boolean {
  return value !== "" && !isNaN(Number(value));
}

/**
 * Check if all values in an array are valid decimals.
 * Used for array-type parameters like lambda_down, c_down, and h_down
 * where each layer's value must be a valid number.
 */
export function areAllValidDecimals(values: string[]): boolean {
  return values.every(isValidDecimal);
}

/**
 * Validate that a data file has the expected 4-column numeric format.
 *
 * FDPBD data files are whitespace-delimited text with 4 numeric columns:
 *   column 1: delay time (ps)
 *   column 2: in-phase signal (Vin)
 *   column 3: out-of-phase signal (Vout)
 *   column 4: amplitude (R)
 *
 * Lines starting with "#" are treated as comments and skipped.
 *
 * This runs entirely in the browser (via File.text()) so the user gets
 * immediate feedback on malformed files before any upload to the server.
 * Returns null if valid, or a descriptive error message if invalid.
 */
export async function validateDataFile(file: File): Promise<string | null> {
  const text = await file.text();

  // Strip blank lines and comment lines (prefixed with #)
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length === 0) {
    return "File is empty or contains no data rows.";
  }

  // Need at least 2 data points to produce a meaningful fit
  if (lines.length < 2) {
    return "File must contain at least 2 data rows.";
  }

  // Check every row: must have exactly 4 whitespace-separated numeric values
  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(/\s+/);
    if (cols.length !== 4) {
      return `Row ${i + 1} has ${cols.length} column(s), expected 4.`;
    }
    for (let j = 0; j < 4; j++) {
      if (isNaN(Number(cols[j]))) {
        return `Row ${i + 1}, column ${j + 1}: "${cols[j]}" is not a valid number.`;
      }
    }
  }

  return null;
}
