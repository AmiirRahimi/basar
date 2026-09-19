import { PHONE_RE } from '@/lib/constants';

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

export async function sendSmsText(phone: string, text: string) {
  if (!PHONE_RE.test(phone)) return { ok: false, message: 'شماره موبایل معتبر نیست' };
  const body = text.trim().slice(0, 400);
  if (!body) return { ok: false, message: 'متن پیامک خالی است' };
  const token = process.env.MELLI_PAYAMAK_TOKEN;
  const base = process.env.MELLI_PAYAMAK_BASE_URL || 'https://console.melipayamak.com';
  const path = process.env.MELLI_PAYAMAK_SMS_PATH || '/api/send/simple/';
  if (process.env.NODE_ENV === 'production' && token) {
    try {
      const payload: Record<string, string> = { to: phone, text: body };
      if (process.env.MELLI_PAYAMAK_FROM) payload.from = process.env.MELLI_PAYAMAK_FROM;
      const res = await fetch(`${base}${path}${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ok: false, message: 'ارسال پیامک ناموفق بود' };
    } catch {
      return { ok: false, message: 'ارسال پیامک ناموفق بود' };
    }
  } else {
    console.info('[SMS]', phone, body);
  }
  return { ok: true, message: process.env.NODE_ENV === 'production' ? 'پیامک ارسال شد' : `پیامک آزمایشی به ${phone}` };
}
