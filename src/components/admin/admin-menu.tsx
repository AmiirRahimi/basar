'use client';

import {
  Coins,
  Globe,
  LayoutDashboard,
  List,
  MessageSquare,
  MessageSquareText,
  Receipt,
  Send,
  Shield,
  ShoppingBag,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import type { AccountingMenuSection } from '@/components/accounting/AccountingSidebar';

export const adminMenuGroups = [
  { label: 'سوپریوزر', ids: ['access', 'prices'] },
  { label: 'نمای کلی', ids: ['dashboard'] },
  { label: 'کاربران', ids: ['users', 'usage', 'plans'] },
  { label: 'ارتباط', ids: ['messages', 'sms', 'telegram'] },
  { label: 'فروشگاه', ids: ['orders', 'storefront', 'website', 'dropdowns'] },
];

export const adminMenuSections: AccountingMenuSection[] = [
  { id: 'access', name: 'دسترسی پنل ادمین', icon: Shield, href: '/admin/access', menuItems: [] },
  { id: 'prices', name: 'قیمت‌ها', icon: Coins, href: '/admin/prices', menuItems: [] },
  { id: 'dashboard', name: 'داشبورد', icon: LayoutDashboard, href: '/admin', menuItems: [] },
  { id: 'users', name: 'کاربران و اشتراک', icon: Users, href: '/admin/users', menuItems: [] },
  { id: 'usage', name: 'اشتراک و توکن', icon: Sparkles, href: '/admin/usage', menuItems: [] },
  { id: 'plans', name: 'طرح‌های اشتراک', icon: Ticket, href: '/admin/plans', menuItems: [] },
  { id: 'messages', name: 'پیام‌ها', icon: MessageSquare, href: '/admin/messages', menuItems: [] },
  { id: 'sms', name: 'پیامک', icon: Send, href: '/admin/sms', menuItems: [] },
  { id: 'telegram', name: 'تلگرام', icon: MessageSquareText, href: '/admin/telegram', menuItems: [] },
  { id: 'orders', name: 'سفارش‌های وب‌سایت', icon: ShoppingBag, href: '/admin/orders', menuItems: [] },
  { id: 'storefront', name: 'سفارش‌های ویترین', icon: Receipt, href: '/admin/storefront', menuItems: [] },
  { id: 'website', name: 'انتشار در وب‌سایت', icon: Globe, href: '/admin/website', menuItems: [] },
  { id: 'dropdowns', name: 'لیست‌های کمکی', icon: List, href: '/admin/dropdowns', menuItems: [] },
];
