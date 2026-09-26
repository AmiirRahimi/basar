import type { Metadata } from 'next';
import { Toaster } from '@/ui/components/Toast';
import { siteOrigin } from '@/lib/site';
import { pageShare } from '@/lib/share-meta';
import { GoogleAnalytics } from '@/components/seo/GoogleAnalytics';
import './globals.css';

const title = 'باسار | شلوار جین و پوشاک عمده از بازار بزرگ تهران';
const description = 'فروش عمده شلوار جین و پوشاک از حجره باسار در بازار بزرگ تهران';
const googleVerification = (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '').trim();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  ...pageShare({ title, description, url: '/' }),
  icons: {
    icon: [
      { url: '/brand/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/brand/icon-192.png',
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <GoogleAnalytics />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
