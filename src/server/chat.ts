import { createHash, randomBytes } from 'crypto';
import mongoose from 'mongoose';
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

function M(): any {
  return dbEngine() === 'file' ? fileModels : mongo;
}

/** Chats saved before the panel was renamed still use `counting`. */
const ACCOUNTING_CHANNELS = { $in: ['accounting', 'counting'] };

function failDto<T>(message: string, status = 400): ActionResult<T> {
  return fail(message, status) as ActionResult<T>;
}

function oid(value: unknown) {
  const s = String(value || '').trim();
  if (!s) return s;
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : s;
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
  return (userName || '').trim() || 'کاربر حسابداری';
}

function toConversationDto(
  row: any,
  extras?: { userFullName?: string; contactPhone?: string },
): ChatConversationDto {
  const channel = (row.channel === 'shop' ? 'shop' : 'accounting') as ChatChannel;
  const dto: ChatConversationDto = {
    _id: String(row._id),
    channel,
    status: row.status === 'closed' ? 'closed' : 'open',
    lastMessageAt: iso(row.lastMessageAt || row.timeStamp),
    lastMessagePreview: String(row.lastMessagePreview || ''),
    unreadForAdmin: Number(row.unreadForAdmin || 0),
    unreadForVisitor: Number(row.unreadForVisitor || 0),
    title: conversationTitle(row, extras?.userFullName),
  };
  if (row.userId) dto.userId = String(row.userId);
  if (row.visitorName) dto.visitorName = String(row.visitorName);
  if (row.visitorPhone) dto.visitorPhone = String(row.visitorPhone);
  if (row.storeId) dto.storeId = String(row.storeId);
  if (row.brandId) dto.brandId = String(row.brandId);
  if (row.subject) dto.subject = String(row.subject);
  const contactPhone = channel === 'shop' ? String(row.visitorPhone || '') : extras?.contactPhone;
  if (contactPhone) dto.contactPhone = contactPhone;
  if (extras?.userFullName) dto.userFullName = extras.userFullName;
  return dto;
}

function toMessageDto(row: any): ChatMessageDto {
  const dto: ChatMessageDto = {
    _id: String(row._id),
    conversationId: String(row.conversationId),
    body: String(row.body || ''),
    sender: (['admin', 'user', 'visitor'].includes(row.sender) ? row.sender : 'user') as ChatSender,
    createdAt: iso(row.createdAt || row.timeStamp),
  };
  if (row.senderUserId) dto.senderUserId = String(row.senderUserId);
  return dto;
}

async function loadUserNames(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, { fullName: string; phonenumber: string }>();
  if (!ids.length) return map;
  const queryIds = ids.map(oid);
  const users = await M()
    .User.find({ _id: { $in: queryIds } })
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
      _id: oid(cookie.conversationId),
      channel: 'shop',
      guestTokenHash: hash,
    })
    .lean();
  return row as any;
}

async function loggedInShopUser() {
  const { getShopIdentity } = await import('./shop-account');
  const identity = await getShopIdentity();
  if (!identity) return null;
  const user = await M()
    .User.findById(oid(identity._id))
    .select('fullName shopFullName phonenumber')
    .lean();
  if (!user || String(user.phonenumber || '') !== identity.phonenumber) return null;
  const name = String(user.shopFullName || user.fullName || '').trim() || identity.phonenumber;
  return { userId: identity._id, name: name.slice(0, 80), phone: identity.phonenumber };
}

async function findShopConversation() {
  const guest = await findGuestConversation();
  if (guest) return guest;
  const profile = await loggedInShopUser();
  if (!profile) return null;
  const row = await M()
    .Conversation.findOne({
      channel: 'shop',
      $or: [{ userId: oid(profile.userId) }, { userId: profile.userId }],
    })
    .sort({ lastMessageAt: -1 })
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
    conversationId: oid(input.conversationId),
    body: input.body,
    sender: input.sender,
    senderUserId: input.senderUserId ? oid(input.senderUserId) : null,
    createdAt: new Date(),
  });
}

