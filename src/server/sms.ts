import { PHONE_RE } from '@/lib/constants';

const SMSIR_BASE = 'https://api.sms.ir/v1';
const SMS_BATCH = 100;
const SMS_MAX_LEN = 700;

export type SmsResult = {
  ok: boolean;
  message: string;
  sent?: number;
  failed?: number;
  packIds?: string[];
};

export async function publicAppOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'http';
    if (host) return `${proto}://${host}`;
  } catch {
    /* headers unavailable outside a request */
  }
  return '';
}

export function shareUrl(token: string, origin = '') {
  const base = origin.replace(/\/$/, '');
  return `${base}/s/${token}`;
}

export function smsApiKey() {
  return (process.env.SMSIR_API_KEY || '').trim();
}

export function smsLineNumber() {
  const raw = (process.env.SMSIR_LINE_NUMBER || '').trim();
  if (!raw) return '';
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : raw;
}

export function smsLive() {
  return Boolean(smsApiKey()) && process.env.NODE_ENV === 'production';
}

export function smsConfigured() {
  return Boolean(smsApiKey());
}

/** Env / provider setup issues — show these on SMS admin, not on login. */
export function isSmsConfigError(message?: string | null) {
  const text = String(message || '');
  return /کلید|وب.?سرویس|API|قالب پیامک|خط ارسال|SMSIR|تنظیم نشده/i.test(text);
}

