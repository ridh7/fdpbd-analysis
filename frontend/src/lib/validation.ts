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
