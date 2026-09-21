import { loadMockPayment } from '@/actions/pay';
import { MockPayForm } from '@/components/shop/MockPayForm';
import { notFound } from 'next/navigation';

export default async function MockPayPage({
  searchParams,
}: {
  searchParams: Promise<{ authority?: string }>;
}) {
  const { authority = '' } = await searchParams;
  const res = await loadMockPayment(authority);
  if (!res.ok || !res.data) notFound();
  const data = res.data as { authority: string; amount: number; kind: string; status: string };
  return <MockPayForm authority={data.authority} amount={data.amount} kind={data.kind} />;
}
