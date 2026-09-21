import type { Metadata } from 'next';
import { CountingLanding } from '@/components/counting/CountingLanding';
import { getSession } from '@/server/session';
import { absoluteUrl } from '@/lib/site';

const title = 'باسار · نرم‌افزار حسابداری تحت وب مخصوص عمده‌فروشی';
const description =
  'باسار نرم‌افزار حسابداری تحت وب مخصوص عمده‌فروشی پوشاک است: پارچه و خیاط، فاکتور و بیجک، لینک مشتری، چند فروشگاه و برند، شریک و فروش آنلاین.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/counting') },
  openGraph: { title, description, url: absoluteUrl('/counting'), locale: 'fa_IR', type: 'website' },
};

export default async function CountingIndex() {
  const session = await getSession();
  return <CountingLanding signedIn={Boolean(session)} />;
}
