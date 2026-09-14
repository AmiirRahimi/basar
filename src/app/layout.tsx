import type { Metadata } from 'next';
import { Toaster } from '@/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'بازار | عمده‌فروشی پوشاک',
  description: 'وب‌سایت عمده‌فروشی پوشاک و نرم‌افزار شمارش بازار',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
