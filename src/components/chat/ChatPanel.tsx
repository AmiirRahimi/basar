'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { ChatMessageDto } from '@/lib/chat-types';
import { CHAT_MESSAGE_MAX } from '@/lib/constants';
import { cn } from '@/ui';
import { Send } from 'lucide-react';
import { ChatBubble } from './ChatBubble';

export function ChatPanel({
  title,
  subtitle,
  messages,
  viewer,
  accent = 'teal',
  emptyHint = 'هنوز پیامی نیست. اولین پیام را بفرستید.',
  sending,
  onSend,
  headerRight,
  className,
  composerPlaceholder = 'پیام خود را بنویسید…',
  readOnly = false,
  readOnlyHint = 'این گفتگو بسته شده است.',
}: {
  title: string;
  subtitle?: string;
  messages: ChatMessageDto[];
  viewer: 'admin' | 'user' | 'visitor';
  accent?: 'teal' | 'saffron';
  emptyHint?: string;
  sending?: boolean;
  onSend: (body: string) => Promise<void> | void;
  headerRight?: React.ReactNode;
  className?: string;
  composerPlaceholder?: string;
  readOnly?: boolean;
  readOnlyHint?: string;
}) {
  const [draft, setDraft] = useState('');
  const [pending, start] = useTransition();
  const scroller = useRef<HTMLDivElement>(null);
  const busy = Boolean(sending) || pending;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, messages.at(-1)?._id]);

  function submit() {
    const body = draft.trim();
    if (!body || busy || readOnly) return;
    start(async () => {
      await onSend(body);
      setDraft('');
    });
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)} dir="rtl">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-700">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
          {subtitle ? <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p> : null}
        </div>
        {headerRight}
      </header>

      <div ref={scroller} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-zinc-500">{emptyHint}</p>
        ) : (
          messages.map((message) => (
            <ChatBubble key={message._id} message={message} viewer={viewer} accent={accent} />
          ))
        )}
      </div>

      {readOnly ? (
        <div className="shrink-0 border-t border-zinc-200/80 px-4 py-3 text-center text-xs text-zinc-500 dark:border-zinc-700">
          {readOnlyHint}
        </div>
      ) : (
        <form
          className="shrink-0 border-t border-zinc-200/80 p-3 dark:border-zinc-700"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, CHAT_MESSAGE_MAX))}
              rows={2}
              placeholder={composerPlaceholder}
              disabled={busy}
              className="min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 outline-none ring-teal-600/30 placeholder:text-zinc-400 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="ارسال"
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white transition disabled:opacity-40',
                accent === 'saffron' ? 'bg-shop-saffron text-shop-ink' : 'bg-teal-700 hover:bg-teal-800',
              )}
            >
              <Send className="h-4 w-4 -scale-x-100" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
