import type { Metadata } from 'next';
import { CountingLanding } from '@/components/counting/CountingLanding';
import { getSession } from '@/server/session';

export const metadata: Metadata = {
  title: 'باسار · نرم‌افزار حسابداری تحت وب مخصوص عمده‌فروشی',
  description:
    'باسار نرم‌افزار حسابداری تحت وب مخصوص عمده‌فروشی پوشاک است: پارچه و خیاط، فاکتور و بیجک، لینک مشتری، چند فروشگاه و برند، شریک و فروش آنلاین.',
};

export default async function CountingIndex() {
  const session = await getSession();
  return <CountingLanding signedIn={Boolean(session)} />;
}
