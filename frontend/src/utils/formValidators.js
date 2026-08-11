import { validateName } from "./nameValidator";
import { validatePhoneNumber } from "./phoneValidator";

/**
 * Validates an email address.
 * @param {string} email
 * @returns {{ valid: boolean, message: string }}
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string" || !email.trim()) {
    return { valid: false, message: "Email address is required." };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, message: "Please enter a valid email address (e.g. user@example.com)." };
  }
  return { valid: true, message: "Valid Email Address" };
}

/**
 * Validates a Date of Birth.
 * @param {string} dob - YYYY-MM-DD string
 * @returns {{ valid: boolean, message: string }}
 */
export function validateDob(dob) {
  if (!dob) {
    return { valid: false, message: "Date of Birth is required." };
  }
  const birthDate = new Date(dob);
  const today = new Date();
  if (isNaN(birthDate.getTime())) {
    return { valid: false, message: "Please select a valid Date of Birth." };
  }
  if (birthDate > today) {
    return { valid: false, message: "Date of Birth cannot be in the future." };
  }
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 5) {
    return { valid: false, message: "Applicant must be at least 5 years old to apply for a travel card." };
  }
  if (age > 120) {
    return { valid: false, message: "Please enter a valid Date of Birth." };
  }
  return { valid: true, message: "Valid Date of Birth" };
}

/**
 * Validates a 6-digit Indian PIN code or standard postal code.
 * @param {string} pincode
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePincode(pincode) {
  if (!pincode || typeof pincode !== "string" || !pincode.trim()) {
    return { valid: false, message: "PIN Code is required." };
  }
  const clean = pincode.trim();
  if (!/^\d{6}$/.test(clean)) {
    return { valid: false, message: "PIN Code must be a valid 6-digit number (e.g. 682001)." };
  }
  return { valid: true, message: "Valid PIN Code" };
}

/**
 * Validates city or district names (minimum 2 chars, letters and spaces only).
 * @param {string} locationName
 * @param {string} fieldTitle
 * @returns {{ valid: boolean, message: string }}
 */
export function validateLocationName(locationName, fieldTitle = "Field") {
  if (!locationName || typeof locationName !== "string" || !locationName.trim()) {
    return { valid: false, message: `${fieldTitle} is required.` };
  }
  const trimmed = locationName.trim();
  if (trimmed.length < 2) {
    return { valid: false, message: `${fieldTitle} must be at least 2 characters long.` };
  }
  if (/\d/.test(trimmed)) {
    return { valid: false, message: `${fieldTitle} cannot contain numbers.` };
  }
  return { valid: true, message: `Valid ${fieldTitle}` };
}

/**
 * Validates School / College / Institution Name (minimum 2 chars, NO NUMBERS allowed).
 * @param {string} name
 * @returns {{ valid: boolean, message: string, badgeType?: "warning" | "error" | "success" }}
 */
export function validateInstitutionName(name) {
  if (!name || typeof name !== "string" || !name.trim()) {
    return { valid: false, message: "School / College / Institution Name is required.", badgeType: "warning" };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, message: "Institution Name must be at least 2 characters long.", badgeType: "error" };
  }
  if (/\d/.test(trimmed)) {
    return { valid: false, message: "Institution Name cannot contain numbers (letters only).", badgeType: "error" };
  }
  return { valid: true, message: "✓ Valid Institution Name", badgeType: "success" };
}

/**
 * Real-time Passport Number Validation
 * Rules for valid Passport:
 * 1. Must be 6 to 12 alphanumeric characters (no spaces or special symbols).
 * 2. Standard Indian Passport: 8 characters starting with 1 letter (A-Z) followed by 7 digits (e.g. Z1234567, A9876543).
 * 3. International Passports: 6-12 alphanumeric characters.
 * 4. Fake pattern protection: blocks repetitive letters/digits like AAAAAAAA, 11111111, 00000000, 12345678.
 *
 * @param {string} passportNumber
 * @returns {{ valid: boolean, reason: string, message: string, badgeType: "warning" | "error" | "success" }}
 */
