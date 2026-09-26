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
import type { AccountingMenuSection } from './AccountingSidebar';

export const accountingMenuSections: AccountingMenuSection[] = [
  { id: 'dashboard', name: 'داشبورد', icon: LayoutDashboard, href: '/accounting/dashboard', menuItems: [] },
  { id: 'invoice', name: 'فاکتور', icon: FileText, href: '/accounting/invoices', menuItems: [] },
  { id: 'person', name: 'اشخاص', icon: Users, href: '/accounting/people', menuItems: [] },
  { id: 'cloth', name: 'البسه', icon: Shirt, href: '/accounting/clothes', menuItems: [] },
  { id: 'share', name: 'لینک محصول', icon: Link2, href: '/accounting/shares', menuItems: [] },
  { id: 'images', name: 'تصویر محصول', icon: Sparkles, href: '/accounting/images', menuItems: [] },
  { id: 'check', name: 'چک', icon: Landmark, href: '/accounting/checks', menuItems: [] },
  { id: 'fabric', name: 'خرید پارچه', icon: Scissors, href: '/accounting/fabric', menuItems: [] },
  { id: 'account', name: 'حساب', icon: Wallet, href: '/accounting/account', menuItems: [] },
  { id: 'returned', name: 'برگشتی', icon: Undo2, href: '/accounting/returned', menuItems: [] },
];
