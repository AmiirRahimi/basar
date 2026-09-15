'use client';

import type { ElementType, ReactNode } from 'react';
import { Avatar, Popover } from 'rizzui';
import {
  Settings,
  LogOut,
  ChevronRight,
  User,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import cn from '../lib/cn';

export interface MenuItem {
  label: string;
  href?: string;
  icon?: ReactNode;
  onClick?: () => void;
  divider?: boolean;
  className?: string;
}

export interface ProfileMenuProps {
  user?: {
    avatar?: string;
    username?: string;
    displayName?: string;
    hasSuperAccess?: boolean;
  };
  /** Fallback avatar image when `user.avatar` is empty. */
  defaultAvatar?: string;
  menuItems?: MenuItem[];
  onLogout?: () => void;
  onNavigate?: () => void;
  labels?: {
    welcome?: string;
    signOut?: string;
    profileSetting?: string;
    settings?: string;
    superAccessActive?: string;
  };
  isRtl?: boolean;
  isConnected?: boolean;
  LinkComponent?: ElementType;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  buttonClassName?: string;
  avatarClassName?: string;
  popoverClassName?: string;
  placement?: 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start';
  showStatusDot?: boolean;
}

const DEFAULT_LABELS = {
  welcome: 'welcome',
  signOut: 'signOut',
  profileSetting: 'ProfileSetting',
  settings: 'settings',
  superAccessActive: 'superAccessActive',
};

// --- Dropdown Content ---
function DropdownMenuContent({
  user,
  defaultAvatar,
  menuItems,
  onLogout,
  onNavigate,
  labels,
  isRtl,
  LinkComponent = 'a'
}: Pick<
  ProfileMenuProps,
  | 'user'
  | 'defaultAvatar'
  | 'menuItems'
  | 'onLogout'
  | 'onNavigate'
  | 'labels'
  | 'isRtl'
  | 'LinkComponent'
>) {
  const t = labels || DEFAULT_LABELS;
  const hasSuperAccess = user?.hasSuperAccess ?? false;
  const username = user?.username || user?.displayName || 'User';

  const defaultMenuItems: MenuItem[] = [
    {
      label: t.profileSetting!,
      href: '/user-profile',
      icon: <User className="h-4 w-4" />,
    },
    {
      label: t.settings!,
      href: '/user-profile',
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  const items = menuItems || defaultMenuItems;

  const handleItemClick = (item: MenuItem, e?: React.MouseEvent) => {
    if (item.onClick) {
      e?.preventDefault();
      item.onClick();
    }
    onNavigate?.();
  };

  return (
    <div className="w-72 text-left rtl:text-right">
      <div className="flex items-center gap-3 border-b border-gray-100/80 px-5 pb-4 pt-5 dark:border-gray-800/80">
        <div className="relative">
          <Avatar
            src={user?.avatar || defaultAvatar}
            name={username}
            className="!h-11 !w-11 ring-2 ring-primary/20"
          />
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)] dark:border-gray-900" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {username === 'defaultUser' ? t.welcome : username}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{t.welcome}</p>
          {hasSuperAccess && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3 w-3" />
              {t.superAccessActive}
            </div>
          )}
        </div>
      </div>

      <div className="p-2">
        {items.map((item, index) => {
          const hasHref = !!item.href;
          const commonClasses = cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white',
            item.className
          );

          if (hasHref) {
            return (
              <LinkComponent
                key={index}
                href={item.href}
                className={commonClasses}
                onClick={(e: React.MouseEvent) => handleItemClick(item, e)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.04]">
                  {item.icon || <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
                </div>
                {item.label}
                {isRtl ? (
                  <ChevronRight className="ml-auto h-4 w-4 text-gray-300 dark:text-gray-600" />
                ) : (
                  <ChevronLeft className="ml-auto h-4 w-4 text-gray-300 dark:text-gray-600" />
                )}
              </LinkComponent>
            );
          }

          return (
            <button
              key={index}
              type="button"
              className={cn('w-full', commonClasses)}
              onClick={(e) => handleItemClick(item, e)}
            >
              <div className='flex justify-between items-center w-full'>
                <div className='flex gap-3'>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.04]">
                    {item.icon || <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
                  </div>
                  <span className='flex items-center'>
                    {item.label}
                  </span>
                </div>
                {isRtl ? (
                  <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                ) : (
                  <ChevronLeft className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-gray-100/80 p-2 dark:border-gray-800/80">
        <button
          type="button"
          onClick={() => {
            onLogout?.();
            onNavigate?.();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">
            <LogOut className="h-4 w-4" />
          </div>
          {t.signOut}
        </button>
      </div>
    </div>
  );
}

// --- Main ProfileMenu ---
export function ProfileMenu({
  user,
  defaultAvatar,
  menuItems,
  onLogout,
  onNavigate,
  labels,
  isRtl = false,
  isConnected,
  open: controlledOpen,
  onOpenChange,
  buttonClassName,
  avatarClassName,
  popoverClassName,
  placement = 'bottom-end',
  showStatusDot = true,
  LinkComponent
}: ProfileMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleSetIsOpen = (value: React.SetStateAction<boolean>) => {
    const newOpen = typeof value === 'function' ? value(open) : value;
    if (isControlled) {
      onOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const hasSuperAccess = user?.hasSuperAccess ?? false;

  return (
    <Popover
      isOpen={open}
      setIsOpen={handleSetIsOpen}
      shadow="lg"
      placement={placement}
    >
      <Popover.Trigger>
        <button
          className={cn(
            'relative flex h-9 w-9 items-center justify-center rounded-full outline-none transition-all duration-200 hover:ring-2 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 active:scale-95 sm:h-10 sm:w-10',
            buttonClassName
          )}
        >
          <Avatar
            src={user?.avatar || defaultAvatar}
            name={user?.username || 'User'}
            className={cn(
              '!h-9 !w-9 sm:!h-10 sm:!w-10 ring-2',
              hasSuperAccess ? 'ring-emerald-400/70' : 'ring-gray-200 dark:ring-gray-700',
              avatarClassName
            )}
          />
          {hasSuperAccess && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.55)] ring-2 ring-white dark:ring-gray-900">
              <ShieldCheck className="h-2.5 w-2.5" />
            </span>
          )}
          {showStatusDot && (
            <span
              className={cn(
                'absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-900',
                isConnected === true
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                  : isConnected === false
                  ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]'
                  : 'bg-gray-300 dark:bg-gray-600'
              )}
            />
          )}
        </button>
      </Popover.Trigger>

      <Popover.Content
        className={cn(
          'z-popover w-auto border-gray-200/80 p-0 dark:border-gray-700/50 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl shadow-black/10 dark:shadow-black/40 [&>svg]:hidden',
          popoverClassName
        )}
      >
        <DropdownMenuContent
          user={user}
          defaultAvatar={defaultAvatar}
          menuItems={menuItems}
          onLogout={onLogout}
          onNavigate={onNavigate}
          labels={labels}
          isRtl={isRtl}
          LinkComponent={LinkComponent}
        />
      </Popover.Content>
    </Popover>
  );
}