/**
 * Validates a user's full name for card application and other forms.
 * Rules:
 * 1. Must be at least 2 characters long (after trimming).
 * 2. Cannot contain numbers (digits 0-9).
 *
 * @param {string} name - Full Name string
 * @returns {{ valid: boolean, reason: "missing_name" | "too_short" | "contains_numbers" | "valid", message: string, badgeType: "warning" | "error" | "success" }}
 */
export function validateName(name) {
  if (!name || typeof name !== "string" || !name.trim()) {
    return {
      valid: false,
      reason: "missing_name",
      message: "Full Name is required.",
      badgeType: "warning",
    };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return {
      valid: false,
      reason: "too_short",
      message: "Full Name must be at least 2 characters long.",
      badgeType: "error",
    };
  }

  if (/\d/.test(name)) {
    return {
      valid: false,
      reason: "contains_numbers",
      message: "Full Name cannot contain numbers.",
      badgeType: "error",
    };
  }

  return {
    valid: true,
    reason: "valid",
    message: "Valid Full Name",
    badgeType: "success",
  };
}
