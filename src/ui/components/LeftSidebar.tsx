'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  createContext,
  useContext,
  ElementType,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, ArrowRight, Clock, Trash2, ChevronDown, Folder } from 'lucide-react';
import { FaTachometerAlt } from 'react-icons/fa';
import cn from '../lib/cn';
import { zIndex } from '../lib/zIndex';

// ─── Types ───────────────────────────────────────────────────────────────────
interface SidebarContextValue {
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
  isLtr: boolean;
  isRtl: boolean;
  pathname: string;
  activeGroup: string;
  activeItem: string;
  LinkComponent: ElementType;
  onNavigate: (href: string, item?: any) => void;
  renderBadge?: (badge: string) => React.ReactNode;
}

export type LeftSidebarProps = {
  menuSections: any[];
  t: (key: string) => string;
  dir?: 'ltr' | 'rtl';
  pathname?: string;
  activeGroup?: string;
  activeItem?: string;
  LinkComponent: ElementType;
  onNavigate: (href: string, item?: any) => void;
  dashboardHref?: string;
  renderBadge?: (badge: string) => React.ReactNode;
  hideSearchBar: boolean;
  header?: React.ReactNode;
  hideDashboardLink?: boolean;
  wide?: boolean;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within LeftSidebar');
  return ctx;
}

// ─── Search helpers ──────────────────────────────────────────────────────────

function normalizeForSearch(text: string) {
  return String(text ?? '')
    .toLowerCase()
    .trim()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ۀ/g, 'ه')
    .replace(/ة/g, 'ه')
    .replace(/\u200c/g, '');
}

function matchesQuery(query: string, ...texts: string[]) {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return true;
  return texts.some((text) => normalizeForSearch(text).includes(normalizedQuery));
}

function itemMatchesQuery(item: any, query: string, t: (text: string) => string) {
  if (!item) return false;
  if (matchesQuery(query, t(item.name), item.name, item.title && t(item.title))) return true;
  return item.subMenuItems?.some((sub: any) => itemMatchesQuery(sub, query, t));
}

function sectionMatchesQuery(section: any, query: string, t: (text: string) => string) {
  if (section.name === 'extra') return false;
  if (!query.trim()) return true;
  if (matchesQuery(query, t(section.name), section.name, section.title && t(section.title))) {
    return true;
  }
  return section.menuItems?.some((item: any) => itemMatchesQuery(item, query, t));
}

function flattenMenuItems(menuSections: any[], t: (text: string) => string) {
  const results: any[] = [];

  for (const section of menuSections) {
    if (section.name === 'extra') continue;

    const sectionLabel = t(section.name);

    if (section.href) {
      results.push({
        id: `section-${section.id}`,
        label: sectionLabel,
        path: sectionLabel,
        href: section.href,
        item: section,
      });
    }

    const walkItems = (items: any[], parentLabels = [sectionLabel]) => {
      items?.forEach((item) => {
        const itemLabel = t(item.name);
        const path = [...parentLabels, itemLabel].join(' › ');

        if (item.href) {
          results.push({
            id: `${section.id}-${item.name}`,
            label: itemLabel,
            path,
            href: item.href,
            item,
          });
        }

        if (item.subMenuItems?.length) {
          walkItems(item.subMenuItems, [...parentLabels, itemLabel]);
        }
      });
    };

    walkItems(section.menuItems, [sectionLabel]);
  }

  return results;
}

// ─── Menu list ───────────────────────────────────────────────────────────────

type MenuItemProps = {
  menu: any;
  isActive: boolean;
  onMouseEnter: (menu: any) => void;
  onMouseLeave: (menu: any) => void;
  anchorRef: React.RefObject<HTMLLIElement | null>;
};

/**
 * A section owns a floating submenu when it explicitly opts in or contains
 * navigable child structure. `forceSubmenu` keeps behavior identical across
 * routers where a section may also expose a default `href`.
 */
function hasFloatingSubmenu(menu: any) {
  const items = Array.isArray(menu?.menuItems) ? menu.menuItems : [];
  return (
    (menu?.forceSubmenu === true && items.length > 0) ||
    items.length > 1 ||
    (!menu?.href && items.length > 0) ||
    items.some((item: any) => item?.subMenuItems?.length > 0)
  );
}