export function validatePassportNumber(passportNumber) {
  if (!passportNumber || typeof passportNumber !== "string" || !passportNumber.trim()) {
    return {
      valid: false,
      reason: "missing_passport",
      message: "Passport Number is required.",
      badgeType: "warning",
    };
  }

  const clean = passportNumber.trim().toUpperCase();

  // Check for spaces or special characters
  if (/[^A-Z0-9]/.test(clean)) {
    return {
      valid: false,
      reason: "invalid_chars",
      message: "Passport number must contain only letters and digits (no spaces or symbols).",
      badgeType: "error",
    };
  }

  // Length check
  if (clean.length < 6) {
    return {
      valid: false,
      reason: "too_short",
      message: "Passport number must be at least 6 characters long.",
      badgeType: "error",
    };
  }

  if (clean.length > 12) {
    return {
      valid: false,
      reason: "too_long",
      message: "Passport number cannot exceed 12 characters.",
      badgeType: "error",
    };
  }

  // Check for fake/spam repetitive patterns (e.g. AAAAAAA, 11111111, 00000000)
  if (/^(\w)\1+$/.test(clean)) {
    return {
      valid: false,
      reason: "fake_pattern",
      message: "This appears to be a fake or repetitive passport number.",
      badgeType: "error",
    };
  }

  // Check for sequential patterns (e.g. 12345678, ABCDEFGH)
  if ("01234567890123456789".includes(clean) || "ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(clean)) {
    return {
      valid: false,
      reason: "fake_pattern",
      message: "Please enter a real valid passport number.",
      badgeType: "error",
    };
  }

  // Standard Indian Passport format (1 uppercase letter + 7 digits)
  if (/^[A-Z][0-9]{7}$/.test(clean)) {
    return {
      valid: true,
      reason: "valid_indian_passport",
      message: "✓ Valid Passport Number (Standard 8-Char Format)",
      badgeType: "success",
    };
  }

  // General International Passport format (6-12 alphanumeric)
  if (/^[A-Z0-9]{6,12}$/.test(clean)) {
    return {
      valid: true,
      reason: "valid_passport",
      message: "✓ Valid International Passport Number",
      badgeType: "success",
    };
  }

  return {
    valid: false,
    reason: "invalid_format",
    message: "Invalid passport format. Enter 6-12 alphanumeric characters (e.g. Z1234567).",
    badgeType: "error",
  };
}

/**
 * Validates government ID or passport number depending on pass category.
 * @param {string} idNumber
 * @param {string} category
 * @returns {{ valid: boolean, message: string, badgeType?: "warning" | "error" | "success" }}
 */
