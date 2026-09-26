import { ShopAccount } from '@/components/shop/ShopAccount';
import { getShopAccount } from '@/actions/shop-account';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'حساب من | باسار',
  description: 'نام، آدرس تحویل، کد پستی، تلفن ثابت و سفارش‌های قبلی.',
};

export default async function ShopAccountPage() {
  const account = await getShopAccount();
  if (!account) redirect('/login?next=/account');
  return <ShopAccount account={account} />;
}