function MenuItem({ menu, isActive, onMouseEnter, onMouseLeave, anchorRef }: MenuItemProps) {
  const { t, onNavigate } = useSidebar();
  const Icon = menu.icon;
  const itemRef = useRef<HTMLLIElement>(null);
  const hasSubmenu = hasFloatingSubmenu(menu);

  const handleMouseEnter = () => {
    if (!hasSubmenu) return;
    if (anchorRef && itemRef.current) (anchorRef as any).current = itemRef.current;
    onMouseEnter(menu);
  };

  const handleClick = () => {
    if (hasSubmenu) {
      handleMouseEnter();
      return;
    }
    if (menu.href) {
      onNavigate(menu.href, menu);
    }
    onMouseLeave(menu);
  };

  return (
    <li
      ref={itemRef}
      role="none"
      className="group relative flex w-full cursor-pointer flex-col items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleClick}
    >
      <span
        className={cn(
          'absolute start-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-e-full transition-all duration-300 ease-out',
          isActive ? 'bg-primary opacity-100 scale-y-100' : 'bg-primary opacity-0 scale-y-50'
        )}
      />

      <div
        role="menuitem"
        tabIndex={0}
        aria-haspopup={hasSubmenu ? 'menu' : undefined}
        className={cn(
          'flex w-full flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-all duration-200 ease-out group-focus-visible:ring-2 group-focus-visible:ring-primary/50 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-transparent',
          isActive
            ? 'bg-white/12 text-white'
            : 'text-white/70 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]'
        )}
      >
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ease-out',
            isActive ? 'bg-primary/25 scale-105' : 'group-hover:bg-white/[0.06]'
          )}
        >
          <Icon className="h-[18px] w-[18px] shrink-0 transition-transform duration-200" />
        </div>
        <span
          className={cn(
            'max-w-[90px] truncate text-[10px] font-medium leading-tight tracking-wide transition-all duration-200',
            isActive ? 'opacity-100 text-white' : 'opacity-90 group-hover:opacity-100'
          )}
          title={t(menu.name)}
        >
          {t(menu.name)}
        </span>
      </div>
    </li>
  );
}

type MenuListProps = {
  menuSections: any[];
  anchorRef: React.RefObject<HTMLLIElement | null>;
  onMenuItemHover: (menu: any) => void;
  onHoverEnd: () => void;
  searchQuery: string;
  activeItem: string;
  isDashboardActive: boolean;
};

