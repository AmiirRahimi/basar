import { displayName } from '@/lib/format';
import { parseImageList } from '@/lib/shop-cart';
import { PHONE_RE } from '@/lib/constants';
import { requirePlatformAdmin } from './admin';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { fail, ok, type ActionResult } from './result';
import { publicAppOrigin, sendSmsText } from './sms';
import { buildClothCaption, createChannelInviteLink, sendChannelPhoto, telegramConfigured } from './telegram';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function asIdList(value: unknown) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(list.map((item) => String(item || '').trim()).filter(Boolean))];
}

function phoneOf(row: { phoneNumber?: unknown; phonenumber?: unknown }) {
  const raw = row.phoneNumber ?? row.phonenumber;
  if (Array.isArray(raw)) return String(raw[0] || '').trim();
  return String(raw || '').trim();
}

export async function getTelegramPublishBoard(): Promise<ActionResult> {
  const access = await requirePlatformAdmin('telegram');
  if ('error' in access) return access.error;
  await db();

  const [clothes, people, publishes, invites] = await Promise.all([
    M()
      .Cloth.find({ isDeleted: false })
      .select('_id code images published _type _style _size _color count')
      .populate([
        { path: '_type', select: '_id name' },
        { path: '_style', select: '_id name' },
        { path: '_size', select: '_id name' },
        { path: '_color', select: '_id name' },
      ])
      .sort({ timeStamp: -1 })
      .limit(500)
      .lean(),
    M()
      .Person.find({ isDeleted: false })
      .select('_id fullName phoneNumber role city')
      .sort({ timeStamp: -1 })
      .limit(500)
      .lean(),
    M().TelegramPublish.find().sort({ timeStamp: -1 }).limit(100).lean(),
    M().TelegramInvite.find().sort({ timeStamp: -1 }).limit(50).lean(),
  ]);

  return ok({
    configured: telegramConfigured(),
    clothes: serialize(clothes),
    people: serialize(people),
    history: serialize(publishes),
    invites: serialize(invites),
  });
}

export async function publishClothesToTelegram(payload: {
  clothIds?: unknown;
}): Promise<ActionResult> {
  const access = await requirePlatformAdmin('telegram');
  if ('error' in access) return access.error;
  const clothIds = asIdList(payload.clothIds);
  if (!clothIds.length) return fail('حداقل یک لباس انتخاب کنید');
  if (!telegramConfigured()) {
    return fail(
      'ربات یا کانال تلگرام تنظیم نشده است. TELEGRAM_BOT_TOKEN و TELEGRAM_CHANNEL_ID را در .env.local بگذارید و سرور را ری‌استارت کنید.',
    );
  }

  await db();
  const origin = await publicAppOrigin();
  const rows = await M()
    .Cloth.find({ _id: { $in: clothIds }, isDeleted: false })
    .populate([
      { path: '_type', select: '_id name' },
      { path: '_style', select: '_id name' },
      { path: '_size', select: '_id name' },
      { path: '_color', select: '_id name' },
    ])
    .lean();

  if (!rows.length) return fail('لباسی پیدا نشد');

  const results: { clothId: string; ok: boolean; message: string }[] = [];
  let sent = 0;

  for (const cloth of rows as any[]) {
    const clothId = String(cloth._id);
    const images = parseImageList(cloth.images);
    const rawImage = images[0] || '';
    const imageUrl =
      rawImage.startsWith('/') && origin ? `${origin}${rawImage}` : rawImage;
    const orderUrl = origin ? `${origin}/product/${clothId}` : `/product/${clothId}`;
    const sizeName = displayName(cloth._size);
    const colorName = displayName(cloth._color);
    const code = String(cloth.code || '');
    const caption = buildClothCaption({
      code,
      sizeName: sizeName === '—' ? '' : sizeName,
      colorName: colorName === '—' ? '' : colorName,
      orderUrl,
      typeName: displayName(cloth._type) === '—' ? '' : displayName(cloth._type),
      styleName: displayName(cloth._style) === '—' ? '' : displayName(cloth._style),
    });

    if (!cloth.published) {
      await M().Cloth.findOneAndUpdate({ _id: clothId }, { published: true });
    }

    const send = imageUrl
      ? await sendChannelPhoto(imageUrl, caption)
      : { ok: false as const, message: 'این لباس تصویر ندارد' };

    await M().TelegramPublish.create({
      _clothId: clothId,
      _userId: access.session._id,
      code,
      sizeName: sizeName === '—' ? '' : sizeName,
      colorName: colorName === '—' ? '' : colorName,
      imageUrl,
      orderUrl,
      caption,
      channelId: send.ok ? send.channelId : '',
      telegramMessageId: send.ok ? send.messageId : null,
      status: send.ok ? 'sent' : 'failed',
      error: send.ok ? '' : send.message,
      timeStamp: new Date(),
    });

    if (send.ok) {
      sent += 1;
      results.push({ clothId, ok: true, message: 'ارسال شد' });
    } else {
      results.push({ clothId, ok: false, message: send.message });
    }
  }

  if (!sent) return fail(results[0]?.message || 'هیچ پستی ارسال نشد', 400);
  return ok(
    { sent, total: rows.length, results },
    sent === rows.length ? `${sent} پست در کانال تلگرام منتشر شد` : `${sent} از ${rows.length} پست منتشر شد`,
  );
}

export async function invitePeopleToTelegramChannel(payload: {
  personIds?: unknown;
}): Promise<ActionResult> {
  const access = await requirePlatformAdmin('telegram');
  if ('error' in access) return access.error;
  const personIds = asIdList(payload.personIds);
  if (!personIds.length) return fail('حداقل یک شخص انتخاب کنید');

  await db();
  const invite = await createChannelInviteLink('دعوت کانال');
  if (!invite.ok) return fail(invite.message);

  const people = await M()
    .Person.find({ _id: { $in: personIds }, isDeleted: false })
    .select('_id fullName phoneNumber')
    .lean();

  const phones: string[] = [];
  let sentCount = 0;
  let failedCount = 0;
  const text = `${BRAND_INVITE_SMS(invite.inviteLink)}`;

  for (const person of people as any[]) {
    const phone = phoneOf(person);
    if (!PHONE_RE.test(phone)) {
      failedCount += 1;
      continue;
    }
    phones.push(phone);
    const sms = await sendSmsText(phone, text);
    if (sms.ok) sentCount += 1;
    else failedCount += 1;
  }

  await M().TelegramInvite.create({
    _userId: access.session._id,
    _personIds: personIds,
    inviteLink: invite.inviteLink,
    phones,
    sentCount,
    failedCount,
    timeStamp: new Date(),
  });

  if (!sentCount) return fail('پیامکی ارسال نشد؛ شماره معتبر نیست یا سرویس پیامک قطع است');
  return ok(
    { inviteLink: invite.inviteLink, sentCount, failedCount },
    `${sentCount} دعوت به کانال تلگرام پیامک شد`,
  );
}

function BRAND_INVITE_SMS(link: string) {
  return `دعوت به کانال تلگرام جین پوش:\n${link}`;
}
