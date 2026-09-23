'use client';

import type { ChatMessageDto } from '@/lib/chat-types';
import { faDate, faTime } from '@/lib/format';
import { cn } from '@/ui';

function isMine(viewer: 'admin' | 'user' | 'visitor', sender: string) {
  return (
    (viewer === 'admin' && sender === 'admin') ||
    (viewer === 'user' && sender === 'user') ||
    (viewer === 'visitor' && sender === 'visitor')
  );
}

function sameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function ChatBubble({
  message,
  viewer,
  accent = 'teal',
  stacked = false,
  showTime = true,
}: {
  message: ChatMessageDto;
  viewer: 'admin' | 'user' | 'visitor';
  accent?: 'teal' | 'saffron';
  /** Tighter top when continuing the same sender */
  stacked?: boolean;
  showTime?: boolean;
}) {
  const mine = isMine(viewer, message.sender);

  return (
    <div
      className={cn('flex w-full', mine ? 'justify-end' : 'justify-start', stacked ? 'mt-0.5' : 'mt-2')}
      dir="rtl"
    >
      <div
        className={cn(
          'max-w-[78%] px-2.5 py-1.5 text-[13px] leading-5',
          mine
            ? cn(
                'rounded-2xl rounded-bl-md text-white',
                accent === 'saffron' ? 'bg-[#c9a227] text-shop-ink' : 'bg-teal-600',
              )
            : 'rounded-2xl rounded-br-md bg-white text-zinc-800 ring-1 ring-zinc-200/90',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        {showTime ? (
          <p
            className={cn(
              'mt-0.5 text-end text-[10px] leading-none tabular-nums',
              mine ? 'text-white/65' : 'text-zinc-400',
            )}
            dir="ltr"
          >
            {faTime(message.createdAt)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ChatMessageList({
  messages,
  viewer,
  accent = 'teal',
  emptyHint,
}: {
  messages: ChatMessageDto[];
  viewer: 'admin' | 'user' | 'visitor';
  accent?: 'teal' | 'saffron';
  emptyHint: string;
}) {
  if (!messages.length) {
    return (
      <div className="flex h-full min-h-[8rem] items-center justify-center px-4">
        <p className="text-center text-xs text-zinc-400">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-2.5 py-2" dir="rtl">
      {messages.map((message, index) => {
        const prev = messages[index - 1];
        const showDay = !prev || !sameDay(prev.createdAt, message.createdAt);
        const stacked = Boolean(
          prev &&
            prev.sender === message.sender &&
            !showDay &&
            new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000,
        );

        return (
          <div key={message._id}>
            {showDay ? (
              <div className="my-2.5 flex justify-center">
                <span className="rounded-full bg-zinc-200/80 px-2.5 py-0.5 text-[10px] text-zinc-500">
                  {faDate(message.createdAt)}
                </span>
              </div>
            ) : null}
            <ChatBubble
              message={message}
              viewer={viewer}
              accent={accent}
              stacked={stacked}
            />
          </div>
        );
      })}
    </div>
  );
}