export function validateIdNumber(idNumber, category = "Regular") {
  if (!idNumber || typeof idNumber !== "string" || !idNumber.trim()) {
    const label = category === "Foreigner" ? "Passport Number" : category === "Student" ? "Student Roll / ID Number" : "Government ID Number";
    return { valid: false, message: `${label} is required.`, badgeType: "warning" };
  }

  const clean = idNumber.trim();

  // 1. Foreigner / Passport Number (Alphanumeric 6-12 chars)
  if (category === "Foreigner") {
    return validatePassportNumber(clean);
  }

  // 2. Student Roll / ID Number (NUMBERS ONLY)
  if (category === "Student") {
    if (!/^\d+$/.test(clean)) {
      return { valid: false, message: "Student Roll / ID Number must contain numbers only (digits 0-9).", badgeType: "error" };
    }
    if (clean.length < 4) {
      return { valid: false, message: "Student Roll / ID Number must be at least 4 digits long.", badgeType: "error" };
    }
    if (clean.length > 15) {
      return { valid: false, message: "Student Roll / ID Number cannot exceed 15 digits.", badgeType: "error" };
    }
    if (/^(\d)\1+$/.test(clean)) {
      return { valid: false, message: "Please enter a valid numeric Student Roll / ID Number.", badgeType: "error" };
    }
    return { valid: true, message: "✓ Valid Numeric Student Roll / ID Number", badgeType: "success" };
  }

  // 3. Government ID Number / Aadhaar / DL (NUMBERS ONLY)
  if (category === "Regular") {
    const digitsOnly = clean.replace(/\s/g, "");
    if (!/^\d+$/.test(digitsOnly)) {
      return { valid: false, message: "Government ID Number must contain numbers only (digits 0-9).", badgeType: "error" };
    }
    if (digitsOnly.length < 6) {
      return { valid: false, message: "Government ID Number must be at least 6 digits long.", badgeType: "error" };
    }
    if (digitsOnly.length > 16) {
      return { valid: false, message: "Government ID Number cannot exceed 16 digits.", badgeType: "error" };
    }
    if (/^(\d)\1+$/.test(digitsOnly)) {
      return { valid: false, message: "Please enter a valid numeric Government ID Number.", badgeType: "error" };
    }
    if (digitsOnly.length === 12) {
      return { valid: true, message: "✓ Valid 12-Digit Aadhaar Number", badgeType: "success" };
    }
    return { valid: true, message: "✓ Valid Numeric Government ID Number", badgeType: "success" };
  }

  return { valid: true, message: "✓ Valid ID Number", badgeType: "success" };
}

/**
 * Validates street or house address.
 * @param {string} street
 * @returns {{ valid: boolean, message: string }}
 */
export function validateStreet(street) {
  if (!street || typeof street !== "string" || !street.trim()) {
    return { valid: false, message: "Street / House Name is required." };
  }
  if (street.trim().length < 3) {
    return { valid: false, message: "Street / House Name must be at least 3 characters long." };
  }
  return { valid: true, message: "Valid Street Address" };
}

/**
 * Validates Driving License Number.
 * @param {string} licenseNumber
 * @returns {{ valid: boolean, message: string, badgeType?: "warning" | "error" | "success" }}
 */
export function validateDrivingLicense(licenseNumber) {
  if (!licenseNumber || typeof licenseNumber !== "string" || !licenseNumber.trim()) {
    return { valid: false, message: "Driving License Number is required.", badgeType: "warning" };
  }
  const clean = licenseNumber.trim().toUpperCase();
  if (clean.length < 8) {
    return { valid: false, message: "Driving License Number must be at least 8 characters long.", badgeType: "error" };
  }
  if (clean.length > 20) {
    return { valid: false, message: "Driving License Number cannot exceed 20 characters.", badgeType: "error" };
  }
  if (!/^[A-Z0-9\s/-]+$/i.test(clean)) {
    return { valid: false, message: "Driving License contains invalid characters.", badgeType: "error" };
  }
  if (/^(\w)\1+$/.test(clean.replace(/[\s/-]/g, ""))) {
    return { valid: false, message: "Please enter a valid Driving License Number.", badgeType: "error" };
  }
  return { valid: true, message: "✓ Valid Driving License Number", badgeType: "success" };
}

/**
 * Validates Years of Driving Experience.
 * @param {string|number} exp
 * @returns {{ valid: boolean, message: string, badgeType?: "warning" | "error" | "success" }}
 */
export function validateExperienceYears(exp) {
  if (exp === undefined || exp === null || String(exp).trim() === "") {
    return { valid: false, message: "Years of Experience is required.", badgeType: "warning" };
  }
  const num = Number(exp);
  if (isNaN(num) || !Number.isInteger(num)) {
    return { valid: false, message: "Experience must be a valid whole number.", badgeType: "error" };
  }
  if (num < 0) {
    return { valid: false, message: "Experience cannot be a negative number.", badgeType: "error" };
  }
  if (num > 50) {
    return { valid: false, message: "Experience cannot exceed 50 years.", badgeType: "error" };
  }
  return { valid: true, message: "✓ Valid Experience Level", badgeType: "success" };
}
