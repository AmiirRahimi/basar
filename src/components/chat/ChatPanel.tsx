'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { ChatMessageDto, ChatSendPayload } from '@/lib/chat-types';
import { CHAT_MESSAGE_MAX } from '@/lib/constants';
import { cn } from '@/ui';
import { ImagePlus, Send, X } from 'lucide-react';
import { ChatMessageList } from './ChatBubble';

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
  composerPlaceholder = 'پیام…',
  readOnly = false,
  readOnlyHint = 'این گفتگو بسته شده است.',
  allowImages = true,
}: {
  title: string;
  subtitle?: string;
  messages: ChatMessageDto[];
  viewer: 'admin' | 'user' | 'visitor';
  accent?: 'teal' | 'saffron';
  emptyHint?: string;
  sending?: boolean;
  onSend: (payload: ChatSendPayload) => Promise<boolean | void> | boolean | void;
  headerRight?: React.ReactNode;
  className?: string;
  composerPlaceholder?: string;
  readOnly?: boolean;
  readOnlyHint?: string;
  allowImages?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [pending, start] = useTransition();
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = Boolean(sending) || pending;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, messages.at(-1)?._id]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [draft]);

  useEffect(() => {
    if (readOnly) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [readOnly]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    if (readOnly) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.length !== 1) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const el = inputRef.current;
      if (!el || el.disabled) return;
      const next = (el.value + event.key).slice(0, CHAT_MESSAGE_MAX);
      setDraft(next);
      event.preventDefault();
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(next.length, next.length);
      });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [readOnly]);

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    if (fileRef.current) fileRef.current.value = '';
  }

  function onPickImage(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function submit() {
    const body = draft.trim();
    if ((!body && !imageFile) || busy || readOnly) return;
    start(async () => {
      try {
        const sent = await onSend({ body, imageFile });
        if (sent !== false) {
          setDraft('');
          clearImage();
          inputRef.current?.focus();
        }
      } catch {
        // Keep the draft. The caller surfaces a message when send fails.
      }
    });
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-white', className)} dir="rtl">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-100 bg-white px-3 py-2">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold text-zinc-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 truncate text-[11px] text-zinc-400">{subtitle}</p> : null}
        </div>
        {headerRight}
      </header>

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f4f4f5_0%,#fafafa_40%,#f4f4f5_100%)]"
      >
        <ChatMessageList
          messages={messages}
          viewer={viewer}
          accent={accent}
          emptyHint={emptyHint}
        />
      </div>

      {readOnly ? (
        <div className="shrink-0 border-t border-zinc-100 bg-zinc-50 px-3 py-2 text-center text-[11px] text-zinc-500">
          {readOnlyHint}
        </div>
      ) : (
        <form
          noValidate
          className="shrink-0 border-t border-zinc-100 bg-white p-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {imagePreview ? (
            <div className="mb-2 flex items-start gap-2 rounded-xl bg-zinc-50 p-2 ring-1 ring-zinc-200/80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-zinc-600">{imageFile?.name || 'تصویر'}</p>
                <p className="mt-0.5 text-[10px] text-zinc-400">همراه پیام ارسال می‌شود</p>
              </div>
              <button
                type="button"
                aria-label="حذف تصویر"
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                onClick={clearImage}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-1.5 rounded-2xl bg-zinc-100/90 px-1.5 py-1 ring-1 ring-zinc-200/80">
            {allowImages ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => onPickImage(event.target.files)}
                />
                <button
                  type="button"
                  aria-label="ارسال تصویر"
                  disabled={busy}
                  className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800 disabled:opacity-35"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
              </>
            ) : null}
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, CHAT_MESSAGE_MAX))}
              rows={1}
              placeholder={composerPlaceholder}
              disabled={busy}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="max-h-24 min-h-[34px] flex-1 resize-none !border-0 bg-transparent px-2 py-1.5 text-[13px] leading-5 text-zinc-900 !shadow-none outline-none !ring-0 placeholder:text-zinc-400 focus:!border-0 focus:!shadow-none focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0 disabled:opacity-60"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            <button
              type="submit"
              disabled={busy || (!draft.trim() && !imageFile)}
              aria-label="ارسال"
              className={cn(
                'mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition disabled:opacity-35',
                accent === 'saffron'
                  ? 'bg-shop-saffron text-shop-ink hover:brightness-95'
                  : 'bg-teal-600 text-white hover:bg-teal-700',
              )}
            >
              <Send className="h-3.5 w-3.5 -scale-x-100" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
