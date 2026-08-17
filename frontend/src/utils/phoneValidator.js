// Universal Phone Number Validation Utility for Frontend
import { COUNTRY_CODES, getCountryByCode } from "./countryPhoneData.js";

export function isFakePattern(rawDigits) {
  if (!rawDigits) return false;
  const digits = String(rawDigits).replace(/\D/g, "");
  if (digits.length < 5) return false;
  return /^(\d)\1+$/.test(digits);
}

/**
 * Validates a phone number based on the selected country dialing code.
 * Rules:
 * 1. ONLY numbers are allowed (no alphabets, no symbols).
 * 2. India (+91): Must be exactly 10 digits (starts with 6, 7, 8, 9).
 * 3. Other Countries: Flexible standard international length (6 to 15 digits), only numbers.
 *
 * @param {string} dialCode - Country dial code (e.g. "+91", "+1", "+971", "IN", etc.)
 * @param {string} phoneInput - The user's input phone number
 * @returns {{ valid: boolean, isValid: boolean, reason: string, message: string, formatted: string, e164: string, country: object, badgeType: "warning" | "error" | "success" }}
 */
export function validatePhoneNumber(dialCode = "+91", phoneInput = "") {
  let code = typeof dialCode === "string" ? dialCode : "+91";
  let input = typeof phoneInput === "string" ? phoneInput : "";

  // Handle swapped parameter signature gracefully
  if (!input && typeof dialCode === "string" && dialCode.length >= 6 && !dialCode.startsWith("+")) {
    input = dialCode;
    code = "+91";
  }

  const country = getCountryByCode(code);

  if (!input || !input.trim()) {
    const lenText = country.isIndia ? "10 digits" : "numbers only, min 6 digits";
    return {
      valid: false,
      isValid: false,
      reason: "missing",
      message: `${country.name} phone number is required (${lenText}).`,
      formatted: "",
      e164: "",
      country,
      badgeType: "warning",
    };
  }

  const trimmedInput = input.trim();

  // 1. STRICT ALPHABET CHECK: If any letter is found in the input, fail immediately!
  if (/[a-zA-Z]/.test(trimmedInput)) {
    return {
      valid: false,
      isValid: false,
      reason: "contains_letters",
      message: `❌ Phone number cannot contain alphabets/letters. Only numbers (0-9) are allowed.`,
      formatted: "",
      e164: "",
      country,
      badgeType: "error",
    };
  }

  // 2. STRICT SPECIAL CHARACTER CHECK: Only digits, spaces, and hyphens allowed in raw typing
  if (/[^\d\s\-]/.test(trimmedInput)) {
    return {
      valid: false,
      isValid: false,
      reason: "invalid_characters",
      message: `❌ Phone number cannot contain symbols or special characters. Only numbers (0-9) are allowed.`,
      formatted: "",
      e164: "",
      country,
      badgeType: "error",
    };
  }

  // Extract purely digits
  let digitsOnly = trimmedInput.replace(/\D/g, "");

  if (!digitsOnly) {
    return {
      valid: false,
      isValid: false,
      reason: "missing",
      message: `Please enter a valid phone number with digits only.`,
      formatted: "",
      e164: "",
      country,
      badgeType: "warning",
    };
  }

  // If user typed the country dial code without plus at the beginning, strip it cleanly
  const dialDigits = country.dialCode.replace(/\D/g, "");
  if (country.isIndia && digitsOnly.startsWith(dialDigits) && digitsOnly.length === 12) {
    digitsOnly = digitsOnly.slice(dialDigits.length);
  }

  // 3. Fake pattern check (e.g. 0000000000, 1111111111)
  if (isFakePattern(digitsOnly)) {
    return {
      valid: false,
      isValid: false,
      reason: "fake_pattern",
      message: `Please enter a real phone number (repetitive numbers detected).`,
      formatted: `${country.dialCode} ${digitsOnly}`,
      e164: `${country.dialCode}${digitsOnly}`,
      country,
      badgeType: "error",
    };
  }

  const len = digitsOnly.length;

  // 4. INDIA SPECIFIC VALIDATION: EXACTLY 10 DIGITS (starts with 6, 7, 8, or 9)
  if (country.isIndia || country.dialCode === "+91" || country.code === "IN") {
    if (len < 10) {
      return {
        valid: false,
        isValid: false,
        reason: "too_short",
        message: `⚠️ Indian phone number must be exactly 10 digits (${len}/10 entered).`,
        formatted: `${country.dialCode} ${digitsOnly}`,
        e164: `${country.dialCode}${digitsOnly}`,
        country,
        badgeType: "warning",
      };
    }

    if (len > 10) {
      return {
        valid: false,
        isValid: false,
        reason: "too_long",
        message: `❌ Indian phone number cannot exceed 10 digits (${len} entered).`,
        formatted: `${country.dialCode} ${digitsOnly}`,
        e164: `${country.dialCode}${digitsOnly}`,
        country,
        badgeType: "error",
      };
    }

    if (!/^[6-9]/.test(digitsOnly)) {
      return {
        valid: false,
        isValid: false,
        reason: "invalid_prefix",
        message: `❌ Indian mobile numbers must start with 6, 7, 8, or 9.`,
        formatted: `${country.dialCode} ${digitsOnly}`,
        e164: `${country.dialCode}${digitsOnly}`,
        country,
        badgeType: "error",
      };
    }

    const formatted = `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
    return {
      valid: true,
      isValid: true,
      reason: "valid",
      message: `✓ Valid India (+91) phone number (10 digits).`,
      formatted,
      e164: `+91${digitsOnly}`,
      country,
      badgeType: "success",
    };
  }

  // 5. OTHER COUNTRIES: Flexible international digit length (between 6 and 15 digits, numbers only)
  if (len < 6) {
    return {
      valid: false,
      isValid: false,
      reason: "too_short",
      message: `⚠️ ${country.name} phone number must be at least 6 digits (${len} entered).`,
      formatted: `${country.dialCode} ${digitsOnly}`,
      e164: `${country.dialCode}${digitsOnly}`,
      country,
      badgeType: "warning",
    };
  }

  if (len > 15) {
    return {
      valid: false,
      isValid: false,
      reason: "too_long",
      message: `❌ ${country.name} phone number cannot exceed 15 digits (${len} entered).`,
      formatted: `${country.dialCode} ${digitsOnly}`,
      e164: `${country.dialCode}${digitsOnly}`,
      country,
      badgeType: "error",
    };
  }

  return {
    valid: true,
    isValid: true,
    reason: "valid",
    message: `✓ Valid ${country.name} (${country.dialCode}) phone number (${len} digits).`,
    formatted: `${country.dialCode} ${digitsOnly}`,
    e164: `${country.dialCode}${digitsOnly}`,
    country,
    badgeType: "success",
  };
}