export function publicSmsFailureMessage(message?: string | null) {
  if (isSmsConfigError(message)) return 'ارسال پیامک ناموفق بود. کمی بعد دوباره تلاش کنید';
  return String(message || '').trim() || 'ارسال پیامک ناموفق بود';
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalizeMobile(value: unknown) {
  let raw = String(value ?? '').trim();
  raw = raw.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
  raw = raw.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
  raw = raw.replace(/[\s-]/g, '');
  if (raw.startsWith('+98')) raw = `0${raw.slice(3)}`;
  else if (raw.startsWith('0098')) raw = `0${raw.slice(4)}`;
  else if (raw.startsWith('98') && raw.length === 12) raw = `0${raw.slice(2)}`;
  else if (raw.startsWith('9') && raw.length === 10) raw = `0${raw}`;
  return raw;
}

export function phoneOf(row: { phoneNumber?: unknown; phonenumber?: unknown }) {
  const raw = row.phoneNumber ?? row.phonenumber;
  if (Array.isArray(raw)) return normalizeMobile(raw[0]);
  return normalizeMobile(raw);
}

function clipText(text: string) {
  return text.trim().slice(0, SMS_MAX_LEN);
}

async function smsIr<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; message: string; data: T | null }> {
  const key = smsApiKey();
  if (!key) return { ok: false, message: 'کلید وب‌سرویس پیامک تنظیم نشده است', data: null };
  try {
    const res = await fetch(`${SMSIR_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': key,
        'X-API-KEY': key,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => null)) as { status?: number; message?: string; data?: T } | null;
    const status = Number(json?.status);
    const message = String(json?.message || '').trim();
    if (!res.ok || status !== 1) {
      return { ok: false, message: message || 'ارسال پیامک ناموفق بود', data: json?.data ?? null };
    }
    return { ok: true, message: message || 'موفق', data: json?.data ?? null };
  } catch {
    return { ok: false, message: 'ارسال پیامک ناموفق بود', data: null };
  }
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type SendPack = { packId?: string; messageIds?: Array<number | null>; cost?: number };

function packCounts(mobiles: string[], data: SendPack | null) {
  const ids = data?.messageIds || [];
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < mobiles.length; i += 1) {
    const id = ids[i];
    if (typeof id === 'number' && id > 0) sent += 1;
    else failed += 1;
  }
  if (!ids.length && data?.packId) {
    sent = mobiles.length;
    failed = 0;
  }
  return { sent, failed, packId: data?.packId ? String(data.packId) : '' };
}

export async function sendSmsText(phone: string, text: string): Promise<SmsResult> {
  const mobile = normalizeMobile(phone);
  if (!PHONE_RE.test(mobile)) return { ok: false, message: 'شماره موبایل معتبر نیست' };
  const body = clipText(text);
  if (!body) return { ok: false, message: 'متن پیامک خالی است' };
  const bulk = await sendBulkSms([mobile], body);
  if (bulk.ok) return { ...bulk, message: smsLive() ? 'پیامک ارسال شد' : bulk.message };
  return bulk;
}

export async function sendBulkSms(phones: string[], text: string): Promise<SmsResult> {
  const body = clipText(text);
  if (!body) return { ok: false, message: 'متن پیامک خالی است' };
  const mobiles = [...new Set(phones.map(normalizeMobile).filter((phone) => PHONE_RE.test(phone)))];
  if (!mobiles.length) return { ok: false, message: 'شماره موبایل معتبر نیست' };

  if (!smsLive()) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, message: 'کلید وب‌سرویس پیامک تنظیم نشده است' };
    }
    for (const phone of mobiles) console.info('[SMS]', phone, body);
    return {
      ok: true,
      message: `پیامک آزمایشی به ${mobiles.length} شماره`,
      sent: mobiles.length,
      failed: 0,
    };
  }

  const lineNumber = smsLineNumber();
  if (!lineNumber) return { ok: false, message: 'شماره خط پیامک تنظیم نشده است' };

  let sent = 0;
  let failed = 0;
  const packIds: string[] = [];
  for (const batch of chunk(mobiles, SMS_BATCH)) {
    const res = await smsIr<SendPack>('POST', '/send/bulk', {
      lineNumber,
      messageText: body,
      mobiles: batch,
      sendDateTime: null,
    });
    if (!res.ok) {
      failed += batch.length;
      if (!sent) return { ok: false, message: res.message, sent: 0, failed };
      continue;
    }
    const counts = packCounts(batch, res.data);
    sent += counts.sent;
    failed += counts.failed;
    if (counts.packId) packIds.push(counts.packId);
  }
  if (!sent) return { ok: false, message: 'پیامکی ارسال نشد', sent: 0, failed };
  return {
    ok: true,
    message: failed ? `${sent} پیامک ارسال شد، ${failed} ناموفق` : `${sent} پیامک ارسال شد`,
    sent,
    failed,
    packIds,
  };
}

export async function sendLikeToLikeSms(items: { phone: string; text: string }[]): Promise<SmsResult> {
  const pairs = items
    .map((item) => ({ phone: normalizeMobile(item.phone), text: clipText(item.text) }))
    .filter((item) => PHONE_RE.test(item.phone) && item.text);
  if (!pairs.length) return { ok: false, message: 'شماره یا متن معتبری نیست' };

  if (!smsLive()) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, message: 'کلید وب‌سرویس پیامک تنظیم نشده است' };
    }
    for (const item of pairs) console.info('[SMS]', item.phone, item.text);
    return {
      ok: true,
      message: `پیامک آزمایشی به ${pairs.length} شماره`,
      sent: pairs.length,
      failed: 0,
    };
  }

  const lineNumber = smsLineNumber();
  if (!lineNumber) return { ok: false, message: 'شماره خط پیامک تنظیم نشده است' };

  let sent = 0;
  let failed = 0;
  const packIds: string[] = [];
  for (const batch of chunk(pairs, SMS_BATCH)) {
    const mobiles = batch.map((item) => item.phone);
    const res = await smsIr<SendPack>('POST', '/send/likeToLike', {
      lineNumber,
      messageTexts: batch.map((item) => item.text),
      mobiles,
      sendDateTime: null,
    });
    if (!res.ok) {
      failed += batch.length;
      if (!sent) return { ok: false, message: res.message, sent: 0, failed };
      continue;
    }
    const counts = packCounts(mobiles, res.data);
    sent += counts.sent;
    failed += counts.failed;
    if (counts.packId) packIds.push(counts.packId);
  }
  if (!sent) return { ok: false, message: 'پیامکی ارسال نشد', sent: 0, failed };
  return {
    ok: true,
    message: failed ? `${sent} پیامک ارسال شد، ${failed} ناموفق` : `${sent} پیامک ارسال شد`,
    sent,
    failed,
    packIds,
  };
}

export async function sendVerifySms(
  phone: string,
  templateId: number,
  parameters: { name: string; value: string }[],
): Promise<SmsResult> {
  const mobile = normalizeMobile(phone);
  if (!PHONE_RE.test(mobile)) return { ok: false, message: 'شماره موبایل معتبر نیست' };
  if (!templateId) return { ok: false, message: 'قالب پیامک تنظیم نشده است' };

  if (!smsLive()) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, message: 'کلید وب‌سرویس پیامک تنظیم نشده است' };
    }
    console.info('[SMS:verify]', mobile, templateId, parameters);
    return { ok: true, message: `پیامک آزمایشی به ${mobile}`, sent: 1, failed: 0 };
  }

  const res = await smsIr<{ messageId?: number; cost?: number }>('POST', '/send/verify', {
    mobile,
    templateId,
    parameters,
  });
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, message: 'پیامک ارسال شد', sent: 1, failed: 0 };
}

export async function sendOtpCode(phone: string, code: string): Promise<SmsResult> {
  const templateId = Number(process.env.SMSIR_OTP_TEMPLATE_ID || 0);
  const param = (process.env.SMSIR_OTP_PARAM || 'CODE').trim() || 'CODE';
  if (templateId > 0) {
    return sendVerifySms(phone, templateId, [{ name: param, value: String(code) }]);
  }
  return sendSmsText(phone, `کد ورود بازار: ${code}`);
}

export async function sendWelcomeSms(phone: string, name = '') {
  const origin = await publicAppOrigin();
  const link = origin ? `${origin}/catalog` : '';
  const who = String(name || '').trim() || 'مشتری';
  const templateId = Number(process.env.SMSIR_WELCOME_TEMPLATE_ID || 0);
  if (templateId > 0) {
    return sendVerifySms(phone, templateId, [
      { name: 'NAME', value: who },
      ...(link ? [{ name: 'LINK', value: link }] : []),
    ]);
  }
  const text = link
    ? `${who} عزیز، به بازار خوش آمدید. محصولات عمده را از این لینک ببینید:\n${link}`
    : `${who} عزیز، به بازار خوش آمدید.`;
  return sendSmsText(phone, text);
}

export async function smsCredit(): Promise<number | null> {
  const status = await smsProviderStatus();
  return status.credit;
}

export async function smsProviderStatus(): Promise<{ credit: number | null; error: string }> {
  if (!smsApiKey()) {
    return { credit: null, error: 'کلید وب‌سرویس پیامک تنظیم نشده است (SMSIR_API_KEY)' };
  }
  if (!smsLive()) {
    return { credit: null, error: '' };
  }
  const res = await smsIr<number>('GET', '/credit');
  if (!res.ok) {
    return {
      credit: null,
      error: res.message || 'ارتباط با SMS.ir برقرار نشد — SMSIR_API_KEY را بررسی کنید',
    };
  }
  if (typeof res.data !== 'number') return { credit: null, error: '' };
  return { credit: res.data, error: '' };
}
