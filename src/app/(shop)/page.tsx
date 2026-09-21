import type { Metadata } from 'next';
import { getCatalog, getPublicKinds } from '@/actions/shop';
import { HomeLanding } from '@/components/shop/HomeLanding';
import { pageShare } from '@/lib/share-meta';
import { absoluteUrl } from '@/lib/site';

const title = 'جین پوش | شلوار جین و پوشاک عمده از بازار بزرگ تهران';
const description =
  'فروش عمده شلوار جین، کتان و پوشاک از حجره جین پوش در بازار آهنگران. سفارش با بسته، موجودی روز حجره خانواده رحیمی.';

export const metadata: Metadata = pageShare({
  title,
  description,
  url: absoluteUrl('/'),
});

export default async function HomePage() {
  const [products, kinds] = await Promise.all([getCatalog(), getPublicKinds()]);
  return <HomeLanding products={products} kinds={kinds} />;
}
