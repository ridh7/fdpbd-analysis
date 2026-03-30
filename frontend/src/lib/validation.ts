/**
 * Check if a string represents a valid decimal number.
 */
export function isValidDecimal(value: string): boolean {
  return value !== "" && !isNaN(parseFloat(value));
}

/**
 * Check if all values in an array are valid decimals.
 */
export function areAllValidDecimals(values: string[]): boolean {
  return values.every(isValidDecimal);
}

/**
 * Validate that a data file has the expected 4-column numeric format.
 * Reads the file as text and checks structure without sending to the server.
 * Returns null if valid, or an error message string if invalid.
 */
export async function validateDataFile(file: File): Promise<string | null> {
  const text = await file.text();
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length === 0) {
    return "File is empty or contains no data rows.";
  }

  if (lines.length < 2) {
    return "File must contain at least 2 data rows.";
  }

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
