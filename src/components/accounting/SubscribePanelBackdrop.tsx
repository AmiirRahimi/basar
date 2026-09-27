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
import { BrandLogo } from '@/components/brand/BrandLogo';

const MENU = [
  { name: 'داشبورد', icon: LayoutDashboard, active: true },
  { name: 'فاکتور', icon: FileText },
  { name: 'اشخاص', icon: Users },
  { name: 'البسه', icon: Shirt },
  { name: 'لینک محصول', icon: Link2 },
  { name: 'تصویر محصول', icon: Sparkles },
  { name: 'چک', icon: Landmark },
  { name: 'خرید پارچه', icon: Scissors },
  { name: 'حساب', icon: Wallet },
  { name: 'برگشتی', icon: Undo2 },
];

const ROWS = [
  ['شلوار جین راسته', '۲۴۰', 'فاکتور باز'],
  ['پیراهن آکسفورد', '۱۲۰', 'آماده'],
  ['تیشرت ساده', '۸۰', 'در راه'],
  ['کت کتان', '۳۶', 'ثبت شده'],
];

/** Static shell. No live account data, no links. */
export function SubscribePanelBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden inert>
      <div className="absolute inset-0 origin-top bg-zinc-200 blur-[28px]">
        <div className="flex min-h-screen" dir="rtl">
          <aside className="flex w-16 shrink-0 flex-col bg-sidebar-gradient p-2 text-white sm:w-64 sm:p-3">
            <div className="mb-4 flex items-center gap-2 rounded-2xl bg-white/10 px-2 py-2">
              <BrandLogo variant="mark" className="h-9 w-9 shrink-0" />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold">باسار</p>
                <p className="text-[10px] text-white/50">حجره نمونه</p>
              </div>
            </div>
            <p className="mb-2 hidden px-2 text-[10px] text-white/40 sm:block">کار روزانه</p>
            <div className="space-y-1">
              {MENU.map((item) => (
                <div
                  key={item.name}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] ${
                    item.active ? 'bg-white font-semibold text-zinc-900' : 'text-white/70'
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{item.name}</span>
                </div>
              ))}
            </div>
          </aside>
          <div className="min-w-0 flex-1 space-y-3 p-4 md:p-5">
            <div className="grid grid-cols-3 gap-3">
              {['فروش ماه', 'فاکتور باز', 'لباس موجود'].map((label) => (
                <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs text-zinc-400">{label}</p>
                  <p className="mt-2 text-xl font-semibold text-zinc-900">۱۲٬۴۰۰٬۰۰۰</p>
                </div>
              ))}
            </div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900">آخرین لباس‌ها</div>
              <div className="divide-y divide-zinc-100">
                {ROWS.map((row) => (
                  <div key={row[0]} className="grid grid-cols-3 px-4 py-3 text-sm text-zinc-700">
                    {row.map((cell) => (
                      <span key={cell}>{cell}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="h-40 rounded-2xl bg-white shadow-sm" />
              <div className="h-40 rounded-2xl bg-white shadow-sm" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-white/10" />
    </div>
  );
}
