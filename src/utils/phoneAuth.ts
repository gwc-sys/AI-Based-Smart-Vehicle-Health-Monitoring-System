export function normalizePhoneNumber(rawPhoneNumber: string): string {
  const trimmed = rawPhoneNumber.trim();

  if (!trimmed) {
    return '';
  }

  const hasLeadingPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');

  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
}

export function normalizeCountryCode(rawCountryCode: string): string {
  const digitsOnly = rawCountryCode.replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  return `+${digitsOnly}`;
}

export function buildPhoneNumberWithCountryCode(rawCountryCode: string, rawPhoneNumber: string): string {
  const countryCode = normalizeCountryCode(rawCountryCode);
  const localNumber = rawPhoneNumber.replace(/\D/g, '');

  if (!countryCode && !localNumber) {
    return '';
  }

  return `${countryCode}${localNumber}`;
}

export function isValidE164PhoneNumber(phoneNumber: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phoneNumber);
}

export function sanitizeOtpCode(rawOtpCode: string): string {
  return rawOtpCode.replace(/\D/g, '').slice(0, 6);
}
