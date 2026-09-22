'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import {
  closeAdminConversation,
  getAdminThread,
  listAdminConversations,
  sendAdminMessage,
} from '@/actions/chat';
import type { ChatChannel, ChatConversationDto, ChatThreadDto } from '@/lib/chat-types';
import { faRelativeTime } from '@/lib/format';
import { cn } from '@/ui';
import { MessageSquare } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { NewMessageBadge } from './NewMessageBadge';
import { useChatPolling } from './useChatPolling';

const FILTERS: { id: ChatChannel | 'all'; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'counting', label: 'شمارش' },
  { id: 'shop', label: 'فروشگاه' },
];

export function ChatInbox({
  initialConversations = [],
  initialUnread = 0,
}: {
  initialConversations?: ChatConversationDto[];
  initialUnread?: number;
}) {
  const [filter, setFilter] = useState<ChatChannel | 'all'>('all');
  const [conversations, setConversations] = useState(initialConversations);
  const [unread, setUnread] = useState(initialUnread);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatThreadDto | null>(null);
  const [pending, start] = useTransition();
  const seenIds = useRef<Set<string>>(new Set());
  const bootstrapped = useRef(false);

  const refreshList = useCallback(async () => {
    const res = await listAdminConversations(filter);
    if (!res.ok || !res.data) return;

    if (bootstrapped.current) {
      for (const row of res.data.conversations) {
        if (row.unreadForAdmin > 0 && !seenIds.current.has(`${row._id}:${row.lastMessageAt}`)) {
          toast.success(`پیام جدید از ${row.title}`, { id: `chat-new-${row._id}` });
        }
      }
    }
    bootstrapped.current = true;
    for (const row of res.data.conversations) {
      if (row.unreadForAdmin > 0) seenIds.current.add(`${row._id}:${row.lastMessageAt}`);
    }

    setConversations(res.data.conversations);
    setUnread(res.data.unread);
  }, [filter]);

  const openThread = useCallback(async (id: string) => {
    setActiveId(id);
    const res = await getAdminThread(id);
    if (!res.ok || !res.data) {
      toast.error(res.message || 'گفتگو باز نشد');
      return;
    }
    setThread(res.data);
    setConversations((prev) =>
      prev.map((c) => (c._id === id ? { ...c, unreadForAdmin: 0 } : c)),
    );
  }, []);

  useChatPolling(
    async () => {
      await refreshList();
      if (activeId) {
        const res = await getAdminThread(activeId);
        if (res.ok && res.data) setThread(res.data);
      }
    },
    { active: Boolean(activeId) },
  );

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  async function handleSend(body: string) {
    if (!activeId) return;
    const res = await sendAdminMessage(activeId, body);
    if (!res.ok) {
      toast.error(res.message || 'ارسال نشد');
      return;
    }
    if (res.data) {
      setThread(res.data);
      await refreshList();
    }
  }

  function closeThread() {
    if (!activeId) return;
    start(async () => {
      const res = await closeAdminConversation(activeId);
      if (!res.ok) {
        toast.error(res.message || 'بستن ممکن نشد');
        return;
      }
      if (res.data) setThread(res.data);
      await refreshList();
    });
  }

  return (
    <div className="grid min-h-[28rem] overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:grid-cols-[20rem_1fr]" dir="rtl">
      <aside className="flex min-h-0 flex-col border-b border-zinc-200 lg:border-b-0 lg:border-e">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <MessageSquare className="h-4 w-4 text-teal-700" />
            پیام‌ها
            <NewMessageBadge count={unread} pulse={unread > 0} />
          </div>
          <div className="flex gap-1 rounded-xl bg-zinc-100 p-0.5 text-[11px]">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  'rounded-lg px-2 py-1 transition',
                  filter === item.id ? 'bg-white font-medium text-zinc-900 shadow-sm' : 'text-zinc-500',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">هنوز گفتگویی نیست.</p>
          ) : (
            conversations.map((row) => (
              <ConversationRow
                key={row._id}
                row={row}
                active={row._id === activeId}
                onClick={() => void openThread(row._id)}
              />
            ))
          )}
        </div>
      </aside>

      <section className="min-h-[22rem] lg:min-h-0">
        {thread ? (
          <ChatPanel
            className="h-full min-h-[22rem] lg:min-h-[28rem]"
            title={thread.conversation.title}
            subtitle={[
              thread.conversation.channel === 'shop' ? 'فروشگاه' : 'شمارش',
              thread.conversation.contactPhone,
              thread.conversation.status === 'closed' ? 'بسته' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            messages={thread.messages}
            viewer="admin"
            accent="teal"
            sending={pending}
            onSend={handleSend}
            headerRight={
              thread.conversation.status === 'open' ? (
                <button
                  type="button"
                  onClick={closeThread}
                  className="rounded-xl px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                >
                  بستن گفتگو
                </button>
              ) : (
                <span className="text-xs text-zinc-400">بسته شده</span>
              )
            }
          />
        ) : (
          <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-zinc-500">
            <MessageSquare className="h-8 w-8 text-zinc-300" />
            یک گفتگو را از فهرست انتخاب کنید تا پاسخ دهید.
          </div>
        )}
      </section>
    </div>
  );
}

function ConversationRow({
  row,
  active,
  onClick,
}: {
  row: ChatConversationDto;
  active: boolean;
  onClick: () => void;
}) {
  const hasUnread = row.unreadForAdmin > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col gap-0.5 border-b border-zinc-100 px-3 py-3 text-right transition',
        active ? 'bg-teal-50/80' : hasUnread ? 'bg-rose-50/60' : 'hover:bg-zinc-50',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('truncate text-sm', hasUnread ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-800')}>
          {row.title}
        </span>
        <span className="shrink-0 text-[10px] text-zinc-400">{faRelativeTime(row.lastMessageAt)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs text-zinc-500">{row.lastMessagePreview || '—'}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[10px]',
              row.channel === 'shop' ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900',
            )}
          >
            {row.channel === 'shop' ? 'فروشگاه' : 'شمارش'}
          </span>
          <NewMessageBadge count={row.unreadForAdmin} pulse={false} />
        </div>
      </div>
    </button>
  );
}
