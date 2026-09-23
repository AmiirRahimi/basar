'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { AdminChatUnreadBadge } from '@/components/chat/AdminChatUnreadBadge';
import { Pin, PinOff } from 'lucide-react';
import { cn } from '@/ui';
import { SidebarReveal } from './SidebarCollapsible';
import { SidebarMenuSearch } from './SidebarMenuSearch';
import { SidebarUser, SidebarWorkspace } from './SidebarWorkspace';

export type CountingMenuItem = {
  name: string;
  href?: string;
};

export type CountingMenuSection = {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  menuItems?: CountingMenuItem[];
};

const GROUPS: { label: string; ids: string[] }[] = [
  { label: 'کار روزانه', ids: ['dashboard', 'invoice', 'cloth', 'share', 'images', 'check', 'returned'] },
  { label: 'اطلاعات', ids: ['person', 'fabric', 'account'] },
  { label: 'سازمان', ids: ['profile', 'admin'] },
];

const EASE = 'duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]';

function normalizePath(path: string) {
  if (!path) return '/';
  const trimmed = path.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return trimmed || '/';
}

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;
  const path = normalizePath(pathname);
  const target = normalizePath(href);
  if (path === target) return true;
  // Dashboard should not stay active on every /counting/* page
  if (target === '/counting/dashboard') return false;
  return path.startsWith(`${target}/`);
}

function NavLink({
  href,
  name,
  icon: Icon,
  active,
  expanded,
  onNavigate,
  badge,
}: {
  href: string;
  name: string;
  icon?: ComponentType<{ className?: string }>;
  active: boolean;
  expanded: boolean;
  onNavigate?: () => void;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={name}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center text-[13px] font-medium transition',
        EASE,
        expanded ? 'gap-2.5 rounded-xl px-2.5 py-2' : 'mx-auto h-11 w-11 justify-center rounded-xl',
        active
          ? 'bg-white text-zinc-900 shadow-sm shadow-black/15'
          : 'text-white/68 hover:bg-white/[0.07] hover:text-white',
      )}
    >
      {Icon ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon className={cn('h-4 w-4', active ? 'text-zinc-900' : undefined)} />
        </span>
      ) : (
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', active ? 'bg-teal-600' : 'bg-white/30')} />
      )}
      <SidebarReveal show={expanded}>
        <span className={cn('flex min-w-0 flex-1 items-center gap-2', active ? 'font-semibold text-zinc-900' : undefined)}>
          <span className="truncate">{name}</span>
          {badge}
        </span>
      </SidebarReveal>
      {!expanded && badge ? <span className="absolute -top-0.5 -end-0.5">{badge}</span> : null}
    </Link>
  );
}

