// International Country Phone Data & Real-time Validation Utility

export const COUNTRY_CODES = [
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳", minLength: 10, maxLength: 10, placeholder: "98765 43210" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪", minLength: 9, maxLength: 9, placeholder: "50 123 4567" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸", minLength: 10, maxLength: 10, placeholder: "202 555 0143" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", minLength: 10, maxLength: 10, placeholder: "7911 123456" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦", minLength: 9, maxLength: 9, placeholder: "50 123 4567" },
  { code: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦", minLength: 8, maxLength: 8, placeholder: "3312 3456" },
  { code: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲", minLength: 8, maxLength: 8, placeholder: "9123 4567" },
  { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼", minLength: 8, maxLength: 8, placeholder: "9123 4567" },
  { code: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭", minLength: 8, maxLength: 8, placeholder: "3612 3456" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬", minLength: 8, maxLength: 8, placeholder: "8123 4567" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦", minLength: 10, maxLength: 10, placeholder: "416 555 0192" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺", minLength: 9, maxLength: 9, placeholder: "412 345 678" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪", minLength: 10, maxLength: 11, placeholder: "151 12345678" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷", minLength: 9, maxLength: 9, placeholder: "6 12 34 56 78" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵", minLength: 10, maxLength: 10, placeholder: "90 1234 5678" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳", minLength: 11, maxLength: 11, placeholder: "138 1234 5678" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾", minLength: 9, maxLength: 10, placeholder: "12 345 6789" },
  { code: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵", minLength: 10, maxLength: 10, placeholder: "9841 234567" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰", minLength: 9, maxLength: 9, placeholder: "71 234 5678" },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰", minLength: 10, maxLength: 10, placeholder: "300 1234567" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩", minLength: 10, maxLength: 10, placeholder: "1712 345678" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭", minLength: 10, maxLength: 10, placeholder: "917 123 4567" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦", minLength: 9, maxLength: 9, placeholder: "82 123 4567" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬", minLength: 10, maxLength: 10, placeholder: "803 123 4567" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷", minLength: 10, maxLength: 11, placeholder: "11 91234 5678" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽", minLength: 10, maxLength: 10, placeholder: "55 1234 5678" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹", minLength: 9, maxLength: 10, placeholder: "312 345 6789" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸", minLength: 9, maxLength: 9, placeholder: "612 34 56 78" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱", minLength: 9, maxLength: 9, placeholder: "6 12345678" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿", minLength: 8, maxLength: 9, placeholder: "21 123 4567" },
  { code: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪", minLength: 9, maxLength: 9, placeholder: "87 123 4567" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷", minLength: 9, maxLength: 10, placeholder: "10 1234 5678" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩", minLength: 9, maxLength: 12, placeholder: "812 3456 7890" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭", minLength: 9, maxLength: 9, placeholder: "81 234 5678" },
  { code: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳", minLength: 9, maxLength: 10, placeholder: "91 234 56 78" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬", minLength: 10, maxLength: 10, placeholder: "100 123 4567" },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪", minLength: 9, maxLength: 9, placeholder: "712 345678" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺", minLength: 10, maxLength: 10, placeholder: "912 345 6789" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷", minLength: 10, maxLength: 10, placeholder: "512 345 6789" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭", minLength: 9, maxLength: 9, placeholder: "79 123 45 67" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪", minLength: 9, maxLength: 9, placeholder: "70 123 45 67" },
];

/**
 * Finds country metadata by dial code or ISO code.
 */
export function getCountryByCode(dialOrIsoCode) {
  if (!dialOrIsoCode) return COUNTRY_CODES[0]; // Default India
  return (
    COUNTRY_CODES.find(
      (c) => c.dialCode === dialOrIsoCode || c.code.toUpperCase() === dialOrIsoCode.toUpperCase()
    ) || COUNTRY_CODES[0]
  );
}

/**
 * Real-time ("ontime") phone number validation.
 * Returns an object with validation status, message, digits, and formatted output.
 */
export function validatePhoneNumber(dialCode, phoneInput) {
  const country = getCountryByCode(dialCode);
  if (!phoneInput || !phoneInput.trim()) {
    return {
      isValid: false,
      isEmpty: true,
      digits: "",
      formatted: "",
      message: `Phone number required for ${country.name} (${country.dialCode}).`,
      badgeType: "warning",
    };
  }

  // Extract numeric digits only
  const digits = phoneInput.replace(/\D/g, "");

  // Check if non-digits were entered
  const containsLetters = /[a-zA-Z]/.test(phoneInput);
  if (containsLetters) {
    return {
      isValid: false,
      isEmpty: false,
      digits,
      formatted: `${country.dialCode} ${digits}`,
      message: `❌ Invalid characters detected. Please enter numbers only.`,
      badgeType: "error",
    };
  }

  const length = digits.length;
  if (length < country.minLength) {
    const remaining = country.minLength - length;
    return {
      isValid: false,
      isEmpty: false,
      digits,
      formatted: `${country.dialCode} ${digits}`,
      message: `⚠️ Too short for ${country.name} (${country.dialCode}). Need ${country.minLength} digits (Entered: ${length}, ${remaining} more needed).`,
      badgeType: "warning",
    };
  }

  if (length > country.maxLength) {
    const extra = length - country.maxLength;
    return {
      isValid: false,
      isEmpty: false,
      digits,
      formatted: `${country.dialCode} ${digits}`,
      message: `❌ Too long for ${country.name} (${country.dialCode}). Max allowed: ${country.maxLength} digits (Entered: ${length}, ${extra} too many).`,
      badgeType: "error",
    };
  }

  // Format phone nicely (e.g. +91 98765 43210 or +1 202 555 0143)
  return {
    isValid: true,
    isEmpty: false,
    digits,
    country,
    formatted: `${country.dialCode} ${digits}`,
    message: `✓ Valid ${country.name} (${country.dialCode}) phone number format (${digits.length} digits).`,
    badgeType: "success",
  };
}