function MenuList({
  menuSections,
  anchorRef,
  onMenuItemHover,
  onHoverEnd,
  searchQuery,
  activeItem,
  isDashboardActive,
}: MenuListProps) {
  const { t, isRtl, isLtr } = useSidebar();

  const filteredSections = useMemo(
    () => menuSections.filter((section) => sectionMatchesQuery(section, searchQuery, t)),
    [menuSections, searchQuery, t]
  );

  return (
    <div className="flex w-full flex-1 flex-col overflow-hidden px-2">
      <div className="custom-scrollbar h-full overflow-y-auto overflow-x-hidden">
        {filteredSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
              <Search className="h-5 w-5 text-white/25" />
            </div>
            <p className="text-[11px] text-white/35">{t('NoResultsFound')}</p>
          </div>
        ) : (
          <ul
            role="menu"
            className={cn('relative flex flex-col gap-0.5', {
              'left-[2px] pr-[6px]': isRtl,
              'right-[2px] pl-[6px]': isLtr,
            })}
          >
            {filteredSections.map((menu) => (
              <MenuItem
                key={menu.id}
                menu={menu}
                isActive={
                  (menu.id === activeItem ||
                    menu.name.toLowerCase() === activeItem.toLowerCase()) &&
                  !isDashboardActive
                }
                onMouseEnter={onMenuItemHover}
                onMouseLeave={onHoverEnd}
                anchorRef={anchorRef}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Floating submenu ────────────────────────────────────────────────────────

type LinkSubMenuItemProps = {
  item: any;
  onClose: () => void;
  indent?: boolean;
};

function LinkSubMenuItem({ item, onClose, indent = false }: LinkSubMenuItemProps) {
  const { t, activeItem, LinkComponent, onNavigate, renderBadge } = useSidebar();
  const isActive = activeItem === item?.name?.toLowerCase();

  const handleClick = () => {
    onNavigate(item.href ?? '#', item);
    onClose();
  };

  return (
    <LinkComponent
      href={item.href ?? '#'}
      onClick={handleClick}
      className={cn(
        'flex items-center justify-between rounded-xl py-2.5 text-[13px] font-medium capitalize transition-all duration-200',
        indent ? 'pl-8 pr-3' : 'px-3',
        isActive
          ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary-default)/0.15)]'
          : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white'
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-200',
            isActive
              ? 'bg-primary shadow-[0_0_6px_rgb(var(--primary-default)/0.28)]'
              : 'bg-gray-300 opacity-40 group-hover:opacity-60 dark:bg-gray-600'
          )}
        />
        <span className="truncate" title={t(item.name)}>
          {t(item.name)}
        </span>
      </div>
      {item?.badge?.length && renderBadge ? (
        <span className="ml-2 shrink-0">{renderBadge(item.badge)}</span>
      ) : null}
    </LinkComponent>
  );
}

type ExpandableMenuItemProps = {
  item: any;
  onClose: () => void;
};

function ExpandableMenuItem({ item, onClose }: ExpandableMenuItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { activeItem, pathname, t, isLtr, isRtl, renderBadge } = useSidebar();

  const hasActiveChild = item.subMenuItems?.some((sub: any) =>
    sub.href ? pathname === sub.href : activeItem === sub?.name?.toLowerCase()
  );

  const toggleExpanded = () => {
    if (hasActiveChild) {
      setIsExpanded(true);
    } else {
      setIsExpanded((prev) => !prev);
    }
  };

  useEffect(() => {
    if (hasActiveChild) setIsExpanded(true);
  }, [hasActiveChild]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        role="menuitem"
        aria-expanded={isExpanded}
        className={cn(
          'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium capitalize transition-all duration-200',
          hasActiveChild
            ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary'
            : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white'
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors duration-200',
              hasActiveChild ? 'text-primary' : 'text-gray-400 dark:text-gray-500'
            )}
          >
            <Folder className="h-3.5 w-3.5" />
          </span>
          <span className="truncate">{t(item.name)}</span>
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          {item?.badge?.length && renderBadge ? (
            <span className="shrink-0">{renderBadge(item.badge)}</span>
          ) : null}
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200 opacity-50',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="overflow-hidden">
          <div
            className={cn('mt-1 space-y-0.5 border-gray-200/60 dark:border-gray-700/60', {
              'ml-3.5 border-l pl-1': isLtr,
              'mr-3.5 border-r pr-1': isRtl,
            })}
          >
            {item.subMenuItems.map((sub: any) => (
              <LinkSubMenuItem key={sub.name || sub.href} item={sub} onClose={onClose} indent />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmenuContent({ menu, onClose }: { menu: any; onClose: () => void }) {
  const { t } = useSidebar();

  return (
    <motion.div
      key={menu?.name}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="border-b border-gray-100/80 px-4 py-3 dark:border-gray-800/80">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t(menu.name)}
        </p>
      </div>

      <div className="max-h-[min(420px,70vh)] overflow-y-auto custom-scrollbar p-2">
        <div className="space-y-0.5">
          {menu?.name === 'Favorites' && (!menu?.menuItems || menu.menuItems.length === 0) ? (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
              <p className="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                {t('NoFavoritePagesToShow')}
              </p>
            </div>
          ) : (
            menu?.menuItems?.map((m: any) =>
              m.subMenuItems && m.subMenuItems.length > 0 ? (
                <ExpandableMenuItem key={m.name} item={m} onClose={onClose} />
              ) : m.href ? (
                <LinkSubMenuItem key={m.name} item={m} onClose={onClose} />
              ) : null
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

type FloatingSubmenuProps = {
  anchorRef: React.RefObject<HTMLElement | null>;
  menu: any;
  isOpen: boolean;
  onClose: () => void;
  onMouseEnter: () => void;
};

function FloatingSubmenu({ anchorRef, menu, isOpen, onClose, onMouseEnter }: FloatingSubmenuProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const floatingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;

      const anchor = anchorRef.current.getBoundingClientRect();
      const panel = floatingRef.current;
      const panelW = panel?.offsetWidth || 260;
      const panelH = panel?.offsetHeight || 320;
      const gap = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scrollY = window.scrollY;

      let left = anchor.right + gap;
      if (left + panelW > vw - 8) {
        left = anchor.left - panelW - gap;
      }
      left = Math.max(8, left);

      let top = anchor.top + scrollY;
      const spaceBelow = vh - anchor.top;

      if (spaceBelow < panelH + gap) {
        top = anchor.bottom + scrollY - panelH;
      }

      top = Math.max(scrollY + 8, top);

      setPosition({ top, left });
    };

    updatePosition();
    const timeout = setTimeout(updatePosition, 10);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { passive: true });
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, anchorRef, menu]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && menu && (
        <motion.div
          ref={floatingRef}
          role="menu"
          initial={{ opacity: 0, x: -8, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -8, scale: 0.96 }}
          transition={{
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1],
            opacity: { duration: 0.15 },
            scale: { duration: 0.15 },
          }}
          style={{
            position: 'absolute',
            top: position.top,
            left: position.left,
            zIndex: 1000,
          }}
          className="w-[260px] overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/95 dark:shadow-black/40"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onClose}
        >
          <AnimatePresence mode="wait">
            <SubmenuContent key={menu?.name} menu={menu} onClose={onClose} />
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Sidebar search ──────────────────────────────────────────────────────────

const RECENT_SEARCHES_KEY = 'telc-sidebar-recent-searches';
const MAX_RECENT_SEARCHES = 8;

type RecentSearchItem = {
  id: string;
  label: string;
  path: string;
  href: string;
  itemName?: string;
};

function readRecentSearches(): RecentSearchItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.href) : [];
  } catch {
    return [];
  }
}

function writeRecentSearches(items: RecentSearchItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items.slice(0, MAX_RECENT_SEARCHES)));
  } catch {
    // ignore quota / private mode errors
  }
}

function pushRecentSearch(entry: RecentSearchItem) {
  const existing = readRecentSearches().filter((item) => item.id !== entry.id);
  writeRecentSearches([entry, ...existing]);
}

type SearchTriggerProps = {
  isOpen: boolean;
  onClick: () => void;
};

function SearchTrigger({ isOpen, onClick }: SearchTriggerProps) {
  const { t } = useSidebar();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('SearchMenu')}
      aria-expanded={isOpen}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 transition-all duration-200',
        isOpen
          ? 'bg-primary text-white shadow-md shadow-primary/25'
          : 'bg-white/[0.06] text-white/45 hover:bg-white/[0.1] hover:text-white/75 active:bg-white/[0.14]'
      )}
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="truncate text-[10px] font-medium tracking-wide opacity-80">
        {t('Search')}
      </span>
    </button>
  );
}

