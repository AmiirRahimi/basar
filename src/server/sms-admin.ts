import { PHONE_RE, personIsCustomer, personRolesLabel } from '@/lib/constants';
import { paymentApplied } from '@/lib/checks';
import {
  fillSmsTemplate,
  formatSmsAmount,
  formatSmsDiscount,
  payNowAmount,
  smsTemplateById,
  type SmsTemplateId,
} from '@/lib/sms-templates';
import { requirePlatformAdmin } from './admin';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { fail, ok, type ActionResult } from './result';
import { clientIp, rateLimit } from './rate-limit';
import {
  normalizeMobile,
  phoneOf,
  publicAppOrigin,
  sendBulkSms,
  sendLikeToLikeSms,
  smsConfigured,
  smsCredit,
  smsLineNumber,
  smsLive,
} from './sms';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function asIdList(value: unknown) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(list.map((item) => String(item || '').trim()).filter(Boolean))];
}

function parsePhones(value: unknown) {
  const raw = Array.isArray(value) ? value.join('\n') : String(value || '');
  return [...new Set(raw.split(/[\s,;]+/).map(normalizeMobile).filter((phone) => PHONE_RE.test(phone)))];
}

function relationKey(value: unknown) {
  if (!value) return '';
  if (typeof value === 'object' && value && '_id' in (value as object)) return String((value as { _id: unknown })._id);
  return String(value);
}

async function remainingByPerson() {
  const [invoices, payments, carts] = await Promise.all([
    M().Invoice.find({ isDeleted: { $ne: true } }).select('_id _client').lean(),
    M().Payment.find({ isDeleted: { $ne: true } }).select('_invoice _person cash cashAmount checkAmount discount').lean(),
    M().CustomerCart.find({ isDeleted: { $ne: true } }).select('_invoice count price').lean(),
  ]);
  const totals: Record<string, number> = {};
  for (const line of carts as any[]) {
    const id = relationKey(line._invoice);
    if (!id) continue;
    totals[id] = (totals[id] || 0) + Number(line.count || 0) * Number(line.price || 0);
  }
  const paidByInvoice: Record<string, number> = {};
  const paidByPerson: Record<string, number> = {};
  for (const payment of payments as any[]) {
    const applied = paymentApplied(payment);
    const invoiceId = relationKey(payment._invoice);
    const personId = relationKey(payment._person);
    if (invoiceId) paidByInvoice[invoiceId] = (paidByInvoice[invoiceId] || 0) + applied;
    else if (personId) paidByPerson[personId] = (paidByPerson[personId] || 0) + applied;
  }
  const remaining: Record<string, number> = {};
  for (const invoice of invoices as any[]) {
    const personId = relationKey(invoice._client);
    if (!personId) continue;
    const due = Math.max(0, (totals[relationKey(invoice._id)] || 0) - (paidByInvoice[relationKey(invoice._id)] || 0));
    remaining[personId] = (remaining[personId] || 0) + due;
  }
  for (const [personId, extra] of Object.entries(paidByPerson)) {
    remaining[personId] = Math.max(0, (remaining[personId] || 0) - extra);
  }
  return remaining;
}

export async function getSmsBoard(): Promise<ActionResult> {
  const access = await requirePlatformAdmin();
  if ('error' in access) return access.error;
  await db();

  const [people, users, campaigns, remaining, credit] = await Promise.all([
    M()
      .Person.find({ isDeleted: false })
      .select('_id fullName phoneNumber role city')
      .sort({ timeStamp: -1 })
      .limit(800)
      .lean(),
    M().User.find().select('_id fullName phonenumber city').limit(400).lean(),
    M().SmsCampaign.find().sort({ timeStamp: -1 }).limit(40).lean(),
    remainingByPerson(),
    smsCredit(),
  ]);
  const origin = await publicAppOrigin();

  const personRows = (people as any[]).map((row) => {
    const id = String(row._id);
    return {
      _id: id,
      fullName: row.fullName || '',
      phone: phoneOf(row),
      city: row.city || '',
      roleLabel: personRolesLabel(row.role) || '',
      customer: personIsCustomer(row.role),
      remaining: Number(remaining[id] || 0),
    };
  });

  return ok({
    configured: smsConfigured(),
    live: smsLive(),
    hasLine: Boolean(smsLineNumber()),
    credit,
    defaultLink: origin ? `${origin}/catalog` : '',
    newProductsLink: origin ? `${origin}/catalog?new=1` : '',
    people: serialize(personRows),
    users: serialize(
      (users as any[]).map((row) => ({
        _id: String(row._id),
        fullName: row.fullName || '',
        phone: normalizeMobile(row.phonenumber),
        city: row.city || '',
      })),
    ),
    history: serialize(campaigns),
  });
}

