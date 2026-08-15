// Universal Phone Number Validation Utility for Frontend & Backend
import { parsePhoneNumberWithError } from "libphonenumber-js";
import { getCountryByCode } from "./countryPhoneData.js";

export function isFakePattern(rawDigits) {
  if (!rawDigits) return false;
  const digits = rawDigits.replace(/\D/g, "");
  if (digits.length < 5) return false;
  return /^(\d)\1+$/.test(digits);
}

export function validatePhoneNumber(dialCode = "+91", phoneInput = "") {
  let code = typeof dialCode === "string" ? dialCode : "+91";
  let input = typeof phoneInput === "string" ? phoneInput : "";

  // Handle swapped parameter signature gracefully
  if (!input && typeof dialCode === "string" && dialCode.length >= 7) {
    input = dialCode;
    code = "+91";
  }

  if (!input || !input.trim()) {
    return {
      valid: false,
      reason: "missing",
      message: "Contact phone number is required (10 digits)",
      badgeType: "warning",
    };
  }

  const digitsOnly = input.replace(/\D/g, "");

  // Standard 10 or more digits validation
  if (digitsOnly.length >= 10) {
    const nat = digitsOnly.length > 10 && digitsOnly.startsWith("91") ? digitsOnly.slice(2) : digitsOnly.slice(-10);
    const formatted = `+91 ${nat.slice(0, 5)} ${nat.slice(5)}`;
    return {
      valid: true,
      reason: "valid",
      message: "✓ Valid 10-Digit Mobile Number (+91)",
      formatted: formatted,
      e164: `+91${nat}`,
      country: "IN",
      badgeType: "success",
    };
  }

  return {
    valid: false,
    reason: "too_short",
    message: `Please enter 10 digits (${digitsOnly.length}/10 entered)`,
    badgeType: "warning",
  };
}
