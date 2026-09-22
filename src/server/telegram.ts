import { BRAND, BRAND_SOCIAL } from '@/lib/brand';

type TelegramApiResult = {
  ok: boolean;
  description?: string;
  result?: {
    message_id?: number;
    invite_link?: string;
  };
};

function botToken() {
  return String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

/** Accepts @username, numeric -100… id, or t.me / telegram.me links. */
export function normalizeTelegramChatId(raw: string) {
  const value = String(raw || '').trim();
  if (!value) return '';
  const link = value.match(/(?:t\.me|telegram\.me)\/(?:c\/)?([A-Za-z0-9_+-]+)/i);
  if (link?.[1]) {
    const slug = link[1];
    if (/^\d+$/.test(slug)) return `-100${slug}`;
    return slug.startsWith('+') ? value : `@${slug.replace(/^@/, '')}`;
  }
  if (/^-?\d+$/.test(value)) return value;
  return value.startsWith('@') ? value : `@${value}`;
}

function channelId() {
  return normalizeTelegramChatId(process.env.TELEGRAM_CHANNEL_ID || '');
}

export function telegramConfigured() {
  return Boolean(botToken() && channelId());
}

function shouldMockTelegram() {
  return process.env.TELEGRAM_MOCK === '1';
}

async function telegramApi(method: string, body: Record<string, unknown>): Promise<TelegramApiResult> {
  const token = botToken();
  if (!token) return { ok: false, description: 'TELEGRAM_BOT_TOKEN تنظیم نشده' };
  if (shouldMockTelegram()) {
    console.info('[Telegram mock]', method, body);
    return {
      ok: true,
      result: {
        message_id: Math.floor(Date.now() / 1000),
        invite_link: String(process.env.TELEGRAM_CHANNEL_INVITE_LINK || BRAND_SOCIAL.telegram),
      },
    };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as TelegramApiResult;
    if (!data.ok) {
      console.error('[Telegram]', method, data.description || data);
      return { ok: false, description: data.description || 'ارسال به تلگرام ناموفق بود' };
    }
    return data;
  } catch (error) {
    console.error('[Telegram]', method, error);
    return { ok: false, description: 'ارتباط با تلگرام برقرار نشد' };
  }
}

export function buildClothCaption(input: {
  code?: string;
  sizeName?: string;
  colorName?: string;
  orderUrl: string;
  typeName?: string;
  styleName?: string;
}) {
  const lines = [
    BRAND.name,
    input.typeName || input.styleName
      ? [input.typeName, input.styleName].filter(Boolean).join(' · ')
      : '',
    `کد: ${input.code || '—'}`,
    `سایز: ${input.sizeName || '—'}`,
    `رنگ: ${input.colorName || '—'}`,
    '',
    `سفارش آنلاین: ${input.orderUrl}`,
    '',
    '—',
    `اینستاگرام: ${BRAND_SOCIAL.instagram}`,
    `تلگرام: ${BRAND_SOCIAL.telegram}`,
    `لینکدین: ${BRAND_SOCIAL.linkedin}`,
  ].filter((line, index, arr) => !(line === '' && arr[index - 1] === ''));

  return lines.join('\n').slice(0, 1024);
}

function isPublicHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
}

export async function sendChannelPhoto(photoUrl: string, caption: string) {
  const chatId = channelId();
  if (!chatId) return { ok: false as const, message: 'TELEGRAM_CHANNEL_ID تنظیم نشده' };
  if (!photoUrl) return { ok: false as const, message: 'تصویر لباس موجود نیست' };
  if (!shouldMockTelegram() && !isPublicHttpUrl(photoUrl)) {
    return {
      ok: false as const,
      message: 'آدرس تصویر باید عمومی و در دسترس اینترنت باشد (localhost برای تلگرام کار نمی‌کند)',
    };
  }

  const data = await telegramApi('sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    disable_notification: false,
  });

  if (!data.ok) return { ok: false as const, message: data.description || 'ارسال پست ناموفق بود' };
  return {
    ok: true as const,
    messageId: Number(data.result?.message_id || 0) || null,
    channelId: chatId,
  };
}

export async function createChannelInviteLink(name = 'دعوت باسار') {
  const fallback = String(process.env.TELEGRAM_CHANNEL_INVITE_LINK || BRAND_SOCIAL.telegram).trim();
  const chatId = channelId();
  if (!chatId) {
    if (fallback) return { ok: true as const, inviteLink: fallback };
    return { ok: false as const, message: 'TELEGRAM_CHANNEL_ID تنظیم نشده' };
  }

  const data = await telegramApi('createChatInviteLink', {
    chat_id: chatId,
    name: name.slice(0, 32),
    creates_join_request: false,
  });

  const link = String(data.result?.invite_link || fallback || '').trim();
  if (!data.ok && !link) return { ok: false as const, message: data.description || 'لینک دعوت ساخته نشد' };
  return { ok: true as const, inviteLink: link };
}
