import { createHash, randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import {
  CHAT_COOKIE,
  CHAT_COOKIE_DAYS,
  CHAT_MESSAGE_MAX,
  PHONE_RE,
} from '@/lib/constants';
import type {
  ChatChannel,
  ChatConversationDto,
  ChatMessageDto,
  ChatSender,
  ChatThreadDto,
} from '@/lib/chat-types';
import { requirePlatformAdmin } from './admin';
import { db, dbEngine } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { clientIp, rateLimit } from './rate-limit';
import { fail, ok, type ActionResult } from './result';
import { normalizeMobile } from './sms';
import { withWorkspace } from './workspace';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function newGuestToken() {
  return randomBytes(24).toString('hex');
}

function previewOf(body: string) {
  const trimmed = body.trim().replace(/\s+/g, ' ');
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

function clipBody(body: unknown) {
  return String(body ?? '')
    .trim()
    .slice(0, CHAT_MESSAGE_MAX);
}

function iso(value: unknown) {
  if (!value) return new Date().toISOString();
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: CHAT_COOKIE_DAYS * 24 * 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  };
}

export async function setChatCookie(conversationId: string, token: string) {
  const jar = await cookies();
  jar.set(CHAT_COOKIE, `${conversationId}.${token}`, cookieOptions());
}

async function readChatCookie(): Promise<{ conversationId: string; token: string } | null> {
  const jar = await cookies();
  const raw = jar.get(CHAT_COOKIE)?.value || '';
  const dot = raw.indexOf('.');
  if (dot < 1) return null;
  const conversationId = raw.slice(0, dot).trim();
  const token = raw.slice(dot + 1).trim();
  if (!conversationId || !token) return null;
  return { conversationId, token };
}

async function allowSend(actorKey: string) {
  const ip = await clientIp();
  return rateLimit(`chat:${actorKey}:${ip}`, 20, 60_000);
}

function conversationTitle(row: any, userName?: string): string {
  if (row.channel === 'shop') {
    return String(row.visitorName || 'مهمان فروشگاه').trim() || 'مهمان فروشگاه';
  }
  return (userName || '').trim() || 'کاربر شمارش';
}

function toConversationDto(
  row: any,
  extras?: { userFullName?: string; contactPhone?: string },
): ChatConversationDto {
  const channel = (row.channel === 'shop' ? 'shop' : 'counting') as ChatChannel;
  return {
    _id: String(row._id),
    channel,
    status: row.status === 'closed' ? 'closed' : 'open',
    userId: row.userId ? String(row.userId) : undefined,
    visitorName: row.visitorName || undefined,
    visitorPhone: row.visitorPhone || undefined,
    storeId: row.storeId ? String(row.storeId) : undefined,
    brandId: row.brandId ? String(row.brandId) : undefined,
    subject: row.subject || undefined,
    lastMessageAt: iso(row.lastMessageAt || row.timeStamp),
    lastMessagePreview: String(row.lastMessagePreview || ''),
    unreadForAdmin: Number(row.unreadForAdmin || 0),
    unreadForVisitor: Number(row.unreadForVisitor || 0),
    title: conversationTitle(row, extras?.userFullName),
    contactPhone: channel === 'shop' ? String(row.visitorPhone || '') : extras?.contactPhone,
    userFullName: extras?.userFullName,
  };
}

function toMessageDto(row: any): ChatMessageDto {
  return {
    _id: String(row._id),
    conversationId: String(row.conversationId),
    body: String(row.body || ''),
    sender: (['admin', 'user', 'visitor'].includes(row.sender) ? row.sender : 'user') as ChatSender,
    senderUserId: row.senderUserId ? String(row.senderUserId) : undefined,
    createdAt: iso(row.createdAt),
  };
}

async function loadUserNames(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, { fullName: string; phonenumber: string }>();
  if (!ids.length) return map;
  const users = await M()
    .User.find({ _id: { $in: ids } })
    .select('_id fullName phonenumber')
    .lean();
  for (const user of users as any[]) {
    map.set(String(user._id), {
      fullName: String(user.fullName || '').trim(),
      phonenumber: String(user.phonenumber || ''),
    });
  }
  return map;
}

async function findGuestConversation() {
  const cookie = await readChatCookie();
  if (!cookie) return null;
  const hash = hashToken(cookie.token);
  const row = await M()
    .Conversation.findOne({
      _id: cookie.conversationId,
      channel: 'shop',
      guestTokenHash: hash,
    })
    .lean();
  return row as any;
}

async function insertMessage(input: {
  conversationId: string;
  body: string;
  sender: ChatSender;
  senderUserId?: string;
}) {
  await M().ChatMessage.create({
    conversationId: input.conversationId,
    body: input.body,
    sender: input.sender,
    senderUserId: input.senderUserId || null,
    createdAt: new Date(),
  });
}

async function bumpConversation(conversationId: string, body: string, forAdmin: boolean) {
  const row = await M().Conversation.findById(conversationId).lean();
  if (!row) return null;
  const patch: Record<string, unknown> = {
    lastMessageAt: new Date(),
    lastMessagePreview: previewOf(body),
    status: 'open',
  };
  if (forAdmin) {
    patch.unreadForAdmin = Number((row as any).unreadForAdmin || 0) + 1;
  } else {
    patch.unreadForVisitor = Number((row as any).unreadForVisitor || 0) + 1;
  }
  await M().Conversation.updateOne({ _id: conversationId }, patch);
  return { ...(row as object), ...patch };
}

async function messagesFor(conversationId: string, limit = 200): Promise<ChatMessageDto[]> {
  const rows = await M()
    .ChatMessage.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
  return (rows as any[]).map(toMessageDto);
}

async function threadFor(
  row: any,
  extras?: { userFullName?: string; contactPhone?: string },
): Promise<ChatThreadDto> {
  const messages = await messagesFor(String(row._id));
  return {
    conversation: toConversationDto(row, extras),
    messages,
  };
}

async function countingExtras(session: { _id: string; phonenumber: string }) {
  const names = await loadUserNames([session._id]);
  const info = names.get(session._id);
  return {
    userFullName: info?.fullName || session.phonenumber,
    contactPhone: info?.phonenumber || session.phonenumber,
  };
}

export async function getCountingThread(): Promise<ActionResult<ChatThreadDto>> {
  const access = await withWorkspace();
  if ('error' in access) return access.error as ActionResult<ChatThreadDto>;
  await db();

  const session = access.session;
  let row = await M()
    .Conversation.findOne({
      channel: 'counting',
      userId: session._id,
      status: 'open',
    })
    .lean();

  if (!row) {
    const created = await M().Conversation.create({
      channel: 'counting',
      status: 'open',
      userId: session._id,
      storeId: session._storeId || null,
      brandId: session._brandId || null,
      lastMessageAt: new Date(),
      lastMessagePreview: '',
      unreadForAdmin: 0,
      unreadForVisitor: 0,
      timeStamp: new Date(),
    });
    row = created.toObject ? created.toObject() : created;
  }

  return ok(await threadFor(row, await countingExtras(session)));
}

export async function sendCountingMessage(bodyRaw: unknown): Promise<ActionResult<ChatThreadDto>> {
  const access = await withWorkspace();
  if ('error' in access) return access.error as ActionResult<ChatThreadDto>;
  const body = clipBody(bodyRaw);
  if (!body) return fail('متن پیام خالی است');
  if (!(await allowSend(`user:${access.session._id}`))) {
    return fail('لطفاً کمی صبر کنید و دوباره بفرستید', 429);
  }
  await db();

  const existing = await getCountingThread();
  if (!existing.ok || !existing.data) return existing;
  const conversationId = existing.data.conversation._id;

  await insertMessage({
    conversationId,
    body,
    sender: 'user',
    senderUserId: access.session._id,
  });
  await bumpConversation(conversationId, body, true);

  return getCountingThread();
}

export async function markCountingRead(): Promise<ActionResult<{ unread: number }>> {
  const access = await withWorkspace();
  if ('error' in access) return access.error as ActionResult<{ unread: number }>;
  await db();
  await M().Conversation.updateMany(
    { channel: 'counting', userId: access.session._id },
    { unreadForVisitor: 0 },
  );
  return ok({ unread: 0 });
}

export async function countingUnread(): Promise<ActionResult<{ unread: number }>> {
  const access = await withWorkspace();
  if ('error' in access) return access.error as ActionResult<{ unread: number }>;
  await db();
  const rows = await M()
    .Conversation.find({ channel: 'counting', userId: access.session._id })
    .select('unreadForVisitor')
    .lean();
  const unread = (rows as any[]).reduce((sum, row) => sum + Number(row.unreadForVisitor || 0), 0);
  return ok({ unread });
}

export async function getShopThread(): Promise<ActionResult<ChatThreadDto | null>> {
  await db();
  const row = await findGuestConversation();
  if (!row) return ok(null);
  return ok(await threadFor(row));
}

export async function startShopThread(input: {
  name?: string;
  phone?: string;
  body?: string;
}): Promise<ActionResult<ChatThreadDto>> {
  const name = String(input.name || '').trim().slice(0, 80);
  const phone = normalizeMobile(input.phone);
  const body = clipBody(input.body);
  if (!name) return fail('نام را وارد کنید');
  if (!PHONE_RE.test(phone)) return fail('شماره موبایل معتبر نیست');
  if (!body) return fail('متن پیام خالی است');
  if (!(await allowSend(`guest:${phone}`))) {
    return fail('لطفاً کمی صبر کنید و دوباره بفرستید', 429);
  }

  await db();

  const existing = await findGuestConversation();
  if (existing) {
    await insertMessage({
      conversationId: String(existing._id),
      body,
      sender: 'visitor',
    });
    await bumpConversation(String(existing._id), body, true);
    const refreshed = await M().Conversation.findById(existing._id).lean();
    return ok(await threadFor(refreshed || existing));
  }

  const token = newGuestToken();
  const created = await M().Conversation.create({
    channel: 'shop',
    status: 'open',
    visitorName: name,
    visitorPhone: phone,
    guestTokenHash: hashToken(token),
    lastMessageAt: new Date(),
    lastMessagePreview: previewOf(body),
    unreadForAdmin: 1,
    unreadForVisitor: 0,
    timeStamp: new Date(),
  });
  const conversationId = String(created._id);
  await insertMessage({
    conversationId,
    body,
    sender: 'visitor',
  });
  await setChatCookie(conversationId, token);
  const row = created.toObject ? created.toObject() : created;
  return ok(await threadFor(row));
}

export async function sendShopMessage(bodyRaw: unknown): Promise<ActionResult<ChatThreadDto>> {
  const body = clipBody(bodyRaw);
  if (!body) return fail('متن پیام خالی است');
  await db();
  const row = await findGuestConversation();
  if (!row) return fail('گفتگو پیدا نشد؛ دوباره شروع کنید', 404);
  if (!(await allowSend(`guest:${row.visitorPhone || row._id}`))) {
    return fail('لطفاً کمی صبر کنید و دوباره بفرستید', 429);
  }
  await insertMessage({
    conversationId: String(row._id),
    body,
    sender: 'visitor',
  });
  await bumpConversation(String(row._id), body, true);
  const refreshed = await M().Conversation.findById(row._id).lean();
  return ok(await threadFor(refreshed || row));
}

export async function markShopRead(): Promise<ActionResult<{ unread: number }>> {
  await db();
  const row = await findGuestConversation();
  if (!row) return ok({ unread: 0 });
  await M().Conversation.updateOne({ _id: row._id }, { unreadForVisitor: 0 });
  return ok({ unread: 0 });
}

export async function shopUnread(): Promise<ActionResult<{ unread: number }>> {
  await db();
  const row = await findGuestConversation();
  if (!row) return ok({ unread: 0 });
  return ok({ unread: Number(row.unreadForVisitor || 0) });
}

export async function listAdminConversations(
  channel?: ChatChannel | 'all',
): Promise<ActionResult<{ conversations: ChatConversationDto[]; unread: number }>> {
  const access = await requirePlatformAdmin();
  if ('error' in access) {
    return access.error as ActionResult<{ conversations: ChatConversationDto[]; unread: number }>;
  }
  await db();

  const filter: Record<string, unknown> = {};
  if (channel === 'counting' || channel === 'shop') filter.channel = channel;

  const rows = await M().Conversation.find(filter).sort({ lastMessageAt: -1 }).limit(200).lean();

  const userIds = (rows as any[])
    .filter((row) => row.channel === 'counting' && row.userId)
    .map((row) => String(row.userId));
  const names = await loadUserNames(userIds);

  const conversations = (rows as any[]).map((row) => {
    const info = row.userId ? names.get(String(row.userId)) : undefined;
    return toConversationDto(row, {
      userFullName: info?.fullName || info?.phonenumber,
      contactPhone: info?.phonenumber,
    });
  });

  const unread = conversations.reduce((sum, c) => sum + c.unreadForAdmin, 0);
  return ok({ conversations, unread });
}

export async function getAdminThread(conversationId: string): Promise<ActionResult<ChatThreadDto>> {
  const access = await requirePlatformAdmin();
  if ('error' in access) return access.error as ActionResult<ChatThreadDto>;
  await db();

  const row = await M().Conversation.findById(conversationId).lean();
  if (!row) return fail('گفتگو پیدا نشد', 404);

  let extras: { userFullName?: string; contactPhone?: string } | undefined;
  if ((row as any).userId) {
    const names = await loadUserNames([String((row as any).userId)]);
    const info = names.get(String((row as any).userId));
    extras = {
      userFullName: info?.fullName || info?.phonenumber,
      contactPhone: info?.phonenumber,
    };
  }

  await M().Conversation.updateOne({ _id: conversationId }, { unreadForAdmin: 0 });
  return ok(await threadFor({ ...(row as object), unreadForAdmin: 0 }, extras));
}

export async function sendAdminMessage(
  conversationId: string,
  bodyRaw: unknown,
): Promise<ActionResult<ChatThreadDto>> {
  const access = await requirePlatformAdmin();
  if ('error' in access) return access.error as ActionResult<ChatThreadDto>;
  const body = clipBody(bodyRaw);
  if (!body) return fail('متن پیام خالی است');
  if (!(await allowSend(`admin:${access.session._id}`))) {
    return fail('لطفاً کمی صبر کنید و دوباره بفرستید', 429);
  }
  await db();

  const row = await M().Conversation.findById(conversationId).lean();
  if (!row) return fail('گفتگو پیدا نشد', 404);

  await insertMessage({
    conversationId,
    body,
    sender: 'admin',
    senderUserId: access.session._id,
  });
  await bumpConversation(conversationId, body, false);
  await M().Conversation.updateOne({ _id: conversationId }, { unreadForAdmin: 0 });

  return getAdminThread(conversationId);
}

export async function closeAdminConversation(conversationId: string): Promise<ActionResult<ChatThreadDto>> {
  const access = await requirePlatformAdmin();
  if ('error' in access) return access.error as ActionResult<ChatThreadDto>;
  await db();
  const row = await M().Conversation.findById(conversationId).lean();
  if (!row) return fail('گفتگو پیدا نشد', 404);
  await M().Conversation.updateOne({ _id: conversationId }, { status: 'closed' });
  return getAdminThread(conversationId);
}

export async function adminUnread(): Promise<ActionResult<{ unread: number }>> {
  const access = await requirePlatformAdmin();
  if ('error' in access) return access.error as ActionResult<{ unread: number }>;
  await db();
  const rows = await M().Conversation.find({}).select('unreadForAdmin').lean();
  const unread = (rows as any[]).reduce((sum, row) => sum + Number(row.unreadForAdmin || 0), 0);
  return ok({ unread });
}
