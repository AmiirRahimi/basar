const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function latinDigits(value: string) {
  return String(value || '')
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

export function normalizeSheba(value: unknown) {
  const raw = latinDigits(String(value || ''))
    .replace(/\s+/g, '')
    .toUpperCase();
  if (!raw) return '';
  const withIr = raw.startsWith('IR') ? raw : `IR${raw}`;
  return withIr;
}

export function shebaIsValid(value: unknown) {
  const sheba = normalizeSheba(value);
  if (!sheba) return true;
  return /^IR\d{24}$/.test(sheba);
}

export function normalizeCardNumber(value: unknown) {
  return latinDigits(String(value || '')).replace(/\D/g, '').slice(0, 16);
}
