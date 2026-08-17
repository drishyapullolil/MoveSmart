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
 * Rules for valid Passport (Strict 8 characters total):
 * 1. Option A: 1 uppercase letter followed by 7 digits (e.g. Z1234567, A9876543)
 * 2. Option B: 2 uppercase letters followed by 6 digits (e.g. AB123456, KL987654)
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

  // Exact 8-character length check
  if (clean.length < 8) {
    return {
      valid: false,
      reason: "too_short",
      message: `Passport number must be exactly 8 characters (1 letter + 7 digits OR 2 letters + 6 digits). (${clean.length}/8 entered)`,
      badgeType: "error",
    };
  }

  if (clean.length > 8) {
    return {
      valid: false,
      reason: "too_long",
      message: `Passport number cannot exceed 8 characters (1 letter + 7 digits OR 2 letters + 6 digits).`,
      badgeType: "error",
    };
  }

  // Must start with at least 1 uppercase letter
  if (!/^[A-Z]/.test(clean)) {
    return {
      valid: false,
      reason: "invalid_prefix",
      message: "Passport number must start with 1 or 2 letters (e.g. Z1234567 or AB123456).",
      badgeType: "error",
    };
  }

  // Check 1 letter + 7 digits OR 2 letters + 6 digits
  const isOneLetterSevenDigits = /^[A-Z][0-9]{7}$/.test(clean);
  const isTwoLettersSixDigits = /^[A-Z]{2}[0-9]{6}$/.test(clean);

  if (!isOneLetterSevenDigits && !isTwoLettersSixDigits) {
    return {
      valid: false,
      reason: "invalid_format",
      message: "Passport format must be 1 letter + 7 digits (e.g. Z1234567) or 2 letters + 6 digits (e.g. AB123456).",
      badgeType: "error",
    };
  }

  // Check for fake repetitive digit patterns
  const numericPart = clean.replace(/^[A-Z]+/, "");
  if (/^(\d)\1+$/.test(numericPart)) {
    return {
      valid: false,
      reason: "fake_pattern",
      message: "Please enter a real valid passport number (repetitive digits detected).",
      badgeType: "error",
    };
  }

  const formatDescription = isOneLetterSevenDigits ? "1 letter + 7 digits" : "2 letters + 6 digits";

  return {
    valid: true,
    reason: "valid_passport",
    message: `✓ Valid Passport Number (${clean} - ${formatDescription})`,
    badgeType: "success",
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

  const rawInput = idNumber;
  const clean = idNumber.trim();

  // 1. Foreigner / Passport Number (Strict 8-character format)
  if (category === "Foreigner") {
    return validatePassportNumber(clean);
  }

  // 2. Student Roll / ID Number (NUMBERS ONLY, NO SPACES)
  if (category === "Student") {
    if (/\s/.test(rawInput)) {
      return { valid: false, message: "❌ Spaces are not allowed in Student Roll / ID Number.", badgeType: "error" };
    }
    if (/[a-zA-Z]/.test(rawInput)) {
      return { valid: false, message: "❌ Alphabets are not allowed. Student Roll / ID Number must contain numbers only (0-9).", badgeType: "error" };
    }
    if (!/^\d+$/.test(clean)) {
      return { valid: false, message: "❌ Student Roll / ID Number must contain numbers only (digits 0-9).", badgeType: "error" };
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

  // 3. Government ID Number (STRICTLY NO SPACES, NO ALPHABETS, DIGITS ONLY)
  if (/\s/.test(rawInput)) {
    return {
      valid: false,
      message: "❌ Spaces are not allowed in Government ID Number. Enter continuous digits only.",
      badgeType: "error",
    };
  }

  if (/[a-zA-Z]/.test(rawInput)) {
    return {
      valid: false,
      message: "❌ Alphabets are not allowed. Government ID Number must contain numbers only (0-9).",
      badgeType: "error",
    };
  }

  if (!/^\d+$/.test(clean)) {
    return {
      valid: false,
      message: "❌ Government ID Number must contain numbers only (digits 0-9). Special characters are not allowed.",
      badgeType: "error",
    };
  }

  if (clean.length < 6) {
    return {
      valid: false,
      message: `⚠️ Government ID Number must be at least 6 digits long (${clean.length} entered).`,
      badgeType: "error",
    };
  }

  if (clean.length > 16) {
    return {
      valid: false,
      message: `❌ Government ID Number cannot exceed 16 digits (${clean.length} entered).`,
      badgeType: "error",
    };
  }

  if (/^(\d)\1+$/.test(clean)) {
    return {
      valid: false,
      message: "❌ Please enter a real valid numeric Government ID Number.",
      badgeType: "error",
    };
  }

  if (clean.length === 12) {
    return {
      valid: true,
      message: "✓ Valid 12-Digit Aadhaar / Government ID Number",
      badgeType: "success",
    };
  }

  return {
    valid: true,
    message: `✓ Valid Government ID Number (${clean})`,
    badgeType: "success",
  };
}

/**
 * Validates street or house address.
 * Rules:
 * - No spaces allowed.
 * - Allowed characters: Alphabets (A-Z, a-z), Numbers (0-9), Parentheses (), and Comma (,).
 * - Other special characters are not allowed.
 * - Must contain at least one alphabet (cannot be only numbers or symbols).
 * - Minimum 2 characters.
 *
 * @param {string} street
 * @returns {{ valid: boolean, message: string, badgeType?: "warning" | "error" | "success" }}
 */
export function validateStreet(street) {
  if (!street || typeof street !== "string" || !street.trim()) {
    return { valid: false, message: "Street / House Name is required.", badgeType: "warning" };
  }

  const raw = street;
  const clean = street.trim();

  // 1. Strictly NO spaces
  if (/\s/.test(raw)) {
    return {
      valid: false,
      message: "❌ Spaces are not allowed in Street / House Name.",
      badgeType: "error",
    };
  }

  // 2. Only allow A-Z, a-z, 0-9, '(', ')', and ','
  if (/[^A-Za-z0-9(),]/.test(clean)) {
    return {
      valid: false,
      message: "❌ Only letters, numbers, parentheses (), and commas (,) are allowed.",
      badgeType: "error",
    };
  }

  // 3. Must contain at least one alphabet (not only numbers/symbols)
  if (!/[A-Za-z]/.test(clean)) {
    return {
      valid: false,
      message: "❌ Street / House Name must contain alphabetic letters.",
      badgeType: "error",
    };
  }

  // 4. Minimum length check
  if (clean.length < 2) {
    return {
      valid: false,
      message: "⚠️ Street / House Name must be at least 2 characters long.",
      badgeType: "error",
    };
  }

  return {
    valid: true,
    message: `✓ Valid Street / House Name (${clean})`,
    badgeType: "success",
  };
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
