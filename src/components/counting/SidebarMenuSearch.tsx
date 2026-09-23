'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { getRecentMenuSearches, recordMenuSearch } from '@/actions/menu-search';
import { MENU_KEYWORDS, searchMenuItems, type RecentMenuSearch } from '@/lib/menu-search';
import { cn, Modal } from '@/ui';
import type { CountingMenuSection } from './CountingSidebar';

function flattenMenu(sections: CountingMenuSection[]) {
  const rows: { href: string; label: string; keywords: string[] }[] = [];
  for (const section of sections) {
    if (section.href) {
      rows.push({
        href: section.href,
        label: section.name,
        keywords: MENU_KEYWORDS[section.id] || [section.name],
      });
    }
    for (const item of section.menuItems || []) {
      if (!item.href) continue;
      const key = item.href.split('/').filter(Boolean).pop() || item.name;
      rows.push({
        href: item.href,
        label: item.name,
        keywords: MENU_KEYWORDS[key] || [item.name, section.name],
      });
    }
  }
  return rows;
}

export function SidebarMenuSearch({
  sections,
  expanded,
  onNavigate,
}: {
  sections: CountingMenuSection[];
  expanded: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<RecentMenuSearch[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useMemo(() => flattenMenu(sections), [sections]);

  const suggestions = useMemo(() => searchMenuItems(query, catalog), [query, catalog]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    void getRecentMenuSearches().then((res) => {
      if (res.ok && res.data) setRecent(res.data.items);
    });
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  async function go(href: string, label: string, typed: string) {
    const text = typed.trim() || label;
    setOpen(false);
    onNavigate?.();
    router.push(href);
    const res = await recordMenuSearch({ query: text, href, label });
    if (res.ok && res.data) setRecent(res.data.items);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const list = query.trim() ? suggestions : recent;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, Math.max(list.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (query.trim() && suggestions[active]) {
        void go(suggestions[active].href, suggestions[active].label, query);
      } else if (!query.trim() && recent[active]) {
        void go(recent[active].href, recent[active].label, recent[active].query);
      }
    }
  }

  return (
    <>
      <button
        type="button"
        title="جستجوی منو"
        aria-label="جستجوی منو"
        onClick={() => setOpen(true)}
        className={cn(
          'mt-2 flex items-center border border-white/10 bg-white/[0.06] text-[13px] text-white/75 transition hover:bg-white/10 hover:text-white',
          expanded ? 'w-full gap-2 rounded-xl px-3 py-2' : 'mx-auto h-11 w-11 justify-center rounded-xl',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-white/70" />
        {expanded ? <span className="truncate text-white/50">جستجو در منو</span> : null}
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="جستجوی منو"
        size="md"
        rounded="lg"
      >
        <div className="px-4 pb-4 pt-1" dir="rtl" onKeyDown={onKeyDown}>
          <label className="relative block">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="مثلاً لباس، فروش، فاکتور…"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pe-3 ps-9 text-sm outline-none focus:border-teal-600 focus:bg-white"
            />
          </label>

          {query.trim() ? (
            <ul className="mt-3 max-h-72 overflow-y-auto">
              {suggestions.length === 0 ? (
                <li className="px-2 py-6 text-center text-sm text-zinc-400">موردی پیدا نشد.</li>
              ) : (
                suggestions.map((item, index) => (
                  <li key={item.href}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => void go(item.href, item.label, query)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-right text-sm',
                        index === active ? 'bg-teal-50 text-teal-900' : 'hover:bg-zinc-50',
                      )}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="text-[11px] text-zinc-400">رفتن</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <div className="mt-3">
              <p className="px-1 text-[11px] text-zinc-400">جستجوهای اخیر</p>
              {recent.length === 0 ? (
                <p className="px-1 py-4 text-sm text-zinc-400">هنوز جستجویی ذخیره نشده است.</p>
              ) : (
                <ul className="mt-1">
                  {recent.map((item, index) => (
                    <li key={`${item.href}-${item.query}-${item.at}`}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(index)}
                        onClick={() => void go(item.href, item.label, item.query)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-right',
                          index === active ? 'bg-teal-50' : 'hover:bg-zinc-50',
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-zinc-800">{item.label}</span>
                          <span className="block truncate text-[11px] text-zinc-400">{item.query}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
