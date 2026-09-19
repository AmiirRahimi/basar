import type { Metadata } from 'next';
import { CountingLanding } from '@/components/counting/CountingLanding';
import { getSession } from '@/server/session';

export const metadata: Metadata = {
  title: 'باسار · پنل شمارش | جین پوش',
  description:
    'پنل شمارش باسار برای حجره پوشاک: فاکتور، چک، البسه، لینک محصول، حساب مشتری و اشتراک.',
};

export default async function CountingIndex() {
  const session = await getSession();
  return <CountingLanding signedIn={Boolean(session)} />;
}
