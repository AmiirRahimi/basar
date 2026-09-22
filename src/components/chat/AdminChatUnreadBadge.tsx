'use client';

import { useCallback, useState } from 'react';
import { adminUnread } from '@/actions/chat';
import { NewMessageBadge } from './NewMessageBadge';
import { useChatPolling } from './useChatPolling';

/** Unread pill for admin sidebar / header. */
export function AdminChatUnreadBadge() {
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(async () => {
    const res = await adminUnread();
    if (res.ok && res.data) setUnread(res.data.unread);
  }, []);
  useChatPolling(refresh, { active: false, idleMs: 15000 });
  return <NewMessageBadge count={unread} className="ms-auto" />;
}
