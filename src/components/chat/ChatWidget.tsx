'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  countingUnread,
  getCountingThread,
  getShopThread,
  markCountingRead,
  markShopRead,
  sendCountingMessage,
  sendShopMessage,
  shopUnread,
  startShopThread,
} from '@/actions/chat';
import type { ChatThreadDto } from '@/lib/chat-types';
import { cn } from '@/ui';
import { ChatPanel } from './ChatPanel';
import { NewMessageBadge } from './NewMessageBadge';
import { useChatPolling } from './useChatPolling';

type Variant = 'counting' | 'shop';

export function ChatWidget({
  variant,
  className,
  openSignal,
}: {
  variant: Variant;
  className?: string;
  /** Increment to force-open (e.g. contact page CTA). */
  openSignal?: number;
}) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  openRef.current = open;
  const [thread, setThread] = useState<ChatThreadDto | null>(null);
  const [unread, setUnread] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestBody, setGuestBody] = useState('');
  const [pending, start] = useTransition();
  const lastAdminReply = useRef<string>('');
  const needsGuestForm = variant === 'shop' && !thread;

  const refreshUnread = useCallback(async () => {
    const res = variant === 'counting' ? await countingUnread() : await shopUnread();
    if (res.ok && res.data) setUnread(res.data.unread);
  }, [variant]);

  const refreshThread = useCallback(async () => {
    if (variant === 'counting') {
      const res = await getCountingThread();
      if (res.ok) {
        if (res.data) {
          maybeToastNewReply(res.data);
          setThread(res.data);
          setUnread(res.data.conversation.unreadForVisitor);
        } else {
          setThread(null);
        }
      }
      return;
    }
    const res = await getShopThread();
    if (res.ok) {
      if (res.data) {
        maybeToastNewReply(res.data);
        setThread(res.data);
        setUnread(res.data.conversation.unreadForVisitor);
      } else {
        setThread(null);
      }
    }
  }, [variant]);

  function maybeToastNewReply(next: ChatThreadDto) {
    const lastAdmin = [...next.messages].reverse().find((m) => m.sender === 'admin');
    if (!lastAdmin) return;
    if (!lastAdminReply.current) {
      lastAdminReply.current = lastAdmin._id;
      return;
    }
    if (lastAdmin._id !== lastAdminReply.current) {
      lastAdminReply.current = lastAdmin._id;
      if (!openRef.current) {
        toast.success('پاسخ جدید از پشتیبانی', { id: 'chat-admin-reply' });
      }
    }
  }

  useChatPolling(
    async () => {
      if (open) await refreshThread();
      else await refreshUnread();
    },
    { active: open },
  );

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    if (openSignal && openSignal > 0) setOpen(true);
  }, [openSignal]);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener('basar-open-chat', onOpen);
    return () => window.removeEventListener('basar-open-chat', onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    start(async () => {
      await refreshThread();
      if (variant === 'counting') await markCountingRead();
      else await markShopRead();
      setUnread(0);
    });
  }, [open, refreshThread, variant]);

  async function handleSend(body: string) {
    if (variant === 'counting') {
      const res = await sendCountingMessage(body);
      if (!res.ok) {
        toast.error(res.message || 'ارسال نشد');
        return;
      }
      if (res.data) setThread(res.data);
      return;
    }
    const res = await sendShopMessage(body);
    if (!res.ok) {
      toast.error(res.message || 'ارسال نشد');
      return;
    }
    if (res.data) setThread(res.data);
  }

  function startGuest() {
    start(async () => {
      const res = await startShopThread({
        name: guestName,
        phone: guestPhone,
        body: guestBody,
      });
      if (!res.ok) {
        toast.error(res.message || 'شروع گفتگو ممکن نشد');
        return;
      }
      if (res.data) {
        setThread(res.data);
        setGuestBody('');
        setUnread(0);
      }
    });
  }

  const accent = variant === 'shop' ? 'saffron' : 'teal';
  const fabClass =
    variant === 'shop'
      ? 'bg-shop-saffron text-shop-ink shadow-shop-saffron/30 hover:bg-[#d4ae5a]'
      : 'bg-teal-700 text-white shadow-teal-900/25 hover:bg-teal-800';

  return (
    <div className={cn('pointer-events-none fixed z-[60]', className)} dir="rtl">
      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'pointer-events-auto fixed bottom-20 left-4 flex w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-2xl shadow-black/20 sm:bottom-24 sm:left-6',
              'h-[min(70vh,32rem)]',
            )}
          >
            {needsGuestForm ? (
              <div className="flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-shop-ink">گفتگو با فروشگاه</h2>
                    <p className="mt-1 text-xs leading-6 text-shop-ink/60">
                      نام و موبایل را وارد کنید تا پشتیبانی پاسخ دهد.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="بستن"
                    className="rounded-xl p-1.5 text-zinc-500 hover:bg-zinc-100"
                    onClick={() => setOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  <input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="نام"
                    className="w-full rounded-2xl border border-shop-ink/10 bg-shop-paper px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-shop-saffron/40"
                  />
                  <input
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="۰۹۱۲…"
                    dir="ltr"
                    className="w-full rounded-2xl border border-shop-ink/10 bg-shop-paper px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-shop-saffron/40"
                  />
                  <textarea
                    value={guestBody}
                    onChange={(e) => setGuestBody(e.target.value)}
                    placeholder="پیام شما…"
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-shop-ink/10 bg-shop-paper px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-shop-saffron/40"
                  />
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={startGuest}
                  className="mt-auto rounded-full bg-shop-saffron px-4 py-2.5 text-sm font-medium text-shop-ink disabled:opacity-50"
                >
                  شروع گفتگو
                </button>
              </div>
            ) : (
              <ChatPanel
                title={variant === 'shop' ? 'پشتیبانی فروشگاه' : 'پشتیبانی شمارش'}
                subtitle={
                  thread?.conversation.status === 'closed'
                    ? 'گفتگوی قبلی بسته شده — پیام جدید گفتگوی تازه می‌سازد'
                    : variant === 'shop'
                      ? 'پاسخ معمولاً در ساعات کاری ارسال می‌شود'
                      : 'پیام به ادمین پلتفرم'
                }
                messages={thread?.messages || []}
                viewer={variant === 'shop' ? 'visitor' : 'user'}
                accent={accent}
                sending={pending}
                onSend={handleSend}
                composerPlaceholder={
                  thread?.conversation.status === 'closed'
                    ? 'پیام جدید برای شروع گفتگوی تازه…'
                    : undefined
                }
                headerRight={
                  <button
                    type="button"
                    aria-label="بستن"
                    className="rounded-xl p-1.5 text-zinc-500 hover:bg-zinc-100"
                    onClick={() => setOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                }
              />
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        aria-label="گفتگو با پشتیبانی"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition',
          fabClass,
          // Physical left; sit above shop cart FAB on small screens
          variant === 'shop'
            ? 'fixed bottom-24 left-4 sm:bottom-6 sm:left-6 md:bottom-6'
            : 'fixed bottom-6 left-4 sm:left-6',
        )}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open ? <NewMessageBadge count={unread} className="absolute -top-1 -start-1" /> : null}
      </button>
    </div>
  );
}
