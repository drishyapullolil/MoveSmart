// Enhanced Phone Number Validation Utility for React (Frontend)
// Uses libphonenumber-js for ITU structure validation and custom algorithms to detect fake/spam patterns.

import { parsePhoneNumberWithError } from "libphonenumber-js";
import { getCountryByCode } from "./countryPhoneData.js";

/**
 * Detects fake or unrealistic phone number patterns.
 * Checks for all-same digits, ascending/descending sequences, and repeating blocks.
 * @param {string} rawDigits - Numeric digits of national number or full number
 * @returns {boolean} true if fake pattern is detected
 */
export function isFakePattern(rawDigits) {
  if (!rawDigits) return false;
  const digits = rawDigits.replace(/\D/g, "");
  if (digits.length < 5) return false;

  // 1. All Digits Same (e.g., 0000000000, 1111111111, 9999999999)
  if (/^(\d)\1+$/.test(digits)) {
    return true;
  }

  // 2. Sequential Numbers (Ascending & Descending)
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
  if (/^(\d{2})\1{2,}$/.test(digits)) return true;
  if (/^(\d{3})\1{2,}$/.test(digits)) return true;
  if (/^(\d{4})\1{1,}$/.test(digits)) return true;
  if (/^(\d{1,4})\1{2,}$/.test(digits)) return true;

  return false;
}

/**
 * Validates a phone number using libphonenumber-js and fake pattern detection algorithms.
 * @param {string} dialCode - Dial code prefix e.g. "+91" or "+1"
 * @param {string} phoneInput - Local phone digits input e.g. "9847012345" or full string "+919847012345"
 * @returns {{ valid: boolean, reason: "invalid_format" | "fake_pattern" | "valid", message: string, formatted?: string, country?: string, badgeType: "success" | "warning" | "error" }}
 */
export function validatePhoneNumber(dialCode, phoneInput) {
  const country = getCountryByCode(dialCode);
  
  if (!phoneInput || !phoneInput.trim()) {
    return {
      valid: false,
      reason: "invalid_format",
      digits: "",
      formatted: "",
      message: "Please enter a valid phone number",
      badgeType: "warning",
    };
  }

  const rawDigits = phoneInput.replace(/\D/g, "");

  // Combine dial code and phone input if dialCode provided
  let fullPhone = phoneInput.trim();
  if (dialCode && !fullPhone.startsWith("+")) {
    fullPhone = `${dialCode}${rawDigits}`;
  } else if (!fullPhone.startsWith("+")) {
    fullPhone = `+${rawDigits}`;
  }

  try {
    // 1. Structure Validation using libphonenumber-js
    const parsedNumber = parsePhoneNumberWithError(fullPhone, country?.code || "IN");

    if (!parsedNumber || !parsedNumber.isValid()) {
      return {
        valid: false,
        reason: "invalid_format",
        message: "Please enter a valid phone number",
        badgeType: "error",
      };
    }

    const nationalDigits = parsedNumber.nationalNumber ? parsedNumber.nationalNumber.toString() : "";
    const fullDigits = parsedNumber.number ? parsedNumber.number.toString().replace(/\D/g, "") : "";

    // 2. Fake Pattern Detection
    if (isFakePattern(nationalDigits) || isFakePattern(fullDigits)) {
      return {
        valid: false,
        reason: "fake_pattern",
        message: "This number appears invalid. Please use a real number",
        badgeType: "error",
      };
    }

    return {
      valid: true,
      reason: "valid",
      message: `✓ Valid ${country?.name || parsedNumber.country} phone number format`,
      formatted: parsedNumber.formatInternational(),
      e164: parsedNumber.number,
      country: parsedNumber.country,
      badgeType: "success",
    };
  } catch (err) {
    return {
      valid: false,
      reason: "invalid_format",
      message: "Please enter a valid phone number",
      badgeType: "error",
    };
  }
}
