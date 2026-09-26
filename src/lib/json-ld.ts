import { BRAND, BRAND_ADDRESSES, BRAND_PHONES, BRAND_SOCIAL } from '@/lib/brand';
import { absoluteUrl } from '@/lib/site';

export function shopOrganizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'ClothingStore'],
    name: BRAND.name,
    alternateName: BRAND.latin,
    description: 'فروش عمده شلوار جین و پوشاک از حجره بازار بزرگ تهران',
    url: absoluteUrl('/'),
    telephone: BRAND_PHONES.map((phone) => phone.display),
    sameAs: [BRAND_SOCIAL.instagram, BRAND_SOCIAL.telegram, BRAND_SOCIAL.linkedin],
    address: BRAND_ADDRESSES.map((address) => ({
      '@type': 'PostalAddress',
      streetAddress: address.line,
      addressLocality: 'تهران',
      addressRegion: 'تهران',
      addressCountry: 'IR',
    })),
  };
}

export function accountingSoftwareLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'باسار',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'نرم‌افزار حسابداری تحت وب مخصوص عمده‌فروشی پوشاک',
    url: absoluteUrl('/accounting'),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IRR',
      availability: 'https://schema.org/InStock',
    },
  };
}
