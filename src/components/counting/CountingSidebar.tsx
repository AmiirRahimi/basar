'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import { cn } from '@/ui';
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
  { label: 'سازمان', ids: ['store', 'subscription', 'admin'] },
];

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;
  if (pathname === href) return true;
  if (href === '/counting/dashboard') return false;
  return pathname.startsWith(href);
}

function NavLink({
  href,
  name,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  name: string;
  icon?: ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[13px] font-medium transition',
        active
          ? 'bg-white/12 text-white'
          : 'text-white/68 hover:bg-white/[0.07] hover:text-white',
      )}
    >
      <span
        className={cn(
          'absolute start-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-e-full transition',
          active ? 'bg-primary opacity-100' : 'opacity-0',
        )}
      />
      {Icon ? (
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition',
            active ? 'bg-primary/25 text-white' : 'bg-white/[0.05] text-white/70 group-hover:text-white',
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      ) : (
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', active ? 'bg-primary' : 'bg-white/30')} />
      )}
      <span className="truncate">{name}</span>
    </Link>
  );
}

export function CountingSidebar({
  pathname,
  menuSections,
  mobileOpen,
  onClose,
}: {
  pathname: string;
  menuSections: CountingMenuSection[];
  mobileOpen: boolean;
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
        className={cn(
          'fixed z-30 flex w-[256px] flex-col overflow-hidden rounded-3xl bg-sidebar-gradient py-3 text-white shadow-lg shadow-black/15',
          'start-5 top-14 bottom-16',
          'max-md:z-[60] max-md:start-0 max-md:top-0 max-md:bottom-0 max-md:h-full max-md:w-[min(320px,88vw)] max-md:rounded-none max-md:shadow-xl max-md:transition-transform max-md:duration-200',
          mobileOpen ? 'max-md:translate-x-0' : 'max-md:pointer-events-none max-md:translate-x-full',
        )}
      >
        <div className="shrink-0 px-2.5 pb-2">
          <div className="mb-2 flex items-center gap-2.5 rounded-2xl bg-white/[0.07] px-2 py-2 ring-1 ring-white/10">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-900 shadow-sm">
              ب
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-5 tracking-tight">باسار</p>
              <p className="truncate text-[10px] leading-4 text-white/45">پنل شمارش</p>
            </div>
          </div>
          <SidebarWorkspace />
        </div>

        <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="mb-0.5 px-3 text-[10px] font-medium tracking-wide text-white/35">{group.label}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((section) => {
                  const children = section.menuItems?.filter((item) => item.href) || [];
                  if (!section.href && children.length) {
                    return (
                      <div key={section.id} className="pt-0.5">
                        <p className="mb-0.5 flex items-center gap-2 px-2.5 py-1 text-[11px] text-white/45">
                          <section.icon className="h-3.5 w-3.5" />
                          {section.name}
                        </p>
                        {children.map((item) => (
                          <NavLink
                            key={item.href}
                            href={item.href!}
                            name={item.name}
                            active={isActivePath(pathname, item.href)}
                            onNavigate={onClose}
                          />
                        ))}
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

        <div className="shrink-0 px-2.5 pb-1 pt-1">
          <SidebarUser />
        </div>
      </aside>
    </>
  );
}
