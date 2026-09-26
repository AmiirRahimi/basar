import type { Metadata } from 'next';
import { BRAND_LOGO } from '@/lib/brand-logo';
import { absoluteUrl } from '@/lib/site';

export const SHOP_SHARE_IMAGE =
  'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=1200&h=630&q=80';

export function shareImageUrl(image?: string) {
  const src = String(image || '').trim();
  if (!src) return absoluteUrl(BRAND_LOGO.iconLarge);
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return absoluteUrl(src);
}

export function pageShare({
  title,
  description,
  url,
  image,
  siteName = 'باسار',
}: {
  title: string;
  description: string;
  url: string;
  image?: string;
  siteName?: string;
}): Metadata {
  const img = shareImageUrl(image || SHOP_SHARE_IMAGE);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      locale: 'fa_IR',
      type: 'website',
      siteName,
      images: [{ url: img, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [img],
    },
  };
}
