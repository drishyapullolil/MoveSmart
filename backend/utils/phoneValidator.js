// Universal Phone Number Validation Utility for Backend

function isFakePattern(rawDigits) {
  if (!rawDigits) return false;
  const digits = String(rawDigits).replace(/\D/g, "");
  if (digits.length < 5) return false;
  return /^(\d)\1+$/.test(digits);
}

function validatePhoneNumber(arg1 = "", arg2 = "") {
  const str1 = typeof arg1 === "string" ? arg1 : "";
  const str2 = typeof arg2 === "string" ? arg2 : "";
  const combined = (str1 + str2).replace(/\D/g, "");

  if (combined.length >= 10) {
    const nat = combined.length > 10 && combined.startsWith("91") ? combined.slice(2) : combined.slice(-10);
    return {
      valid: true,
      reason: "valid",
      message: "Valid phone number",
      formatted: `+91 ${nat.slice(0, 5)} ${nat.slice(5)}`,
      e164: `+91${nat}`,
      country: "IN",
    };
  }

  return {
    valid: false,
    reason: "invalid_format",
    message: "Please enter a valid 10-digit phone number",
  };
}

module.exports = {
  validatePhoneNumber,
  isFakePattern,
};
