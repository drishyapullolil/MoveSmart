/**
 * Validates a user's full name for backend APIs.
 * Rules:
 * 1. Must be at least 2 characters long.
 * 2. Must only contain alphabets (A-Z, a-z).
 * 3. Spaces, numbers, and special characters/symbols (-=0).<//? etc.) are NOT allowed.
 *
 * @param {string} name - Name string to validate
 * @param {string} [fieldLabel="Full Name"] - Field display name for error messages
 * @returns {{ valid: boolean, reason: "missing_name" | "too_short" | "too_long" | "contains_spaces" | "contains_numbers" | "invalid_characters" | "valid", message: string }}
 */
function validateName(name, fieldLabel = "Full Name") {
  if (!name || typeof name !== "string" || !name.trim()) {
    return {
      valid: false,
      reason: "missing_name",
      message: `${fieldLabel} is required.`,
    };
  }

  // 1. Check for spaces
  if (/\s/.test(name)) {
    return {
      valid: false,
      reason: "contains_spaces",
      message: `${fieldLabel} cannot contain spaces. Use only alphabetic letters (A-Z, a-z).`,
    };
  }

  // 2. Check for numbers
  if (/\d/.test(name)) {
    return {
      valid: false,
      reason: "contains_numbers",
      message: `${fieldLabel} cannot contain numbers. Use only alphabetic letters (A-Z, a-z).`,
    };
  }

  // 3. Check for any non-alphabet characters (symbols, punctuation, etc.)
  if (/[^A-Za-z]/.test(name)) {
    return {
      valid: false,
      reason: "invalid_characters",
      message: `${fieldLabel} can only contain alphabets (A-Z, a-z). Special characters or symbols are not allowed.`,
    };
  }

  // 4. Minimum 2 alphabetic characters
  if (name.length < 2) {
    return {
      valid: false,
      reason: "too_short",
      message: `${fieldLabel} must contain at least 2 alphabetic characters.`,
    };
  }

  // 5. Maximum 50 characters
  if (name.length > 50) {
    return {
      valid: false,
      reason: "too_long",
      message: `${fieldLabel} cannot exceed 50 characters.`,
    };
  }

  return {
    valid: true,
    reason: "valid",
    message: `Valid ${fieldLabel}`,
  };
}

module.exports = {
  validateName,
};
