'use server';

import type { ChatChannel } from '@/lib/chat-types';
import {
  adminUnread as adminUnreadServer,
  closeAdminConversation as closeAdminConversationServer,
  countingUnread as countingUnreadServer,
  getAdminThread as getAdminThreadServer,
  getCountingThread as getCountingThreadServer,
  getShopThread as getShopThreadServer,
  listAdminConversations as listAdminConversationsServer,
  markCountingRead as markCountingReadServer,
  markShopRead as markShopReadServer,
  reopenAdminConversation as reopenAdminConversationServer,
  sendAdminMessage as sendAdminMessageServer,
  sendCountingMessage as sendCountingMessageServer,
  sendShopMessage as sendShopMessageServer,
  shopUnread as shopUnreadServer,
  startShopThread as startShopThreadServer,
} from '@/server/chat';

export async function getCountingThread() {
  return getCountingThreadServer();
}

export async function sendCountingMessage(body: string) {
  return sendCountingMessageServer(body);
}

export async function markCountingRead() {
  return markCountingReadServer();
}

export async function countingUnread() {
  return countingUnreadServer();
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
