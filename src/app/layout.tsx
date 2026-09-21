import type { Metadata } from 'next';
import { Toaster } from '@/ui/components/Toast';
import { siteOrigin } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: 'جین پوش | شلوار جین و پوشاک عمده از بازار بزرگ تهران',
  description: 'فروش عمده شلوار جین و پوشاک از حجره جین پوش در بازار بزرگ تهران',
  icons: {
    icon: [
      { url: '/brand/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/brand/icon-192.png',
  },
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
