import type { Metadata } from 'next';
import { Toaster } from '@/ui/components/Toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'جین پوش | خانواده رحیمی',
  description: 'برند پوشاک خانواده رحیمی با بیش از ۴۵ سال فعالیت در بازار بزرگ تهران',
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
