const { validateName } = require("./nameValidator");
const { validatePhoneNumber } = require("./phoneValidator");

function validateEmail(email) {
  if (!email || typeof email !== "string" || !email.trim()) {
    return { valid: false, message: "Email address is required." };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, message: "Please enter a valid email address." };
  }
  return { valid: true };
}

function validateDob(dob) {
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
    return { valid: false, message: "Applicant must be at least 5 years old." };
  }
  return { valid: true };
}

function validatePincode(pincode) {
  if (!pincode || typeof pincode !== "string" || !pincode.trim()) {
    return { valid: false, message: "PIN Code is required." };
  }
  if (!/^\d{6}$/.test(pincode.trim())) {
    return { valid: false, message: "PIN Code must be a valid 6-digit number." };
  }
  return { valid: true };
}

function validateLocationName(locationName, fieldTitle = "Field") {
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
  return { valid: true };
}

function validateInstitutionName(name) {
  if (!name || typeof name !== "string" || !name.trim()) {
    return { valid: false, message: "School / College / Institution Name is required." };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, message: "Institution Name must be at least 2 characters long." };
  }
  if (/\d/.test(trimmed)) {
    return { valid: false, message: "Institution Name cannot contain numbers (letters only)." };
  }
  return { valid: true };
}

function validatePassportNumber(passportNumber) {
  if (!passportNumber || typeof passportNumber !== "string" || !passportNumber.trim()) {
    return {
      valid: false,
      reason: "missing_passport",
      message: "Passport Number is required.",
    };
  }

  const clean = passportNumber.trim().toUpperCase();

  if (/[^A-Z0-9]/.test(clean)) {
    return {
      valid: false,
      reason: "invalid_chars",
      message: "Passport number must contain only letters and digits without spaces or symbols.",
    };
  }

  if (clean.length < 6) {
    return {
      valid: false,
      reason: "too_short",
      message: "Passport number must be at least 6 characters long.",
    };
  }

  if (clean.length > 12) {
    return {
      valid: false,
      reason: "too_long",
      message: "Passport number cannot exceed 12 characters.",
    };
  }

  if (/^(\w)\1+$/.test(clean) || "01234567890123456789".includes(clean) || "ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(clean)) {
    return {
      valid: false,
      reason: "fake_pattern",
      message: "This appears to be a fake or repetitive passport number.",
    };
  }

  if (/^[A-Z0-9]{6,12}$/.test(clean)) {
    return {
      valid: true,
      reason: "valid_passport",
      message: "Valid Passport Number",
    };
  }

  return {
    valid: false,
    reason: "invalid_format",
    message: "Invalid passport format. Enter 6-12 alphanumeric characters.",
  };
}

function validateIdNumber(idNumber, category = "Regular") {
  if (!idNumber || typeof idNumber !== "string" || !idNumber.trim()) {
    const label = category === "Foreigner" ? "Passport Number" : category === "Student" ? "Student Roll / ID Number" : "Government ID Number";
    return { valid: false, message: `${label} is required.` };
  }

  const clean = idNumber.trim();

  // 1. Foreigner / Passport Number (Alphanumeric 6-12 chars)
  if (category === "Foreigner") {
    return validatePassportNumber(clean);
  }

  // 2. Student Roll / ID Number (NUMBERS ONLY)
  if (category === "Student") {
    if (!/^\d+$/.test(clean)) {
      return { valid: false, message: "Student Roll / ID Number must contain numbers only (digits 0-9)." };
    }
    if (clean.length < 4) {
      return { valid: false, message: "Student Roll / ID Number must be at least 4 digits long." };
    }
    if (clean.length > 15) {
      return { valid: false, message: "Student Roll / ID Number cannot exceed 15 digits." };
    }
    if (/^(\d)\1+$/.test(clean)) {
      return { valid: false, message: "Please enter a valid numeric Student Roll / ID Number." };
    }
    return { valid: true };
  }

  // 3. Government ID Number / Aadhaar / DL (NUMBERS ONLY)
  if (category === "Regular") {
    const digitsOnly = clean.replace(/\s/g, "");
    if (!/^\d+$/.test(digitsOnly)) {
      return { valid: false, message: "Government ID Number must contain numbers only (digits 0-9)." };
    }
    if (digitsOnly.length < 6) {
      return { valid: false, message: "Government ID Number must be at least 6 digits long." };
    }
    if (digitsOnly.length > 16) {
      return { valid: false, message: "Government ID Number cannot exceed 16 digits." };
    }
    if (/^(\d)\1+$/.test(digitsOnly)) {
      return { valid: false, message: "Please enter a valid numeric Government ID Number." };
    }
    return { valid: true };
  }

  return { valid: true };
}

function validateStreet(street) {
  if (!street || typeof street !== "string" || !street.trim()) {
    return { valid: false, message: "Street / House Name is required." };
  }
  if (street.trim().length < 3) {
    return { valid: false, message: "Street / House Name must be at least 3 characters long." };
  }
  return { valid: true };
}

function validateDrivingLicense(licenseNumber) {
  if (!licenseNumber || typeof licenseNumber !== "string" || !licenseNumber.trim()) {
    return { valid: false, message: "Driving License Number is required." };
  }
  const clean = licenseNumber.trim().toUpperCase();
  if (clean.length < 8) {
    return { valid: false, message: "Driving License Number must be at least 8 characters long." };
  }
  if (clean.length > 20) {
    return { valid: false, message: "Driving License Number cannot exceed 20 characters." };
  }
  if (!/^[A-Z0-9\s/-]+$/i.test(clean)) {
    return { valid: false, message: "Driving License contains invalid characters." };
  }
  if (/^(\w)\1+$/.test(clean.replace(/[\s/-]/g, ""))) {
    return { valid: false, message: "Please enter a valid Driving License Number." };
  }
  return { valid: true };
}

function validateExperienceYears(exp) {
  if (exp === undefined || exp === null || String(exp).trim() === "") {
    return { valid: false, message: "Years of Experience is required." };
  }
  const num = Number(exp);
  if (isNaN(num) || !Number.isInteger(num)) {
    return { valid: false, message: "Experience must be a valid whole number." };
  }
  if (num < 0) {
    return { valid: false, message: "Experience cannot be a negative number." };
  }
  if (num > 50) {
    return { valid: false, message: "Experience cannot exceed 50 years." };
  }
  return { valid: true };
}

module.exports = {
  validateEmail,
  validateDob,
  validatePincode,
  validateLocationName,
  validateInstitutionName,
  validatePassportNumber,
  validateIdNumber,
  validateStreet,
  validateDrivingLicense,
  validateExperienceYears,
  validateName,
  validatePhoneNumber,
};
