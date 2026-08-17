// Universal Phone Number Validation Utility for Backend

const COUNTRY_CODES = [
  { code: "IN", name: "India", dialCode: "+91", isIndia: true, minLength: 10, maxLength: 10 },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", minLength: 6, maxLength: 15 },
  { code: "US", name: "United States", dialCode: "+1", minLength: 6, maxLength: 15 },
  { code: "GB", name: "United Kingdom", dialCode: "+44", minLength: 6, maxLength: 15 },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", minLength: 6, maxLength: 15 },
  { code: "QA", name: "Qatar", dialCode: "+974", minLength: 6, maxLength: 15 },
  { code: "OM", name: "Oman", dialCode: "+968", minLength: 6, maxLength: 15 },
  { code: "KW", name: "Kuwait", dialCode: "+965", minLength: 6, maxLength: 15 },
  { code: "BH", name: "Bahrain", dialCode: "+973", minLength: 6, maxLength: 15 },
  { code: "SG", name: "Singapore", dialCode: "+65", minLength: 6, maxLength: 15 },
  { code: "CA", name: "Canada", dialCode: "+1", minLength: 6, maxLength: 15 },
  { code: "AU", name: "Australia", dialCode: "+61", minLength: 6, maxLength: 15 },
  { code: "DE", name: "Germany", dialCode: "+49", minLength: 6, maxLength: 15 },
  { code: "FR", name: "France", dialCode: "+33", minLength: 6, maxLength: 15 },
  { code: "JP", name: "Japan", dialCode: "+81", minLength: 6, maxLength: 15 },
  { code: "CN", name: "China", dialCode: "+86", minLength: 6, maxLength: 15 },
  { code: "MY", name: "Malaysia", dialCode: "+60", minLength: 6, maxLength: 15 },
  { code: "NP", name: "Nepal", dialCode: "+977", minLength: 6, maxLength: 15 },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", minLength: 6, maxLength: 15 },
  { code: "PK", name: "Pakistan", dialCode: "+92", minLength: 6, maxLength: 15 },
  { code: "BD", name: "Bangladesh", dialCode: "+880", minLength: 6, maxLength: 15 },
  { code: "PH", name: "Philippines", dialCode: "+63", minLength: 6, maxLength: 15 },
  { code: "ZA", name: "South Africa", dialCode: "+27", minLength: 6, maxLength: 15 },
  { code: "NG", name: "Nigeria", dialCode: "+234", minLength: 6, maxLength: 15 },
  { code: "BR", name: "Brazil", dialCode: "+55", minLength: 6, maxLength: 15 },
  { code: "MX", name: "Mexico", dialCode: "+52", minLength: 6, maxLength: 15 },
  { code: "IT", name: "Italy", dialCode: "+39", minLength: 6, maxLength: 15 },
  { code: "ES", name: "Spain", dialCode: "+34", minLength: 6, maxLength: 15 },
  { code: "NL", name: "Netherlands", dialCode: "+31", minLength: 6, maxLength: 15 },
  { code: "NZ", name: "New Zealand", dialCode: "+64", minLength: 6, maxLength: 15 },
  { code: "IE", name: "Ireland", dialCode: "+353", minLength: 6, maxLength: 15 },
  { code: "KR", name: "South Korea", dialCode: "+82", minLength: 6, maxLength: 15 },
  { code: "ID", name: "Indonesia", dialCode: "+62", minLength: 6, maxLength: 15 },
  { code: "TH", name: "Thailand", dialCode: "+66", minLength: 6, maxLength: 15 },
  { code: "VN", name: "Vietnam", dialCode: "+84", minLength: 6, maxLength: 15 },
  { code: "EG", name: "Egypt", dialCode: "+20", minLength: 6, maxLength: 15 },
  { code: "KE", name: "Kenya", dialCode: "+254", minLength: 6, maxLength: 15 },
  { code: "RU", name: "Russia", dialCode: "+7", minLength: 6, maxLength: 15 },
  { code: "TR", name: "Turkey", dialCode: "+90", minLength: 6, maxLength: 15 },
  { code: "CH", name: "Switzerland", dialCode: "+41", minLength: 6, maxLength: 15 },
  { code: "SE", name: "Sweden", dialCode: "+46", minLength: 6, maxLength: 15 },
];

function getCountryByCode(dialOrIsoCode) {
  if (!dialOrIsoCode) return COUNTRY_CODES[0];
  const clean = String(dialOrIsoCode).trim();
  return (
    COUNTRY_CODES.find(
      (c) => c.dialCode === clean || c.code.toUpperCase() === clean.toUpperCase()
    ) || {
      code: "INTL",
      name: "International",
      dialCode: clean.startsWith("+") ? clean : `+${clean}`,
      minLength: 6,
      maxLength: 15,
      isIndia: false,
    }
  );
}

function isFakePattern(rawDigits) {
  if (!rawDigits) return false;
  const digits = String(rawDigits).replace(/\D/g, "");
  if (digits.length < 5) return false;
  return /^(\d)\1+$/.test(digits);
}

