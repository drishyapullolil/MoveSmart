// International Country Phone Data & Metadata

export const COUNTRY_CODES = [
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳", minLength: 10, maxLength: 10, isIndia: true, placeholder: "98765 43210" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪", minLength: 6, maxLength: 15, placeholder: "50 123 4567" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸", minLength: 6, maxLength: 15, placeholder: "202 555 0143" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", minLength: 6, maxLength: 15, placeholder: "7911 123456" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦", minLength: 6, maxLength: 15, placeholder: "50 123 4567" },
  { code: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦", minLength: 6, maxLength: 15, placeholder: "3312 3456" },
  { code: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲", minLength: 6, maxLength: 15, placeholder: "9123 4567" },
  { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼", minLength: 6, maxLength: 15, placeholder: "9123 4567" },
  { code: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭", minLength: 6, maxLength: 15, placeholder: "3612 3456" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬", minLength: 6, maxLength: 15, placeholder: "8123 4567" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦", minLength: 6, maxLength: 15, placeholder: "416 555 0192" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺", minLength: 6, maxLength: 15, placeholder: "412 345 678" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪", minLength: 6, maxLength: 15, placeholder: "151 12345678" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷", minLength: 6, maxLength: 15, placeholder: "6 12 34 56 78" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵", minLength: 6, maxLength: 15, placeholder: "90 1234 5678" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳", minLength: 6, maxLength: 15, placeholder: "138 1234 5678" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾", minLength: 6, maxLength: 15, placeholder: "12 345 6789" },
  { code: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵", minLength: 6, maxLength: 15, placeholder: "9841 234567" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰", minLength: 6, maxLength: 15, placeholder: "71 234 5678" },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰", minLength: 6, maxLength: 15, placeholder: "300 1234567" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩", minLength: 6, maxLength: 15, placeholder: "1712 345678" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭", minLength: 6, maxLength: 15, placeholder: "917 123 4567" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦", minLength: 6, maxLength: 15, placeholder: "82 123 4567" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬", minLength: 6, maxLength: 15, placeholder: "803 123 4567" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷", minLength: 6, maxLength: 15, placeholder: "11 91234 5678" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽", minLength: 6, maxLength: 15, placeholder: "55 1234 5678" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹", minLength: 6, maxLength: 15, placeholder: "312 345 6789" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸", minLength: 6, maxLength: 15, placeholder: "612 34 56 78" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱", minLength: 6, maxLength: 15, placeholder: "6 12345678" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿", minLength: 6, maxLength: 15, placeholder: "21 123 4567" },
  { code: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪", minLength: 6, maxLength: 15, placeholder: "87 123 4567" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷", minLength: 6, maxLength: 15, placeholder: "10 1234 5678" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩", minLength: 6, maxLength: 15, placeholder: "812 3456 7890" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭", minLength: 6, maxLength: 15, placeholder: "81 234 5678" },
  { code: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳", minLength: 6, maxLength: 15, placeholder: "91 234 56 78" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬", minLength: 6, maxLength: 15, placeholder: "100 123 4567" },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪", minLength: 6, maxLength: 15, placeholder: "712 345678" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺", minLength: 6, maxLength: 15, placeholder: "912 345 6789" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷", minLength: 6, maxLength: 15, placeholder: "512 345 6789" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭", minLength: 6, maxLength: 15, placeholder: "79 123 45 67" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪", minLength: 6, maxLength: 15, placeholder: "70 123 45 67" },
];

/**
 * Finds country metadata by dial code or ISO code.
 */
export function getCountryByCode(dialOrIsoCode) {
  if (!dialOrIsoCode) return COUNTRY_CODES[0]; // Default India
  const clean = String(dialOrIsoCode).trim();
  return (
    COUNTRY_CODES.find(
      (c) => c.dialCode === clean || c.code.toUpperCase() === clean.toUpperCase()
    ) || {
      code: "INTL",
      name: "International",
      dialCode: clean.startsWith("+") ? clean : `+${clean}`,
      flag: "🌐",
      minLength: 6,
      maxLength: 15,
      isIndia: false,
      placeholder: "Enter phone number",
    }
  );
}