/** Never auto-reopens a closed conversation — closed stays in history. */
async function bumpConversation(conversationId: string, body: string, forAdmin: boolean) {
  const row = await M().Conversation.findById(oid(conversationId)).lean();
  if (!row) return null;
  const patch: Record<string, unknown> = {
    lastMessageAt: new Date(),
    lastMessagePreview: previewOf(body),
  };
  if (forAdmin) {
    patch.unreadForAdmin = Number((row as any).unreadForAdmin || 0) + 1;
  } else {
    patch.unreadForVisitor = Number((row as any).unreadForVisitor || 0) + 1;
  }
  await M().Conversation.updateOne({ _id: oid(conversationId) }, patch);
  return { ...(row as object), ...patch };
}

async function messagesFor(conversationId: string, limit = 500): Promise<ChatMessageDto[]> {
  const id = oid(conversationId);
  const asString = String(conversationId);
  const rows = await M()
    .ChatMessage.find({
      $or: [{ conversationId: id }, { conversationId: asString }],
    })
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

async function accountingExtras(session: { _id: string; phonenumber: string }) {
  const names = await loadUserNames([session._id]);
  const info = names.get(session._id);
  return {
    userFullName: info?.fullName || session.phonenumber,
    contactPhone: info?.phonenumber || session.phonenumber,
  };
}

async function createAccountingConversation(session: {
  _id: string;
  _storeId: string;
  _brandId: string;
}) {
  const created = await M().Conversation.create({
    channel: 'accounting',
    status: 'open',
    userId: oid(session._id),
    storeId: session._storeId ? oid(session._storeId) : null,
    brandId: session._brandId ? oid(session._brandId) : null,
    lastMessageAt: new Date(),
    lastMessagePreview: '',
    unreadForAdmin: 0,
    unreadForVisitor: 0,
    timeStamp: new Date(),
  });
  return created.toObject ? created.toObject() : created;
}

/** Latest open thread, or most recent closed (history) — never creates empty chats. */
export async function getAccountingThread(): Promise<ActionResult<ChatThreadDto | null>> {
  try {
    return await loadAccountingThread();
  } catch (error) {
    console.error('[chat] getAccountingThread', error);
    return failDto('گفتگو بارگذاری نشد');
  }
}

async function loadAccountingThread(): Promise<ActionResult<ChatThreadDto | null>> {
  const access = await withWorkspace();
  if ('error' in access) return access.error as ActionResult<ChatThreadDto | null>;
  await db();

  const session = access.session;
  const userKey = oid(session._id);
  let row = await M()
    .Conversation.findOne({
      channel: ACCOUNTING_CHANNELS,
      userId: userKey,
      status: 'open',
    })
    .sort({ lastMessageAt: -1 })
    .lean();

  if (!row) {
    row = await M()
      .Conversation.findOne({
        channel: ACCOUNTING_CHANNELS,
        userId: userKey,
      })
      .sort({ lastMessageAt: -1 })
      .lean();
  }

  if (!row) {
    row = await M()
      .Conversation.findOne({
        channel: ACCOUNTING_CHANNELS,
        userId: session._id,
        status: 'open',
      })
      .sort({ lastMessageAt: -1 })
      .lean();
  }
  if (!row) {
    row = await M()
      .Conversation.findOne({
        channel: ACCOUNTING_CHANNELS,
        userId: session._id,
      })
      .sort({ lastMessageAt: -1 })
      .lean();
  }

  if (!row) return ok(null);
  return ok(await threadFor(row, await accountingExtras(session)));
}

export async function sendAccountingMessage(bodyRaw: unknown): Promise<ActionResult<ChatThreadDto>> {
  const access = await withWorkspace();
  if ('error' in access) return access.error as ActionResult<ChatThreadDto>;
  const body = clipBody(bodyRaw);
  if (!body) return failDto('متن پیام خالی است');
  if (!(await allowSend(`user:${access.session._id}`))) {
    return failDto('لطفاً کمی صبر کنید و دوباره بفرستید', 429);
  }
  await db();

  const session = access.session;
  const userKey = oid(session._id);
  let row =
    (await M()
      .Conversation.findOne({ channel: ACCOUNTING_CHANNELS, userId: userKey, status: 'open' })
      .sort({ lastMessageAt: -1 })
      .lean()) ||
    (await M()
      .Conversation.findOne({ channel: ACCOUNTING_CHANNELS, userId: session._id, status: 'open' })
      .sort({ lastMessageAt: -1 })
      .lean());

  // Closed thread stays in history — start a fresh open conversation
  if (!row) {
    row = await createAccountingConversation(session);
  }

  const conversationId = String((row as any)._id);
  await insertMessage({
    conversationId,
    body,
    sender: 'user',
    senderUserId: session._id,
  });
  await bumpConversation(conversationId, body, true);

  const refreshed = await M().Conversation.findById(oid(conversationId)).lean();
  return ok(await threadFor(refreshed || row, await accountingExtras(session)));
}

export async function markAccountingRead(): Promise<ActionResult<{ unread: number }>> {
  try {
    const access = await withWorkspace();
    if ('error' in access) return access.error as ActionResult<{ unread: number }>;
    await db();
    await M().Conversation.updateMany(
      { channel: ACCOUNTING_CHANNELS, userId: oid(access.session._id) },
      { unreadForVisitor: 0 },
    );
    await M().Conversation.updateMany(
      { channel: ACCOUNTING_CHANNELS, userId: access.session._id },
      { unreadForVisitor: 0 },
    );
    return ok({ unread: 0 });
  } catch (error) {
    console.error('[chat] markAccountingRead', error);
    return ok({ unread: 0 });
  }
}

export async function accountingUnread(): Promise<ActionResult<{ unread: number }>> {
  const access = await withWorkspace();
  if ('error' in access) return access.error as ActionResult<{ unread: number }>;
  await db();
  const rows = await M()
    .Conversation.find({
      channel: ACCOUNTING_CHANNELS,
      $or: [{ userId: oid(access.session._id) }, { userId: access.session._id }],
    })
    .select('unreadForVisitor')
    .lean();
  const unread = (rows as any[]).reduce((sum, row) => sum + Number(row.unreadForVisitor || 0), 0);
  return ok({ unread });
}

export async function getShopThread(): Promise<ActionResult<ChatThreadDto | null>> {
  await db();
  const row = await findShopConversation();
  if (!row) return ok(null);
  return ok(await threadFor(row));
}

async function createShopConversation(input: {
  name: string;
  phone: string;
  body: string;
  userId?: string;
}) {
  const token = newGuestToken();
  const created = await M().Conversation.create({
    channel: 'shop',
    status: 'open',
    userId: input.userId ? oid(input.userId) : null,
    visitorName: input.name,
    visitorPhone: input.phone,
    guestTokenHash: hashToken(token),
    lastMessageAt: new Date(),
    lastMessagePreview: previewOf(input.body),
    unreadForAdmin: 1,
    unreadForVisitor: 0,
    timeStamp: new Date(),
  });
  const conversationId = String(created._id);
  await insertMessage({
    conversationId,
    body: input.body,
    sender: 'visitor',
  });
  await setChatCookie(conversationId, token);
  const row = created.toObject ? created.toObject() : created;
  return threadFor(row);
}

export async function startShopThread(input: {
  name?: string;
  phone?: string;
  body?: string;
}): Promise<ActionResult<ChatThreadDto>> {
  const profile = await loggedInShopUser();
  const name = (profile?.name || String(input.name || '').trim()).slice(0, 80);
  const phone = profile?.phone || normalizeMobile(input.phone);
  const body = clipBody(input.body);
  if (!profile && !name) return failDto('نام را وارد کنید');
  if (!profile && !PHONE_RE.test(phone)) return failDto('شماره موبایل معتبر نیست');
  if (!body) return failDto('متن پیام خالی است');
  if (!(await allowSend(`guest:${phone || profile?.userId}`))) {
    return failDto('لطفاً کمی صبر کنید و دوباره بفرستید', 429);
  }

  await db();

  const existing = await findShopConversation();
  if (existing && (existing as any).status !== 'closed') {
    await insertMessage({
      conversationId: String(existing._id),
      body,
      sender: 'visitor',
    });
    await bumpConversation(String(existing._id), body, true);
    const refreshed = await M().Conversation.findById(oid(existing._id)).lean();
    return ok(await threadFor(refreshed || existing));
  }

  // Closed cookie thread stays archived — start a new conversation
  return ok(await createShopConversation({ name, phone, body, userId: profile?.userId }));
}

export async function sendShopMessage(bodyRaw: unknown): Promise<ActionResult<ChatThreadDto>> {
  const body = clipBody(bodyRaw);
  if (!body) return failDto('متن پیام خالی است');
  await db();
  const row = await findShopConversation();
  if (!row) {
    const profile = await loggedInShopUser();
    if (!profile) return failDto('گفتگو پیدا نشد؛ دوباره شروع کنید', 404);
    return ok(await createShopConversation({ name: profile.name, phone: profile.phone, body, userId: profile.userId }));
  }
  if (!(await allowSend(`guest:${row.visitorPhone || row._id}`))) {
    return failDto('لطفاً کمی صبر کنید و دوباره بفرستید', 429);
  }

  if ((row as any).status === 'closed') {
    const profile = await loggedInShopUser();
    return ok(
      await createShopConversation({
        name: profile?.name || String(row.visitorName || 'مهمان'),
        phone: profile?.phone || String(row.visitorPhone || ''),
        body,
        userId: profile?.userId,
      }),
    );
  }

  await insertMessage({
    conversationId: String(row._id),
    body,
    sender: 'visitor',
  });
  await bumpConversation(String(row._id), body, true);
  const refreshed = await M().Conversation.findById(oid(row._id)).lean();
  return ok(await threadFor(refreshed || row));
}

export async function markShopRead(): Promise<ActionResult<{ unread: number }>> {
  await db();
  const row = await findShopConversation();
  if (!row) return ok({ unread: 0 });
  await M().Conversation.updateOne({ _id: oid(row._id) }, { unreadForVisitor: 0 });
  return ok({ unread: 0 });
}

export async function shopUnread(): Promise<ActionResult<{ unread: number }>> {
  await db();
  const row = await findShopConversation();
  if (!row) return ok({ unread: 0 });
  return ok({ unread: Number(row.unreadForVisitor || 0) });
}

export async function listAdminConversations(
  channel?: ChatChannel | 'all',
  status?: 'open' | 'closed' | 'all',
): Promise<ActionResult<{ conversations: ChatConversationDto[]; unread: number }>> {
  const access = await requirePlatformAdmin('messages');
  if ('error' in access) {
    return access.error as ActionResult<{ conversations: ChatConversationDto[]; unread: number }>;
  }
  await db();

  const filter: Record<string, unknown> = {};
  if (channel === 'accounting') filter.channel = ACCOUNTING_CHANNELS;
  else if (channel === 'shop') filter.channel = channel;
  if (status === 'open' || status === 'closed') filter.status = status;

  const rows = await M().Conversation.find(filter).sort({ lastMessageAt: -1 }).limit(300).lean();

  const userIds = (rows as any[])
    .filter((row) => (row.channel === 'accounting' || row.channel === 'counting') && row.userId)
    .map((row) => String(row.userId));
  const names = await loadUserNames(userIds);

  const conversations = (rows as any[]).map((row) => {
    const info = row.userId ? names.get(String(row.userId)) : undefined;
    return toConversationDto(row, {
      userFullName: info?.fullName || info?.phonenumber,
      contactPhone: info?.phonenumber,
    });
  });

  const allForUnread = await M()
    .Conversation.find({ status: { $ne: 'closed' } })
    .select('unreadForAdmin')
    .lean();
  const unread = (allForUnread as any[]).reduce((sum, c) => sum + Number(c.unreadForAdmin || 0), 0);
  return ok({ conversations, unread });
}

export async function getAdminThread(conversationId: string): Promise<ActionResult<ChatThreadDto>> {
  const access = await requirePlatformAdmin('messages');
  if ('error' in access) return access.error as ActionResult<ChatThreadDto>;
  await db();

  const row = await M().Conversation.findById(oid(conversationId)).lean();
  if (!row) return failDto('گفتگو پیدا نشد', 404);

  let extras: { userFullName?: string; contactPhone?: string } | undefined;
  if ((row as any).userId) {
    const names = await loadUserNames([String((row as any).userId)]);
    const info = names.get(String((row as any).userId));
    extras = {
      userFullName: info?.fullName || info?.phonenumber,
      contactPhone: info?.phonenumber,
    };
  }

  await M().Conversation.updateOne({ _id: oid(conversationId) }, { unreadForAdmin: 0 });
  return ok(await threadFor({ ...(row as object), unreadForAdmin: 0 }, extras));
}

export async function sendAdminMessage(
  conversationId: string,
  bodyRaw: unknown,
): Promise<ActionResult<ChatThreadDto>> {
  const access = await requirePlatformAdmin('messages');
  if ('error' in access) return access.error as ActionResult<ChatThreadDto>;
  const body = clipBody(bodyRaw);
  if (!body) return failDto('متن پیام خالی است');
  if (!(await allowSend(`admin:${access.session._id}`))) {
    return failDto('لطفاً کمی صبر کنید و دوباره بفرستید', 429);
  }
  await db();

  const row = await M().Conversation.findById(oid(conversationId)).lean();
  if (!row) return failDto('گفتگو پیدا نشد', 404);
  if ((row as any).status === 'closed') {
    return failDto('این گفتگو بسته است. برای پاسخ، ابتدا از سرگیری کنید.', 400);
  }

  await insertMessage({
    conversationId,
    body,
    sender: 'admin',
    senderUserId: access.session._id,
  });
  await bumpConversation(conversationId, body, false);
  await M().Conversation.updateOne({ _id: oid(conversationId) }, { unreadForAdmin: 0 });

  return getAdminThread(conversationId);
}

export async function closeAdminConversation(conversationId: string): Promise<ActionResult<ChatThreadDto>> {
  const access = await requirePlatformAdmin('messages');
  if ('error' in access) return access.error as ActionResult<ChatThreadDto>;
  await db();
  const row = await M().Conversation.findById(oid(conversationId)).lean();
  if (!row) return failDto('گفتگو پیدا نشد', 404);
  await M().Conversation.updateOne({ _id: oid(conversationId) }, { status: 'closed' });
  return getAdminThread(conversationId);
}

export async function reopenAdminConversation(conversationId: string): Promise<ActionResult<ChatThreadDto>> {
  const access = await requirePlatformAdmin('messages');
  if ('error' in access) return access.error as ActionResult<ChatThreadDto>;
  await db();
  const row = await M().Conversation.findById(oid(conversationId)).lean();
  if (!row) return failDto('گفتگو پیدا نشد', 404);
  await M().Conversation.updateOne({ _id: oid(conversationId) }, { status: 'open' });
  return getAdminThread(conversationId);
}

export async function adminUnread(): Promise<ActionResult<{ unread: number }>> {
  const access = await requirePlatformAdmin('messages');
  if ('error' in access) return access.error as ActionResult<{ unread: number }>;
  await db();
  const rows = await M()
    .Conversation.find({ status: { $ne: 'closed' } })
    .select('unreadForAdmin')
    .lean();
  const unread = (rows as any[]).reduce((sum, row) => sum + Number(row.unreadForAdmin || 0), 0);
  return ok({ unread });
}
