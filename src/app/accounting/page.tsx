import type { Metadata } from 'next';
import { AccountingLanding } from '@/components/accounting/AccountingLanding';
import { getSession } from '@/server/session';
import { livePlanCatalog } from '@/server/plan-catalog';
import { pageShare } from '@/lib/share-meta';
import { absoluteUrl } from '@/lib/site';
import { BRAND_LOGO } from '@/lib/brand-logo';

const title = 'باسار · نرم‌افزار حسابداری تحت وب مخصوص عمده‌فروشی';
const description =
  'باسار نرم‌افزار حسابداری تحت وب مخصوص عمده‌فروشی پوشاک است: پارچه و خیاط، فاکتور و بیجک، لینک مشتری، چند فروشگاه و برند، شریک و فروش آنلاین.';

export const metadata: Metadata = pageShare({
  title,
  description,
  url: absoluteUrl('/accounting'),
  image: BRAND_LOGO.iconLarge,
  siteName: 'باسار',
});

export default async function AccountingIndex() {
  const [session, catalog] = await Promise.all([getSession(), livePlanCatalog()]);
  return <AccountingLanding signedIn={Boolean(session)} catalog={catalog} />;
}
