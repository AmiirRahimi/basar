import { randomBytes } from 'node:crypto';
import { publicAppOrigin } from './sms';

export type GatewayDriver = 'zarinpal' | 'mock';

export type GatewayRequest = {
  amountToman: number;
  description: string;
  callbackPath: string;
  mobile?: string;
  orderId: string;
};

function merchantId() {
  return (process.env.ZARINPAL_MERCHANT_ID || '').trim();
}

export function gatewayDriver(): GatewayDriver | 'missing' {
  if (merchantId()) return 'zarinpal';
  if (process.env.NODE_ENV === 'production') return 'missing';
  return 'mock';
}

function zarinpalBase() {
  const sandbox = (process.env.ZARINPAL_SANDBOX || '').trim().toLowerCase();
  const useSandbox = sandbox === '1' || sandbox === 'true' || sandbox === 'yes';
  return useSandbox ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
}

function tomanToRials(amount: number) {
  return Math.max(0, Math.round(Number(amount) || 0) * 10);
}

export async function requestGatewayPayment(input: GatewayRequest) {
  const driver = gatewayDriver();
  if (driver === 'missing') {
    return { ok: false as const, message: 'درگاه پرداخت پیکربندی نشده است. شناسه زرین‌پال را در محیط سرور بگذارید.' };
  }
  const origin = await publicAppOrigin();
  if (!origin) return { ok: false as const, message: 'آدرس سایت برای بازگشت از درگاه مشخص نیست' };
  const amountRials = tomanToRials(input.amountToman);
  if (amountRials < 1000) {
    return { ok: true as const, driver: 'mock' as const, authority: `free_${input.orderId}`, redirectUrl: '' };
  }
  const callbackUrl = `${origin}${input.callbackPath}`;
  if (driver === 'mock') {
    const authority = `mock_${randomBytes(12).toString('hex')}`;
    return {
      ok: true as const,
      driver,
      authority,
      redirectUrl: `${origin}/pay/mock?authority=${encodeURIComponent(authority)}`,
    };
  }
  try {
    const res = await fetch(`${zarinpalBase()}/pg/v4/payment/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        merchant_id: merchantId(),
        amount: amountRials,
        callback_url: callbackUrl,
        description: input.description.slice(0, 255),
        metadata: {
          mobile: input.mobile || undefined,
          order_id: input.orderId,
        },
      }),
    });
    const body = (await res.json()) as {
      data?: { code?: number; authority?: string; message?: string };
      errors?: { message?: string };
    };
    const authority = String(body.data?.authority || '');
    if (!res.ok || body.data?.code !== 100 || !authority) {
      return { ok: false as const, message: body.errors?.message || body.data?.message || 'درگاه پرداخت پاسخ نداد' };
    }
    return {
      ok: true as const,
      driver,
      authority,
      redirectUrl: `${zarinpalBase()}/pg/StartPay/${authority}`,
    };
  } catch {
    return { ok: false as const, message: 'اتصال به درگاه پرداخت برقرار نشد' };
  }
}

export async function verifyGatewayPayment(input: { authority: string; amountToman: number; driver: GatewayDriver }) {
  if (!input.authority) return { ok: false as const, message: 'شناسه پرداخت نامعتبر است' };
  if (input.driver === 'mock' || input.authority.startsWith('mock_') || input.authority.startsWith('free_')) {
    return { ok: true as const, refId: input.authority.slice(0, 32) };
  }
  const amountRials = tomanToRials(input.amountToman);
  try {
    const res = await fetch(`${zarinpalBase()}/pg/v4/payment/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        merchant_id: merchantId(),
        amount: amountRials,
        authority: input.authority,
      }),
    });
    const body = (await res.json()) as {
      data?: { code?: number; ref_id?: number | string; message?: string };
      errors?: { message?: string };
    };
    const code = Number(body.data?.code || 0);
    if (code === 100 || code === 101) {
      return { ok: true as const, refId: String(body.data?.ref_id || input.authority) };
    }
    return { ok: false as const, message: body.errors?.message || body.data?.message || 'پرداخت تایید نشد' };
  } catch {
    return { ok: false as const, message: 'تایید پرداخت ناموفق بود' };
  }
}
