'use client';

import {
  FileText,
  Landmark,
  LayoutDashboard,
  Link2,
  Scissors,
  Shirt,
  Sparkles,
  Undo2,
  Users,
  Wallet,
} from 'lucide-react';
import type { CountingMenuSection } from './CountingSidebar';

export const countingMenuSections: CountingMenuSection[] = [
  { id: 'dashboard', name: 'داشبورد', icon: LayoutDashboard, href: '/counting/dashboard', menuItems: [] },
  { id: 'invoice', name: 'فاکتور', icon: FileText, href: '/counting/invoices', menuItems: [] },
  { id: 'person', name: 'اشخاص', icon: Users, href: '/counting/people', menuItems: [] },
  { id: 'cloth', name: 'البسه', icon: Shirt, href: '/counting/clothes', menuItems: [] },
  { id: 'share', name: 'لینک محصول', icon: Link2, href: '/counting/shares', menuItems: [] },
  { id: 'images', name: 'تصویر محصول', icon: Sparkles, href: '/counting/images', menuItems: [] },
  { id: 'check', name: 'چک', icon: Landmark, href: '/counting/checks', menuItems: [] },
  { id: 'fabric', name: 'خرید پارچه', icon: Scissors, href: '/counting/fabric', menuItems: [] },
  { id: 'account', name: 'حساب', icon: Wallet, href: '/counting/account', menuItems: [] },
  { id: 'returned', name: 'برگشتی', icon: Undo2, href: '/counting/returned', menuItems: [] },
];