export async function sendAdminSms(payload: {
  templateId?: string;
  body?: string;
  audience?: string;
  personIds?: unknown;
  userIds?: unknown;
  extraPhones?: unknown;
  link?: string;
  discountPercent?: number;
}): Promise<ActionResult> {
  const access = await requirePlatformAdmin();
  if ('error' in access) return access.error;

  const ip = await clientIp();
  if (!rateLimit(`admin-sms:${access.session._id}`, 8, 10 * 60 * 1000) || !rateLimit(`admin-sms-ip:${ip}`, 20, 10 * 60 * 1000)) {
    return fail('تعداد ارسال‌ها زیاد است. کمی بعد دوباره تلاش کنید', 429);
  }

  const template = smsTemplateById(String(payload.templateId || 'custom'));
  const customBody = String(payload.body || '').trim();
  const body = template.id === 'custom' ? customBody : customBody || template.body;
  if (!body) return fail('متن پیامک خالی است');

  const discountPercent = Math.max(0, Math.min(100, Number(payload.discountPercent ?? 1) || 0));
  const origin = await publicAppOrigin();
  const fallbackLink =
    template.id === 'new-products' && origin ? `${origin}/catalog?new=1` : origin ? `${origin}/catalog` : '';
  const link = String(payload.link || '').trim() || fallbackLink;

  await db();
  const remaining = template.id === 'payment' || body.includes('{amount}') || body.includes('{payNow}')
    ? await remainingByPerson()
    : {};

  const personIds = asIdList(payload.personIds);
  const userIds = asIdList(payload.userIds);
  const extraPhones = parsePhones(payload.extraPhones);

  const [people, users] = await Promise.all([
    personIds.length
      ? M()
          .Person.find({ _id: { $in: personIds }, isDeleted: false })
          .select('_id fullName phoneNumber')
          .lean()
      : Promise.resolve([]),
    userIds.length
      ? M().User.find({ _id: { $in: userIds } }).select('_id fullName phonenumber').lean()
      : Promise.resolve([]),
  ]);

  type Target = { phone: string; name: string; remaining: number };
  const byPhone = new Map<string, Target>();
  const add = (phone: string, name: string, remainingAmount = 0) => {
    const mobile = normalizeMobile(phone);
    if (!PHONE_RE.test(mobile) || byPhone.has(mobile)) return;
    byPhone.set(mobile, { phone: mobile, name: name.trim() || 'مشتری', remaining: remainingAmount });
  };

  for (const row of people as any[]) {
    add(phoneOf(row), String(row.fullName || ''), Number(remaining[String(row._id)] || 0));
  }
  for (const row of users as any[]) {
    add(String(row.phonenumber || ''), String(row.fullName || ''));
  }
  for (const phone of extraPhones) add(phone, 'مشتری');

  const targets = [...byPhone.values()];
  if (!targets.length) return fail('حداقل یک شماره معتبر انتخاب کنید');
  if (targets.length > 1000) return fail('حداکثر ۱۰۰۰ شماره در هر ارسال مجاز است');

  if (template.id === 'payment') {
    const owing = targets.filter((row) => row.remaining > 0);
    if (!owing.length) return fail('برای این قالب باید اشخاصی با مانده حساب انتخاب شوند');
    targets.length = 0;
    targets.push(...owing);
  }

  const messages = targets.map((row) =>
    fillSmsTemplate(body, {
      name: row.name,
      amount: formatSmsAmount(row.remaining),
      discount: formatSmsDiscount(discountPercent),
      payNow: formatSmsAmount(payNowAmount(row.remaining, discountPercent)),
      link,
    }),
  );
  if (messages.some((text) => !text)) return fail('متن پیامک خالی است');

  const uniqueTexts = new Set(messages);
  const result =
    uniqueTexts.size === 1
      ? await sendBulkSms(
          targets.map((row) => row.phone),
          messages[0],
        )
      : await sendLikeToLikeSms(targets.map((row, index) => ({ phone: row.phone, text: messages[index] })));

  await M().SmsCampaign.create({
    _userId: access.session._id,
    templateId: template.id as SmsTemplateId,
    title: template.title,
    body,
    audience: String(payload.audience || 'custom'),
    phones: targets.map((row) => row.phone),
    sentCount: result.sent || 0,
    failedCount: result.failed || (result.ok ? 0 : targets.length),
    packIds: result.packIds || [],
    discountPercent,
    link,
    timeStamp: new Date(),
  });

  if (!result.ok) return fail(result.message);
  return ok(
    { sent: result.sent, failed: result.failed, total: targets.length },
    result.message,
  );
}
