export const CHECK_DIRECTIONS = {
  in: 'دریافت از مشتری',
  out: 'پرداخت به شخص',
} as const;

export const CHECK_SOURCES = {
  own: 'چک شخصی',
  received: 'چک دریافتی',
} as const;

export const CHECK_STATUSES = {
  pending: 'در جریان',
  passed: 'پاس شده',
  failed: 'برگشتی',
} as const;

export type CheckDirection = keyof typeof CHECK_DIRECTIONS;
export type CheckSource = keyof typeof CHECK_SOURCES;
export type CheckStatus = keyof typeof CHECK_STATUSES;

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toLatinDigits(value: string) {
  return String(value || '').replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

export const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export function persianYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    calendar: 'persian',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value || '';
  const month = (parts.find((part) => part.type === 'month')?.value || '').padStart(2, '0');
  return `${year}/${month}`;
}

export function persianMonthLabel(date = new Date()) {
  const key = persianYearMonth(date);
  const [year, month] = key.split('/');
  const name = PERSIAN_MONTHS[Number(month) - 1] || month;
  return `${name} ${year}`;
}

export function dueDateMonthKey(dueDate?: string | null) {
  const normalized = toLatinDigits(String(dueDate || '')).replace(/-/g, '/');
  const match = normalized.match(/(\d{4})\/(\d{1,2})/);
  if (!match) return '';
  return `${match[1]}/${String(match[2]).padStart(2, '0')}`;
}

export function checkStatus(row: { isCashed?: boolean; isReturned?: boolean }): CheckStatus {
  if (row.isReturned) return 'failed';
  if (row.isCashed) return 'passed';
  return 'pending';
}

export function statusToFlags(status: string) {
  return {
    isCashed: status === 'passed',
    isReturned: status === 'failed',
  };
}

export function checkSourceLabel(row: { direction?: string; _sourceCheck?: unknown }) {
  if (row.direction === 'out') return row._sourceCheck ? CHECK_SOURCES.received : CHECK_SOURCES.own;
  return CHECK_DIRECTIONS.in;
}

export function isReceivedCheck(row: { direction?: string }) {
  return row.direction !== 'out';
}

export function checkAvailableToTransfer(row: {
  direction?: string;
  isTransferred?: boolean;
  isCashed?: boolean;
  isReturned?: boolean;
  isDeleted?: boolean;
}) {
  return (
    isReceivedCheck(row) &&
    !row.isTransferred &&
    !row.isCashed &&
    !row.isReturned &&
    !row.isDeleted
  );
}

export function checkAvailableForPayment(row: {
  direction?: string;
  isTransferred?: boolean;
  isCashed?: boolean;
  isReturned?: boolean;
  isDeleted?: boolean;
  isUsedInPayment?: boolean;
}) {
  return checkAvailableToTransfer(row) && !row.isUsedInPayment;
}

export function paymentApplied(row: {
  cash?: number;
  cashAmount?: number;
  checkAmount?: number;
  discount?: number;
}) {
  return Number(row.cashAmount ?? row.cash ?? 0) + Number(row.checkAmount ?? 0) + Number(row.discount ?? 0);
}