function validatePhoneNumber(arg1 = "+91", arg2 = "") {
  let dialCode = typeof arg1 === "string" ? arg1 : "+91";
  let phoneInput = typeof arg2 === "string" ? arg2 : "";

  // Single argument handler
  if (!phoneInput && dialCode) {
    if (dialCode.startsWith("+")) {
      const match = COUNTRY_CODES.find((c) => dialCode.startsWith(c.dialCode));
      if (match) {
        phoneInput = dialCode.slice(match.dialCode.length);
        dialCode = match.dialCode;
      } else {
        phoneInput = dialCode;
        dialCode = "+91";
      }
    } else {
      phoneInput = dialCode;
      dialCode = "+91";
    }
  }

  const country = getCountryByCode(dialCode);

  if (!phoneInput || !phoneInput.trim()) {
    const lenText = country.isIndia ? "10 digits" : "numbers only, min 6 digits";
    return {
      valid: false,
      isValid: false,
      reason: "missing",
      message: `${country.name} phone number is required (${lenText}).`,
      formatted: "",
      e164: "",
      country,
    };
  }

  const trimmedInput = phoneInput.trim();

  // 1. Check if contains alphabets
  if (/[a-zA-Z]/.test(trimmedInput)) {
    return {
      valid: false,
      isValid: false,
      reason: "contains_letters",
      message: `Phone number cannot contain alphabets/letters. Only numbers (0-9) are allowed.`,
      formatted: "",
      e164: "",
      country,
    };
  }

  // 2. Check if contains special characters
  if (/[^\d\s\-]/.test(trimmedInput)) {
    return {
      valid: false,
      isValid: false,
      reason: "invalid_characters",
      message: `Phone number cannot contain symbols or special characters. Only numbers (0-9) are allowed.`,
      formatted: "",
      e164: "",
      country,
    };
  }

  let digitsOnly = trimmedInput.replace(/\D/g, "");

  if (!digitsOnly) {
    return {
      valid: false,
      isValid: false,
      reason: "missing",
      message: `Please enter a valid numeric phone number.`,
      formatted: "",
      e164: "",
      country,
    };
  }

  const dialDigits = country.dialCode.replace(/\D/g, "");
  if (country.isIndia && digitsOnly.startsWith(dialDigits) && digitsOnly.length === 12) {
    digitsOnly = digitsOnly.slice(dialDigits.length);
  }

  // 3. Fake repetitive pattern check
  if (isFakePattern(digitsOnly)) {
    return {
      valid: false,
      isValid: false,
      reason: "fake_pattern",
      message: `Please enter a valid phone number (repetitive digits detected).`,
      formatted: `${country.dialCode} ${digitsOnly}`,
      e164: `${country.dialCode}${digitsOnly}`,
      country,
    };
  }

  const len = digitsOnly.length;

  // 4. India Phone: Exactly 10 digits
  if (country.isIndia || country.dialCode === "+91" || country.code === "IN") {
    if (len < 10) {
      return {
        valid: false,
        isValid: false,
        reason: "too_short",
        message: `Indian phone number must be exactly 10 digits (${len}/10 entered).`,
        formatted: `${country.dialCode} ${digitsOnly}`,
        e164: `${country.dialCode}${digitsOnly}`,
        country,
      };
    }
    if (len > 10) {
      return {
        valid: false,
        isValid: false,
        reason: "too_long",
        message: `Indian phone number cannot exceed 10 digits (${len} entered).`,
        formatted: `${country.dialCode} ${digitsOnly}`,
        e164: `${country.dialCode}${digitsOnly}`,
        country,
      };
    }
    if (!/^[6-9]/.test(digitsOnly)) {
      return {
        valid: false,
        isValid: false,
        reason: "invalid_prefix",
        message: `Indian mobile numbers must start with 6, 7, 8, or 9.`,
        formatted: `${country.dialCode} ${digitsOnly}`,
        e164: `${country.dialCode}${digitsOnly}`,
        country,
      };
    }

    return {
      valid: true,
      isValid: true,
      reason: "valid",
      message: `Valid India (+91) phone number.`,
      formatted: `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`,
      e164: `+91${digitsOnly}`,
      country,
    };
  }

  // 5. Other Countries: Flexible (6-15 digits, numbers only)
  if (len < 6) {
    return {
      valid: false,
      isValid: false,
      reason: "too_short",
      message: `${country.name} phone number must be at least 6 digits (${len} entered).`,
      formatted: `${country.dialCode} ${digitsOnly}`,
      e164: `${country.dialCode}${digitsOnly}`,
      country,
    };
  }

  if (len > 15) {
    return {
      valid: false,
      isValid: false,
      reason: "too_long",
      message: `${country.name} phone number cannot exceed 15 digits.`,
      formatted: `${country.dialCode} ${digitsOnly}`,
      e164: `${country.dialCode}${digitsOnly}`,
      country,
    };
  }

  return {
    valid: true,
    isValid: true,
    reason: "valid",
    message: `Valid ${country.name} (${country.dialCode}) phone number.`,
    formatted: `${country.dialCode} ${digitsOnly}`,
    e164: `${country.dialCode}${digitsOnly}`,
    country,
  };
}

module.exports = {
  validatePhoneNumber,
  isFakePattern,
  COUNTRY_CODES,
  getCountryByCode,
};
