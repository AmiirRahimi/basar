import { ShopLogin } from '@/components/shop/ShopLogin';
import { getShopViewer } from '@/actions/shop-account';
import { shopReturnPath } from '@/lib/shop-account';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'ورود | باسار',
  description: 'ورود به باسار با شماره موبایل.',
};

export default async function ShopLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, viewer] = await Promise.all([searchParams, getShopViewer()]);
  const returnPath = shopReturnPath(next);
  if (viewer) redirect(viewer.fullName && viewer.shopAddress ? returnPath || '/account' : '/account');
  return <ShopLogin next={returnPath} />;
}