type ResultRowProps = {
  label: string;
  path?: string;
  selected?: boolean;
  icon?: 'search' | 'recent';
  onClick: () => void;
  isRtl: boolean;
};

function ResultRow({ label, path, selected, icon = 'search', onClick, isRtl }: ResultRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-all duration-150',
        selected ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100/80 dark:hover:bg-white/[0.04]'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          selected
            ? 'bg-primary/15 text-primary'
            : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
        )}
      >
        {icon === 'recent' ? <Clock className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-medium',
            selected ? 'text-primary' : 'text-gray-900 dark:text-gray-100'
          )}
        >
          {label}
        </p>
        {path && path !== label && (
          <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">{path}</p>
        )}
      </div>
      <ArrowRight
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          selected ? 'text-primary' : 'text-gray-300 group-hover:text-primary dark:text-gray-600',
          isRtl && 'rotate-180'
        )}
      />
    </button>
  );
}

type SearchPanelProps = {
  isOpen: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  menuSections: any[];
};

function SearchPanel({ isOpen, query, onQueryChange, onClose, menuSections }: SearchPanelProps) {
  const { t, isRtl, onNavigate } = useSidebar();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

  const allItems = useMemo(() => flattenMenuItems(menuSections, t), [menuSections, t]);

  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];
    return allItems.filter((entry) =>
      matchesQuery(query, entry.label, entry.path, entry.item?.name, t(entry.item?.name))
    );
  }, [allItems, query, t]);

  const listItems = query.trim() ? filteredResults : recentSearches;

  useEffect(() => {
    if (isOpen) {
      setRecentSearches(readRecentSearches());
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timeout = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIndex(-1);
  }, [query, isOpen]);

  const navigateToResult = useCallback(
    (result: any) => {
      pushRecentSearch({
        id: result.id,
        label: result.label,
        path: result.path,
        href: result.href,
        itemName: result.item?.name,
      });
      setRecentSearches(readRecentSearches());

      onNavigate(result.href, result.item);
      onClose();
    },
    [onClose, onNavigate]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, listItems.length - 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      }
      if (event.key === 'Enter' && selectedIndex >= 0 && listItems[selectedIndex]) {
        event.preventDefault();
        navigateToResult(listItems[selectedIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, listItems, selectedIndex, navigateToResult]);

  const clearRecent = () => {
    writeRecentSearches([]);
    setRecentSearches([]);
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        role="button"
        tabIndex={-1}
        aria-label={t('Cancel')}
        className={cn(
          'fixed inset-0 z-overlay bg-black/40 backdrop-blur-md transition-opacity duration-200 ease-out dark:bg-black/50',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-label={t('SearchMenu')}
        style={{ zIndex: zIndex.overlay + 1 }}
        className={cn(
          'fixed top-4 z-overlay w-[min(400px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl shadow-black/15 backdrop-blur-xl transition-all duration-200 ease-out dark:border-gray-700/50 dark:bg-gray-900/95 dark:shadow-black/40',
          isRtl ? 'right-[132px]' : 'left-[132px]',
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-[0.98]'
        )}
      >
        <div className="border-b border-gray-100/80 p-3 dark:border-gray-800/80">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute start-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t('SearchMenu')}
              className="w-full rounded-xl border border-gray-200/80 bg-gray-50/50 py-3 pe-20 ps-10 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/10 dark:border-gray-700/50 dark:bg-white/[0.03] dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-white/[0.05]"
            />
            <div className="absolute end-3 flex items-center gap-1.5">
              {query && (
                <button
                  type="button"
                  onClick={() => onQueryChange('')}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="hidden h-5 items-center gap-0.5 rounded-md border border-gray-200 bg-gray-50 px-1.5 text-[10px] font-medium text-gray-400 sm:inline-flex dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-500">
                ESC
              </kbd>
            </div>
          </div>
        </div>

        <div className="max-h-[min(420px,60vh)] overflow-y-auto custom-scrollbar p-2">
          {!query.trim() ? (
            recentSearches.length > 0 ? (
              <div>
                <div className="mb-1 flex items-center justify-between px-2 py-1.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    <Clock className="h-3 w-3" />
                    {t('RecentSearches')}
                  </p>
                  <button
                    type="button"
                    onClick={clearRecent}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
                  >
                    <Trash2 className="h-3 w-3" />
                    {t('ClearRecentSearches')}
                  </button>
                </div>
                <ul className="space-y-0.5" role="listbox">
                  {recentSearches.map((result, index) => (
                    <li key={result.id} role="option" aria-selected={index === selectedIndex}>
                      <ResultRow
                        label={result.label}
                        path={result.path}
                        selected={index === selectedIndex}
                        icon="recent"
                        isRtl={isRtl}
                        onClick={() => navigateToResult(result)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('SearchMenuHint')}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('NoRecentSearches')}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <kbd className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium dark:border-gray-700 dark:bg-white/[0.03]">
                    ↑↓
                  </kbd>
                  <span>to navigate</span>
                  <kbd className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium dark:border-gray-700 dark:bg-white/[0.03]">
                    ↵
                  </kbd>
                  <span>to select</span>
                </div>
              </div>
            )
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/[0.03]">
                <Search className="h-5 w-5 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('NoResultsFound')}</p>
            </div>
          ) : (
            <ul className="space-y-0.5" role="listbox">
              {filteredResults.map((result, index) => (
                <li key={result.id} role="option" aria-selected={index === selectedIndex}>
                  <ResultRow
                    label={result.label}
                    path={result.path}
                    selected={index === selectedIndex}
                    isRtl={isRtl}
                    onClick={() => navigateToResult(result)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

type SidebarSearchProps = {
  menuSections: any[];
  onChange: (state: { isOpen: boolean; query: string }) => void;
};

function SidebarSearch({ menuSections, onChange }: SidebarSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const notifyChange = useCallback(
    (nextOpen: boolean, nextQuery: string) => {
      onChange?.({
        isOpen: nextOpen,
        query: nextOpen ? nextQuery : '',
      });
    },
    [onChange]
  );

  const openSearch = useCallback(() => {
    setIsOpen(true);
    notifyChange(true, query);
  }, [notifyChange, query]);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    notifyChange(false, '');
  }, [notifyChange]);

  const toggleSearch = useCallback(() => {
    if (isOpen) {
      closeSearch();
    } else {
      openSearch();
    }
  }, [isOpen, closeSearch, openSearch]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      notifyChange(true, value);
    },
    [notifyChange]
  );

  return (
    <>
      <SearchTrigger isOpen={isOpen} onClick={toggleSearch} />
      <SearchPanel
        isOpen={isOpen}
        query={query}
        onQueryChange={handleQueryChange}
        onClose={closeSearch}
        menuSections={menuSections}
      />
    </>
  );
}

// ─── LeftSidebar ─────────────────────────────────────────────────────────────

export default function LeftSidebar({
  menuSections,
  t,
  dir = 'ltr',
  pathname = '',
  activeGroup = '',
  activeItem = '',
  LinkComponent,
  onNavigate,
  dashboardHref = '/dashboard',
  renderBadge,
  hideSearchBar,
  header,
  hideDashboardLink,
  wide,
}: LeftSidebarProps) {
  const [hoveredMenu, setHoveredMenu] = useState<any>(null);
  const [searchState, setSearchState] = useState({ isOpen: false, query: '' });
  const anchorRef = useRef<HTMLLIElement | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLtr = dir === 'ltr';
  const isRtl = dir === 'rtl';

  // Determine if the dashboard link should be active
  const isDashboardActive = Boolean(pathname && pathname.includes('dashboard'));

  const contextValue = useMemo<SidebarContextValue>(
    () => ({
      t,
      dir,
      isLtr,
      isRtl,
      pathname,
      activeGroup,
      activeItem,
      LinkComponent,
      onNavigate,
      renderBadge,
    }),
    [
      t,
      dir,
      isLtr,
      isRtl,
      pathname,
      activeGroup,
      activeItem,
      LinkComponent,
      onNavigate,
      renderBadge,
    ]
  );

  const cancelHide = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  }, []);

  const onMenuItemHover = useCallback(
    (menu: any) => {
      cancelHide();
      if (hasFloatingSubmenu(menu)) {
        setHoveredMenu(menu);
      }
    },
    [cancelHide]
  );

  const onHoverEnd = useCallback(() => {
    hideTimeout.current = setTimeout(() => {
      setHoveredMenu(null);
    }, 300);
  }, []);

  const handleSearchChange = useCallback(
    (state: { isOpen: boolean; query: string }) => {
      setSearchState(state);
      if (state.isOpen) {
        cancelHide();
        setHoveredMenu(null);
      }
    },
    [cancelHide]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <>
        <aside
          role="navigation"
          aria-label="Main navigation"
          className={cn(
            'fixed start-3 top-4 flex h-[96vh] flex-col items-center gap-3 rounded-2xl bg-sidebar-gradient py-4 shadow-xl shadow-black/20 backdrop-blur-sm',
            wide ? 'w-[220px]' : 'w-[120px]',
          )}
        >
          {header ? <div className="w-full shrink-0 px-2">{header}</div> : null}
          {!hideSearchBar ? (
            <div className="w-full px-2">
              <SidebarSearch menuSections={menuSections} onChange={handleSearchChange} />
            </div>
          ) : null}

          {header || !hideSearchBar ? (
            <div className="mx-3 h-px w-[calc(100%-24px)] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          ) : null}

          <MenuList
            menuSections={menuSections}
            anchorRef={anchorRef}
            onMenuItemHover={onMenuItemHover}
            onHoverEnd={onHoverEnd}
            searchQuery={searchState.query}
            activeItem={activeGroup}
            isDashboardActive={hideDashboardLink ? false : isDashboardActive}
          />

          {!hideDashboardLink ? (
            <div className="w-full px-2">
              <div className="mx-auto mb-1 h-px w-[calc(100%-24px)] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <LinkComponent
                href={dashboardHref}
                className={cn(
                  'flex w-full flex-col items-center gap-1.5 rounded-2xl px-2 py-2.5 transition-all duration-200',
                  isDashboardActive
                    ? 'bg-white/12 text-white'
                    : 'text-white/35 hover:bg-white/[0.06] hover:text-white/60'
                )}
                aria-label={t('Dashboard')}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                    isDashboardActive ? 'bg-primary/25 scale-105' : 'group-hover:bg-white/[0.06]'
                  )}
                >
                  <FaTachometerAlt className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[10px] font-medium tracking-wide">{t('Dashboard')}</span>
              </LinkComponent>
            </div>
          ) : null}
        </aside>

        <FloatingSubmenu
          anchorRef={anchorRef}
          menu={hoveredMenu}
          isOpen={!!hoveredMenu && !searchState.isOpen}
          onClose={onHoverEnd}
          onMouseEnter={cancelHide}
        />
      </>
    </SidebarContext.Provider>
  );
}
