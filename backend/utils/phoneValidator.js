// Enhanced Phone Number Validation Utility for Node.js (Backend)
// Uses libphonenumber-js for ITU structure validation and custom algorithms to detect fake/spam patterns.

const { parsePhoneNumberWithError, isValidPhoneNumber } = require("libphonenumber-js");

/**
 * Detects fake or unrealistic phone number patterns.
 * Checks for all-same digits, ascending/descending sequences, and repeating blocks.
 * @param {string} rawDigits - Numeric digits of national number or full number
 * @returns {boolean} true if fake pattern is detected
 */
function isFakePattern(rawDigits) {
  if (!rawDigits) return false;
  const digits = rawDigits.replace(/\D/g, "");
  if (digits.length < 5) return false;

  // 1. All Digits Same (e.g., 0000000000, 1111111111, 9999999999)
  if (/^(\d)\1+$/.test(digits)) {
    return true;
  }

  // 2. Sequential Numbers (Ascending & Descending)
  // Check if string contains or matches contiguous ascending/descending sequences
  const testStr = digits.length > 10 ? digits.slice(-10) : digits;
  
  const isAscending = "01234567890123456789".includes(testStr);
  if (isAscending && testStr.length >= 6) return true;

  const isDescending = "98765432109876543210".includes(testStr);
  if (isDescending && testStr.length >= 6) return true;

  let ascDiffCount = 0;
  let descDiffCount = 0;
  for (let i = 1; i < digits.length; i++) {
    const prev = parseInt(digits[i - 1], 10);
    const curr = parseInt(digits[i], 10);
    if ((curr - prev + 10) % 10 === 1) ascDiffCount++;
    if ((prev - curr + 10) % 10 === 1) descDiffCount++;
  }
  if (ascDiffCount === digits.length - 1 || descDiffCount === digits.length - 1) {
    return true;
  }

  // 3. Repeating Patterns (e.g., 1212121212, 1010101010, 123123123, 100100100)
  // Repeated 2-digit patterns
  if (/^(\d{2})\1{2,}$/.test(digits)) return true;

  // Repeated 3-digit patterns
  if (/^(\d{3})\1{2,}$/.test(digits)) return true;

  // Repeated 4-digit patterns
  if (/^(\d{4})\1{1,}$/.test(digits)) return true;

  // General repetition check: small block (1 to 4 digits) repeating to cover whole string
  if (/^(\d{1,4})\1{2,}$/.test(digits)) return true;

  return false;
}

/**
 * Validates a phone number using libphonenumber-js and fake pattern detection.
 * @param {string} phone - International format phone string (e.g., "+919876543210", "+12025550143") or (dialCode, number)
 * @param {string} [defaultCountry] - Optional ISO country code fallback (e.g., "IN", "US")
 * @returns {{ valid: boolean, reason: "invalid_format" | "fake_pattern" | "valid", message: string, formatted?: string, country?: string }}
 */
function validatePhoneNumber(phone, defaultCountry = "IN") {
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return {
      valid: false,
      reason: "invalid_format",
      message: "Please enter a valid phone number",
    };
  }

  let formattedInput = phone.trim();

  // Ensure string starts with '+' if user entered international code without '+'
  if (!formattedInput.startsWith("+") && /^\d{10,15}$/.test(formattedInput.replace(/\D/g, ""))) {
    formattedInput = "+" + formattedInput;
  }

  try {
    // 1. Basic Structure Validation using libphonenumber-js
    const parsedNumber = parsePhoneNumberWithError(formattedInput, defaultCountry);

    if (!parsedNumber || !parsedNumber.isValid()) {
      return {
        valid: false,
        reason: "invalid_format",
        message: "Please enter a valid phone number",
      };
    }

    // Extract national number digits for pattern checking
    const nationalDigits = parsedNumber.nationalNumber ? parsedNumber.nationalNumber.toString() : "";
    const fullDigits = parsedNumber.number ? parsedNumber.number.toString().replace(/\D/g, "") : "";

    // 2. Block Fake Patterns
    if (isFakePattern(nationalDigits) || isFakePattern(fullDigits)) {
      // Security logging (internal analysis only)
      console.warn(`[Phone Validation Security] Rejected fake phone pattern: ${formattedInput} (Country: ${parsedNumber.country})`);
      return {
        valid: false,
        reason: "fake_pattern",
        message: "This number appears invalid. Please use a real number",
      };
    }

    return {
      valid: true,
      reason: "valid",
      message: "Valid phone number",
      formatted: parsedNumber.formatInternational(), // e.g. "+91 98765 43210"
      e164: parsedNumber.number, // e.g. "+919876543210"
      country: parsedNumber.country,
    };
  } catch (err) {
    return {
      valid: false,
      reason: "invalid_format",
      message: "Please enter a valid phone number",
    };
  }
}

module.exports = {
  validatePhoneNumber,
  isFakePattern,
};
