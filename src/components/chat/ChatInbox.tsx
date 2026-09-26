'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import {
  closeAdminConversation,
  getAdminThread,
  listAdminConversations,
  reopenAdminConversation,
  sendAdminMessage,
} from '@/actions/chat';
import type { ChatChannel, ChatConversationDto, ChatThreadDto } from '@/lib/chat-types';
import { faRelativeTime } from '@/lib/format';
import { cn } from '@/ui';
import { MessageSquare, RotateCcw, X } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { NewMessageBadge } from './NewMessageBadge';
import { useChatPolling } from './useChatPolling';

const CHANNEL_FILTERS: { id: ChatChannel | 'all'; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'accounting', label: 'حسابداری' },
  { id: 'shop', label: 'فروشگاه' },
];

const STATUS_FILTERS: { id: 'all' | 'open' | 'closed'; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'open', label: 'باز' },
  { id: 'closed', label: 'بسته' },
];

export function ChatInbox({
  initialConversations = [],
  initialUnread = 0,
}: {
  initialConversations?: ChatConversationDto[];
  initialUnread?: number;
}) {
  const [channel, setChannel] = useState<ChatChannel | 'all'>('all');
  const [status, setStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [conversations, setConversations] = useState(initialConversations);
  const [unread, setUnread] = useState(initialUnread);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatThreadDto | null>(null);
  const [pending, start] = useTransition();
  const seenIds = useRef<Set<string>>(new Set());
  const bootstrapped = useRef(false);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const refreshList = useCallback(async () => {
    const res = await listAdminConversations(channel, status);
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
  }, [channel, status]);

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
      const id = activeIdRef.current;
      if (id) {
        const res = await getAdminThread(id);
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

  function reopenThread() {
    if (!activeId) return;
    start(async () => {
      const res = await reopenAdminConversation(activeId);
      if (!res.ok) {
        toast.error(res.message || 'از سرگیری ممکن نشد');
        return;
      }
      if (res.data) setThread(res.data);
      await refreshList();
    });
  }

  const isClosed = thread?.conversation.status === 'closed';

  return (
    <div
      className="grid h-[min(70vh,36rem)] min-h-[24rem] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:grid-cols-[17.5rem_1fr]"
      dir="rtl"
    >
      <aside className="flex min-h-0 flex-col border-b border-zinc-100 lg:border-b-0 lg:border-e">
        <div className="shrink-0 space-y-1.5 border-b border-zinc-100 px-2.5 py-2">
          <div className="flex items-center gap-1.5 px-0.5 text-[13px] font-semibold text-zinc-900">
            <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
            پیام‌ها
            <NewMessageBadge count={unread} pulse={unread > 0} />
          </div>
          <PillRow
            items={CHANNEL_FILTERS}
            value={channel}
            onChange={setChannel}
          />
          <PillRow
            items={STATUS_FILTERS}
            value={status}
            onChange={setStatus}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-3 py-8 text-center text-[12px] text-zinc-400">گفتگویی نیست.</p>
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

      <section className="min-h-0">
        {thread ? (
          <ChatPanel
            key={thread.conversation._id}
            className="h-full"
            title={thread.conversation.title}
            subtitle={[
              thread.conversation.channel === 'shop' ? 'فروشگاه' : 'حسابداری',
              thread.conversation.contactPhone,
              isClosed ? 'بسته' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            messages={thread.messages}
            viewer="admin"
            accent="teal"
            sending={pending}
            onSend={handleSend}
            readOnly={isClosed}
            readOnlyHint="گفتگو بسته است — برای پاسخ از سرگیری کنید."
            emptyHint="هنوز پیامی در این گفتگو نیست."
            headerRight={
              isClosed ? (
                <button
                  type="button"
                  onClick={reopenThread}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2 py-1 text-[11px] text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  <RotateCcw className="h-3 w-3" />
                  از سرگیری
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeThread}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                  بستن
                </button>
              )
            }
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-zinc-50/50 px-6 text-center">
            <MessageSquare className="h-7 w-7 text-zinc-300" />
            <p className="text-[12px] text-zinc-400">یک گفتگو را انتخاب کنید</p>
          </div>
        )}
      </section>
    </div>
  );
}

function PillRow<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-zinc-100 p-0.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            'flex-1 rounded-md px-1.5 py-1 text-[10px] transition',
            value === item.id ? 'bg-white font-medium text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
          )}
        >
          {item.label}
        </button>
      ))}
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
  const hasUnread = row.unreadForAdmin > 0 && row.status === 'open';
  const closed = row.status === 'closed';
  const initial = (row.title || '?').trim().charAt(0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2 border-b border-zinc-50 px-2.5 py-2 text-right transition',
        active ? 'bg-teal-50' : hasUnread ? 'bg-rose-50/50' : 'hover:bg-zinc-50',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
          row.channel === 'shop' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800',
          closed && 'opacity-60',
        )}
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn(
              'truncate text-[12px]',
              hasUnread ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-800',
              closed && 'text-zinc-500',
            )}
          >
            {row.title}
          </span>
          <span className="shrink-0 text-[9px] text-zinc-400">{faRelativeTime(row.lastMessageAt)}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-1">
          <p className="truncate text-[11px] text-zinc-400">{row.lastMessagePreview || '—'}</p>
          <div className="flex shrink-0 items-center gap-1">
            {closed ? (
              <span className="rounded px-1 py-px text-[9px] text-zinc-400">بسته</span>
            ) : null}
            <NewMessageBadge count={hasUnread ? row.unreadForAdmin : 0} pulse={false} />
          </div>
        </div>
      </div>
    </button>
  );
}
