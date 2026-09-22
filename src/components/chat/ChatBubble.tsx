'use client';

import type { ChatMessageDto } from '@/lib/chat-types';
import { faTime } from '@/lib/format';
import { cn } from '@/ui';

export function ChatBubble({
  message,
  viewer,
  accent = 'teal',
}: {
  message: ChatMessageDto;
  viewer: 'admin' | 'user' | 'visitor';
  accent?: 'teal' | 'saffron';
}) {
  const mine =
    (viewer === 'admin' && message.sender === 'admin') ||
    (viewer === 'user' && message.sender === 'user') ||
    (viewer === 'visitor' && message.sender === 'visitor');

  const isEnd = viewer === 'admin' ? message.sender !== 'admin' : mine;

  const bubbleAccent =
    accent === 'saffron' ? 'bg-shop-saffron text-shop-ink' : 'bg-teal-700 text-white';

  return (
    <div className={cn('flex w-full', isEnd ? 'justify-start' : 'justify-end')} dir="rtl">
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-7 shadow-sm',
          isEnd
            ? bubbleAccent
            : 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p
          className={cn(
            'mt-1 text-[10px] tabular-nums opacity-70',
            isEnd ? 'text-inherit' : 'text-zinc-500',
          )}
          dir="ltr"
        >
          {faTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