export function CountingSidebar({
  pathname,
  menuSections,
  mobileOpen,
  expanded,
  pinned,
  onExpandedChange,
  onPinnedChange,
  onClose,
}: {
  pathname: string;
  menuSections: CountingMenuSection[];
  mobileOpen: boolean;
  expanded: boolean;
  pinned: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onPinnedChange: (pinned: boolean) => void;
  onClose: () => void;
}) {
  const grouped = GROUPS.map((group) => ({
    ...group,
    items: group.ids
      .map((id) => menuSections.find((section) => section.id === id))
      .filter(Boolean) as CountingMenuSection[],
  })).filter((group) => group.items.length);

  const leftover = menuSections.filter((section) => !GROUPS.some((group) => group.ids.includes(section.id)));
  const navGroups = leftover.length ? [...grouped, { label: 'سایر', items: leftover }] : grouped;

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="بستن منو"
          className="fixed inset-0 z-[55] bg-black/45 md:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        role="navigation"
        aria-label="منوی شمارش"
        onMouseEnter={() => onExpandedChange(true)}
        onMouseLeave={() => {
          if (!pinned) onExpandedChange(false);
        }}
        className={cn(
          'fixed z-30 flex flex-col overflow-hidden rounded-3xl bg-sidebar-gradient py-3 text-white shadow-lg shadow-black/15',
          'start-5 top-14 bottom-16',
          'transition-[width]',
          EASE,
          expanded ? 'w-[256px]' : 'w-[72px]',
          'max-md:z-[60] max-md:start-0 max-md:top-0 max-md:bottom-0 max-md:h-full max-md:rounded-none max-md:shadow-xl max-md:transition-transform max-md:duration-200',
          mobileOpen ? 'max-md:w-[min(320px,88vw)] max-md:translate-x-0' : 'max-md:pointer-events-none max-md:w-[min(320px,88vw)] max-md:translate-x-full',
        )}
      >
        <div className={cn('shrink-0', expanded ? 'px-2.5 pb-2' : 'px-1.5 pb-1')}>
          <div
            className={cn(
              'mb-2 flex rounded-2xl bg-white/[0.07] ring-1 ring-white/10',
              expanded ? 'items-center gap-2 px-2 py-2' : 'mx-auto w-fit items-center justify-center p-1',
            )}
          >
            <BrandLogo variant="mark" className="h-9 w-9 shrink-0" />
            {expanded ? (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-5 tracking-tight">باسار</p>
                  <p className="text-[10px] leading-4 text-white/45">نرم‌افزار حسابداری تحت وب مخصوص عمده‌فروشی</p>
                </div>
                <button
                  type="button"
                  title={pinned ? 'بازگشت به حالت هاور' : 'همیشه باز بماند'}
                  aria-label={pinned ? 'بازگشت به حالت هاور' : 'همیشه باز بماند'}
                  aria-pressed={pinned}
                  onClick={(event) => {
                    event.stopPropagation();
                    onPinnedChange(!pinned);
                  }}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition',
                    pinned ? 'bg-white/15 text-white' : 'text-white/45 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </button>
              </>
            ) : null}
          </div>
          <SidebarWorkspace expanded={expanded} />
          <SidebarMenuSearch sections={menuSections} expanded={expanded} onNavigate={onClose} />
        </div>

        <nav
          className={cn(
            'min-h-0 flex-1 overflow-x-hidden pb-2',
            expanded
              ? 'custom-scrollbar overflow-y-auto px-2'
              : 'overflow-y-auto px-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {navGroups.map((group) => (
            <div key={group.label} className="mb-2">
              <div
                className={cn(
                  'grid transition-[grid-template-rows,opacity]',
                  EASE,
                  expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className="mb-0.5 px-3 text-[10px] font-medium tracking-wide text-white/35">{group.label}</p>
                </div>
              </div>
              <div className={cn('flex flex-col', expanded ? 'gap-0.5' : 'gap-1.5')}>
                {group.items.map((section) => {
                  const children = section.menuItems?.filter((item) => item.href) || [];
                  if (!section.href && children.length) {
                    const sectionActive = children.some((item) => isActivePath(pathname, item.href));
                    const SectionIcon = section.icon;
                    return (
                      <div key={section.id} className={expanded ? 'pt-1' : 'pt-0.5'}>
                        <div
                          className={cn(
                            'flex items-center text-[13px] font-medium',
                            expanded ? 'gap-2.5 rounded-xl px-2.5 py-2' : 'mx-auto h-11 w-11 justify-center rounded-xl',
                            sectionActive ? 'text-white' : 'text-white/55',
                          )}
                          title={section.name}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                            <SectionIcon className="h-4 w-4" />
                          </span>
                          <SidebarReveal show={expanded}>
                            <span className="truncate">{section.name}</span>
                          </SidebarReveal>
                        </div>
                        <div
                          className={cn(
                            'grid transition-[grid-template-rows,opacity]',
                            EASE,
                            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                          )}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className={cn('flex flex-col', expanded ? 'mt-1 gap-1 border-s border-white/15 ps-2 ms-4' : 'mt-1.5 gap-1.5')}>
                              {children.map((item) => (
                                <NavLink
                                  key={item.href}
                                  href={item.href!}
                                  name={item.name}
                                  active={isActivePath(pathname, item.href)}
                                  expanded={expanded}
                                  onNavigate={onClose}
                                  badge={
                                    item.href === '/counting/admin/messages' ? (
                                      <AdminChatUnreadBadge />
                                    ) : undefined
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={section.id}>
                      {section.href ? (
                        <NavLink
                          href={section.href}
                          name={section.name}
                          icon={section.icon}
                          active={isActivePath(pathname, section.href)}
                          expanded={expanded}
                          onNavigate={onClose}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={cn('shrink-0 pb-1 pt-1', expanded ? 'px-2.5' : 'px-1.5')}>
          <SidebarUser expanded={expanded} />
        </div>
      </aside>
    </>
  );
}
