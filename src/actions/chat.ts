'use server';

import type { ChatChannel } from '@/lib/chat-types';
import {
  adminUnread as adminUnreadServer,
  closeAdminConversation as closeAdminConversationServer,
  accountingUnread as accountingUnreadServer,
  getAdminThread as getAdminThreadServer,
  getAccountingThread as getAccountingThreadServer,
  getShopThread as getShopThreadServer,
  listAdminConversations as listAdminConversationsServer,
  markAccountingRead as markAccountingReadServer,
  markShopRead as markShopReadServer,
  reopenAdminConversation as reopenAdminConversationServer,
  sendAdminMessage as sendAdminMessageServer,
  sendAccountingMessage as sendAccountingMessageServer,
  sendShopMessage as sendShopMessageServer,
  shopUnread as shopUnreadServer,
  startShopThread as startShopThreadServer,
} from '@/server/chat';

export async function getAccountingThread() {
  return getAccountingThreadServer();
}

export async function sendAccountingMessage(body: string) {
  return sendAccountingMessageServer(body);
}

export async function markAccountingRead() {
  return markAccountingReadServer();
}

export async function accountingUnread() {
  return accountingUnreadServer();
}

export async function getShopThread() {
  return getShopThreadServer();
}

export async function startShopThread(payload: { name?: string; phone?: string; body?: string }) {
  return startShopThreadServer(payload);
}

export async function sendShopMessage(body: string) {
  return sendShopMessageServer(body);
}

export async function markShopRead() {
  return markShopReadServer();
}

export async function shopUnread() {
  return shopUnreadServer();
}

export async function listAdminConversations(
  channel?: ChatChannel | 'all',
  status?: 'open' | 'closed' | 'all',
) {
  return listAdminConversationsServer(channel, status);
}

export async function getAdminThread(conversationId: string) {
  return getAdminThreadServer(conversationId);
}

export async function sendAdminMessage(conversationId: string, body: string) {
  return sendAdminMessageServer(conversationId, body);
}

export async function closeAdminConversation(conversationId: string) {
  return closeAdminConversationServer(conversationId);
}

export async function reopenAdminConversation(conversationId: string) {
  return reopenAdminConversationServer(conversationId);
}

export async function adminUnread() {
  return adminUnreadServer();
}
